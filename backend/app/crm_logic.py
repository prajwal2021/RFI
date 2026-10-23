"""Call Center logic shared by the CRM router and the public RFI endpoints."""
import re
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import and_, delete, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm_meta import JOURNEY
from app.crm_models import Contact, ContactEvent, ContactPoint, Course, Interaction, Interest, RFIInvitation
from app.models import RFI, RFISubmission, User

# ───────────────────────── normalisation ─────────────────────────

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def norm_email(v: str | None) -> str | None:
    if not v:
        return None
    v = str(v).strip().lower()
    return v if EMAIL_RE.match(v) else None


def norm_phone(v: str | None) -> str | None:
    if not v:
        return None
    d = re.sub(r"\D", "", str(v))
    if len(d) == 11 and d.startswith("1"):
        d = d[1:]
    return d if 7 <= len(d) <= 15 else None


def contact_name(c: Contact) -> str:
    n = f"{c.first_name} {c.last_name}".strip()
    return n or c.email or c.phone or "Unnamed contact"


async def sync_points(db: AsyncSession, c: Contact) -> None:
    """Rebuild the searchable email/phone index for a contact from its primary + extra values."""
    await db.execute(delete(ContactPoint).where(ContactPoint.contact_id == c.id))
    seen: set[tuple[str, str]] = set()
    for kind, values, fn in (("email", [c.email, *(c.emails or [])], norm_email), ("phone", [c.phone, *(c.phones or [])], norm_phone)):
        for v in values:
            n = fn(v)
            if n and (kind, n) not in seen:
                seen.add((kind, n))
                db.add(ContactPoint(contact_id=c.id, kind=kind, value=str(v).strip(), normalized=n))


# ───────────────────────── visibility ─────────────────────────


def contact_visible_clause(user: User):
    if user.is_admin:
        return Contact.id.is_not(None)
    clauses = [and_(Contact.org_id.is_(None), Contact.created_by_id == user.id)]
    if user.org_id is not None:
        clauses.append(Contact.org_id == user.org_id)
    return or_(*clauses)


async def find_contact(db: AsyncSession, org_id: UUID | None, email: str | None = None, phone: str | None = None,
                       r_number: str | None = None, exclude: UUID | None = None) -> Contact | None:
    """Find an existing person in the same organisation by R-number, email or phone (in that order)."""
    scope = Contact.org_id == org_id if org_id is not None else Contact.org_id.is_(None)
    if r_number:
        q = select(Contact).where(scope, func.upper(Contact.r_number) == r_number.upper())
        if exclude:
            q = q.where(Contact.id != exclude)
        hit = (await db.execute(q.limit(1))).scalar_one_or_none()
        if hit:
            return hit
    for kind, n in (("email", norm_email(email)), ("phone", norm_phone(phone))):
        if not n:
            continue
        q = select(Contact).join(ContactPoint, ContactPoint.contact_id == Contact.id).where(scope, ContactPoint.kind == kind, ContactPoint.normalized == n)
        if exclude:
            q = q.where(Contact.id != exclude)
        hit = (await db.execute(q.limit(1))).scalars().first()
        if hit:
            return hit
    return None


def add_event(db: AsyncSession, contact_id: UUID, kind: str, actor: str | None, data: dict | None = None) -> None:
    db.add(ContactEvent(contact_id=contact_id, kind=kind, actor_email=actor, data=data))


# ───────────────────────── reading identity from an RFI response ─────────────────────────

SMS_OPT_RE = re.compile(
    r"\bsms\b|\btexts?\b[\s_-]*(messag|alert|updat|notif|remind)|\btexting\b|\btext\s+me\b|\breceive\b.{0,40}\btext"
    r"|\bopt[\s_-]*in\b.{0,40}\btexts?\b|\b(agree|accept|consent|opt)\b.{0,30}\bmessag(e|es|ing)\b",
    re.I,
)
EMAIL_CONSENT_RE = re.compile(r"\b(agree|accept|consent|opt)\b.{0,40}\b(email|e-mail)s?\b|\bnewsletter\b", re.I)
NEGATIVE_RE = re.compile(r"^(no|n|false|0|off|unchecked|declined?|opt[\s_-]*out|not?\s+opted)\b", re.I)


