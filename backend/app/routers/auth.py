import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import client_ip, record
from app.auth import create_token, hash_password, require_user, verify_password
from app.database import get_db
from app.models import Organisation, User
from app.schemas import ChangePasswordIn, LoginIn, MeOut, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

_MAX_FAILS = 5
_LOCK_SECONDS = 60
_fails: dict[str, list[float]] = {}


def _locked(key: str) -> bool:
    now = time.time()
    recent = [t for t in _fails.get(key, []) if now - t < _LOCK_SECONDS]
    _fails[key] = recent
    return len(recent) >= _MAX_FAILS


def _fail(key: str) -> None:
    _fails.setdefault(key, []).append(time.time())


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, request: Request, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "")
    keys = [f"e:{email}", f"i:{ip}"]
    if any(_locked(k) for k in keys):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in a minute.")

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    ok = bool(user) and await verify_password(body.password, user.password_hash)
    if not ok:
        for k in keys:
            _fail(k)
        record(db, None, "login_failed", "user", None, email, {"ip": client_ip(request)}, actor_email=email)
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    record(db, user, "login", "user", user.id, user.email, {"ip": client_ip(request)})
    await db.commit()
    return TokenOut(token=create_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    org_name = None
    if user.org_id:
        org_name = (await db.execute(select(Organisation.name).where(Organisation.id == user.org_id))).scalar_one_or_none()
    return MeOut(id=user.id, email=user.email, is_admin=user.is_admin, org_id=user.org_id, org_name=org_name)


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordIn,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if not await verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    user.password_hash = await hash_password(body.new_password)
    record(db, user, "password_changed", "user", user.id, user.email)
    await db.commit()
