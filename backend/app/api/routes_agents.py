from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents.sales_agent import SalesAgent
from app.api.deps import get_current_user, require_workspace
from app.db.database import get_db
from app.llm.client import LLMBudgetExceeded, LLMRateLimited, LLMUnavailable, ProviderNotConfigured
from app.models.tables import User
from app.ratelimit import hit

router = APIRouter(prefix="/agents", tags=["agents"])
sales_agent = SalesAgent()


class AgentQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


def _agent_rate_limit(user: User) -> None:
    hit(f"agent:sales:user:{user.id}", max_calls=5, window=60)


@router.post("/sales")
async def ask_sales(
    payload: AgentQuestion,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    workspace_id: int = Depends(require_workspace),
):
    _agent_rate_limit(user)
    try:
        return await sales_agent.run(
            {"db": db, "workspace_id": workspace_id, "user_id": user.id},
            payload.question,
        )
    except ProviderNotConfigured as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LLMBudgetExceeded as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LLMRateLimited as error:
        raise HTTPException(status_code=429, detail=str(error)) from error
    except LLMUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error