def _truthy(v) -> bool:
    if v is True:
        return True
    if v in (False, None, ""):
        return False
    if isinstance(v, list):
        return len(v) > 0 and all(_truthy(x) for x in v)
    return not NEGATIVE_RE.match(str(v).strip())


def _survey_fields(content: dict | None) -> list[dict]:
    out: list[dict] = []
    sd = (content or {}).get("surveyDefinition")
    if not sd:
        return out

    def walk(els):
        for e in els or []:
            if e.get("type") == "panel":
                walk(e.get("elements"))
            elif e.get("name"):
                t = e.get("title")
                title = t if isinstance(t, str) else (t or {}).get("default") if isinstance(t, dict) else None
                out.append({"key": e["name"], "title": title or e["name"], "type": e.get("type"), "inputType": e.get("inputType")})

    for p in sd.get("pages", []) or []:
        walk(p.get("elements"))
    walk(sd.get("elements"))
    return out


def extract_identity(content: dict | None, data: dict, submitted_by_name: str | None, submitted_by_email: str | None) -> dict:
    fields = _survey_fields(content)
    if not fields:  # HTML forms store answers under their labels
        fields = [{"key": k, "title": k, "type": None, "inputType": None} for k in data.keys()]

    def val(f):
        return data.get(f["key"])

    def first(pred):
        for f in fields:
            v = val(f)
            if v not in (None, "", []) and pred(f, v):
                return v
        return None

    def label(f):
        return f"{f['title']} {f['key']}".lower()

    out: dict = {}
    out["email"] = submitted_by_email or first(lambda f, v: f.get("inputType") == "email" or ("email" in label(f) and isinstance(v, str) and "@" in v))
    out["phone"] = first(lambda f, v: f.get("inputType") == "tel" or (re.search(r"\b(tele)?phone\b|\bmobile\b|\bcell\b", label(f)) and isinstance(v, str)))
    out["first_name"] = first(lambda f, v: isinstance(v, str) and re.search(r"first[\s_-]*name|given", label(f)))
    out["last_name"] = first(lambda f, v: isinstance(v, str) and re.search(r"last[\s_-]*name|surname|family", label(f)))
    full = submitted_by_name or first(
        lambda f, v: isinstance(v, str)
        and (f["title"].strip().lower() in ("name", "full name", "your name", "fullname") or f["key"].lower() in ("name", "fullname", "full_name"))
    )
    if full and not (out["first_name"] or out["last_name"]):
        parts = str(full).strip().split()
        out["first_name"] = parts[0] if parts else ""
        out["last_name"] = " ".join(parts[1:])
    out["organization_name"] = first(lambda f, v: isinstance(v, str) and re.search(r"organi[sz]ation|company|employer|department", label(f)))
    out["r_number"] = first(lambda f, v: isinstance(v, str) and (re.search(r"\br[\s-]?number\b|student\s*id", label(f)) or re.fullmatch(r"[Rr]\d{8}", v.strip())))
    dob = first(lambda f, v: isinstance(v, str) and re.search(r"birth|\bdob\b", label(f)))
    try:
        out["date_of_birth"] = date.fromisoformat(str(dob)[:10]) if dob else None
    except ValueError:
        out["date_of_birth"] = None
    sms_fields = [f for f in fields if f.get("type") in (None, "boolean", "checkbox", "radiogroup") and SMS_OPT_RE.search(label(f))]
    out["consent_sms"] = any(_truthy(val(f)) for f in sms_fields)
    email_fields = [f for f in fields if f.get("type") in (None, "boolean", "checkbox", "radiogroup") and EMAIL_CONSENT_RE.search(label(f))]
    out["consent_email"] = any(_truthy(val(f)) for f in email_fields) or out["consent_sms"] and any("email" in label(f) for f in sms_fields)
    # every string answer, for matching course names
    answers: list[str] = []
    for f in fields:
        v = val(f)
        if isinstance(v, str):
            answers.append(v)
        elif isinstance(v, list):
            answers += [x for x in v if isinstance(x, str)]
    out["answers"] = answers
    for k in ("first_name", "last_name", "organization_name", "r_number", "phone", "email"):
        if isinstance(out.get(k), str):
            out[k] = out[k].strip()[:250]
    return out


