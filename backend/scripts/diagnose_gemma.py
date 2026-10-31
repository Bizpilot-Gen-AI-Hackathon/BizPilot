"""Read-only diagnostics for Gemma request variants.

This script reports request shapes and provider status without printing credentials
or response contents that could contain business data.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any

from app.config import settings
from app.tools.registry import TOOL_REGISTRY, normalize_gemini_schema


QUESTION = "hello what can you help me with"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "app" / "llm" / "prompts" / "inventory.txt"
SYSTEM = PROMPT_PATH.read_text(encoding="utf-8")
INVENTORY_TOOLS = (
    "get_stock",
    "days_until_stockout",
    "reorder_quantity",
    "top_and_bottom_sellers",
)


def status_code(error: Exception) -> str:
    for candidate in (
        getattr(error, "status_code", None),
        getattr(error, "code", None),
        getattr(error, "status", None),
    ):
        if candidate is not None:
            return str(candidate)
    text = str(error)
    for code in ("400", "401", "403", "404", "408", "429", "500", "502", "503", "504"):
        if code in text:
            return code
    return "unknown"


def tool_dict(name: str) -> dict[str, Any]:
    entry = TOOL_REGISTRY[name]
    return {
        "name": name,
        "description": entry["description"],
        "parameters": normalize_gemini_schema(entry["parameters"]),
    }


def native_config(tool_names: list[str] | None) -> Any:
    from google.genai import types

    if not tool_names:
        return None
    declarations = [
        types.FunctionDeclaration(
            name=tool["name"],
            description=tool["description"],
            parameters=tool["parameters"],
        )
        for tool in (tool_dict(name) for name in tool_names)
    ]
    return types.GenerateContentConfig(
        tools=[types.Tool(function_declarations=declarations)]
    )


def request(client: Any, model: str, variant: str, system: str, question: str,
            tool_names: list[str] | None, *, json_config: bool = False) -> None:
    config = native_config(tool_names)
    if json_config:
        from google.genai import types

        config = types.GenerateContentConfig(response_mime_type="application/json")
    contents = f"{system}\n\nuser: {question}" if system else question
    chars = len(contents)
    started = time.monotonic()
    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        has_function_call = any(
            getattr(part, "function_call", None) is not None
            for candidate in getattr(response, "candidates", []) or []
            for part in getattr(getattr(candidate, "content", None), "parts", []) or []
        )
        result = "PASS" if response is not None else "FAIL"
        suffix = f" function_call={has_function_call}" if tool_names else ""
        print(
            f"{result}\t{variant}\t{model}\tstatus=200\t"
            f"elapsed={time.monotonic() - started:.1f}s\t"
            f"tools={len(tool_names or [])}\tchars={chars}{suffix}"
        )
    except Exception as error:
        print(
            f"FAIL\t{variant}\t{model}\tstatus={status_code(error)}\t"
            f"elapsed={time.monotonic() - started:.1f}s\t"
            f"tools={len(tool_names or [])}\tchars={chars}\t"
            f"error_type={type(error).__name__}\tmessage={str(error)[:240]}"
        )


def main() -> int:
    if not settings.gemini_api_key:
        print("GEMINI_API_KEY is not configured; diagnostics not run.")
        return 1
    from google import genai

    models = settings.gemma_models
    client = genai.Client(api_key=settings.gemini_api_key)
    print("variant\tmodel\tstatus\telapsed\ttools\tchars\tadditional")
    for model in models:
        request(client, model, "a_plain", "", "Say hello in one short sentence.", None)
        request(client, model, "b_system", SYSTEM, "Say hello in one short sentence.", None)
        for name in TOOL_REGISTRY:
            request(client, model, f"c_one_tool:{name}", SYSTEM, QUESTION, [name])
        request(client, model, "d_all_tools", SYSTEM, QUESTION, list(TOOL_REGISTRY))
        request(client, model, "e_exact_app_payload", SYSTEM, QUESTION, list(INVENTORY_TOOLS))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
