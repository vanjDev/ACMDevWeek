import base64
import hashlib
import hmac
import os
import secrets

from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User

COOKIE_NAME = "saan_session"


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_value, digest_value = stored_hash.split("$", 1)
        salt = base64.b64decode(salt_value.encode())
        expected = base64.b64decode(digest_value.encode())
    except ValueError:
        return False

    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(digest, expected)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def sign_user_id(user_id: int) -> str:
    settings = get_settings()
    nonce = secrets.token_urlsafe(8)
    payload = f"{user_id}.{nonce}"
    signature = hmac.new(settings.secret_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def read_signed_user_id(cookie_value: str | None) -> int | None:
    if not cookie_value:
        return None

    try:
        user_id, nonce, signature = cookie_value.split(".", 2)
    except ValueError:
        return None

    payload = f"{user_id}.{nonce}"
    expected = hmac.new(
        get_settings().secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None

    try:
        return int(user_id)
    except ValueError:
        return None


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=sign_user_id(user_id),
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 60,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME)


def get_optional_user(
    session_cookie: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User | None:
    user_id = read_signed_user_id(session_cookie)
    if not user_id:
        return None
    return db.get(User, user_id)


def require_user(user: User | None = Depends(get_optional_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Login required.")
    return user
