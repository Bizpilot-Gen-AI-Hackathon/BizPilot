from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import random
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from app.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base error for provider-neutral LLM failures."""


class ProviderNotConfigured(LLMError):
    pass


class LLMRateLimited(LLMError):
    pass


class LLMBudgetExceeded(LLMError):
    pass


class LLMUnavailable(LLMError):
    pass


@dataclass
class ToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass
class CompletionResult:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    provider: str = ""
    model: str = ""

    @property
    def usage(self) -> dict[str, int]:
        return {"input_tokens": self.input_tokens, "output_tokens": self.output_tokens}


def redact_pii(value: Any) -> Any:
    if not settings.llm_redact_pii:
        return value
    if isinstance(value, dict):
        return {key: redact_pii(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_pii(item) for item in value]
    if not isinstance(value, str):
        return value
    value = re.sub(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", "[email]", value)
    value = re.sub(r"(?<!\d)(?:\+?\d[\d ()-]{7,}\d)(?!\d)", "[phone]", value)
    return value


class _ProviderAdapter:
    provider: str

    def complete(
        self,
        messages: list[dict[str, Any]],
        system: str,
        tools: list[dict[str, Any]],
        response_schema: dict[str, Any] | None,
        model: str,
    ) -> CompletionResult:
        raise NotImplementedError


class _GeminiAdapter(_ProviderAdapter):
    provider = "gemini"

    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise ProviderNotConfigured("Gemini is not configured. Set GEMINI_API_KEY on the backend.")
        from google import genai

        self._client = genai.Client(api_key=settings.gemini_api_key)

    def complete(self, messages, system, tools, response_schema, model):
        from google.genai import types

        contents = []
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            if isinstance(content, (dict, list)):
                content = json.dumps(content, separators=(",", ":"))
            contents.append(f"{role}: {content}")
        config_kwargs: dict[str, Any] = {"system_instruction": system}
        if tools:
            config_kwargs["tools"] = [{"function_declarations": tools}]
        if response_schema:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = response_schema
        started = time.monotonic()
        response = self._client.models.generate_content(
            model=model,
            contents="\n".join(contents),
            config=types.GenerateContentConfig(**config_kwargs),
        )
        text = getattr(response, "text", "") or ""
        calls: list[ToolCall] = []
        for candidate in getattr(response, "candidates", []) or []:
            for part in getattr(getattr(candidate, "content", None), "parts", []) or []:
                function_call = getattr(part, "function_call", None)
                if function_call:
                    args = dict(getattr(function_call, "args", {}) or {})
                    calls.append(ToolCall(getattr(function_call, "name", ""), args))
        usage = getattr(response, "usage_metadata", None)
        return CompletionResult(
            text=text,
            tool_calls=calls,
            input_tokens=int(getattr(usage, "prompt_token_count", 0) or 0),
            output_tokens=int(getattr(usage, "candidates_token_count", 0) or 0),
            latency_ms=int((time.monotonic() - started) * 1000),
            provider=self.provider,
            model=model,
        )


class _UnavailableAdapter(_ProviderAdapter):
    def __init__(self, provider: str) -> None:
        self.provider = provider

    def complete(self, *args, **kwargs):
        raise ProviderNotConfigured(f"{self.provider.title()} is not configured.")


class _RuntimeState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.day: str | None = None
        self.calls = 0
        self.cache: dict[str, tuple[float, CompletionResult]] = {}
        self.semaphore = asyncio.Semaphore(max(1, settings.llm_max_concurrency))


# The counter and cache are per-process and reset when this process restarts.
_state = _RuntimeState()


def _cache_key(agent: str, workspace_id: int, question: str, data_fingerprint: str) -> str:
    raw = f"{agent}|{workspace_id}|{' '.join(question.split()).lower()}|{data_fingerprint}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _is_limited(error: Exception) -> bool:
    text = str(error).upper()
    return "429" in text or "RESOURCE_EXHAUSTED" in text or "RATE LIMIT" in text


def _retry_delay(error: Exception, attempt: int) -> float:
    match = re.search(r"retry.*?(\d+(?:\.\d+)?)s", str(error), re.IGNORECASE)
    return min(float(match.group(1)), 30.0) if match else min(2**attempt + random.random(), 30.0)


def _model_route(alias: str) -> list[tuple[str, str]]:
    route = settings.model_routes.get(alias)
    if not route or ":" not in route:
        raise LLMUnavailable(f"Unknown model route: {alias}")
    provider, model = route.split(":", 1)
    fallbacks = {"reasoning": ["fast"], "fast": ["bulk"], "bulk": []}
    aliases = [alias] + fallbacks.get(alias, [])
    output = []
    for candidate in aliases:
        configured = settings.model_routes.get(candidate)
        if configured and ":" in configured:
            provider_name, model_name = configured.split(":", 1)
            if (provider_name, model_name) not in output:
                output.append((provider_name, model_name))
    return output


def _adapter(provider: str) -> _ProviderAdapter:
    if provider == "gemini":
        return _GeminiAdapter()
    if provider in {"anthropic", "openai"}:
        return _UnavailableAdapter(provider)
    raise LLMUnavailable(f"Unsupported LLM provider: {provider}")


async def complete(
    messages: list[dict[str, Any]],
    system: str,
    tools: list[dict[str, Any]] | None = None,
    response_schema: dict[str, Any] | None = None,
    model_alias: str = "fast",
    *,
    agent: str = "unknown",
    workspace_id: int = 0,
    data_fingerprint: str = "",
) -> CompletionResult:
    key = _cache_key(agent, workspace_id, messages[-1].get("content", ""), data_fingerprint)
    now = time.monotonic()
    with _state.lock:
        cached = _state.cache.get(key)
        if cached and cached[0] > now:
            result = cached[1]
            logger.info("llm_call agent=%s cache_hit=true provider=%s model=%s", agent, result.provider, result.model)
            return result
        current_day = datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
        if _state.day != current_day:
            _state.day, _state.calls = current_day, 0
        if _state.calls >= settings.llm_daily_call_budget:
            raise LLMBudgetExceeded("The AI daily call budget has been reached. Try again tomorrow.")
        _state.calls += 1

    async with _state.semaphore:
        last_error: Exception | None = None
        for provider, model in _model_route(model_alias):
            adapter = _adapter(provider)
            for attempt in range(3):
                try:
                    result = await asyncio.to_thread(
                        adapter.complete, messages, redact_pii(system), tools or [], response_schema, model
                    )
                    with _state.lock:
                        _state.cache[key] = (time.monotonic() + settings.llm_cache_ttl_seconds, result)
                    logger.info(
                        "llm_call agent=%s cache_hit=false provider=%s model=%s tokens_in=%s tokens_out=%s latency_ms=%s success=true",
                        agent, result.provider, result.model, result.input_tokens, result.output_tokens, result.latency_ms,
                    )
                    return result
                except Exception as error:
                    last_error = error
                    if not _is_limited(error) or attempt == 2:
                        break
                    await asyncio.sleep(_retry_delay(error, attempt))
            if last_error and _is_limited(last_error):
                continue
            break
    if last_error and _is_limited(last_error):
        raise LLMRateLimited("The AI service is busy, try again in a minute.") from last_error
    if isinstance(last_error, ProviderNotConfigured):
        raise last_error
    raise LLMUnavailable("The AI service is temporarily unavailable.") from last_error


def reset_runtime_state() -> None:
    with _state.lock:
        _state.day = None
        _state.calls = 0
        _state.cache.clear()