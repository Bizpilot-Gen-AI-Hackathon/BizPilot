from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.tables import User, Workspace
from app.security import decode_token


def _token_from(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def get_current_user(authorization: str | None = Header(None),
                     db: Session = Depends(get_db)) -> User:
    token = _token_from(authorization)
    payload = decode_token(token) if token else None
    user = db.get(User, int(payload["sub"])) if payload else None
    if not user:
        raise HTTPException(status_code=401, detail="Please log in again.")
    return user


def current_workspace(authorization: str | None = Header(None),
                      db: Session = Depends(get_db)) -> int:
    token = _token_from(authorization)
    if token:
        payload = decode_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
        return payload["ws"]
    # No token: demo mode, use the first workspace.
    return db.scalar(select(Workspace.id).order_by(Workspace.id).limit(1))