import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import hash_password, require_admin
from app.database import get_db
from app.models import Organisation, User
from app.schemas import AdminResetPasswordIn, OrgCreate, OrgOut, OrgUserCreate, UserOut

router = APIRouter(prefix="/api/orgs", tags=["organisations"], dependencies=[Depends(require_admin)])

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


async def _load_org(db: AsyncSession, org_id: UUID) -> Organisation:
    org = (
        await db.execute(
            select(Organisation).options(selectinload(Organisation.users)).where(Organisation.id == org_id)
        )
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return org


@router.get("/", response_model=list[OrgOut])
async def list_orgs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Organisation).options(selectinload(Organisation.users)).order_by(Organisation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=OrgOut, status_code=201)
async def create_org(body: OrgCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organisation name is required")
    org = Organisation(name=name, created_by=admin.email)
    db.add(org)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An organisation with that name already exists")
    return await _load_org(db, org.id)


@router.patch("/{org_id}", response_model=OrgOut)
async def rename_org(org_id: UUID, body: OrgCreate, db: AsyncSession = Depends(get_db)):
    org = await _load_org(db, org_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organisation name is required")
    org.name = name
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An organisation with that name already exists")
    return await _load_org(db, org_id)


@router.delete("/{org_id}", status_code=204)
async def delete_org(org_id: UUID, db: AsyncSession = Depends(get_db)):
    org = await _load_org(db, org_id)
    if org.users:
        raise HTTPException(status_code=409, detail="Remove the organisation's users before deleting it")
    await db.delete(org)
    await db.commit()


@router.post("/{org_id}/users", response_model=UserOut, status_code=201)
async def add_user(org_id: UUID, body: OrgUserCreate, db: AsyncSession = Depends(get_db)):
    await _load_org(db, org_id)
    email = body.email.strip().lower()
    if not _EMAIL.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = User(
        email=email,
        password_hash=await hash_password(body.password),
        is_admin=body.is_admin,
        org_id=org_id,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    await db.refresh(user)
    return user


async def _member(db: AsyncSession, org_id: UUID, user_id: UUID) -> User:
    user = (
        await db.execute(select(User).where(User.id == user_id, User.org_id == org_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this organisation")
    return user


@router.delete("/{org_id}/users/{user_id}", status_code=204)
async def remove_user(
    org_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _member(db, org_id, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot remove your own account")
    if user.is_admin:
        admins = (await db.execute(select(func.count(User.id)).where(User.is_admin.is_(True)))).scalar_one()
        if admins <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    await db.delete(user)
    await db.commit()


@router.post("/{org_id}/users/{user_id}/reset-password", status_code=204)
async def reset_user_password(
    org_id: UUID,
    user_id: UUID,
    body: AdminResetPasswordIn,
    db: AsyncSession = Depends(get_db),
):
    user = await _member(db, org_id, user_id)
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user.password_hash = await hash_password(body.new_password)
    await db.commit()