async def link_submission(db: AsyncSession, sub: RFISubmission, rfi: RFI, invite_token: str | None = None) -> Contact | None:
    """Attach a response to a person: the invited contact, an existing match, or a new contact."""
    owner = (await db.execute(select(User).where(User.id == rfi.owner_id))).scalar_one_or_none() if rfi.owner_id else None
    org_id = owner.org_id if owner else None
    ident = extract_identity(rfi.content, sub.data or {}, sub.submitted_by_name, sub.submitted_by_email)

    contact = None
    inv = None
    if invite_token:
        inv = (await db.execute(select(RFIInvitation).where(RFIInvitation.token == invite_token, RFIInvitation.rfi_id == rfi.id))).scalar_one_or_none()
        if inv:
            contact = (await db.execute(select(Contact).where(Contact.id == inv.contact_id))).scalar_one_or_none()
    if contact is None:
        contact = await find_contact(db, org_id, ident.get("email"), ident.get("phone"), ident.get("r_number"))

    created = False
    if contact is None:
        if not (norm_email(ident.get("email")) or norm_phone(ident.get("phone")) or ident.get("first_name") or ident.get("last_name")):
            return None  # anonymous response with nothing to identify the person
        contact = Contact(
            org_id=org_id, first_name=ident.get("first_name") or "", last_name=ident.get("last_name") or "",
            email=norm_email(ident.get("email")), phone=ident.get("phone") if norm_phone(ident.get("phone")) else None,
            source="rfi", contact_type="prospect", lifecycle="lead", created_by_id=rfi.owner_id,
            consent_sms=bool(ident.get("consent_sms")), consent_email=bool(ident.get("consent_email")),
            organization_name=ident.get("organization_name"), r_number=ident.get("r_number"), date_of_birth=ident.get("date_of_birth"),
        )
        db.add(contact)
        await db.flush()
        add_event(db, contact.id, "created", sub.submitted_by_email, {"source": "rfi", "rfi": rfi.subject})
        created = True
    else:
        # fill gaps and record anything new we learned
        changed = {}
        for k in ("first_name", "last_name", "organization_name", "r_number", "date_of_birth"):
            if ident.get(k) and not getattr(contact, k):
                setattr(contact, k, ident[k])
                changed[k] = str(ident[k])
        e, p = norm_email(ident.get("email")), norm_phone(ident.get("phone"))
        if e and e != norm_email(contact.email) and e not in [norm_email(x) for x in contact.emails or []]:
            if contact.email:
                contact.emails = [*(contact.emails or []), e]
            else:
                contact.email = e
            changed["email"] = e
        if p and p != norm_phone(contact.phone) and p not in [norm_phone(x) for x in contact.phones or []]:
            if contact.phone:
                contact.phones = [*(contact.phones or []), ident["phone"]]
            else:
                contact.phone = ident["phone"]
            changed["phone"] = ident["phone"]
        if ident.get("consent_sms") and not contact.consent_sms and not contact.do_not_contact:
            contact.consent_sms = True
            changed["consent_sms"] = "yes"
        if ident.get("consent_email") and not contact.consent_email and not contact.do_not_contact:
            contact.consent_email = True
            changed["consent_email"] = "yes"
        if changed:
            add_event(db, contact.id, "updated_from_rfi", sub.submitted_by_email, {"rfi": rfi.subject, "fields": changed})
    await sync_points(db, contact)

    sub.contact_id = contact.id
    if inv:
        inv.submitted_at = datetime.now(timezone.utc)
        inv.submission_id = sub.id
        if not inv.opened_at:
            inv.opened_at = inv.submitted_at

    # Course names picked in the form become course interests (waitlist when the course is not open yet).
    answers = {a.strip().lower() for a in ident.get("answers", []) if a and len(a) < 255}
    if answers:
        courses = (await db.execute(select(Course).where(func.lower(Course.name).in_(answers)))).scalars().all()
        for course in courses:
            exists = (await db.execute(select(Interest).where(Interest.contact_id == contact.id, Interest.course_id == course.id))).scalar_one_or_none()
            if not exists:
                stage = "waitlist" if course.status == "coming_soon" else "inquiry"
                db.add(Interest(contact_id=contact.id, course_id=course.id, stage=stage, source="rfi"))
                add_event(db, contact.id, "interest_added", None, {"course": course.name, "stage": stage, "via": rfi.subject})
    return contact


