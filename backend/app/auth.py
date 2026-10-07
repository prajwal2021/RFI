import asyncio
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User

_ITERATIONS = 600_000
_bearer = HTTPBearer(auto_error=False)


def _hash(password: str, salt: bytes, iterations: int) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)


def hash_password_sync(password: str) -> str:
    salt = os.urandom(16)
    return f"pbkdf2${_ITERATIONS}${salt.hex()}${_hash(password, salt, _ITERATIONS).hex()}"


def verify_password_sync(password: str, stored: str) -> bool:
    try:
        _, iters, salt_hex, hash_hex = stored.split("$")
        expected = bytes.fromhex(hash_hex)
        actual = _hash(password, bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(hash_password_sync, password)


async def verify_password(password: str, stored: str) -> bool:
    return await asyncio.to_thread(verify_password_sync, password, stored)


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "iat": now,
        "exp": now + timedelta(hours=settings.TOKEN_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


async def require_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not creds:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = UUID(payload["sub"])
    except Exception:
        raise unauthorized
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise unauthorized
    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def seed_admin(db: AsyncSession) -> None:
    email = settings.ADMIN_EMAIL.strip().lower()
    if not email or not settings.ADMIN_PASSWORD:
        return
    exists = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if exists:
        return
    db.add(User(email=email, is_admin=True, password_hash=await hash_password(settings.ADMIN_PASSWORD)))
    await db.commit()
