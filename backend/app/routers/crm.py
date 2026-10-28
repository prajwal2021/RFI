"""Call Center (CRM) API: contacts, interactions, work items (tasks/callbacks/cases/handoffs), queues,
course interests, personal RFI links, custom fields, home and team views."""
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, exists, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.access import get_accessible_rfi, rfi_visible_clause
from app.audit import record
from app.auth import is_rfi_only, require_call_center_staff, require_user
from app.crm_logic import (
    JOURNEY_HELP, JOURNEY_LABELS, add_event, contact_name, contact_visible_clause, find_contact, journeys, next_work_number,
    norm_email, norm_phone, response_qa, sync_points,
)
from app.crm_meta import INVERSE_RELATION, as_dict, values
from app.crm_meta import (
    CASE_CATEGORIES, CHANNELS, CONTACT_TYPES, COURSE_STATUSES, CUSTOM_FIELD_TYPES, DIRECTIONS, HANDOFF_REASONS, INTEREST_STAGES,
    LIFECYCLE, LOST_REASONS, OUTCOMES, PRIORITIES, REASONS, RELATIONS, TEAMS, WORK_KINDS, WORK_STATUSES,
)
from app.crm_models import (
    Contact, ContactEvent, ContactPoint, ContactRelation, Course, CustomFieldDef, Interaction, Interest, RFIInvitation, WorkItem,
    WorkItemComment,
)
from app.database import get_db
from app.models import RFI, RFISubmission, User, Workspace

router = APIRouter(prefix="/api/crm", tags=["call center"])

OPEN_STATUSES = ("open", "in_progress", "waiting")


def now() -> datetime:
    return datetime.now(timezone.utc)


def _check(value, opts, what: str):
    if value is not None and value not in values(opts):
        raise HTTPException(status_code=400, detail=f"Unknown {what}: {value}")


