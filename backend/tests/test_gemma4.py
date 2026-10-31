import asyncio
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.agents.base_agent import AgentResult
from app.agents.inventory_agent import InventoryAgent
from app.config import settings
from app.llm import client
from app.models.tables import Base, Product, Sale, SaleItem, Workspace
from app.tools.registry import TOOL_REGISTRY
from app.tools.stock_tools import get_stock
from app.tools.registry import normalize_gemini_schema


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        workspace = Workspace(name="Fixture")
        session.add(workspace)
        session.flush()
        water = Product(workspace_id=workspace.id, name="Bottled Water 1L", category="drinks", sku="W",
                        cost_price=20, selling_price=35, stock_qty=7, reorder_level=24)
        milk = Product(workspace_id=workspace.id, name="Long-life Milk 500ml", category="drinks", sku="M",
                       cost_price=30, selling_price=50, stock_qty=12, reorder_level=20)
        session.add_all([water, milk])
        session.flush()
        sale = Sale(workspace_id=workspace.id, ref="TX-1", payment_method="Cash", total=350,
                    created_at=datetime.now() - timedelta(days=2))
        sale.items.append(SaleItem(product_id=water.id, qty=10, unit_price=35, unit_cost=20))
        session.add(sale)
        session.commit()
        yield session, workspace.id


def test_stock_tool_is_workspace_scoped_and_matches_fixture(db):
    session, workspace_id = db
    result = get_stock(session, workspace_id, {"product_name": "water"})
    assert result["name"] == "Bottled Water 1L"
    assert result["stock"] == 7
    assert result["reorder_level"] == 24


def test_tool_argument_validation_rejects_unknown_and_spoofing():
    agent = InventoryAgent()
    with pytest.raises(ValueError):
        agent._validate_args("not_a_tool", {})
    with pytest.raises(ValueError):
        agent._validate_args("get_stock", {"workspace_id": 999})


def test_all_tool_schemas_are_normalized_for_gemini():
    unsupported = {"additionalProperties", "additional_properties", "$schema", "title", "default"}

    def keys(value):
        if isinstance(value, dict):
            for key, item in value.items():
                yield key
                yield from keys(item)
        elif isinstance(value, list):
            for item in value:
                yield from keys(item)

    for entry in TOOL_REGISTRY.values():
        assert not unsupported.intersection(keys(normalize_gemini_schema(entry["parameters"])))


def test_privacy_scrub_removes_customer_fields():
    clean = client.redact_pii({"customer_name": "Jane", "email": "jane@example.com", "revenue": 12.5})
    assert clean == {"revenue": 12.5}


def test_evidence_verifier_drops_unsupported_numbers():
    agent = InventoryAgent()
    result = AgentResult(insight="x", recommendation="y", evidence=["stock is 7", "stock is 999"],
                         confidence="high")
    verified = agent._verify_evidence(result, [{"stock": 7}])
    assert verified.evidence == ["stock is 7"]
    assert verified.confidence == "low"


def test_fallback_returns_tool_data_when_gemma_unavailable(monkeypatch, db):
    class Down:
        def __init__(self):
            raise client.LLMUnavailable("offline")

    monkeypatch.setattr("app.agents.base_agent.GemmaClient", Down)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "What is in stock?"))
    assert result["fallback"] is True
    assert result["result"].confidence == "low"
    assert result["tool_calls"][0]["name"] == "get_stock"


def test_native_tool_calls_are_recorded(monkeypatch, db):
    class FakeGemma:
        def __init__(self):
            self.calls = 0

        async def generate(self, system, messages, tools=None, **kwargs):
            self.calls += 1
            if self.calls == 1:
                return client.CompletionResult(
                    tool_calls=[client.ToolCall("get_stock", {"product_name": "water"}, mode="native")],
                    model="gemma-4-26b-a4b-it",
                )
            return client.CompletionResult(
                text='{"insight":"Stock is low","recommendation":"Review reorder","evidence":["7"],"confidence":"medium"}',
                model="gemma-4-26b-a4b-it",
            )

    monkeypatch.setattr("app.agents.base_agent.GemmaClient", FakeGemma)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "Check water stock"))
    assert result["fallback"] is False
    assert result["tool_calls"][0]["mode"] == "native"


def test_json_fallback_tool_calls_are_recorded(monkeypatch, db):
    class FakeGemma:
        def __init__(self):
            self.calls = 0

        async def generate(self, system, messages, tools=None, **kwargs):
            self.calls += 1
            if self.calls == 1:
                return client.CompletionResult(
                    tool_calls=[client.ToolCall("get_stock", {"product_name": "water"}, mode="json")],
                    model="gemma-4-26b-a4b-it",
                )
            return client.CompletionResult(
                text='{"insight":"Stock is low","recommendation":"Review reorder","evidence":["7"],"confidence":"medium"}',
                model="gemma-4-26b-a4b-it",
            )

    monkeypatch.setattr("app.agents.base_agent.GemmaClient", FakeGemma)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "Check water stock"))
    assert result["tool_calls"][0]["mode"] == "json"


def test_gemma_model_chain_is_ordered_deduplicated_and_safe(monkeypatch, caplog):
    monkeypatch.setattr(settings, "gemma_model", "gemma-4-26b-a4b-it")
    monkeypatch.setattr(settings, "gemma_fallback_models", "gemma-4-31b-it, gemma-4-26b-a4b-it, gemini-2.0-flash")
    with caplog.at_level("WARNING"):
        assert settings.gemma_models == ["gemma-4-26b-a4b-it", "gemma-4-31b-it"]
    assert "Skipping non-Gemma 4 model" in caplog.text


