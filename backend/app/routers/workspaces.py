from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.access import get_accessible_workspace, workspace_visible_clause
from app.auth import require_user
from app.database import get_db
from app.models import Workspace, RFI, User
from app.schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceOut, RFIOut

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


def _decorate(ws: Workspace, rfi_count: int, owner_email: str | None, user: User) -> Workspace:
    ws.rfi_count = rfi_count
    ws.owner_email = owner_email or (ws.created_by or None)
    ws.is_owner = ws.owner_id == user.id
    return ws


async def _workspace_out(db: AsyncSession, user: User, ws_id: UUID) -> Workspace:
    row = (
        await db.execute(
            select(Workspace, sa_func.count(RFI.id), User.email)
            .outerjoin(RFI, RFI.workspace_id == Workspace.id)
            .outerjoin(User, User.id == Workspace.owner_id)
            .where(Workspace.id == ws_id, workspace_visible_clause(user))
            .group_by(Workspace.id, User.email)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _decorate(row[0], row[1], row[2], user)


@router.get("/", response_model=list[WorkspaceOut])
async def list_workspaces(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Workspace, sa_func.count(RFI.id), User.email)
        .outerjoin(RFI, RFI.workspace_id == Workspace.id)
        .outerjoin(User, User.id == Workspace.owner_id)
        .where(workspace_visible_clause(user))
        .group_by(Workspace.id, User.email)
        .order_by(Workspace.created_at.desc())
    )
    return [_decorate(ws, count, email, user) for ws, count, email in result.all()]


@router.post("/", response_model=WorkspaceOut, status_code=201)
async def create_workspace(
    ws_in: WorkspaceCreate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    name = ws_in.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Workspace name is required")
    if ws_in.visibility == "org" and user.org_id is None:
        raise HTTPException(status_code=400, detail="You are not in an organisation, so you can only create private workspaces")
    ws = Workspace(
        name=name,
        description=ws_in.description,
        created_by=user.email,
        visibility=ws_in.visibility,
        owner_id=user.id,
        org_id=user.org_id if ws_in.visibility == "org" else None,
    )
    db.add(ws)
    await db.commit()
    return await _workspace_out(db, user, ws.id)


@router.get("/{ws_id}", response_model=WorkspaceOut)
async def get_workspace(ws_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    return await _workspace_out(db, user, ws_id)


@router.patch("/{ws_id}", response_model=WorkspaceOut)
async def update_workspace(
    ws_id: UUID, ws_in: WorkspaceUpdate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    ws = await get_accessible_workspace(db, user, ws_id)
    if ws.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the workspace owner can change it")
    for field, value in ws_in.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)
    await db.commit()
    return await _workspace_out(db, user, ws_id)


@router.delete("/{ws_id}", status_code=204)
async def delete_workspace(ws_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    ws = await get_accessible_workspace(db, user, ws_id)
    if ws.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the workspace owner can delete it")
    await db.delete(ws)
    await db.commit()


@router.get("/{ws_id}/rfis", response_model=list[RFIOut])
async def list_workspace_rfis(ws_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    await get_accessible_workspace(db, user, ws_id)
    result = await db.execute(
        select(RFI)
        .options(selectinload(RFI.responses))
        .where(RFI.workspace_id == ws_id)
        .order_by(RFI.created_at.desc())
    )
    return result.scalars().all()