async def _users(db: AsyncSession, ids) -> dict:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {u.id: u.email for u in (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()}


def _contact_scope(user: User):
    """Who can this user see? Call Center users: the whole organisation. RFI-only users: just people tied to their own
    forms (a response or a hand-off they sent or received)."""
    base = contact_visible_clause(user)
    if not is_rfi_only(user):
        return base
    visible_rfis = select(RFI.id).outerjoin(Workspace, RFI.workspace_id == Workspace.id).where(rfi_visible_clause(user))
    return and_(base, or_(
        exists().where(RFISubmission.contact_id == Contact.id, RFISubmission.rfi_id.in_(visible_rfis)),
        exists().where(WorkItem.contact_id == Contact.id, or_(WorkItem.created_by_id == user.id, WorkItem.owner_id == user.id)),
        Contact.created_by_id == user.id,
    ))


async def _get_contact(db: AsyncSession, user: User, cid: UUID) -> Contact:
    c = (await db.execute(select(Contact).where(Contact.id == cid, _contact_scope(user)))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    return c


def _work_visible(user: User):
    if user.is_admin:
        return WorkItem.id.is_not(None)
    clauses = [and_(WorkItem.org_id.is_(None), WorkItem.created_by_id == user.id), WorkItem.owner_id == user.id]
    if user.org_id is not None:
        clauses.append(WorkItem.org_id == user.org_id)
    base = or_(*clauses)
    if is_rfi_only(user):  # RFI users see the RFI team's queue and anything they sent or own
        return and_(base, or_(WorkItem.team == "rfi", WorkItem.created_by_id == user.id, WorkItem.owner_id == user.id))
    return base


async def _assignable(db: AsyncSession, user: User, owner_id: UUID | None) -> User | None:
    if owner_id is None:
        return None
    u = (await db.execute(select(User).where(User.id == owner_id))).scalar_one_or_none()
    if not u or (not user.is_admin and u.id != user.id and (user.org_id is None or u.org_id != user.org_id)):
        raise HTTPException(status_code=400, detail="That person cannot be assigned")
    return u


def contact_out(c: Contact, journey: str | None = None, owner_email: str | None = None) -> dict:
    return {
        "id": str(c.id), "name": contact_name(c), "first_name": c.first_name, "last_name": c.last_name,
        "email": c.email, "phone": c.phone, "emails": c.emails or [], "phones": c.phones or [],
        "r_number": c.r_number, "date_of_birth": c.date_of_birth.isoformat() if c.date_of_birth else None,
        "preferred_language": c.preferred_language, "organization_name": c.organization_name, "job_title": c.job_title,
        "address": c.address or {}, "contact_type": c.contact_type, "lifecycle": c.lifecycle, "source": c.source,
        "owner_id": str(c.owner_id) if c.owner_id else None, "owner_email": owner_email,
        "do_not_contact": c.do_not_contact, "consent_email": c.consent_email, "consent_sms": c.consent_sms, "consent_call": c.consent_call,
        "description": c.description, "custom": c.custom or {},
        "created_at": c.created_at.isoformat() if c.created_at else None, "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "journey": journey, "journey_label": JOURNEY_LABELS.get(journey or ""), "journey_help": JOURNEY_HELP.get(journey or ""),
    }


def work_out(w: WorkItem, emails: dict, contacts: dict | None = None) -> dict:
    c = (contacts or {}).get(w.contact_id) if w.contact_id else None
    overdue = bool(w.due_at and w.status in OPEN_STATUSES and w.due_at < now())
    return {
        "id": str(w.id), "number": w.number, "kind": w.kind, "team": w.team, "category": w.category, "title": w.title,
        "description": w.description, "status": w.status, "priority": w.priority,
        "due_at": w.due_at.isoformat() if w.due_at else None, "overdue": overdue,
        "owner_id": str(w.owner_id) if w.owner_id else None, "owner_email": emails.get(w.owner_id),
        "created_by_email": w.created_by_email, "contact_id": str(w.contact_id) if w.contact_id else None,
        "contact_name": contact_name(c) if c else None, "rfi_id": str(w.rfi_id) if w.rfi_id else None,
        "submission_id": str(w.submission_id) if w.submission_id else None, "resolution": w.resolution,
        "created_at": w.created_at.isoformat() if w.created_at else None, "updated_at": w.updated_at.isoformat() if w.updated_at else None,
        "closed_at": w.closed_at.isoformat() if w.closed_at else None,
    }


# ───────────────────────── reference data ─────────────────────────


@router.get("/meta")
async def meta(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    q = select(User).order_by(User.email)
    if not user.is_admin:
        q = q.where(or_(User.id == user.id, User.org_id == user.org_id) if user.org_id else User.id == user.id)
    people = [{"id": str(u.id), "email": u.email} for u in (await db.execute(q)).scalars().all()]
    fields = (await db.execute(select(CustomFieldDef).order_by(CustomFieldDef.position, CustomFieldDef.label))).scalars().all()
    courses = (await db.execute(select(Course).order_by(Course.status, Course.name))).scalars().all()
    return {
        **as_dict(),
        "people": people,
        "me": {"id": str(user.id), "email": user.email, "is_admin": user.is_admin, "is_rfi_user": user.is_rfi_user,
                "is_call_center_user": user.is_call_center_user, "rfi_only": is_rfi_only(user)},
        "custom_fields": [_field_out(f) for f in fields],
        "courses": [_course_out(c) for c in courses],
    }


# ───────────────────────── contacts ─────────────────────────


class ContactIn(BaseModel):
    first_name: str = Field("", max_length=120)
    last_name: str = Field("", max_length=120)
    email: str | None = None
    phone: str | None = None
    emails: list[str] = []
    phones: list[str] = []
    r_number: str | None = None
    date_of_birth: date | None = None
    preferred_language: str | None = None
    organization_name: str | None = None
    job_title: str | None = None
    address: dict[str, Any] = {}
    contact_type: str = "prospect"
    lifecycle: str = "lead"
    source: str | None = "call_center"
    owner_id: UUID | None = None
    do_not_contact: bool = False
    consent_email: bool = False
    consent_sms: bool = False
    consent_call: bool = True
    description: str = ""
    custom: dict[str, Any] = {}
    force: bool = False


class ContactPatch(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    emails: list[str] | None = None
    phones: list[str] | None = None
    r_number: str | None = None
    date_of_birth: date | None = None
    preferred_language: str | None = None
    organization_name: str | None = None
    job_title: str | None = None
    address: dict[str, Any] | None = None
    contact_type: str | None = None
    lifecycle: str | None = None
    source: str | None = None
    owner_id: UUID | None = None
    clear_owner: bool = False
    do_not_contact: bool | None = None
    consent_email: bool | None = None
    consent_sms: bool | None = None
    consent_call: bool | None = None
    description: str | None = None
    custom: dict[str, Any] | None = None


def _clean_contact(d: dict) -> dict:
    if d.get("email") is not None:
        e = d["email"].strip()
        if e and not norm_email(e):
            raise HTTPException(status_code=400, detail="Enter a valid email address")
        d["email"] = norm_email(e) or None
    if d.get("phone") is not None:
        p = d["phone"].strip()
        if p and not norm_phone(p):
            raise HTTPException(status_code=400, detail="Enter a valid phone number (7-15 digits)")
        d["phone"] = p or None
    if d.get("r_number"):
        r = d["r_number"].strip().upper()
        if not re.fullmatch(r"R\d{8}", r):
            raise HTTPException(status_code=400, detail="R-numbers look like R12345678")
        d["r_number"] = r
    for k in ("emails", "phones"):
        if d.get(k) is not None:
            d[k] = [x.strip() for x in d[k] if x and x.strip()][:10]
    _check(d.get("contact_type"), CONTACT_TYPES, "contact type")
    _check(d.get("lifecycle"), LIFECYCLE, "lifecycle stage")
    return d


@router.get("/contacts")
async def list_contacts(
    q: str = "", journey: str = "", lifecycle: str = "", contact_type: str = "", owner: str = "", dnc: str = "",
    limit: int = 50, offset: int = 0, user: User = Depends(require_user), db: AsyncSession = Depends(get_db),
):
    """Search everyone by name, email, phone, R-number or organisation, with optional filters."""
    query = select(Contact).where(_contact_scope(user))
    q = q.strip()
    if q:
        digits = re.sub(r"\D", "", q)
        conds = [
            func.concat(Contact.first_name, " ", Contact.last_name).ilike(f"%{q}%"),
            func.concat(Contact.last_name, " ", Contact.first_name).ilike(f"%{q}%"),
            Contact.organization_name.ilike(f"%{q}%"),
            func.upper(Contact.r_number) == q.upper(),
        ]
        pts = select(ContactPoint.contact_id).where(ContactPoint.kind == "email", ContactPoint.normalized.ilike(f"%{q.lower()}%"))
        conds.append(Contact.id.in_(pts))
        if len(digits) >= 4:
            conds.append(Contact.id.in_(select(ContactPoint.contact_id).where(ContactPoint.kind == "phone", ContactPoint.normalized.like(f"%{digits[-10:]}%"))))
        query = query.where(or_(*conds))
    if lifecycle:
        query = query.where(Contact.lifecycle == lifecycle)
    if contact_type:
        query = query.where(Contact.contact_type == contact_type)
    if owner == "me":
        query = query.where(Contact.owner_id == user.id)
    elif owner == "none":
        query = query.where(Contact.owner_id.is_(None))
    if dnc == "yes":
        query = query.where(Contact.do_not_contact.is_(True))
    query = query.order_by(Contact.updated_at.desc())

    limit = min(max(limit, 1), 200)
    if journey:
        rows = (await db.execute(query.limit(3000))).scalars().all()
        js = await journeys(db, rows)
        rows = [r for r in rows if js.get(r.id) == journey]
        total = len(rows)
        rows = rows[offset: offset + limit]
    else:
        total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await db.execute(query.limit(limit).offset(max(offset, 0)))).scalars().all()
        js = await journeys(db, rows)
    emails = await _users(db, [r.owner_id for r in rows])
    last = dict((await db.execute(
        select(Interaction.contact_id, func.max(Interaction.occurred_at)).where(Interaction.contact_id.in_([r.id for r in rows])).group_by(Interaction.contact_id)
    )).all()) if rows else {}
    out = []
    for r in rows:
        d = contact_out(r, js.get(r.id), emails.get(r.owner_id))
        d["last_activity_at"] = last[r.id].isoformat() if r.id in last else None
        out.append(d)
    return {"total": total, "rows": out}


@router.post("/contacts", status_code=201)
async def create_contact(body: ContactIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    d = _clean_contact(body.model_dump(exclude={"force"}))
    if not (d["first_name"].strip() or d["last_name"].strip() or d["email"] or d["phone"]):
        raise HTTPException(status_code=400, detail="Enter at least a name, email or phone")
    if not body.force:
        dup = await find_contact(db, user.org_id, d["email"], d["phone"], d["r_number"])
        if dup and (await db.execute(select(Contact.id).where(Contact.id == dup.id, _contact_scope(user)))).first():
            raise HTTPException(status_code=409, detail={"message": "This person may already exist", "contact": contact_out(dup)})
    if d.get("owner_id"):
        await _assignable(db, user, d["owner_id"])
    c = Contact(**d, org_id=user.org_id, created_by_id=user.id)
    db.add(c)
    await db.flush()
    await sync_points(db, c)
    add_event(db, c.id, "created", user.email, {"source": d.get("source")})
    record(db, user, "contact_created", "contact", c.id, contact_name(c))
    await db.commit()
    return contact_out(c, "new")


@router.patch("/contacts/{cid}")
async def update_contact(cid: UUID, body: ContactPatch, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    c = await _get_contact(db, user, cid)
    d = _clean_contact(body.model_dump(exclude_unset=True, exclude={"clear_owner"}))
    changes: dict = {}
    if body.clear_owner:
        d["owner_id"] = None
    elif d.get("owner_id"):
        await _assignable(db, user, d["owner_id"])
    for k, v in d.items():
        old = getattr(c, k)
        if old != v:
            changes[k] = {"from": str(old) if old is not None else None, "to": str(v) if v is not None else None}
            setattr(c, k, v)
    if "do_not_contact" in changes and c.do_not_contact:
        c.consent_sms = False
        c.consent_email = False
        c.consent_call = False
    if changes:
        consent_keys = {"do_not_contact", "consent_email", "consent_sms", "consent_call"}
        if consent_keys & changes.keys():
            add_event(db, c.id, "consent", user.email, {k: changes[k] for k in consent_keys & changes.keys()})
        other = {k: v for k, v in changes.items() if k not in consent_keys and k != "custom"}
        if other or "custom" in changes:
            add_event(db, c.id, "updated", user.email, {"fields": sorted([*other.keys(), *(["custom fields"] if "custom" in changes else [])])})
        await sync_points(db, c)
        record(db, user, "contact_updated", "contact", c.id, contact_name(c), {"fields": sorted(changes)})
    await db.commit()
    await db.refresh(c)
    js = await journeys(db, [c])
    return contact_out(c, js.get(c.id), (await _users(db, [c.owner_id])).get(c.owner_id))


@router.delete("/contacts/{cid}", status_code=204)
async def delete_contact(cid: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete contacts")
    c = await _get_contact(db, user, cid)
    record(db, user, "contact_deleted", "contact", c.id, contact_name(c))
    await db.delete(c)
    await db.commit()


@router.get("/contacts/{cid}")
async def contact_360(cid: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    """Everything about one person: details, journey, interests, work, RFIs and the full timeline."""
    c = await _get_contact(db, user, cid)
    js = await journeys(db, [c])

    interactions = (await db.execute(select(Interaction).where(Interaction.contact_id == c.id).order_by(Interaction.occurred_at.desc()).limit(500))).scalars().all()
    strip = is_rfi_only(user)  # RFI users see that a call happened and its outcome, not the notes
    work_q = select(WorkItem).where(WorkItem.contact_id == c.id)
    if strip:
        work_q = work_q.where(_work_visible(user))
    work = (await db.execute(work_q.order_by(WorkItem.created_at.desc()))).scalars().all()
    interests = (await db.execute(select(Interest, Course).join(Course, Course.id == Interest.course_id).where(Interest.contact_id == c.id).order_by(Course.name))).all()
    rels = (await db.execute(select(ContactRelation, Contact).join(Contact, Contact.id == ContactRelation.related_id).where(ContactRelation.contact_id == c.id))).all()
    events = (await db.execute(select(ContactEvent).where(ContactEvent.contact_id == c.id).order_by(ContactEvent.created_at.desc()).limit(300))).scalars().all()
    subs = (await db.execute(select(RFISubmission, RFI).join(RFI, RFI.id == RFISubmission.rfi_id).where(RFISubmission.contact_id == c.id).order_by(RFISubmission.created_at.desc()))).all()
    invs = (await db.execute(select(RFIInvitation, RFI).join(RFI, RFI.id == RFIInvitation.rfi_id).where(RFIInvitation.contact_id == c.id).order_by(RFIInvitation.created_at.desc()))).all()
    visible_rfis = set((await db.execute(
        select(RFI.id).outerjoin(Workspace, RFI.workspace_id == Workspace.id).where(rfi_visible_clause(user), RFI.id.in_([r.id for _, r in subs] or [None]))
    )).scalars().all())
    emails = await _users(db, [c.owner_id, *[w.owner_id for w in work]])
    courses = {co.id: co.name for _, co in interests}
    all_courses = {co.id: co.name for co in (await db.execute(select(Course))).scalars().all()}

    timeline: list[dict] = []
    for i in interactions:
        timeline.append({"at": i.occurred_at.isoformat(), "kind": "interaction", "actor": i.agent_email, "data": {
            "id": str(i.id), "channel": i.channel, "direction": i.direction, "outcome": i.outcome,
            "reason": None if strip else i.reason, "subject": "" if strip else i.subject, "notes": "" if strip else i.notes,
            "duration_minutes": None if strip else i.duration_minutes, "course": None if strip else all_courses.get(i.course_id)}})
    for w in work:
        timeline.append({"at": w.created_at.isoformat(), "kind": "work_created", "actor": w.created_by_email,
                         "data": {"id": str(w.id), "number": w.number, "kind": w.kind, "team": w.team, "title": w.title, "category": w.category}})
        if w.closed_at:
            timeline.append({"at": w.closed_at.isoformat(), "kind": "work_closed", "actor": emails.get(w.owner_id),
                             "data": {"id": str(w.id), "number": w.number, "kind": w.kind, "title": w.title, "status": w.status, "resolution": w.resolution}})
    for s, r in subs:
        timeline.append({"at": s.created_at.isoformat(), "kind": "rfi_submitted", "actor": s.submitted_by_email,
                         "data": {"submission_id": str(s.id), "rfi_id": str(r.id), "rfi": r.subject, "can_view": r.id in visible_rfis}})
    for inv, r in invs:
        timeline.append({"at": inv.created_at.isoformat(), "kind": "rfi_invited", "actor": inv.sent_by_email, "data": {"rfi": r.subject, "channel": inv.channel}})
        if inv.opened_at and (not inv.submitted_at or inv.opened_at < inv.submitted_at):
            timeline.append({"at": inv.opened_at.isoformat(), "kind": "rfi_opened", "actor": None, "data": {"rfi": r.subject, "count": inv.open_count}})
    for e in events:
        timeline.append({"at": e.created_at.isoformat(), "kind": "event", "actor": e.actor_email, "data": {"type": e.kind, **(e.data or {})}})
    timeline.sort(key=lambda x: x["at"], reverse=True)

    calls = [i for i in interactions if i.channel in ("call", "voicemail")]
    last_touch = max((i.occurred_at for i in interactions if i.direction != "internal" and i.channel != "note"), default=None)
    return {
        "contact": contact_out(c, js.get(c.id), emails.get(c.owner_id)),
        "stats": {
            "calls": len(calls), "interactions": len(interactions), "rfis_submitted": len(subs), "rfis_sent": len(invs),
            "open_work": sum(1 for w in work if w.status in OPEN_STATUSES),
            "last_contacted_at": last_touch.isoformat() if last_touch else None,
        },
        "interests": [{"id": str(it.id), "course_id": str(co.id), "course": co.name, "course_status": co.status, "stage": it.stage,
                       "source": it.source, "lost_reason": it.lost_reason, "updated_at": it.updated_at.isoformat() if it.updated_at else None}
                      for it, co in interests],
        "relations": [{"id": str(rel.id), "relation": rel.relation, "contact": {"id": str(o.id), "name": contact_name(o), "phone": o.phone, "email": o.email}}
                      for rel, o in rels],
        "work_items": [work_out(w, emails) for w in work],
        "submissions": [{"id": str(s.id), "rfi_id": str(r.id), "rfi": r.subject, "created_at": s.created_at.isoformat(), "status": s.status,
                         "data": s.data if r.id in visible_rfis else None, "can_view": r.id in visible_rfis} for s, r in subs],
        "invitations": [{"id": str(inv.id), "rfi_id": str(r.id), "rfi": r.subject, "token": inv.token, "publish_key": r.publish_key,
                         "is_published": r.is_published, "channel": inv.channel, "sent_by": inv.sent_by_email,
                         "created_at": inv.created_at.isoformat(), "opened_at": inv.opened_at.isoformat() if inv.opened_at else None,
                         "open_count": inv.open_count, "submitted_at": inv.submitted_at.isoformat() if inv.submitted_at else None} for inv, r in invs],
        "timeline": timeline,
    }


@router.get("/contacts/{cid}/summary")
async def contact_summary(cid: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    """Small card used on RFI responses: who this is and what the Call Center has done."""
    c = await _get_contact(db, user, cid)
    js = await journeys(db, [c])
    last = (await db.execute(select(Interaction).where(Interaction.contact_id == c.id).order_by(Interaction.occurred_at.desc()).limit(1))).scalar_one_or_none()
    calls = (await db.execute(select(func.count(Interaction.id)).where(Interaction.contact_id == c.id, Interaction.channel.in_(("call", "voicemail"))))).scalar_one()
    open_work = (await db.execute(select(func.count(WorkItem.id)).where(WorkItem.contact_id == c.id, WorkItem.status.in_(OPEN_STATUSES), _work_visible(user)))).scalar_one()
    return {
        "contact": contact_out(c, js.get(c.id)), "calls": calls, "open_work": open_work,
        "last_interaction": {"at": last.occurred_at.isoformat(), "channel": last.channel, "outcome": last.outcome, "agent": last.agent_email} if last else None,
    }


class MergeIn(BaseModel):
    source_id: UUID


@router.post("/contacts/{cid}/merge")
async def merge_contacts(cid: UUID, body: MergeIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    """Merge a duplicate (source) into this contact (target). History moves; the duplicate is removed."""
    target = await _get_contact(db, user, cid)
    source = await _get_contact(db, user, body.source_id)
    if target.id == source.id:
        raise HTTPException(status_code=400, detail="Pick a different contact to merge")
    for k in ("first_name", "last_name", "email", "phone", "r_number", "date_of_birth", "preferred_language", "organization_name", "job_title", "owner_id", "source"):
        if not getattr(target, k) and getattr(source, k):
            setattr(target, k, getattr(source, k))
    target.emails = list(dict.fromkeys([*(target.emails or []), *(source.emails or []), *([source.email] if source.email and source.email != target.email else [])]))
    target.phones = list(dict.fromkeys([*(target.phones or []), *(source.phones or []), *([source.phone] if source.phone and source.phone != target.phone else [])]))
    target.custom = {**(source.custom or {}), **(target.custom or {})}
    target.address = target.address or source.address
    target.description = "\n\n".join(x for x in (target.description, source.description) if x)
    target.do_not_contact = target.do_not_contact or source.do_not_contact
    if target.do_not_contact:
        target.consent_sms = target.consent_email = target.consent_call = False

    for model in (Interaction, WorkItem, RFIInvitation, ContactEvent):
        await db.execute(update(model).where(model.contact_id == source.id).values(contact_id=target.id))
    await db.execute(update(RFISubmission).where(RFISubmission.contact_id == source.id).values(contact_id=target.id))
    have = set((await db.execute(select(Interest.course_id).where(Interest.contact_id == target.id))).scalars().all())
    await db.execute(delete(Interest).where(Interest.contact_id == source.id, Interest.course_id.in_(list(have) or [None])))
    await db.execute(update(Interest).where(Interest.contact_id == source.id).values(contact_id=target.id))
    await db.execute(delete(ContactRelation).where(or_(
        and_(ContactRelation.contact_id == source.id, ContactRelation.related_id == target.id),
        and_(ContactRelation.related_id == source.id, ContactRelation.contact_id == target.id))))
    await db.execute(update(ContactRelation).where(ContactRelation.contact_id == source.id).values(contact_id=target.id))
    await db.execute(update(ContactRelation).where(ContactRelation.related_id == source.id).values(related_id=target.id))
    add_event(db, target.id, "merged", user.email, {"merged": contact_name(source)})
    record(db, user, "contact_merged", "contact", target.id, contact_name(target), {"merged": contact_name(source), "merged_id": str(source.id)})
    await db.delete(source)
    await db.flush()
    await sync_points(db, target)
    await db.commit()
    return {"ok": True, "id": str(target.id)}


# ───────────────────────── relationships ─────────────────────────


class RelationIn(BaseModel):
    related_id: UUID
    relation: str


@router.post("/contacts/{cid}/relations", status_code=201)
async def add_relation(cid: UUID, body: RelationIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    _check(body.relation, RELATIONS, "relationship")
    a = await _get_contact(db, user, cid)
    b = await _get_contact(db, user, body.related_id)
    if a.id == b.id:
        raise HTTPException(status_code=400, detail="A person cannot be related to themselves")
    exists = (await db.execute(select(ContactRelation).where(ContactRelation.contact_id == a.id, ContactRelation.related_id == b.id))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="These people are already linked")
    db.add(ContactRelation(contact_id=a.id, related_id=b.id, relation=body.relation))
    db.add(ContactRelation(contact_id=b.id, related_id=a.id, relation=INVERSE_RELATION.get(body.relation, "other")))
    add_event(db, a.id, "relation", user.email, {"relation": body.relation, "with": contact_name(b)})
    add_event(db, b.id, "relation", user.email, {"relation": INVERSE_RELATION.get(body.relation, "other"), "with": contact_name(a)})
    await db.commit()
    return {"ok": True}


@router.delete("/relations/{rid}", status_code=204)
async def remove_relation(rid: UUID, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    rel = (await db.execute(select(ContactRelation).where(ContactRelation.id == rid))).scalar_one_or_none()
    if not rel:
        raise HTTPException(status_code=404, detail="Not found")
    await _get_contact(db, user, rel.contact_id)
    await db.execute(delete(ContactRelation).where(or_(
        ContactRelation.id == rid, and_(ContactRelation.contact_id == rel.related_id, ContactRelation.related_id == rel.contact_id))))
    await db.commit()


# ───────────────────────── interactions ─────────────────────────


class InteractionIn(BaseModel):
    channel: str = "call"
    direction: str = "inbound"
    outcome: str | None = None
    reason: str | None = None
    course_id: UUID | None = None
    subject: str = Field("", max_length=255)
    notes: str = Field("", max_length=20000)
    duration_minutes: int | None = Field(None, ge=0, le=1440)
    occurred_at: datetime | None = None
    on_behalf_of_id: UUID | None = None
    external_ref: str | None = None
    # quick follow-ups created in the same step
    callback_at: datetime | None = None
    mark_do_not_contact: bool = False


@router.post("/contacts/{cid}/interactions", status_code=201)
async def log_interaction(cid: UUID, body: InteractionIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    c = await _get_contact(db, user, cid)
    _check(body.channel, CHANNELS, "channel")
    _check(body.direction, DIRECTIONS, "direction")
    _check(body.outcome, OUTCOMES, "outcome")
    _check(body.reason, REASONS, "reason")
    if body.direction == "outbound" and c.do_not_contact and body.channel != "note":
        raise HTTPException(status_code=409, detail="This person asked not to be contacted. Outbound contact is blocked.")
    if body.on_behalf_of_id:
        await _get_contact(db, user, body.on_behalf_of_id)
    when = body.occurred_at or now()
    i = Interaction(
        contact_id=c.id, channel=body.channel, direction="internal" if body.channel == "note" else body.direction,
        outcome=body.outcome, reason=body.reason, course_id=body.course_id, subject=body.subject.strip(), notes=body.notes.strip(),
        duration_minutes=body.duration_minutes, occurred_at=when, on_behalf_of_id=body.on_behalf_of_id, external_ref=body.external_ref,
        agent_id=user.id, agent_email=user.email,
    )
    db.add(i)
    if body.on_behalf_of_id:  # also show the call on the student's record
        db.add(Interaction(
            contact_id=body.on_behalf_of_id, channel=body.channel, direction=i.direction, outcome=body.outcome, reason=body.reason,
            course_id=body.course_id, subject=f"Via {contact_name(c)}: {body.subject}".strip(), notes=body.notes.strip(),
            duration_minutes=body.duration_minutes, occurred_at=when, on_behalf_of_id=c.id, agent_id=user.id, agent_email=user.email,
        ))
    if body.course_id:
        exists = (await db.execute(select(Interest).where(Interest.contact_id == c.id, Interest.course_id == body.course_id))).scalar_one_or_none()
        course = (await db.execute(select(Course).where(Course.id == body.course_id))).scalar_one_or_none()
        if course and not exists:
            stage = "waitlist" if course.status == "coming_soon" else "inquiry"
            db.add(Interest(contact_id=c.id, course_id=course.id, stage=stage, source="call"))
            add_event(db, c.id, "interest_added", user.email, {"course": course.name, "stage": stage, "via": "call"})
    if body.callback_at:
        db.add(WorkItem(number=await next_work_number(db), org_id=c.org_id, contact_id=c.id, kind="callback", team="call_center",
                        title=f"Call back {contact_name(c)}", description=body.subject or body.notes[:500], due_at=body.callback_at,
                        owner_id=user.id, created_by_id=user.id, created_by_email=user.email, status="open", priority="normal"))
    if body.mark_do_not_contact or body.outcome == "do_not_contact":
        if not c.do_not_contact:
            c.do_not_contact = True
            c.consent_sms = c.consent_email = c.consent_call = False
            add_event(db, c.id, "consent", user.email, {"do_not_contact": {"from": "False", "to": "True"}})
    if c.owner_id is None:
        c.owner_id = user.id  # first agent to work a person becomes the owner
    c.updated_at = now()
    await db.commit()
    return {"ok": True, "id": str(i.id)}


@router.delete("/interactions/{iid}", status_code=204)
async def delete_interaction(iid: UUID, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    i = (await db.execute(select(Interaction).where(Interaction.id == iid))).scalar_one_or_none()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    await _get_contact(db, user, i.contact_id)
    if i.agent_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the person who logged it (or an admin) can delete it")
    await db.delete(i)
    await db.commit()


# ───────────────────────── course interests ─────────────────────────


class InterestIn(BaseModel):
    course_id: UUID
    stage: str = "inquiry"


class InterestPatch(BaseModel):
    stage: str | None = None
    lost_reason: str | None = None


LIFECYCLE_FOR_STAGE = {"interested": "prospect", "applied": "applicant", "enrolled": "student"}
LIFECYCLE_RANK = ["lead", "prospect", "applicant", "student", "alumni"]


def _bump_lifecycle(c: Contact, stage: str) -> None:
    target = LIFECYCLE_FOR_STAGE.get(stage)
    if target and c.lifecycle in LIFECYCLE_RANK and LIFECYCLE_RANK.index(target) > LIFECYCLE_RANK.index(c.lifecycle):
        c.lifecycle = target


@router.post("/contacts/{cid}/interests", status_code=201)
async def add_interest(cid: UUID, body: InterestIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    _check(body.stage, INTEREST_STAGES, "stage")
    c = await _get_contact(db, user, cid)
    course = (await db.execute(select(Course).where(Course.id == body.course_id))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if (await db.execute(select(Interest).where(Interest.contact_id == c.id, Interest.course_id == course.id))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This person already has an interest in that course")
    stage = "waitlist" if course.status == "coming_soon" and body.stage == "inquiry" else body.stage
    db.add(Interest(contact_id=c.id, course_id=course.id, stage=stage, source="manual"))
    _bump_lifecycle(c, stage)
    add_event(db, c.id, "interest_added", user.email, {"course": course.name, "stage": stage})
    await db.commit()
    return {"ok": True}


@router.patch("/interests/{iid}")
async def update_interest(iid: UUID, body: InterestPatch, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    it = (await db.execute(select(Interest).where(Interest.id == iid))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Not found")
    c = await _get_contact(db, user, it.contact_id)
    course = (await db.execute(select(Course).where(Course.id == it.course_id))).scalar_one()
    if body.stage and body.stage != it.stage:
        _check(body.stage, INTEREST_STAGES, "stage")
        if body.stage == "lost" and not (body.lost_reason or it.lost_reason):
            raise HTTPException(status_code=400, detail="Pick a reason when marking Lost")
        add_event(db, c.id, "stage", user.email, {"course": course.name, "from": it.stage, "to": body.stage, "reason": body.lost_reason})
        it.stage = body.stage
        _bump_lifecycle(c, body.stage)
    if body.lost_reason is not None:
        _check(body.lost_reason or None, LOST_REASONS, "lost reason")
        it.lost_reason = body.lost_reason or None
    await db.commit()
    return {"ok": True}


@router.delete("/interests/{iid}", status_code=204)
async def delete_interest(iid: UUID, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    it = (await db.execute(select(Interest).where(Interest.id == iid))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Not found")
    await _get_contact(db, user, it.contact_id)
    await db.delete(it)
    await db.commit()


# ───────────────────────── personal RFI links ─────────────────────────


class InviteIn(BaseModel):
    rfi_id: UUID
    channel: str = "link"


@router.get("/rfis")
async def sendable_rfis(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    """Published forms this user can send to a contact."""
    rows = (await db.execute(
        select(RFI).outerjoin(Workspace, RFI.workspace_id == Workspace.id)
        .where(rfi_visible_clause(user), RFI.is_published.is_(True)).order_by(RFI.subject)
    )).scalars().all()
    return [{"id": str(r.id), "subject": r.subject, "publish_key": r.publish_key} for r in rows]


@router.post("/contacts/{cid}/invitations", status_code=201)
async def create_invitation(cid: UUID, body: InviteIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    c = await _get_contact(db, user, cid)
    if c.do_not_contact:
        raise HTTPException(status_code=409, detail="This person asked not to be contacted.")
    if body.channel not in ("link", "email", "sms"):
        raise HTTPException(status_code=400, detail="Unknown channel")
    if body.channel == "sms" and not c.consent_sms:
        raise HTTPException(status_code=409, detail="This person has not agreed to receive text messages.")
    rfi = await get_accessible_rfi(db, user, body.rfi_id)
    if not rfi.is_published or not rfi.publish_key:
        raise HTTPException(status_code=400, detail="Publish the form before sending it")
    inv = RFIInvitation(rfi_id=rfi.id, contact_id=c.id, channel=body.channel, sent_by_email=user.email)
    db.add(inv)
    await db.flush()
    record(db, user, "rfi_invitation_created", "contact", c.id, contact_name(c), {"rfi": rfi.subject})
    await db.commit()
    return {"id": str(inv.id), "token": inv.token, "path": f"/rfi/public/{rfi.publish_key}?i={inv.token}"}


# ───────────────────────── work items (tasks, callbacks, cases, handoffs) ─────────────────────────


class WorkIn(BaseModel):
    kind: str = "task"
    team: str = "call_center"
    category: str | None = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field("", max_length=20000)
    priority: str = "normal"
    due_at: datetime | None = None
    owner_id: UUID | None = None
    contact_id: UUID | None = None
    rfi_id: UUID | None = None
    submission_id: UUID | None = None
    share_response: bool = False


class WorkPatch(BaseModel):
    status: str | None = None
    owner_id: UUID | None = None
    claim: bool = False
    unassign: bool = False
    team: str | None = None
    priority: str | None = None
    due_at: datetime | None = None
    clear_due: bool = False
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    resolution: str | None = None
    category: str | None = None


def _check_category(kind: str, category: str | None):
    if not category:
        return
    if kind == "case":
        _check(category, CASE_CATEGORIES, "case category")
    elif kind == "handoff":
        _check(category, HANDOFF_REASONS, "handoff reason")


@router.get("/work")
async def list_work(
    view: str = "mine", team: str = "", status: str = "open", kind: str = "", contact_id: UUID | None = None, q: str = "",
    limit: int = 200, user: User = Depends(require_user), db: AsyncSession = Depends(get_db),
):
    """view = mine | queue (unassigned) | team (everything for a team) | created (things I sent) | all"""
    query = select(WorkItem).where(_work_visible(user))
    if view == "mine":
        query = query.where(WorkItem.owner_id == user.id)
    elif view == "queue":
        query = query.where(WorkItem.owner_id.is_(None))
    elif view == "created":
        query = query.where(WorkItem.created_by_id == user.id)
    if team:
        query = query.where(WorkItem.team == team)
    if status == "open":
        query = query.where(WorkItem.status.in_(OPEN_STATUSES))
    elif status == "closed":
        query = query.where(WorkItem.status.in_(("done", "cancelled")))
    elif status == "overdue":
        query = query.where(WorkItem.status.in_(OPEN_STATUSES), WorkItem.due_at < now())
    elif status:
        query = query.where(WorkItem.status == status)
    if kind:
        query = query.where(WorkItem.kind == kind)
    if contact_id:
        query = query.where(WorkItem.contact_id == contact_id)
    if q.strip():
        like = f"%{q.strip()}%"
        num = int(q.strip().lstrip("#")) if q.strip().lstrip("#").isdigit() else -1
        query = query.where(or_(WorkItem.title.ilike(like), WorkItem.description.ilike(like), WorkItem.number == num))
    rows = (await db.execute(query.order_by(WorkItem.due_at.asc().nulls_last(), WorkItem.created_at.desc()).limit(min(max(limit, 1), 500)))).scalars().all()
    emails = await _users(db, [w.owner_id for w in rows])
    contacts = {c.id: c for c in (await db.execute(select(Contact).where(Contact.id.in_([w.contact_id for w in rows if w.contact_id] or [None])))).scalars().all()}
    prio = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
    out = [work_out(w, emails, contacts) for w in rows]
    out.sort(key=lambda x: (not x["overdue"], prio.get(x["priority"], 2), x["due_at"] or "9999"))
    return out


@router.post("/work", status_code=201)
async def create_work(body: WorkIn, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    _check(body.kind, WORK_KINDS, "type")
    _check(body.team, TEAMS, "team")
    _check(body.priority, PRIORITIES, "priority")
    _check_category(body.kind, body.category)
    org_id = user.org_id
    contact = None
    shared = None
    if body.contact_id:
        contact = await _get_contact(db, user, body.contact_id)
        org_id = contact.org_id if contact.org_id is not None else org_id
    if body.rfi_id:
        await get_accessible_rfi(db, user, body.rfi_id)
    if body.submission_id:
        sub = (await db.execute(select(RFISubmission).where(RFISubmission.id == body.submission_id))).scalar_one_or_none()
        if not sub:
            raise HTTPException(status_code=404, detail="Response not found")
        await get_accessible_rfi(db, user, sub.rfi_id)
        if not body.rfi_id:
            body.rfi_id = sub.rfi_id
        if not contact and sub.contact_id:
            contact = (await db.execute(select(Contact).where(Contact.id == sub.contact_id))).scalar_one_or_none()
        if body.share_response:
            rfi_row = (await db.execute(select(RFI).where(RFI.id == sub.rfi_id))).scalar_one()
            shared = response_qa(rfi_row.content, sub.data or {})
    owner = await _assignable(db, user, body.owner_id)
    due = body.due_at
    if due is None and body.kind in ("case", "handoff"):
        due = now() + {"urgent": timedelta(hours=4), "high": timedelta(days=1)}.get(body.priority, timedelta(days=2))
    w = WorkItem(
        number=await next_work_number(db), org_id=org_id, contact_id=contact.id if contact else None, kind=body.kind, team=body.team,
        category=body.category, title=body.title.strip(), description=body.description.strip(), priority=body.priority, due_at=due,
        owner_id=owner.id if owner else None, created_by_id=user.id, created_by_email=user.email, rfi_id=body.rfi_id,
        submission_id=body.submission_id, status="open", shared_response=shared,
    )
    db.add(w)
    await db.flush()
    db.add(WorkItemComment(work_item_id=w.id, author_email=user.email, kind="system",
                           text=f"Created ({body.kind}) for {dict((t['value'], t['label']) for t in TEAMS)[body.team]}" + (f", assigned to {owner.email}" if owner else ", waiting in the queue")))
    record(db, user, "work_created", "work_item", w.id, f"#{w.number} {w.title}", {"kind": w.kind, "team": w.team})
    await db.commit()
    emails = await _users(db, [w.owner_id])
    return work_out(w, emails, {contact.id: contact} if contact else None)


async def _get_work(db: AsyncSession, user: User, wid: UUID) -> WorkItem:
    w = (await db.execute(select(WorkItem).where(WorkItem.id == wid, _work_visible(user)))).scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Item not found")
    return w


@router.get("/work/{wid}")
async def get_work(wid: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    w = await _get_work(db, user, wid)
    comments = (await db.execute(select(WorkItemComment).where(WorkItemComment.work_item_id == w.id).order_by(WorkItemComment.created_at))).scalars().all()
    contacts = {}
    if w.contact_id:
        c = (await db.execute(select(Contact).where(Contact.id == w.contact_id))).scalar_one_or_none()
        if c:
            contacts[c.id] = c
    rfi_subject = None
    if w.rfi_id:
        rfi_subject = (await db.execute(select(RFI.subject).where(RFI.id == w.rfi_id))).scalar_one_or_none()
    return {
        **work_out(w, await _users(db, [w.owner_id]), contacts), "rfi_subject": rfi_subject, "shared_response": w.shared_response,
        "comments": [{"id": str(x.id), "author_email": x.author_email, "kind": x.kind, "text": x.text, "created_at": x.created_at.isoformat()} for x in comments],
    }


@router.patch("/work/{wid}")
async def update_work(wid: UUID, body: WorkPatch, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    w = await _get_work(db, user, wid)
    notes: list[str] = []
    if body.claim:
        body.owner_id = user.id
    if body.unassign and w.owner_id:
        w.owner_id = None
        notes.append("Returned to the queue")
    elif body.owner_id and body.owner_id != w.owner_id:
        u = await _assignable(db, user, body.owner_id)
        w.owner_id = u.id
        notes.append(f"Picked up by {u.email}" if body.claim else f"Assigned to {u.email}")
        if w.status == "open":
            w.status = "in_progress"
    if body.team and body.team != w.team:
        _check(body.team, TEAMS, "team")
        notes.append(f"Moved to {dict((t['value'], t['label']) for t in TEAMS)[body.team]}")
        w.team = body.team
    if body.priority and body.priority != w.priority:
        _check(body.priority, PRIORITIES, "priority")
        notes.append(f"Priority {w.priority} → {body.priority}")
        w.priority = body.priority
    if body.clear_due and w.due_at:
        w.due_at = None
        notes.append("Due date cleared")
    elif body.due_at and body.due_at != w.due_at:
        w.due_at = body.due_at
        notes.append(f"Due {body.due_at.strftime('%b %d, %Y %H:%M')} UTC")
    if body.title is not None and body.title.strip() and body.title.strip() != w.title:
        w.title = body.title.strip()
    if body.description is not None:
        w.description = body.description
    if body.category is not None:
        _check_category(w.kind, body.category or None)
        w.category = body.category or None
    if body.resolution is not None:
        w.resolution = body.resolution
    if body.status and body.status != w.status:
        _check(body.status, WORK_STATUSES, "status")
        if body.status == "done" and w.kind == "case" and not (body.resolution or w.resolution).strip():
            raise HTTPException(status_code=400, detail="Describe the resolution before closing a case")
        notes.append(f"Status {w.status} → {body.status}")
        w.status = body.status
        w.closed_at = now() if body.status in ("done", "cancelled") else None
    for n in notes:
        db.add(WorkItemComment(work_item_id=w.id, author_email=user.email, kind="system", text=n))
    await db.commit()
    await db.refresh(w)
    c = (await db.execute(select(Contact).where(Contact.id == w.contact_id))).scalar_one_or_none() if w.contact_id else None
    return work_out(w, await _users(db, [w.owner_id]), {c.id: c} if c else None)


class CommentIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)


@router.post("/work/{wid}/comments", status_code=201)
async def comment_work(wid: UUID, body: CommentIn, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    w = await _get_work(db, user, wid)
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Write a comment first")
    db.add(WorkItemComment(work_item_id=w.id, author_email=user.email, kind="comment", text=body.text.strip()))
    w.updated_at = now()
    await db.commit()
    return {"ok": True}


# ───────────────────────── home & team board ─────────────────────────


@router.get("/home")
async def home(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    vis = _work_visible(user)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    mine_open = and_(vis, WorkItem.owner_id == user.id, WorkItem.status.in_(OPEN_STATUSES))
    count = lambda *w: select(func.count(WorkItem.id)).where(*w)  # noqa: E731
    stats = {
        "my_open": (await db.execute(count(mine_open))).scalar_one(),
        "my_overdue": (await db.execute(count(mine_open, WorkItem.due_at < now()))).scalar_one(),
        "my_due_today": (await db.execute(count(mine_open, WorkItem.due_at >= today_start, WorkItem.due_at < today_start + timedelta(days=1)))).scalar_one(),
        "queue_call_center": (await db.execute(count(vis, WorkItem.owner_id.is_(None), WorkItem.team == "call_center", WorkItem.status.in_(OPEN_STATUSES)))).scalar_one(),
        "queue_rfi": (await db.execute(count(vis, WorkItem.owner_id.is_(None), WorkItem.team == "rfi", WorkItem.status.in_(OPEN_STATUSES)))).scalar_one(),
        "my_calls_today": (await db.execute(select(func.count(Interaction.id)).where(Interaction.agent_id == user.id, Interaction.occurred_at >= today_start, Interaction.channel.in_(("call", "voicemail"))))).scalar_one(),
    }
    contacts = (await db.execute(select(Contact).where(_contact_scope(user)).order_by(Contact.updated_at.desc()).limit(3000))).scalars().all()
    js = await journeys(db, contacts)
    counts: dict[str, int] = {}
    for v in js.values():
        counts[v] = counts.get(v, 0) + 1
    stats["journey_counts"] = counts
    recent_ids = [cid for (cid,) in (await db.execute(
        select(Interaction.contact_id).where(Interaction.agent_id == user.id).group_by(Interaction.contact_id).order_by(func.max(Interaction.occurred_at).desc()).limit(8)
    )).all()]
    by_id = {c.id: c for c in contacts}
    recent = [contact_out(by_id[i], js.get(i)) for i in recent_ids if i in by_id]
    return {"stats": stats, "recent_contacts": recent}


@router.get("/team")
async def team_board(user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    """Who is working on what: open, overdue, due today and closed this week per person, plus queue depth per team."""
    q = select(User).order_by(User.email)
    if not user.is_admin:
        q = q.where(or_(User.id == user.id, User.org_id == user.org_id) if user.org_id else User.id == user.id)
    people = (await db.execute(q)).scalars().all()
    vis = _work_visible(user)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now() - timedelta(days=7)
    rows = []
    for p in people:
        base = and_(vis, WorkItem.owner_id == p.id)
        open_ = and_(base, WorkItem.status.in_(OPEN_STATUSES))
        rows.append({
            "id": str(p.id), "email": p.email,
            "open": (await db.execute(select(func.count(WorkItem.id)).where(open_))).scalar_one(),
            "in_progress": (await db.execute(select(func.count(WorkItem.id)).where(base, WorkItem.status == "in_progress"))).scalar_one(),
            "overdue": (await db.execute(select(func.count(WorkItem.id)).where(open_, WorkItem.due_at < now()))).scalar_one(),
            "closed_week": (await db.execute(select(func.count(WorkItem.id)).where(base, WorkItem.status == "done", WorkItem.closed_at >= week_ago))).scalar_one(),
            "calls_today": (await db.execute(select(func.count(Interaction.id)).where(Interaction.agent_id == p.id, Interaction.occurred_at >= today_start, Interaction.channel.in_(("call", "voicemail"))))).scalar_one(),
            "calls_week": (await db.execute(select(func.count(Interaction.id)).where(Interaction.agent_id == p.id, Interaction.occurred_at >= week_ago, Interaction.channel.in_(("call", "voicemail"))))).scalar_one(),
        })
    queues = []
    for t in TEAMS:
        unassigned = and_(vis, WorkItem.team == t["value"], WorkItem.owner_id.is_(None), WorkItem.status.in_(OPEN_STATUSES))
        oldest = (await db.execute(select(func.min(WorkItem.created_at)).where(unassigned))).scalar_one()
        queues.append({
            "team": t["value"], "label": t["label"],
            "unassigned": (await db.execute(select(func.count(WorkItem.id)).where(unassigned))).scalar_one(),
            "open": (await db.execute(select(func.count(WorkItem.id)).where(vis, WorkItem.team == t["value"], WorkItem.status.in_(OPEN_STATUSES)))).scalar_one(),
            "overdue": (await db.execute(select(func.count(WorkItem.id)).where(vis, WorkItem.team == t["value"], WorkItem.status.in_(OPEN_STATUSES), WorkItem.due_at < now()))).scalar_one(),
            "oldest_unassigned_at": oldest.isoformat() if oldest else None,
        })
    stalled = (await db.execute(
        select(WorkItem).where(vis, WorkItem.status.in_(OPEN_STATUSES), WorkItem.updated_at < now() - timedelta(days=3)).order_by(WorkItem.updated_at).limit(25)
    )).scalars().all()
    emails = await _users(db, [w.owner_id for w in stalled])
    return {"people": rows, "queues": queues, "stalled": [work_out(w, emails) for w in stalled]}


# ───────────────────────── course catalog ─────────────────────────


def _course_out(c: Course) -> dict:
    return {"id": str(c.id), "name": c.name, "code": c.code, "category": c.category, "status": c.status,
            "starts_on": c.starts_on.isoformat() if c.starts_on else None, "description": c.description, "url": c.url}


class CourseIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str | None = None
    category: str | None = None
    status: str = "available"
    starts_on: date | None = None
    description: str = ""
    url: str | None = None


@router.get("/courses")
async def list_courses(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Course).order_by(Course.name))).scalars().all()
    counts = {cid: (n, e, w) for cid, n, e, w in (await db.execute(
        select(Interest.course_id, func.count(Interest.id), func.count(Interest.id).filter(Interest.stage == "enrolled"),
               func.count(Interest.id).filter(Interest.stage == "waitlist")).group_by(Interest.course_id)
    )).all()}
    return [{**_course_out(c), "interested": counts.get(c.id, (0, 0, 0))[0], "enrolled": counts.get(c.id, (0, 0, 0))[1],
             "waitlist": counts.get(c.id, (0, 0, 0))[2]} for c in rows]


@router.post("/courses", status_code=201)
async def create_course(body: CourseIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    _check(body.status, COURSE_STATUSES, "course status")
    if (await db.execute(select(Course).where(func.lower(Course.name) == body.name.strip().lower()))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A course with that name already exists")
    c = Course(**{**body.model_dump(), "name": body.name.strip()})
    db.add(c)
    record(db, user, "course_created", "course", None, c.name)
    await db.commit()
    return _course_out(c)


@router.patch("/courses/{course_id}")
async def update_course(course_id: UUID, body: CourseIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    _check(body.status, COURSE_STATUSES, "course status")
    c = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    opened = c.status == "coming_soon" and body.status == "available"
    for k, v in body.model_dump().items():
        setattr(c, k, v.strip() if isinstance(v, str) and k == "name" else v)
    notified = 0
    if opened:
        # The course just opened: everyone on the waitlist gets a follow-up in the Call Center queue.
        waiting = (await db.execute(select(Interest, Contact).join(Contact, Contact.id == Interest.contact_id)
                                    .where(Interest.course_id == c.id, Interest.stage == "waitlist"))).all()
        for it, person in waiting:
            if person.do_not_contact:
                continue
            db.add(WorkItem(number=await next_work_number(db), org_id=person.org_id, contact_id=person.id, kind="task", team="call_center",
                            title=f"{c.name} is now open: let {contact_name(person)} know", priority="normal",
                            description="This person was on the waitlist. Contact them (respect their consent) and move the interest to Interested or Applied.",
                            due_at=now() + timedelta(days=2), created_by_id=user.id, created_by_email=user.email, status="open"))
            add_event(db, person.id, "course_opened", user.email, {"course": c.name})
            notified += 1
    record(db, user, "course_updated", "course", c.id, c.name, {"opened": opened, "waitlist_tasks": notified})
    await db.commit()
    return {**_course_out(c), "waitlist_tasks_created": notified}


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(course_id: UUID, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete courses. Mark it Closed instead.")
    c = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if c:
        record(db, user, "course_deleted", "course", c.id, c.name)
        await db.delete(c)
        await db.commit()


# ───────────────────────── custom fields ─────────────────────────


def _field_out(f: CustomFieldDef) -> dict:
    return {"id": str(f.id), "key": f.key, "label": f.label, "field_type": f.field_type, "options": f.options or [],
            "help_text": f.help_text, "position": f.position}


class FieldIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)
    field_type: str = "text"
    options: list[str] = []
    help_text: str = Field("", max_length=255)
    position: int = 0


@router.post("/custom-fields", status_code=201)
async def create_field(body: FieldIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    _check(body.field_type, CUSTOM_FIELD_TYPES, "field type")
    key = re.sub(r"[^a-z0-9]+", "_", body.label.lower()).strip("_")[:60] or "field"
    base, n = key, 2
    while (await db.execute(select(CustomFieldDef.id).where(CustomFieldDef.key == key))).first():
        key, n = f"{base}_{n}", n + 1
    opts = [o.strip() for o in body.options if o.strip()]
    if body.field_type == "select" and not opts:
        raise HTTPException(status_code=400, detail="Add at least one option for a pick list")
    f = CustomFieldDef(key=key, label=body.label.strip(), field_type=body.field_type, options=opts, help_text=body.help_text.strip(), position=body.position)
    db.add(f)
    record(db, user, "custom_field_created", "custom_field", None, f.label)
    await db.commit()
    return _field_out(f)


@router.patch("/custom-fields/{fid}")
async def update_field(fid: UUID, body: FieldIn, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    f = (await db.execute(select(CustomFieldDef).where(CustomFieldDef.id == fid))).scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Field not found")
    _check(body.field_type, CUSTOM_FIELD_TYPES, "field type")
    f.label, f.field_type, f.help_text, f.position = body.label.strip(), body.field_type, body.help_text.strip(), body.position
    f.options = [o.strip() for o in body.options if o.strip()]
    await db.commit()
    return _field_out(f)


@router.delete("/custom-fields/{fid}", status_code=204)
async def delete_field(fid: UUID, user: User = Depends(require_call_center_staff), db: AsyncSession = Depends(get_db)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete custom fields")
    f = (await db.execute(select(CustomFieldDef).where(CustomFieldDef.id == fid))).scalar_one_or_none()
    if f:
        record(db, user, "custom_field_deleted", "custom_field", f.id, f.label)
        await db.delete(f)
        await db.commit()
