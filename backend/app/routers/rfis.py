from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import RFI, RFIResponse, RFIStatus
from app.schemas import RFICreate, RFIUpdate, RFIOut, RFIResponseCreate, RFIResponseOut

router = APIRouter(prefix="/api/rfis", tags=["rfis"])


@router.get("/", response_model=list[RFIOut])
async def list_rfis(status: RFIStatus | None = None, db: AsyncSession = Depends(get_db)):
    query = select(RFI).options(selectinload(RFI.responses)).order_by(RFI.created_at.desc())
    if status:
        query = query.where(RFI.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=RFIOut, status_code=201)
async def create_rfi(rfi_in: RFICreate, db: AsyncSession = Depends(get_db)):
    rfi = RFI(**rfi_in.model_dump())
    db.add(rfi)
    await db.commit()
    await db.refresh(rfi, attribute_names=["responses"])
    return rfi


@router.get("/{rfi_id}", response_model=RFIOut)
async def get_rfi(rfi_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RFI).options(selectinload(RFI.responses)).where(RFI.id == rfi_id)
    )
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    return rfi


@router.patch("/{rfi_id}", response_model=RFIOut)
async def update_rfi(rfi_id: UUID, rfi_in: RFIUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RFI).options(selectinload(RFI.responses)).where(RFI.id == rfi_id)
    )
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    for field, value in rfi_in.model_dump(exclude_unset=True).items():
        setattr(rfi, field, value)
    await db.commit()
    await db.refresh(rfi, attribute_names=["responses"])
    return rfi


@router.delete("/{rfi_id}", status_code=204)
async def delete_rfi(rfi_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    await db.delete(rfi)
    await db.commit()


@router.post("/{rfi_id}/responses", response_model=RFIResponseOut, status_code=201)
async def add_response(rfi_id: UUID, resp_in: RFIResponseCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    response = RFIResponse(rfi_id=rfi_id, **resp_in.model_dump())
    db.add(response)
    rfi.status = RFIStatus.ANSWERED
    await db.commit()
    await db.refresh(response)
    return response