def test_client_uses_next_model_after_transient_retry(monkeypatch):
    monkeypatch.setattr(settings, "gemma_model", "gemma-4-primary")
    monkeypatch.setattr(settings, "gemma_fallback_models", "gemma-4-fallback")
    calls = []

    def fake_json(model, system, messages, tools):
        calls.append(model)
        if model == "gemma-4-primary":
            raise RuntimeError("503 UNAVAILABLE")
        return client.CompletionResult(text="ok", model=model)

    gemma = object.__new__(client.GemmaClient)
    monkeypatch.setattr(gemma, "_request_json", fake_json)
    async def no_sleep(_):
        return None

    monkeypatch.setattr(client.asyncio, "sleep", no_sleep)
    result = asyncio.run(gemma.generate("system", [{"role": "user", "content": "hello"}]))
    assert result.model == "gemma-4-fallback"
    assert calls == ["gemma-4-primary", "gemma-4-primary", "gemma-4-fallback"]


def test_native_call_then_final_answer_does_not_fallback(monkeypatch, db):
    class FakeGemma:
        def __init__(self):
            self.calls = 0

        async def generate(self, *args, **kwargs):
            self.calls += 1
            if self.calls == 1:
                return client.CompletionResult(
                    tool_calls=[client.ToolCall("get_stock", {"product_name": "water"}, mode="native")],
                    model="gemma-4-26b-a4b-it",
                )
            return client.CompletionResult(
                text='{"insight":"Stock is low","recommendation":"Review reorder","evidence":["7"],"confidence":"medium"}',
                model="gemma-4-26b-a4b-it",
            )

    fake = FakeGemma()
    monkeypatch.setattr("app.agents.base_agent.GemmaClient", lambda: fake)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "Check water stock"))
    assert result["fallback"] is False
    assert fake.calls == 2
    assert [call["mode"] for call in result["tool_calls"]] == ["native"]


def test_api_rejects_tools_then_json_fallback_once(monkeypatch):
    calls = []
    gemma = object.__new__(client.GemmaClient)

    def reject(*args):
        calls.append("native")
        raise RuntimeError("400 tool declarations rejected")

    def json_response(*args):
        calls.append("json")
        return client.CompletionResult(
            text='{"tool":"get_stock","args":{"product_name":"water"}}',
            tool_calls=[client.ToolCall("get_stock", {"product_name": "water"}, mode="json")],
            model="gemma-4-26b-a4b-it",
        )

    monkeypatch.setattr(gemma, "_request_native", reject)
    monkeypatch.setattr(gemma, "_request_json", json_response)
    result = asyncio.run(gemma.generate("system", [{"role": "user", "content": "stock"}], [{"name": "get_stock", "description": "stock", "parameters": {}}], allow_json_fallback=True))
    assert result.tool_calls[0].mode == "json"
    assert calls == ["native", "json"]


def test_first_plain_text_turn_uses_json_fallback_once(monkeypatch, db):
    class FakeGemma:
        def __init__(self):
            self.requests = []

        async def generate(self, *args, **kwargs):
            self.requests.append(kwargs)
            if len(self.requests) == 1:
                return client.CompletionResult(text="plain text", model="gemma-4-26b-a4b-it")
            return client.CompletionResult(
                text='{"insight":"No issue","recommendation":"Monitor stock","evidence":[],"confidence":"low"}',
                model="gemma-4-26b-a4b-it",
            )

    fake = FakeGemma()
    monkeypatch.setattr("app.agents.base_agent.GemmaClient", lambda: fake)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "Check stock"))
    assert result["fallback"] is False
    assert len(fake.requests) == 2
    assert fake.requests[0]["allow_json_fallback"] is True
    assert fake.requests[1]["json_only"] is True


def test_failure_after_tool_execution_does_not_rerun_tool(monkeypatch, db):
    calls = 0

    def stock_once(db_session, workspace_id, arguments):
        nonlocal calls
        calls += 1
        return {"name": "Bottled Water 1L", "stock": 7}

    monkeypatch.setitem(TOOL_REGISTRY["get_stock"], "function", stock_once)

    class FakeGemma:
        def __init__(self):
            self.calls = 0

        async def generate(self, *args, **kwargs):
            self.calls += 1
            if self.calls == 1:
                return client.CompletionResult(
                    tool_calls=[client.ToolCall("get_stock", {"product_name": "water"}, mode="native")],
                    model="gemma-4-26b-a4b-it",
                )
            raise client.LLMUnavailable("provider failed after tool result")

    monkeypatch.setattr("app.agents.base_agent.GemmaClient", FakeGemma)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "Check water stock"))
    assert result["fallback"] is True
    assert calls == 1
    assert len(result["tool_calls"]) == 1
    assert result["tool_calls"][0]["mode"] == "native"


def test_gemma_failure_records_sanitized_error(monkeypatch, db):
    class ProviderFailure(Exception):
        status_code = 503

    class FakeGemma:
        def __init__(self):
            pass

        async def generate(self, *args, **kwargs):
            raise client.LLMUnavailable(
                "The AI service is temporarily unavailable.",
            ) from ProviderFailure("upstream failed api_key=secret-value")

    monkeypatch.setattr("app.agents.base_agent.GemmaClient", FakeGemma)
    session, workspace_id = db
    result = asyncio.run(InventoryAgent().run(session, workspace_id, "Check stock"))
    assert result["fallback"] is True
    assert result["error"].startswith("type=ProviderFailure; status=503;")
    assert "secret-value" not in result["error"]
