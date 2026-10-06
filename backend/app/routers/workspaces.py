from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Workspace, RFI
from app.schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceOut, RFIOut

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


@router.get("/", response_model=list[WorkspaceOut])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Workspace,
            sa_func.count(RFI.id).label("rfi_count"),
        )
        .outerjoin(RFI, RFI.workspace_id == Workspace.id)
        .group_by(Workspace.id)
        .order_by(Workspace.created_at.desc())
    )
    workspaces = []
    for row in result.all():
        ws = row[0]
        ws.rfi_count = row[1]
        workspaces.append(ws)
    return workspaces


@router.post("/", response_model=WorkspaceOut, status_code=201)
async def create_workspace(ws_in: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    ws = Workspace(**ws_in.model_dump())
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    ws.rfi_count = 0
    return ws


@router.get("/{ws_id}", response_model=WorkspaceOut)
async def get_workspace(ws_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Workspace,
            sa_func.count(RFI.id).label("rfi_count"),
        )
        .outerjoin(RFI, RFI.workspace_id == Workspace.id)
        .where(Workspace.id == ws_id)
        .group_by(Workspace.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws = row[0]
    ws.rfi_count = row[1]
    return ws


@router.patch("/{ws_id}", response_model=WorkspaceOut)
async def update_workspace(ws_id: UUID, ws_in: WorkspaceUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).where(Workspace.id == ws_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    for field, value in ws_in.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)
    await db.commit()
    await db.refresh(ws)
    rfi_count_result = await db.execute(
        select(sa_func.count(RFI.id)).where(RFI.workspace_id == ws_id)
    )
    ws.rfi_count = rfi_count_result.scalar() or 0
    return ws


@router.delete("/{ws_id}", status_code=204)
async def delete_workspace(ws_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).where(Workspace.id == ws_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await db.delete(ws)
    await db.commit()


@router.get("/{ws_id}/rfis", response_model=list[RFIOut])
async def list_workspace_rfis(ws_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).where(Workspace.id == ws_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")
    result = await db.execute(
        select(RFI)
        .options(selectinload(RFI.responses))
        .where(RFI.workspace_id == ws_id)
        .order_by(RFI.created_at.desc())
    )
    return result.scalars().all()
