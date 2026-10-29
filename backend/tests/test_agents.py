import asyncio

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.agents import base_agent
from app.db import repositories
from app.llm import client
from app.models.tables import Base, Product, Workspace


def test_tool_loop_is_capped(monkeypatch):
    class EndlessAgent(base_agent.BaseAgent):
        name = "test"
        tools = {
            "noop": base_agent.ToolSpec(
                "noop", "A test tool.", {"type": "object", "properties": {}},
                lambda db, workspace_id, arguments: {"ok": True},
            )
        }

    calls = 0

    async def fake_complete(*args, **kwargs):
        nonlocal calls
        calls += 1
        return client.CompletionResult(
            tool_calls=[client.ToolCall("noop", {})], model="test-model"
        )

    monkeypatch.setattr(base_agent, "complete", fake_complete)
    agent = EndlessAgent()
    result = asyncio.run(agent.run({"db": object(), "workspace_id": 1}, "question"))
    assert calls == 3
    assert result["answer"] == "I could not complete that analysis within the tool limit."


def test_retry_then_fallback(monkeypatch):
    client.reset_runtime_state()
    attempts = []

    class Adapter:
        def __init__(self, provider):
            self.provider = provider

        def complete(self, *args):
            attempts.append(self.provider)
            if self.provider == "gemini" and len(attempts) <= 3:
                raise RuntimeError("429 RESOURCE_EXHAUSTED")
            return client.CompletionResult(text="ok", provider=self.provider, model="fallback")

    monkeypatch.setattr(client, "_adapter", Adapter)
    async def no_sleep(_):
        return None

    monkeypatch.setattr(client.asyncio, "sleep", no_sleep)
    result = asyncio.run(client.complete(
        [{"role": "user", "content": "fallback-test"}], "system", model_alias="reasoning",
        agent="test", workspace_id=1,
    ))
    assert result.provider == "gemini"
    assert attempts[:3] == ["gemini", "gemini", "gemini"]
    assert len(attempts) == 4


def test_daily_budget_stops_calls(monkeypatch):
    client.reset_runtime_state()
    monkeypatch.setattr(client.settings, "llm_daily_call_budget", 0)
    try:
        try:
            asyncio.run(client.complete([{"role": "user", "content": "budget"}], "system"))
            assert False, "expected budget exception"
        except client.LLMBudgetExceeded:
            pass
    finally:
        monkeypatch.setattr(client.settings, "llm_daily_call_budget", 100)


def test_cache_hit(monkeypatch):
    client.reset_runtime_state()
    calls = 0

    class Adapter:
        provider = "gemini"

        def complete(self, *args):
            nonlocal calls
            calls += 1
            return client.CompletionResult(text="cached", provider="gemini", model="model")

    monkeypatch.setattr(client, "_adapter", lambda _: Adapter())
    messages = [{"role": "user", "content": "same"}]
    asyncio.run(client.complete(messages, "system", agent="test", workspace_id=1))
    asyncio.run(client.complete(messages, "system", agent="test", workspace_id=1))
    assert calls == 1


def test_pii_redaction():
    value = client.redact_pii("Contact Jane at jane@example.com or +1 555-123-4567")
    assert "jane@example.com" not in value
    assert "555-123-4567" not in value
    assert "[email]" in value
    assert "[phone]" in value


def test_workspace_isolation():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine, tables=[Workspace.__table__, Product.__table__])
    with Session(engine) as db:
        first = Workspace(name="First")
        second = Workspace(name="Second")
        db.add_all([first, second])
        db.flush()
        db.add_all([
            Product(workspace_id=first.id, name="First product", category="x", sku="F",
                    cost_price=1, selling_price=2, stock_qty=1, reorder_level=2),
            Product(workspace_id=second.id, name="Second product", category="x", sku="S",
                    cost_price=1, selling_price=2, stock_qty=9, reorder_level=2),
        ])
        db.commit()
        result = repositories.inventory_summary(db, first.id, 10)
        assert result["product_count"] == 1
        assert result["low_stock"][0]["name"] == "First product"
