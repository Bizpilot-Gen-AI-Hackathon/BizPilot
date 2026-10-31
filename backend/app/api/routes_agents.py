from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents.orchestrator import Orchestrator
from app.api.deps import get_current_user, require_workspace
from app.db.database import get_db
from app.models.tables import AgentRun, User
from app.ratelimit import hit, limit

router = APIRouter(prefix="/agents", tags=["agents"])
chat_router = APIRouter(tags=["chat"])
orchestrator = Orchestrator()


class ChatQuestion(BaseModel):
    message: str = Field(min_length=1, max_length=500)


def _reply(result: dict) -> str:
    data = result["result"]
    return f"{data.insight} {data.recommendation}".strip()


@chat_router.post("/chat", dependencies=[Depends(limit("chat", 20, 60))])
async def chat(payload: ChatQuestion, db: Session = Depends(get_db),
               user: User = Depends(get_current_user),
               workspace_id: int = Depends(require_workspace)):
    agent = orchestrator.choose(payload.message)
    run = await agent.run(db, workspace_id, payload.message)
    db.add(AgentRun(workspace_id=workspace_id, question=payload.message, agent=agent.name,
                    tool_calls=run["tool_calls"], result=run["result"].model_dump(),
                    model=run["model"], ms=run["ms"], error=run.get("error")))
    db.commit()
    return {"reply": _reply(run), "result": run["result"].model_dump(),
            "tool_calls": run["tool_calls"], "model": run["model"], "fallback": run["fallback"]}


class AgentQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


@router.post("/sales")
async def ask_sales(payload: AgentQuestion, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user),
                    workspace_id: int = Depends(require_workspace)):
    run = await orchestrator.sales.run(db, workspace_id, payload.question)
    return {"answer": _reply(run), "data_used": [call["name"] for call in run["tool_calls"]],
            "model": run["model"], "fallback": run["fallback"]}
