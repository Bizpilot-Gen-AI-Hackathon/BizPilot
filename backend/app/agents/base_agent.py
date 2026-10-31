from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from app.config import settings
from app.llm.client import GemmaClient, LLMUnavailable, complete, redact_pii
from app.tools.registry import TOOL_REGISTRY

logger = logging.getLogger(__name__)

VALID_ACTION_TYPES = {"create_reorder_list", "suggest_price_change", "none"}
VALID_CONFIDENCE = {"high", "medium", "low"}


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
        if self.type not in VALID_ACTION_TYPES:
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
        if self.confidence not in VALID_CONFIDENCE:
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
        args = dict(args)
        schema = TOOL_REGISTRY[name]["parameters"]
        properties = schema.get("properties", {})
        if set(args) - set(properties):
            raise ValueError("Tool arguments contain unsupported fields")
        for required in schema.get("required", []):
            if required not in args:
                raise ValueError(f"Missing required tool argument: {required}")
        # Clamp numeric values to the range declared in the schema, so a slightly
        # out-of-range value from the model (for example limit=20) does not fail the chat.
        for key, value in list(args.items()):
            spec = properties.get(key, {})
            if (spec.get("type") in {"integer", "number"} and isinstance(value, (int, float))
                    and not isinstance(value, bool)):
                if "minimum" in spec:
                    value = max(value, spec["minimum"])
                if "maximum" in spec:
                    value = min(value, spec["maximum"])
                args[key] = int(value) if spec["type"] == "integer" else value
        return args

    def _verify_evidence(self, result: AgentResult, tool_results: list[dict[str, Any]]) -> AgentResult:
        serialized = json.dumps(tool_results)
        supported = [item for item in result.evidence
                     if any(str(number) in serialized for number in self._numbers(item))]
        if len(supported) != len(result.evidence):
            result.evidence = supported
            result.confidence = "low"
        if not tool_results:
            # Greetings and other no-data replies are fine. Only warn when the model
            # made claims (evidence or a real action) without any tool data behind them.
            makes_claims = bool(result.evidence) or (
                result.action is not None and result.action.type != "none"
            )
            result.evidence = []
            if makes_claims:
                result.confidence = "low"
                result.recommendation = f"{result.recommendation} Data is missing to verify this recommendation."
        return result

    @staticmethod
    def _numbers(text: str) -> list[str]:
        return re.findall(r"-?\d+(?:\.\d+)?", text)

    def _fallback_result(self, tool_results: list[dict[str, Any]]) -> AgentResult:
        return AgentResult(
            insight="The AI assistant is unavailable right now. Here is the data it would have used.",
            recommendation="Review the returned data before taking any action.",
            evidence=[json.dumps(item, separators=(",", ":")) for item in tool_results],
            action=Action(type="none"),
            confidence="low",
        )

    def _collect_fallback_data(self, db: Session, workspace_id: int | str,
                               tool_results: list[dict[str, Any]], calls: list[dict[str, Any]]) -> None:
        """When the AI is unavailable, still return real data from the agent's first tool.

        This must never raise: if the database connection is broken, the user should still
        get the "unavailable" reply instead of a server error.
        """
        if tool_results or not self.allowed_tools:
            return
        try:
            db.rollback()  # clears a broken or aborted transaction before the session is reused
            name = self.allowed_tools[0]
            raw = TOOL_REGISTRY[name]["function"](db, workspace_id, {})
            clean = redact_pii(raw)
            tool_results.append(clean)
            calls.append({"name": name, "args": {}, "result": clean, "ms": 0, "mode": "json"})
        except Exception:
            logger.exception("Fallback tool call failed")

    @staticmethod
    def _error_details(error: Exception) -> str:
        if isinstance(error, LLMUnavailable) and error.attempt_errors:
            # Keep the FIRST attempts (for example a 429) rather than only the most recent ones.
            return " | ".join(error.attempt_errors)[:1900]
        original = error
        while original.__cause__ is not None:
            original = original.__cause__
        status = (
            getattr(original, "status_code", None)
            or getattr(original, "code", None)
            or getattr(original, "status", None)
        )
        if status is None:
            match = re.search(r"\b([45]\d{2})\b", str(original))
            status = match.group(1) if match else "unknown"
        message = re.sub(
            r"(?i)(api[_ -]?key|authorization|bearer|token|password)\s*[:=]\s*\S+",
            r"\1=[REDACTED]",
            str(original),
        )
        return f"type={type(original).__name__}; status={status}; message={message[:700]}"

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any] | None:
        """Pull a JSON object out of model text, tolerating code fences and extra prose."""
        if not text:
            return None
        cleaned = text.strip()
        fence = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
        if fence:
            cleaned = fence.group(1).strip()
        try:
            data = json.loads(cleaned)
        except Exception:
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start == -1 or end <= start:
                return None
            try:
                data = json.loads(cleaned[start:end + 1])
            except Exception:
                return None
        return data if isinstance(data, dict) else None

    @classmethod
    def _parse_result(cls, text: str) -> AgentResult | None:
        """Parse the model's reply into an AgentResult, normalising common schema slips."""
        data = cls._extract_json(text)
        if data is None or "insight" not in data:
            return None

        evidence = data.get("evidence")
        if isinstance(evidence, str):
            evidence = [] if evidence.strip().lower() in {"", "n/a", "na", "none"} else [evidence]
        elif not isinstance(evidence, list):
            evidence = []
        data["evidence"] = [str(item) for item in evidence]

        action = data.get("action")
        if isinstance(action, dict) and action.get("type") in VALID_ACTION_TYPES:
            payload = action.get("payload")
            data["action"] = {"type": action["type"], "payload": payload if isinstance(payload, dict) else {}}
        else:
            data["action"] = None

        confidence = str(data.get("confidence", "low")).lower()
        data["confidence"] = confidence if confidence in VALID_CONFIDENCE else "low"
        data["insight"] = str(data.get("insight") or "")
        data["recommendation"] = str(data.get("recommendation") or "")
        if not isinstance(data.get("cause"), str):
            data["cause"] = None

        try:
            return AgentResult.model_validate(data)
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
        deadline = started + settings.llm_chat_deadline_seconds
        messages = list(history or []) + [{"role": "user", "content": question}]
        tool_results: list[dict[str, Any]] = []
        calls: list[dict[str, Any]] = []
        try:
            client = GemmaClient()
            first_turn = True
            for _ in range(settings.llm_max_tool_calls):
                # Stop when less than 3 seconds of the whole-chat deadline remain.
                if time.monotonic() >= deadline - 3:
                    break
                completion = await client.generate(
                    self._system_prompt(),
                    messages,
                    self._tool_definitions(),
                    allow_json_fallback=first_turn,
                    deadline=deadline,
                )
                if not completion.tool_calls:
                    result = self._parse_result(completion.text)
                    if result is None and first_turn and not tool_results:
                        repair = await client.generate(
                            self._system_prompt() + "\nReturn a valid AgentResult JSON or a tool request.",
                            messages + [{"role": "assistant", "content": completion.text}],
                            self._tool_definitions(),
                            json_only=True,
                            deadline=deadline,
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
                    try:
                        raw = TOOL_REGISTRY[call.name]["function"](db, workspace_id, args)
                    except ValueError as tool_error:
                        # Let the model see the rejection and retry instead of failing the chat.
                        raw = {"error": f"Tool rejected the request: {tool_error}. Retry with valid arguments."}
                    clean = redact_pii(raw)
                    tool_results.append(clean)
                    calls.append({"name": call.name, "args": args, "result": clean,
                                  "ms": int((time.monotonic() - tool_started) * 1000),
                                  "mode": call.mode})
                    messages.extend([
                        {"role": "assistant", "content": completion.text},
                        {"role": "tool", "content": json.dumps(clean, separators=(",", ":"))},
                    ])
            # The loop ended without a final answer (deadline reached or tool-call limit hit).
            self._collect_fallback_data(db, workspace_id, tool_results, calls)
            result = self._fallback_result(tool_results)
            return {"result": result, "tool_calls": calls, "model": settings.gemma_model,
                    "ms": int((time.monotonic() - started) * 1000), "fallback": True,
                    "error": "type=DeadlineExceeded; status=timeout; message=chat deadline reached"}
        except Exception as error:
            # Any failure (AI service, bad tool arguments, database) becomes a safe fallback reply
            # instead of a server error. The cause is logged and stored in agent_runs.error.
            error_details = self._error_details(error)
            logger.error("Gemma agent call failed: %s", error_details)
            self._collect_fallback_data(db, workspace_id, tool_results, calls)
            result = self._fallback_result(tool_results)
            return {"result": result, "tool_calls": calls, "model": settings.gemma_model,
                    "ms": int((time.monotonic() - started) * 1000), "fallback": True,
                    "error": error_details}