async def link_unlinked_submissions(db: AsyncSession) -> int:
    rows = (await db.execute(select(RFISubmission, RFI).join(RFI, RFI.id == RFISubmission.rfi_id).where(RFISubmission.contact_id.is_(None)))).all()
    n = 0
    for sub, rfi in rows:
        try:
            async with db.begin_nested():
                if await link_submission(db, sub, rfi):
                    n += 1
        except Exception as e:  # never block startup on one odd response
            print(f"crm backfill skipped submission {sub.id}: {e}")
    await db.commit()
    return n


# ───────────────────────── journey status ─────────────────────────

TOUCH_CHANNELS = ("call", "voicemail", "email", "sms", "chat", "walk_in", "meeting")
JOURNEY_LABELS = {o["value"]: o["label"] for o in JOURNEY}
JOURNEY_HELP = {o["value"]: o["description"] for o in JOURNEY}


async def journeys(db: AsyncSession, contacts: list[Contact]) -> dict[UUID, str]:
    if not contacts:
        return {}
    ids = [c.id for c in contacts]
    touches: dict[UUID, list[datetime]] = {}
    for cid, at in (await db.execute(
        select(Interaction.contact_id, Interaction.occurred_at).where(
            Interaction.contact_id.in_(ids), Interaction.channel.in_(TOUCH_CHANNELS), Interaction.direction != "internal")
    )).all():
        touches.setdefault(cid, []).append(at)
    first_sub = dict((await db.execute(
        select(RFISubmission.contact_id, func.min(RFISubmission.created_at)).where(RFISubmission.contact_id.in_(ids)).group_by(RFISubmission.contact_id)
    )).all())
    invites: dict[UUID, tuple[int, int]] = {}
    for cid, total, opened in (await db.execute(
        select(RFIInvitation.contact_id, func.count(RFIInvitation.id), func.count(RFIInvitation.opened_at)).where(RFIInvitation.contact_id.in_(ids)).group_by(RFIInvitation.contact_id)
    )).all():
        invites[cid] = (total, opened)
    stages: dict[UUID, list[str]] = {}
    for cid, st in (await db.execute(select(Interest.contact_id, Interest.stage).where(Interest.contact_id.in_(ids)))).all():
        stages.setdefault(cid, []).append(st)

    out: dict[UUID, str] = {}
    for c in contacts:
        st = stages.get(c.id, [])
        t = touches.get(c.id, [])
        if c.do_not_contact:
            out[c.id] = "do_not_contact"
        elif "enrolled" in st:
            out[c.id] = "enrolled"
        elif st and all(s == "lost" for s in st):
            out[c.id] = "lost"
        elif c.id in first_sub:
            fs = first_sub[c.id]
            if any(x < fs for x in t):
                out[c.id] = "responded_after_call"
            elif any(x >= fs for x in t):
                out[c.id] = "responded_contacted"
            else:
                out[c.id] = "responded_not_contacted"
        elif c.id in invites:
            out[c.id] = "rfi_opened" if invites[c.id][1] else "rfi_sent"
        elif t:
            out[c.id] = "called_no_rfi"
        else:
            out[c.id] = "new"
    return out


async def next_work_number(db: AsyncSession) -> int:
    return (await db.execute(text("SELECT nextval('crm_work_item_seq')"))).scalar_one()


async def seed_courses(db: AsyncSession) -> None:
    """Start the catalog with TTU Online's workplace microcertificates (from their RFI sheet)."""
    if (await db.execute(select(func.count(Course.id)))).scalar_one():
        return
    now = [("Communication for the Workplace", "available"), ("Leadership for the Workplace", "available"),
           ("Technical Skills for the Workplace: AI", "available")]
    soon = ["Board Governance", "Change Management", "Digital Literacy", "Entrepreneurship", "Human Resource Development",
            "Organizational Leadership", "Project Management", "Swift Coding"]
    for name, status in now + [(n, "coming_soon") for n in soon]:
        db.add(Course(name=name, status=status, category="Microcertificate"))
    await db.commit()


