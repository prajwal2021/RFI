from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.access import get_accessible_rfi, rfi_visible_clause
from app.auth import require_user
from app.crm_logic import notify
from app.database import get_db
from app.models import RFI, RFISubmission, SubmissionEvent, User, Workspace
from app.schemas import SubmissionOut, SubmissionWithRFI

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

# Default lead/enrollment pipeline. Stored lowercase; the UI shows the labels.
STATUSES = ["new", "contacted", "interested", "applied", "enrolled", "not_interested"]
STATUS_LABELS = {
    "new": "New", "contacted": "Contacted", "interested": "Interested",
    "applied": "Applied", "enrolled": "Enrolled", "not_interested": "Not interested",
}


def _with_rfi(s: RFISubmission, subject: str) -> SubmissionWithRFI:
    return SubmissionWithRFI(
        id=s.id, rfi_id=s.rfi_id, rfi_subject=subject, data=s.data,
        submitted_by_name=s.submitted_by_name, submitted_by_email=s.submitted_by_email, created_at=s.created_at,
        status=s.status, owner_id=s.owner_id, owner_email=s.owner_email, follow_up_at=s.follow_up_at, contact_id=s.contact_id,
    )


@router.get("/statuses")
async def list_statuses(_: User = Depends(require_user)):
    return [{"value": v, "label": STATUS_LABELS[v]} for v in STATUSES]


@router.get("/assignees")
async def list_assignees(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    """People a response can be assigned to: your organisation (admins: everyone)."""
    q = select(User).order_by(User.email)
    if not user.is_admin:
        q = q.where(or_(User.id == user.id, User.org_id == user.org_id) if user.org_id else User.id == user.id)
    return [{"id": str(u.id), "email": u.email} for u in (await db.execute(q)).scalars().all()]


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
    return [_with_rfi(s, subject) for s, subject in rows]


async def _load(db: AsyncSession, user: User, sub_id: UUID) -> RFISubmission:
    s = (await db.execute(select(RFISubmission).where(RFISubmission.id == sub_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Response not found")
    await get_accessible_rfi(db, user, s.rfi_id)  # 404 if the user cannot see the form
    return s


def _event(db: AsyncSession, sub_id: UUID, actor: User | None, kind: str, data: dict | None = None) -> None:
    db.add(SubmissionEvent(submission_id=sub_id, actor_email=actor.email if actor else None, kind=kind, data=data))


class SubmissionPatch(BaseModel):
    status: str | None = None
    owner_id: UUID | None = None
    follow_up_at: datetime | None = None
    clear_owner: bool = False
    clear_follow_up: bool = False


@router.patch("/{sub_id}", response_model=SubmissionOut)
async def update_submission(
    sub_id: UUID, body: SubmissionPatch, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    s = await _load(db, user, sub_id)

    if body.status is not None and body.status != s.status:
        if body.status not in STATUSES:
            raise HTTPException(status_code=400, detail="Unknown status")
        _event(db, s.id, user, "status", {"from": s.status, "to": body.status})
        s.status = body.status

    if body.clear_owner and s.owner_id:
        _event(db, s.id, user, "owner", {"from": s.owner_email, "to": None})
        s.owner_id = None
        s.owner = None
    elif body.owner_id is not None and body.owner_id != s.owner_id:
        new_owner = (await db.execute(select(User).where(User.id == body.owner_id))).scalar_one_or_none()
        if not new_owner or (not user.is_admin and new_owner.id != user.id and (user.org_id is None or new_owner.org_id != user.org_id)):
            raise HTTPException(status_code=400, detail="That person cannot be assigned")
        _event(db, s.id, user, "owner", {"from": s.owner_email, "to": new_owner.email})
        s.owner_id = new_owner.id
        s.owner = new_owner
        notify(db, new_owner.id, "assigned", "An RFI response was assigned to you", f"By {user.email}", "/", user.id)

    if body.clear_follow_up and s.follow_up_at:
        _event(db, s.id, user, "follow_up", {"from": s.follow_up_at.isoformat(), "to": None})
        s.follow_up_at = None
    elif body.follow_up_at is not None and body.follow_up_at != s.follow_up_at:
        _event(db, s.id, user, "follow_up", {"from": s.follow_up_at.isoformat() if s.follow_up_at else None, "to": body.follow_up_at.isoformat()})
        s.follow_up_at = body.follow_up_at

    await db.commit()
    await db.refresh(s)
    return s


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


@router.post("/{sub_id}/notes", status_code=201)
async def add_note(sub_id: UUID, body: NoteIn, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    s = await _load(db, user, sub_id)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Write a note first")
    _event(db, s.id, user, "note", {"text": text})
    await db.commit()
    return {"ok": True}


@router.get("/{sub_id}/events")
async def list_events(sub_id: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    s = await _load(db, user, sub_id)
    rows = (
        await db.execute(select(SubmissionEvent).where(SubmissionEvent.submission_id == s.id).order_by(SubmissionEvent.created_at.desc()))
    ).scalars().all()
    events = [
        {"id": str(e.id), "created_at": e.created_at.isoformat(), "actor_email": e.actor_email, "kind": e.kind, "data": e.data}
        for e in rows
    ]
    # Responses that arrived before tracking existed still get a first entry.
    if not any(e["kind"] == "submitted" for e in events):
        events.append({"id": "submitted", "created_at": s.created_at.isoformat(), "actor_email": s.submitted_by_email, "kind": "submitted", "data": None})
    return events
