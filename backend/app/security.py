from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def _encode(payload: dict, minutes: int) -> str:
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def _decode(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def create_access_token(user_id: int, workspace_id: int) -> str:
    return _encode({"sub": str(user_id), "ws": workspace_id, "typ": "access"},
                   settings.access_token_minutes)


def decode_token(token: str) -> dict | None:
    p = _decode(token)
    return p if p and p.get("typ", "access") == "access" and "ws" in p else None


def create_purpose_token(user_id: int, purpose: str, minutes: int, extra: dict | None = None) -> str:
    return _encode({"sub": str(user_id), "typ": purpose, **(extra or {})}, minutes)


def decode_purpose_token(token: str, purpose: str) -> dict | None:
    p = _decode(token)
    return p if p and p.get("typ") == purpose else None