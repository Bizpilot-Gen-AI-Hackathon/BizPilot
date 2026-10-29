import re
import secrets

from fastapi import APIRouter, Body, Depends, Form, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_workspace
from app.config import settings
from app.db.database import get_db
from app.models.tables import User, Workspace
from app.ratelimit import limit
from app.ussd import handle_ussd

router = APIRouter(tags=["ussd"])


def _phone(value: str) -> str:
    return re.sub(r"\s+", "", value)


@router.post("/ussd", response_class=PlainTextResponse,
             dependencies=[Depends(limit("ussd", 120, 60))])
def ussd(
    request: Request,
    key: str = Query(""),
    session_id: str = Form("", alias="sessionId"),
    service_code: str = Form("", alias="serviceCode"),
    phone_number: str = Form("", alias="phoneNumber"),
    network_code: str = Form("", alias="networkCode"),
    text: str = Form(""),
    db: Session = Depends(get_db),
):
    del request, session_id, service_code, network_code
    if not secrets.compare_digest(key, settings.ussd_secret):
        return PlainTextResponse("END Unauthorized")
    user = db.scalar(select(User).where(User.phone == _phone(phone_number)))
    workspace_id = user.workspace_id if user else None
    if workspace_id is None and settings.ussd_demo_fallback:
        workspace_id = db.scalar(select(Workspace.id).order_by(Workspace.id).limit(1))
    if workspace_id is None:
        return PlainTextResponse("END This number is not registered with BizPilot. Add it in Settings.")
    return PlainTextResponse(handle_ussd(db, workspace_id, text))


class SimulateIn(BaseModel):
    text: str = Field(default="", max_length=500)


@router.post("/ussd/simulate")
def simulate_ussd(body: SimulateIn = Body(...), db: Session = Depends(get_db),
                  workspace_id: int = Depends(require_workspace)):
    return {"reply": handle_ussd(db, workspace_id, body.text)}
