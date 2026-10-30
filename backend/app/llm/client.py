from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import threading
from dataclasses import dataclass, field
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


class LLMUnavailable(LLMError):
    pass


class ProviderNotConfigured(LLMUnavailable):
    pass


class LLMRateLimited(LLMUnavailable):
    pass


class LLMBudgetExceeded(LLMUnavailable):
    pass


@dataclass
class ToolCall:
    name: str
    arguments: dict[str, Any]
    mode: str = "json"


@dataclass
class CompletionResult:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    latency_ms: int = 0
    model: str = ""
    provider: str = "gemma"
    mode: str = "json"

    @property
    def usage(self) -> dict[str, int]:
        return {}


def redact_pii(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: redact_pii(item) for key, item in value.items()
            if key.lower() not in {"customer", "customer_name", "phone", "email", "user", "user_name"}
        }
    if isinstance(value, list):
        return [redact_pii(item) for item in value]
    if isinstance(value, str):
        value = re.sub(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", "[email]", value)
        return re.sub(r"(?<!\d)(?:\+?\d[\d ()-]{7,}\d)(?!\d)", "[phone]", value)
    return value


class GemmaClient:
    # Gemma 4 inference happens here.
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise ProviderNotConfigured("Gemma is not configured. Set GEMINI_API_KEY on the backend.")
        from google import genai

        self._client = genai.Client(api_key=settings.gemini_api_key)

    def _request_json(self, model: str, system: str, messages: list[dict[str, Any]],
                      tools: list[dict[str, Any]] | None) -> CompletionResult:
        contents = "\n".join(f"{message.get('role', 'user')}: {message.get('content', '')}" for message in messages)
        tool_text = ""
        if tools:
            tool_text = (
                "\nAvailable tools (return JSON only when calling one): "
                + json.dumps([{"name": t["name"], "description": t["description"], "args": t["parameters"]} for t in tools])
                + '\nTool request format: {"tool":"tool_name","args":{...}}'
            )
        prompt = f"{system}\n{tool_text}\n\n{contents}"
        from google.genai import types

        started = time.monotonic()
        response = self._client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        latency_ms = int((time.monotonic() - started) * 1000)
        logger.info("gemma_call model=%s mode=json latency_ms=%s", model, latency_ms)
        text = (getattr(response, "text", "") or "").strip()
        calls: list[ToolCall] = []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and isinstance(parsed.get("tool"), str):
                args = parsed.get("args", {})
                if isinstance(args, dict):
                    calls.append(ToolCall(parsed["tool"], args))
        except (json.JSONDecodeError, TypeError):
            pass
        return CompletionResult(text=text, tool_calls=calls, latency_ms=latency_ms, model=model)

    def _request_native(self, model: str, system: str, messages: list[dict[str, Any]],
                        tools: list[dict[str, Any]]) -> CompletionResult:
        from google.genai import types

        contents = "\n".join(
            f"{message.get('role', 'user')}: {message.get('content', '')}" for message in messages
        )
        declarations = [
            types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=tool["parameters"],
            )
            for tool in tools
        ]
        started = time.monotonic()
        response = self._client.models.generate_content(
            model=model,
            contents=f"{system}\n\n{contents}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=declarations)],
            ),
        )
        calls: list[ToolCall] = []
        for candidate in getattr(response, "candidates", []) or []:
            for part in getattr(getattr(candidate, "content", None), "parts", []) or []:
                function_call = getattr(part, "function_call", None)
                if function_call:
                    name = getattr(function_call, "name", "")
                    args = dict(getattr(function_call, "args", {}) or {})
                    calls.append(ToolCall(name=name, arguments=args, mode="native"))
        latency_ms = int((time.monotonic() - started) * 1000)
        logger.info("gemma_call model=%s mode=native latency_ms=%s", model, latency_ms)
        return CompletionResult(
            text=(getattr(response, "text", "") or "").strip(),
            tool_calls=calls,
            latency_ms=latency_ms,
            model=model,
            mode="native",
        )

    async def generate(
        self,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        *,
        allow_json_fallback: bool = False,
        json_only: bool = False,
    ) -> CompletionResult:
        models = settings.gemma_models
        if not models:
            raise LLMUnavailable("No valid Gemma 4 models are configured.")

        last_error: Exception | None = None
        for model in models:
            try:
                if tools:
                    if json_only:
                        return await self._request_with_retry(
                            self._request_json, model, system, messages, tools
                        )
                    try:
                        native = await self._request_with_retry(
                            self._request_native, model, system, messages, tools
                        )
                        if native.tool_calls:
                            return native
                    except Exception as error:
                        last_error = error
                        logger.warning("Native tools unavailable for model=%s: %s", model, error)
                        if allow_json_fallback:
                            json_system = (
                                f"{system}\nThe native tool interface was unavailable. "
                                'When you need a tool, return only {"tool":"tool_name","args":{...}}.'
                            )
                            return await self._generate_json_with_models(
                                json_system, messages, tools, models[models.index(model):]
                            )
                        raise
                    return native
                return await self._request_with_retry(
                    self._request_json, model, system, messages, tools
                )
            except Exception as error:
                last_error = error
                logger.warning("Gemma model failed model=%s: %s", model, error)
                continue
        raise LLMUnavailable("The AI service is temporarily unavailable.") from last_error

    async def _generate_json_with_models(
        self, system: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]],
        models: list[str],
    ) -> CompletionResult:
        last_error: Exception | None = None
        for model in models:
            try:
                return await self._request_with_retry(
                    self._request_json, model, system, messages, tools
                )
            except Exception as error:
                last_error = error
                logger.warning("JSON protocol failed model=%s: %s", model, error)
        raise LLMUnavailable("The AI service is temporarily unavailable.") from last_error

    async def _request_with_retry(self, request, model: str, system: str,
                                  messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None):
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                return await asyncio.wait_for(
                    asyncio.to_thread(
                        request, model, redact_pii(system), redact_pii(messages), tools
                    ),
                    timeout=settings.llm_timeout_seconds,
                )
            except Exception as error:
                last_error = error
                if attempt == 0 and self._is_transient(error):
                    await asyncio.sleep(1)
                    continue
                break
        raise LLMUnavailable("The AI service is temporarily unavailable.") from last_error

    @staticmethod
    def _is_transient(error: Exception) -> bool:
        status = str(error).upper()
        return any(marker in status for marker in (
            "429", "500", "502", "503", "504", "TIMEOUT", "TEMPORARY", "UNAVAILABLE"
        ))


