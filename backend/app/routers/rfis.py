from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.access import get_accessible_rfi, get_accessible_workspace, rfi_visible_clause
from app.auth import require_user
from app.database import get_db
from app.models import RFI, RFIResponse, RFISubmission, RFIStatus, User, Workspace, generate_publish_key
from app.schemas import (
    RFICreate, RFIUpdate, RFIOut,
    RFIResponseCreate, RFIResponseOut,
    RFIPublicOut, RFIPublishResult,
    SubmissionCreate, SubmissionOut,
)

router = APIRouter(prefix="/api/rfis", tags=["rfis"])


# ── Public endpoints (defined first to avoid path conflicts with /{rfi_id}) ──

@router.get("/public/{publish_key}", response_model=RFIPublicOut)
async def get_public_rfi(publish_key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RFI).where(RFI.publish_key == publish_key, RFI.is_published.is_(True))
    )
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found or not published")
    return rfi


@router.post("/public/{publish_key}/submit", response_model=SubmissionOut, status_code=201)
async def submit_public_rfi(
    publish_key: str,
    submission_in: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RFI).where(RFI.publish_key == publish_key, RFI.is_published.is_(True))
    )
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found or not published")

    submission = RFISubmission(
        rfi_id=rfi.id,
        data=submission_in.data,
        submitted_by_name=submission_in.submitted_by_name,
        submitted_by_email=submission_in.submitted_by_email,
    )
    db.add(submission)

    if rfi.status == RFIStatus.DRAFT or rfi.status == RFIStatus.OPEN:
        rfi.status = RFIStatus.ANSWERED

    await db.commit()
    await db.refresh(submission)
    return submission


# ── Management endpoints (authenticated, scoped to what the user may see) ──

@router.get("/", response_model=list[RFIOut])
async def list_rfis(
    status: RFIStatus | None = None,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(RFI)
        .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
        .options(selectinload(RFI.responses))
        .where(rfi_visible_clause(user))
        .order_by(RFI.created_at.desc())
    )
    if status:
        query = query.where(RFI.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=RFIOut, status_code=201)
async def create_rfi(rfi_in: RFICreate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    if rfi_in.workspace_id:
        await get_accessible_workspace(db, user, rfi_in.workspace_id)
    data = rfi_in.model_dump(exclude={"created_by"})
    rfi = RFI(**data, created_by=user.email, owner_id=user.id)
    db.add(rfi)
    await db.commit()
    await db.refresh(rfi, attribute_names=["responses"])
    return rfi


@router.get("/{rfi_id}", response_model=RFIOut)
async def get_rfi(rfi_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    return await get_accessible_rfi(db, user, rfi_id, with_responses=True)


@router.patch("/{rfi_id}", response_model=RFIOut)
async def update_rfi(
    rfi_id: UUID, rfi_in: RFIUpdate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    rfi = await get_accessible_rfi(db, user, rfi_id, with_responses=True)
    for field, value in rfi_in.model_dump(exclude_unset=True).items():
        setattr(rfi, field, value)
    await db.commit()
    await db.refresh(rfi, attribute_names=["responses"])
    return rfi


@router.delete("/{rfi_id}", status_code=204)
async def delete_rfi(rfi_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    rfi = await get_accessible_rfi(db, user, rfi_id)
    await db.delete(rfi)
    await db.commit()


@router.post("/{rfi_id}/publish", response_model=RFIPublishResult)
async def publish_rfi(rfi_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    rfi = await get_accessible_rfi(db, user, rfi_id)
    if not rfi.content:
        raise HTTPException(status_code=400, detail="Cannot publish an RFI without content")

    if not rfi.publish_key:
        rfi.publish_key = generate_publish_key()
    rfi.is_published = True
    if rfi.status == RFIStatus.DRAFT:
        rfi.status = RFIStatus.OPEN
    await db.commit()
    await db.refresh(rfi)
    return rfi


@router.post("/{rfi_id}/unpublish", response_model=RFIOut)
async def unpublish_rfi(rfi_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    rfi = await get_accessible_rfi(db, user, rfi_id, with_responses=True)
    rfi.is_published = False
    await db.commit()
    await db.refresh(rfi, attribute_names=["responses"])
    return rfi


@router.get("/{rfi_id}/submissions", response_model=list[SubmissionOut])
async def get_submissions(rfi_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    await get_accessible_rfi(db, user, rfi_id)
    result = await db.execute(
        select(RFISubmission)
        .where(RFISubmission.rfi_id == rfi_id)
        .order_by(RFISubmission.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{rfi_id}/responses", response_model=RFIResponseOut, status_code=201)
async def add_response(
    rfi_id: UUID, resp_in: RFIResponseCreate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    rfi = await get_accessible_rfi(db, user, rfi_id)
    response = RFIResponse(rfi_id=rfi_id, **resp_in.model_dump())
    db.add(response)
    rfi.status = RFIStatus.ANSWERED
    await db.commit()
    await db.refresh(response)
    return response
