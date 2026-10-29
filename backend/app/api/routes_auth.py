import hashlib
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.db.database import get_db
from app.mailer import send_email
from app.models.tables import User, Workspace
from app.ratelimit import clear, client_ip, hit, limit
from app.security import (create_access_token, create_purpose_token, decode_purpose_token,
                          hash_password, verify_password)

router = APIRouter(prefix="/auth", tags=["auth"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def clean_email(v: str) -> str:
    v = v.strip().lower()
    if not EMAIL_RE.match(v):
        raise ValueError("Enter a valid email address.")
    return v


class RegisterIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=120)
    email: str
    password: str = Field(min_length=8, max_length=72)
    business_name: str | None = Field(default=None, alias="businessName", max_length=120)
    _e = field_validator("email")(lambda cls, v: clean_email(v))


class LoginIn(BaseModel):
    email: str
    password: str


class EmailIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=72)


class GoogleIn(BaseModel):
    credential: str


class PhoneIn(BaseModel):
    phone: str = Field(min_length=1, max_length=20)


def user_out(u: User, db: Session) -> dict:
    ws = db.get(Workspace, u.workspace_id)
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role,
            "emailVerified": u.email_verified, "workspaceId": u.workspace_id,
            "businessName": ws.name if ws else None,
            "currency": ws.currency if ws else "KES"}


def session_out(u: User, db: Session) -> dict:
    return {"user": user_out(u, db),
            "access_token": create_access_token(u.id, u.workspace_id),
            "token_type": "bearer"}


def pw_fingerprint(u: User) -> str:
    # changes whenever the password changes, so a reset link works only once
    return hashlib.sha256((u.password_hash or "").encode()).hexdigest()[:12]


def create_user(db: Session, *, name: str, email: str, password: str | None,
                business: str | None, verified: bool, google_id: str | None = None) -> User:
    first = name.strip().split()[0] if name.strip() else "My"
    ws = Workspace(name=(business or "").strip() or f"{first}'s Business", currency="KES")
    db.add(ws)
    db.flush()
    user = User(workspace_id=ws.id, name=name.strip(), email=email,
                password_hash=hash_password(password) if password else None,
                role="businessOwner", email_verified=verified, google_id=google_id)
    db.add(user)
    db.commit()
    return user


def queue_verification(user: User, bg: BackgroundTasks) -> None:
    token = create_purpose_token(user.id, "verify", settings.verify_token_minutes)
    link = f"{settings.backend_url}/auth/verify?token={token}"
    bg.add_task(send_email, user.email, "Confirm your BizPilot email",
                f"Hi {user.name},\n\nConfirm your email to finish setting up BizPilot:\n{link}\n\n"
                "If you didn't create this account, you can ignore this message.")


@router.post("/register", status_code=201, dependencies=[Depends(limit("register", 10, 3600))])
def register(body: RegisterIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.email == body.email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = create_user(db, name=body.name, email=body.email, password=body.password,
                       business=body.business_name, verified=False)
    queue_verification(user, bg)
    if settings.require_verified_email:
        return {"user": user_out(user, db),
                "message": "Check your email to confirm your account, then log in."}
    return session_out(user, db)


@router.get("/verify")
def verify(token: str, db: Session = Depends(get_db)):
    payload = decode_purpose_token(token, "verify")
    user = db.get(User, int(payload["sub"])) if payload else None
    target = settings.frontend_url.rstrip("/")
    if not user:
        return RedirectResponse(f"{target}/?verify=failed")
    user.email_verified = True
    db.commit()
    return RedirectResponse(f"{target}/?verify=success")


@router.post("/resend-verification", dependencies=[Depends(limit("resend", 5, 3600))])
def resend_verification(body: EmailIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user and not user.email_verified:
        queue_verification(user, bg)
    return {"message": "If that account exists and isn't confirmed yet, we've sent a new link."}


@router.post("/login", dependencies=[Depends(limit("login-ip", 30, 300))])
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    key = f"login:{client_ip(request)}:{email}"
    hit(key, 8, 900)                      # 8 tries per 15 minutes per email and IP
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if settings.require_verified_email and not user.email_verified:
        raise HTTPException(status_code=403, detail="Confirm your email first. Check your inbox for the link.")
    clear(key)
    return session_out(user, db)


@router.post("/forgot-password", dependencies=[Depends(limit("forgot", 5, 900))])
def forgot_password(body: EmailIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user:
        token = create_purpose_token(user.id, "reset", 30, {"pw": pw_fingerprint(user)})
        link = f"{settings.frontend_url.rstrip('/')}/?reset_token={token}"
        bg.add_task(send_email, user.email, "Reset your BizPilot password",
                    f"Hi {user.name},\n\nUse this link to choose a new password (valid for 30 minutes):\n{link}\n\n"
                    "If you didn't ask for this, you can ignore this message.")
    return {"message": "If an account exists for that email, we've sent a reset link."}


@router.post("/reset-password", dependencies=[Depends(limit("reset", 10, 900))])
def reset_password(body: ResetIn, db: Session = Depends(get_db)):
    payload = decode_purpose_token(body.token, "reset")
    user = db.get(User, int(payload["sub"])) if payload else None
    if not user or payload.get("pw") != pw_fingerprint(user):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
    user.password_hash = hash_password(body.password)
    user.email_verified = True            # they just proved they own the inbox
    db.commit()
    return {"message": "Password updated. You can log in now."}


@router.post("/google", dependencies=[Depends(limit("google", 20, 300))])
def google_login(body: GoogleIn, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in isn't set up yet.")
    try:
        info = google_id_token.verify_oauth2_token(
            body.credential, google_requests.Request(), settings.google_client_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    if not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Your Google email isn't verified.")
    email, sub = info["email"].lower(), info["sub"]
    user = (db.scalar(select(User).where(User.google_id == sub))
            or db.scalar(select(User).where(User.email == email)))
    if user:
        user.google_id = user.google_id or sub
        user.email_verified = True
        db.commit()
    else:
        user = create_user(db, name=info.get("name") or email.split("@")[0], email=email,
                           password=None, business=None, verified=True, google_id=sub)
    return session_out(user, db)


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(user, db)


@router.put("/phone")
def save_phone(body: PhoneIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    phone = re.sub(r"\s+", "", body.phone)
    if not re.fullmatch(r"\+254[17]\d{8}", phone):
        raise HTTPException(status_code=422, detail="Enter a valid Kenyan number, e.g. +254712345678.")
    taken = db.scalar(select(User).where(User.phone == phone, User.id != user.id))
    if taken:
        raise HTTPException(status_code=409, detail="That phone number is already linked to another account.")
    user.phone = phone
    db.commit()
    db.refresh(user)
    return user_out(user, db)


@router.post("/logout", status_code=204)
def logout():
    return Response(status_code=204)