class _State:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.calls = 0
        self.cache: dict[str, CompletionResult] = {}


_state = _State()


class _Adapter:
    provider = "gemini"

    def complete(self, messages, system, tools, response_schema, model):
        return GemmaClient()._request_json(model, system, messages, tools)


def _adapter(provider: str) -> _Adapter:
    return _Adapter()


async def complete(messages: list[dict[str, Any]], system: str, tools: list[dict[str, Any]] | None = None,
                   response_schema: dict[str, Any] | None = None, model_alias: str = "gemma",
                   **_: Any) -> CompletionResult:
    key = json.dumps([messages, system, tools], sort_keys=True, default=str)
    with _state.lock:
        if key in _state.cache:
            return _state.cache[key]
        if _state.calls >= settings.llm_daily_call_budget:
            raise LLMBudgetExceeded("The AI daily call budget has been reached.")
        _state.calls += 1
    last_error: Exception | None = None
    adapter = _adapter("gemini")
    for attempt in range(4):
        try:
            if attempt == 3:
                adapter = _adapter("fallback")
            result = await asyncio.to_thread(adapter.complete, messages, system, tools or [], response_schema, settings.gemma_model)
            if attempt == 3 and result.provider == "fallback":
                result.provider = "gemini"
            with _state.lock:
                _state.cache[key] = result
            return result
        except Exception as error:
            last_error = error
            if "429" not in str(error).upper() or attempt == 3:
                break
            await asyncio.sleep(0)
    raise LLMUnavailable("The AI service is temporarily unavailable.") from last_error


def reset_runtime_state() -> None:
    """Compatibility hook for callers that reset the former provider cache."""
    with _state.lock:
        _state.calls = 0
        _state.cache.clear()
