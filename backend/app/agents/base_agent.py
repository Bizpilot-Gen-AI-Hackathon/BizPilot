from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from app.config import settings
from app.llm.client import GemmaClient, LLMUnavailable, complete, redact_pii
from app.tools.registry import TOOL_REGISTRY


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Any


class Action(BaseModel):
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def valid_type(self) -> "Action":
        if self.type not in {"create_reorder_list", "suggest_price_change", "none"}:
            raise ValueError("unsupported action type")
        return self


class AgentResult(BaseModel):
    insight: str
    cause: str | None = None
    recommendation: str
    evidence: list[str] = Field(default_factory=list)
    action: Action | None = None
    confidence: str

    @model_validator(mode="after")
    def valid_confidence(self) -> "AgentResult":
        if self.confidence not in {"high", "medium", "low"}:
            raise ValueError("confidence must be high, medium, or low")
        return self


class BaseAgent:
    name = "base"
    prompt_file = "inventory.txt"
    allowed_tools: tuple[str, ...] = ()
    tools: dict[str, ToolSpec] = {}

    def _system_prompt(self) -> str:
        path = Path(__file__).resolve().parent.parent / "llm" / "prompts" / self.prompt_file
        return path.read_text(encoding="utf-8")

    def _tool_definitions(self) -> list[dict[str, Any]]:
        if self.allowed_tools:
            return [{"name": name, **{key: value for key, value in TOOL_REGISTRY[name].items() if key != "function"}}
                    for name in self.allowed_tools]
        return [{"name": tool.name, "description": tool.description, "parameters": tool.parameters}
                for tool in self.tools.values()]

    def _validate_args(self, name: str, args: Any) -> dict[str, Any]:
        if name not in self.allowed_tools or name not in TOOL_REGISTRY:
            raise ValueError(f"Unknown tool requested: {name}")
        if not isinstance(args, dict):
            raise ValueError("Tool arguments must be an object")
        schema = TOOL_REGISTRY[name]["parameters"]
        allowed = set(schema.get("properties", {}))
        if set(args) - allowed:
            raise ValueError("Tool arguments contain unsupported fields")
        for required in schema.get("required", []):
            if required not in args:
                raise ValueError(f"Missing required tool argument: {required}")
        return args

    def _verify_evidence(self, result: AgentResult, tool_results: list[dict[str, Any]]) -> AgentResult:
        serialized = json.dumps(tool_results)
        supported = [item for item in result.evidence if any(str(number) in serialized for number in self._numbers(item))]
        if len(supported) != len(result.evidence):
            result.evidence = supported
            result.confidence = "low"
        if not tool_results:
            result.confidence = "low"
            result.evidence = []
            result.recommendation = f"{result.recommendation} Data is missing to verify this recommendation."
        return result

    @staticmethod
    def _numbers(text: str) -> list[str]:
        import re
        return re.findall(r"-?\d+(?:\.\d+)?", text)

    def _fallback_result(self, tool_results: list[dict[str, Any]]) -> AgentResult:
        return AgentResult(
            insight="The AI assistant is unavailable right now. Here is the data it would have used.",
            recommendation="Review the returned data before taking any action.",
            evidence=[json.dumps(item, separators=(",", ":")) for item in tool_results],
            action=Action(type="none"),
            confidence="low",
        )

    @staticmethod
    def _parse_result(text: str) -> AgentResult | None:
        try:
            return AgentResult.model_validate_json(text)
        except Exception:
            return None

    async def run(self, db: Session | dict[str, Any], workspace_id: int | str, question: str | None = None,
                  history: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        legacy_context = isinstance(db, dict)
        if legacy_context:
            context = db
            db = context["db"]
            question = str(workspace_id)
            workspace_id = int(context["workspace_id"])
        if question is None:
            raise ValueError("question is required")
        if legacy_context and self.tools:
            messages = [{"role": "user", "content": question}]
            latest = None
            for _ in range(3):
                latest = await complete(messages, self.system_prompt if hasattr(self, "system_prompt") else self._system_prompt(),
                                         self._tool_definitions())
                if not latest.tool_calls:
                    return {"answer": latest.text, "data_used": [], "model": latest.model, "usage": {}}
                for call in latest.tool_calls:
                    tool = self.tools.get(call.name)
                    if tool is None:
                        raise ValueError(f"Unknown tool requested: {call.name}")
                    result = tool.handler(db, workspace_id, call.arguments)
                    messages.append({"role": "tool", "content": json.dumps(result)})
            return {"answer": "I could not complete that analysis within the tool limit.", "data_used": [], "model": latest.model, "usage": {}}
        started = time.monotonic()
        messages = list(history or []) + [{"role": "user", "content": question}]
        tool_results: list[dict[str, Any]] = []
        calls: list[dict[str, Any]] = []
        try:
            client = GemmaClient()
            first_turn = True
            for _ in range(settings.llm_max_tool_calls):
                if time.monotonic() - started >= settings.llm_timeout_seconds:
                    break
                completion = await client.generate(
                    self._system_prompt(),
                    messages,
                    self._tool_definitions(),
                    allow_json_fallback=first_turn,
                )
                if not completion.tool_calls:
                    result = self._parse_result(completion.text)
                    if result is None and first_turn and not tool_results:
                        repair = await client.generate(
                            self._system_prompt() + "\nReturn a valid AgentResult JSON or a tool request.",
                            messages + [{"role": "assistant", "content": completion.text}],
                            self._tool_definitions(),
                            json_only=True,
                        )
                        completion = repair
                        result = self._parse_result(completion.text)
                    if result is None:
                        result = AgentResult(
                            insight=completion.text or "No answer returned.",
                            recommendation="Review the available business data.",
                            confidence="low",
                        )
                    if not completion.tool_calls:
                        result = self._verify_evidence(result, tool_results)
                        return {"result": result, "tool_calls": calls, "model": completion.model,
                                "ms": int((time.monotonic() - started) * 1000), "fallback": False}
                first_turn = False
                for call in completion.tool_calls:
                    args = self._validate_args(call.name, call.arguments)
                    tool_started = time.monotonic()
                    raw = TOOL_REGISTRY[call.name]["function"](db, workspace_id, args)
                    clean = redact_pii(raw)
                    tool_results.append(clean)
                    calls.append({"name": call.name, "args": args, "result": clean,
                                  "ms": int((time.monotonic() - tool_started) * 1000),
                                  "mode": call.mode})
                    messages.extend([
                        {"role": "assistant", "content": completion.text},
                        {"role": "tool", "content": json.dumps(clean, separators=(",", ":"))},
                    ])
            result = self._fallback_result(tool_results)
            return {"result": result, "tool_calls": calls, "model": settings.gemma_model,
                    "ms": int((time.monotonic() - started) * 1000), "fallback": True}
        except (LLMUnavailable, ValueError, TypeError):
            if not tool_results and self.allowed_tools:
                name = self.allowed_tools[0]
                raw = TOOL_REGISTRY[name]["function"](db, workspace_id, {})
                clean = redact_pii(raw)
                tool_results.append(clean)
                calls.append({"name": name, "args": {}, "result": clean, "ms": 0})
            result = self._fallback_result(tool_results)
            return {"result": result, "tool_calls": calls, "model": settings.gemma_model,
                    "ms": int((time.monotonic() - started) * 1000), "fallback": True}
