import re

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.tables import User, Workspace
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=120)
    email: str
    password: str = Field(min_length=8, max_length=72)
    business_name: str | None = Field(default=None, alias="businessName", max_length=120)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address.")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


def user_out(u: User, db: Session) -> dict:
    ws = db.get(Workspace, u.workspace_id)
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "workspaceId": u.workspace_id,
            "businessName": ws.name if ws else None,
            "currency": ws.currency if ws else "KES"}


def session_out(u: User, db: Session) -> dict:
    return {"user": user_out(u, db),
            "access_token": create_access_token(u.id, u.workspace_id),
            "token_type": "bearer"}


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.email == body.email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    first = body.name.strip().split()[0]
    ws = Workspace(name=(body.business_name or "").strip() or f"{first}'s Business", currency="KES")
    db.add(ws)
    db.flush()
    user = User(workspace_id=ws.id, name=body.name.strip(), email=body.email,
                password_hash=hash_password(body.password), role="businessOwner")
    db.add(user)
    db.commit()
    return session_out(user, db)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return session_out(user, db)


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(user, db)


@router.post("/logout", status_code=204)
def logout():
    # Tokens are stateless; the frontend clears its stored session.
    return Response(status_code=204)