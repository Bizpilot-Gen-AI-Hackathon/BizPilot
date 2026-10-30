"""Small live check for the configured Gemma 4 Gemini API integration."""

from __future__ import annotations

import json
import time
from typing import Any

from app.config import settings


def _client() -> Any:
    from google import genai

    return genai.Client(api_key=settings.gemini_api_key)


def _text(response: Any) -> str:
    return (getattr(response, "text", "") or "").strip()


def _function_calls(response: Any) -> list[Any]:
    calls = []
    for candidate in getattr(response, "candidates", []) or []:
        for part in getattr(getattr(candidate, "content", None), "parts", []) or []:
            function_call = getattr(part, "function_call", None)
            if function_call:
                calls.append(function_call)
    return calls


def main() -> int:
    model = settings.gemma_model
    print(f"Model: {model}")
    print(f"Fallback chain: {', '.join(settings.gemma_models) or '(none)'}")
    if not settings.gemini_api_key:
        print("a) FAIL - GEMINI_API_KEY is not configured")
        print("b) FAIL - GEMINI_API_KEY is not configured")
        print("c) FAIL - GEMINI_API_KEY is not configured")
        return 1

    try:
        from google.genai import types

        client = _client()
    except Exception as error:
        print(f"a) FAIL - could not initialise google-genai: {error}")
        print("b) FAIL - could not initialise google-genai")
        print("c) FAIL - could not initialise google-genai")
        return 1

    all_passed = True
    started = time.monotonic()
    try:
        response = client.models.generate_content(
            model=model,
            contents="Reply with the single word PASS.",
        )
        print(f"a) PASS - reply={_text(response)!r}, latency_ms={int((time.monotonic() - started) * 1000)}")
    except Exception as error:
        all_passed = False
        print(f"a) FAIL - {error}")

    function_declaration = types.FunctionDeclaration(
        name="smoke_test_function",
        description="A dummy function used only to verify structured function calling.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={"value": types.Schema(type=types.Type.STRING)},
            required=["value"],
        ),
    )
    try:
        response = client.models.generate_content(
            model=model,
            contents="Call smoke_test_function with value set to pass.",
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=[function_declaration])],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(mode="ANY")
                ),
            ),
        )
        calls = _function_calls(response)
        if calls:
            print(f"b) PASS - structured function call={calls[0]}")
        else:
            all_passed = False
            print(f"b) FAIL - no structured function call returned; reply={_text(response)!r}")
    except Exception as error:
        all_passed = False
        print(f"b) FAIL - {error}")

    try:
        response = client.models.generate_content(
            model=model,
            contents='Return JSON only with this shape: {"status": "pass"}.',
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        parsed = json.loads(_text(response))
        if isinstance(parsed, dict) and parsed.get("status") == "pass":
            print(f"c) PASS - parsed={parsed}")
        else:
            all_passed = False
            print(f"c) FAIL - unexpected JSON={parsed!r}")
    except Exception as error:
        all_passed = False
        print(f"c) FAIL - {error}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
