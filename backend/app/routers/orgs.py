import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.audit import record
from app.auth import hash_password, require_admin
from app.database import get_db
from app.models import RFI, Organisation, User, Workspace
from app.schemas import AdminResetPasswordIn, OrgCreate, OrgOut, OrgUserCreate, UserAccessPatch, UserOut

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


@router.get("/shared/workspaces")
async def all_workspaces(db: AsyncSession = Depends(get_db)):
    """Every workspace in the system, so an admin can mark some as shared Examples for all accounts."""
    rows = (
        await db.execute(
            select(Workspace, func.count(RFI.id), User.email)
            .outerjoin(RFI, RFI.workspace_id == Workspace.id)
            .outerjoin(User, User.id == Workspace.owner_id)
            .group_by(Workspace.id, User.email)
            .order_by(Workspace.is_example.desc(), Workspace.name)
        )
    ).all()
    return [
        {"id": str(w.id), "name": w.name, "owner_email": email or w.created_by, "rfi_count": n, "is_example": w.is_example}
        for w, n, email in rows
    ]


@router.patch("/shared/workspaces/{ws_id}")
async def set_workspace_example(ws_id: UUID, body: dict, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    ws = (await db.execute(select(Workspace).where(Workspace.id == ws_id))).scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws.is_example = bool(body.get("is_example"))
    record(db, admin, "workspace_example_set", "workspace", ws.id, ws.name, {"is_example": ws.is_example})
    await db.commit()
    return {"id": str(ws.id), "is_example": ws.is_example}


@router.get("/unassigned", response_model=list[UserOut])
async def unassigned_users(db: AsyncSession = Depends(get_db)):
    """Users who are not in any organisation (e.g. platform administrators)."""
    result = await db.execute(select(User).where(User.org_id.is_(None)).order_by(User.is_admin.desc(), User.email))
    return result.scalars().all()


@router.post("/", response_model=OrgOut, status_code=201)
async def create_org(body: OrgCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organisation name is required")
    org = Organisation(name=name, created_by=admin.email)
    db.add(org)
    try:
        await db.flush()
        record(db, admin, "org_created", "organisation", org.id, org.name)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An organisation with that name already exists")
    return await _load_org(db, org.id)


@router.patch("/{org_id}", response_model=OrgOut)
async def rename_org(
    org_id: UUID, body: OrgCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    org = await _load_org(db, org_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organisation name is required")
    old_name = org.name
    org.name = name
    record(db, admin, "org_renamed", "organisation", org.id, name, {"from": old_name})
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An organisation with that name already exists")
    return await _load_org(db, org_id)


@router.delete("/{org_id}", status_code=204)
async def delete_org(org_id: UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    org = await _load_org(db, org_id)
    if org.users:
        raise HTTPException(status_code=409, detail="Remove the organisation's users before deleting it")
    record(db, admin, "org_deleted", "organisation", org.id, org.name)
    await db.delete(org)
    await db.commit()


@router.post("/{org_id}/users", response_model=UserOut, status_code=201)
async def add_user(
    org_id: UUID, body: OrgUserCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    org = await _load_org(db, org_id)
    email = body.email.strip().lower()
    if not _EMAIL.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not (body.is_rfi_user or body.is_call_center_user):
        raise HTTPException(status_code=400, detail="Choose at least one: RFI user or Call Center user")
    user = User(
        email=email,
        password_hash=await hash_password(body.password),
        is_admin=body.is_admin,
        is_rfi_user=body.is_rfi_user,
        is_call_center_user=body.is_call_center_user,
        org_id=org_id,
    )
    db.add(user)
    try:
        await db.flush()
        record(db, admin, "user_added", "user", user.id, user.email, {"org": org.name, "is_admin": user.is_admin, "rfi_user": user.is_rfi_user, "call_center_user": user.is_call_center_user})
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


@router.patch("/{org_id}/users/{user_id}/access", response_model=UserOut)
async def change_user_access(
    org_id: UUID,
    user_id: UUID,
    body: UserAccessPatch,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _member(db, org_id, user_id)
    rfi = user.is_rfi_user if body.is_rfi_user is None else body.is_rfi_user
    cc = user.is_call_center_user if body.is_call_center_user is None else body.is_call_center_user
    if not (rfi or cc):
        raise HTTPException(status_code=400, detail="Choose at least one: RFI user or Call Center user")
    if body.is_admin is not None and body.is_admin != user.is_admin:
        if user.id == admin.id and not body.is_admin:
            raise HTTPException(status_code=400, detail="You cannot remove your own admin access")
        if not body.is_admin:
            admins = (await db.execute(select(func.count(User.id)).where(User.is_admin.is_(True)))).scalar_one()
            if admins <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last admin")
        user.is_admin = body.is_admin
    user.is_rfi_user = rfi
    user.is_call_center_user = cc
    record(db, admin, "user_access_changed", "user", user.id, user.email, {"rfi_user": rfi, "call_center_user": cc, "is_admin": user.is_admin})
    await db.commit()
    await db.refresh(user)
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
    record(db, admin, "user_removed", "user", user.id, user.email, {"was_admin": user.is_admin})
    await db.delete(user)
    await db.commit()


@router.post("/{org_id}/users/{user_id}/reset-password", status_code=204)
async def reset_user_password(
    org_id: UUID,
    user_id: UUID,
    body: AdminResetPasswordIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _member(db, org_id, user_id)
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user.password_hash = await hash_password(body.new_password)
    record(db, admin, "user_password_reset", "user", user.id, user.email)
    await db.commit()
