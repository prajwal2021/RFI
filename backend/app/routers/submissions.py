from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.access import rfi_visible_clause
from app.auth import require_user
from app.database import get_db
from app.models import RFI, RFISubmission, User, Workspace
from app.schemas import SubmissionWithRFI

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


@router.get("/", response_model=list[SubmissionWithRFI])
async def list_all_submissions(
    rfi_id: UUID | None = None,
    limit: int = 500,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(RFISubmission, RFI.subject)
        .join(RFI, RFI.id == RFISubmission.rfi_id)
        .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
        .where(rfi_visible_clause(user))
        .order_by(RFISubmission.created_at.desc())
        .limit(min(max(limit, 1), 1000))
    )
    if rfi_id:
        query = query.where(RFISubmission.rfi_id == rfi_id)
    rows = (await db.execute(query)).all()
    return [
        SubmissionWithRFI(
            id=s.id,
            rfi_id=s.rfi_id,
            rfi_subject=subject,
            data=s.data,
            submitted_by_name=s.submitted_by_name,
            submitted_by_email=s.submitted_by_email,
            created_at=s.created_at,
        )
        for s, subject in rows
    ]
