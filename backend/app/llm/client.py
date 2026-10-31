from __future__ import annotations

import asyncio
import json
import logging
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from app.config import settings
from app.tools.registry import normalize_gemini_schema

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


class LLMUnavailable(LLMError):
    def __init__(self, message: str, attempt_errors: list[str] | None = None):
        super().__init__(message)
        self.attempt_errors = attempt_errors or []


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


def _status(error: BaseException) -> str:
    for candidate in (getattr(error, "status_code", None), getattr(error, "code", None), getattr(error, "status", None)):
        if candidate is not None:
            return str(candidate)
    match = re.search(r"\b([45]\d{2})\b", str(error))
    return match.group(1) if match else "unknown"


def _safe_error(error: BaseException) -> str:
    raw = str(error)
    if not raw and isinstance(error, (asyncio.TimeoutError, TimeoutError)):
        raw = "request timed out"
    message = re.sub(
        r"(?i)(api[_ -]?key|authorization|bearer|token|password|connection string)\s*[:=]\s*\S+",
        r"\1=[REDACTED]",
        raw,
    )
    return f"type={type(error).__name__}; status={_status(error)}; message={message[:500]}"


# --- Model cooldowns -------------------------------------------------------------
# When a model fails with 429 (quota/rate limit) or a timeout, skip it for a while so
# the next chat doesn't waste its whole deadline on a model that is known to be down.
# If every model is cooling down, they are all tried anyway.
_COOLDOWN: dict[str, float] = {}
_QUOTA_COOLDOWN_SECONDS = 600
_TIMEOUT_COOLDOWN_SECONDS = 60


def _cooling(model: str) -> bool:
    return _COOLDOWN.get(model, 0.0) > time.monotonic()


def _note_failure(model: str, error: BaseException) -> None:
    if _status(error) == "429":
        _COOLDOWN[model] = time.monotonic() + _QUOTA_COOLDOWN_SECONDS
    elif isinstance(error, (asyncio.TimeoutError, TimeoutError)):
        _COOLDOWN[model] = time.monotonic() + _TIMEOUT_COOLDOWN_SECONDS


def _speed_config(types: Any, model: str) -> dict[str, Any]:
    """Extra generation settings that keep calls fast.

    - http_options.timeout makes the SDK itself give up (milliseconds), so abandoned
      background threads don't keep hitting the API after asyncio stops waiting.
    - Gemini 3.x models reason before answering by default. A low thinking level
      cuts several seconds from every call. Gemma models don't get this setting.
    """
    cfg: dict[str, Any] = {
        "http_options": types.HttpOptions(timeout=int(settings.llm_timeout_seconds * 1000)),
    }
    if model.startswith("gemini-3"):
        cfg["thinking_config"] = types.ThinkingConfig(thinking_level="low")
    return cfg


class GemmaClient:
    # Gemma 4 inference happens here.
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise ProviderNotConfigured("Gemma is not configured.")
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
        from google.genai import types

        started = time.monotonic()
        response = self._client.models.generate_content(
            model=model,
            contents=f"{system}\n{tool_text}\n\n{contents}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                **_speed_config(types, model),
            ),
        )
        text = (getattr(response, "text", "") or "").strip()
        calls: list[ToolCall] = []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and isinstance(parsed.get("tool"), str) and isinstance(parsed.get("args", {}), dict):
                calls.append(ToolCall(parsed["tool"], parsed["args"], mode="json"))
        except (json.JSONDecodeError, TypeError):
            pass
        return CompletionResult(text=text, tool_calls=calls,
                                latency_ms=int((time.monotonic() - started) * 1000), model=model)

    def _request_native(self, model: str, system: str, messages: list[dict[str, Any]],
                        tools: list[dict[str, Any]]) -> CompletionResult:
        from google.genai import types

        declarations = [
            types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=normalize_gemini_schema(tool["parameters"]),
            )
            for tool in tools
        ]
        contents = "\n".join(f"{message.get('role', 'user')}: {message.get('content', '')}" for message in messages)
        started = time.monotonic()
        response = self._client.models.generate_content(
            model=model,
            contents=f"{system}\n\n{contents}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=declarations)],
                **_speed_config(types, model),
            ),
        )
        calls = [
            ToolCall(getattr(part.function_call, "name", ""), dict(getattr(part.function_call, "args", {}) or {}), "native")
            for candidate in getattr(response, "candidates", []) or []
            for part in getattr(getattr(candidate, "content", None), "parts", []) or []
            if getattr(part, "function_call", None)
        ]
        return CompletionResult(
            text=(getattr(response, "text", "") or "").strip(),
            tool_calls=calls,
            latency_ms=int((time.monotonic() - started) * 1000),
            model=model,
            mode="native",
        )

    async def generate(self, system: str, messages: list[dict[str, Any]],
                       tools: list[dict[str, Any]] | None = None, *,
                       allow_json_fallback: bool = False, json_only: bool = False,
                       deadline: float | None = None,
                       attempt_errors: list[str] | None = None) -> CompletionResult:
        errors = attempt_errors if attempt_errors is not None else []
        # Remove duplicates but keep order, so the same model is never tried twice.
        all_models = list(dict.fromkeys(settings.gemma_models))
        if not all_models:
            raise LLMUnavailable("No supported models are configured.", errors)
        # Skip models that recently failed with quota/timeout errors (unless none are left).
        models = [m for m in all_models if not _cooling(m)] or all_models

        for model in models:
            json_tried = False
            try:
                if tools and not json_only:
                    try:
                        result = await self._request_with_retry(
                            self._request_native, model, system, messages, tools, deadline, errors
                        )
                        if result.tool_calls:
                            return result
                    except LLMUnavailable:
                        if not allow_json_fallback:
                            raise
                        json_tried = True
                        json_system = f'{system}\nReturn tool requests only as {{"tool":"name","args":{{...}}}}.'
                        # Models that just failed with 429/timeout are cooling down and get skipped here.
                        remaining_models = [m for m in models[models.index(model):] if not _cooling(m)]
                        return await self._generate_json(
                            json_system, messages, tools, remaining_models, deadline, errors
                        )
                    return result
                return await self._request_with_retry(
                    self._request_json, model, system, messages, tools, deadline, errors
                )
            except LLMUnavailable:
                if json_tried:
                    # The JSON fallback already walked the remaining models, so stop here.
                    break
                continue
        raise LLMUnavailable("The AI service is temporarily unavailable.", errors)

    async def _generate_json(self, system, messages, tools, models, deadline, errors):
        for model in models:
            try:
                return await self._request_with_retry(
                    self._request_json, model, system, messages, tools, deadline, errors
                )
            except LLMUnavailable:
                continue
        raise LLMUnavailable("The AI service is temporarily unavailable.", errors)

    async def _request_with_retry(self, request: Callable, model: str, system: str,
                                  messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None,
                                  deadline: float | None, errors: list[str]) -> CompletionResult:
        last_error: Exception | None = None
        for attempt in range(1, 3):
            remaining = (deadline - time.monotonic()) if deadline is not None else settings.llm_timeout_seconds
            if remaining < 3:
                errors.append(f"model={model}; attempt={attempt}; skipped: chat deadline reached")
                raise LLMUnavailable("Chat deadline reached.", errors)
            timeout = min(settings.llm_timeout_seconds, remaining)
            started = time.monotonic()
            try:
                result = await asyncio.wait_for(
                    asyncio.to_thread(request, model, redact_pii(system), redact_pii(messages), tools),
                    timeout=timeout,
                )
                logger.info("llm_attempt model=%s attempt=%s status=200 elapsed_ms=%s tools=%s prompt_chars=%s",
                            model, attempt, int((time.monotonic() - started) * 1000),
                            len(tools or []), len(system) + sum(len(str(item)) for item in messages))
                return result
            except asyncio.CancelledError:
                # The caller went away (browser refresh, server reload). Record it, then let it propagate.
                errors.append(
                    f"model={model}; attempt={attempt}; elapsed_ms={int((time.monotonic() - started) * 1000)}; "
                    "type=CancelledError; message=request cancelled by caller"
                )
                logger.warning("llm_attempt_cancelled model=%s attempt=%s", model, attempt)
                raise
            except Exception as error:
                last_error = error
                _note_failure(model, error)
                detail = (
                    f"model={model}; attempt={attempt}; timeout_s={timeout:.0f}; "
                    f"elapsed_ms={int((time.monotonic() - started) * 1000)}; {_safe_error(error)}"
                )
                errors.append(detail[:900])
                logger.warning("llm_attempt_failed %s", detail)
                if not self._is_transient(error) or attempt == 2:
                    break
                remaining = (deadline - time.monotonic()) if deadline is not None else 4
                if remaining < 4:
                    break
                await asyncio.sleep(1)
        raise LLMUnavailable("The AI service is temporarily unavailable.", errors) from last_error

    @staticmethod
    def _is_transient(error: Exception) -> bool:
        # Only server-side hiccups are worth retrying on the same model.
        # - Timeouts: a model that was too slow once is usually too slow again.
        # - 429: a quota/rate limit won't clear in a second, so go to the next model.
        return _status(error) in {"500", "502", "503", "504"}


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
    for attempt in range(4):
        try:
            adapter = _adapter("fallback" if attempt == 3 else "gemini")
            result = await asyncio.to_thread(
                adapter.complete, messages, system, tools or [], response_schema, settings.gemma_model
            )
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
    with _state.lock:
        _state.calls = 0
        _state.cache.clear()
    _COOLDOWN.clear()