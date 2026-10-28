"""Call Center (CRM) data model.

One Contact per real person; calls, tasks, cases, handoffs, course interests, RFI invitations and RFI responses
all hang off it so both the Call Center and the RFI team see the same history.
"""
import secrets
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, false, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _uuid() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def new_invite_token() -> str:
    return secrets.token_urlsafe(16)


class Contact(Base):
    __tablename__ = "crm_contacts"

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="SET NULL"), nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    emails: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    phones: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    r_number: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(40), nullable=True)
    organization_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    contact_type: Mapped[str] = mapped_column(String(32), nullable=False, default="prospect", server_default="prospect")
    lifecycle: Mapped[str] = mapped_column(String(32), nullable=False, default="lead", server_default="lead")
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    do_not_contact: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    consent_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    consent_sms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    consent_call: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    custom: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ContactPoint(Base):
    """Every email/phone a contact has, normalised, so search and auto-matching find them however they reach us."""

    __tablename__ = "crm_contact_points"
    __table_args__ = (Index("ix_crm_points_lookup", "kind", "normalized"),)

    id: Mapped[uuid.UUID] = _uuid()
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(8), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized: Mapped[str] = mapped_column(String(255), nullable=False)


class ContactRelation(Base):
    __tablename__ = "crm_relations"

    id: Mapped[uuid.UUID] = _uuid()
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    related_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    relation: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Interaction(Base):
    """A touchpoint: call, voicemail, email, SMS, chat, walk-in, meeting or note."""

    __tablename__ = "crm_interactions"
    __table_args__ = (Index("ix_crm_interactions_contact", "contact_id", "occurred_at"),)

    id: Mapped[uuid.UUID] = _uuid()
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, default="inbound")
    outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    course_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_courses.id", ondelete="SET NULL"), nullable=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    on_behalf_of_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True)
    external_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    agent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    agent_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkItem(Base):
    """Tasks, callbacks, cases (tickets) and handoffs between teams. Unassigned items sit in their team's queue."""

    __tablename__ = "crm_work_items"
    __table_args__ = (Index("ix_crm_work_queue", "org_id", "team", "status"),)

    id: Mapped[uuid.UUID] = _uuid()
    number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="SET NULL"), nullable=True)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="task")
    team: Mapped[str] = mapped_column(String(16), nullable=False, default="call_center")
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="normal")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rfi_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="SET NULL"), nullable=True)
    submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rfi_submissions.id", ondelete="SET NULL"), nullable=True)
    resolution: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Copy of the RFI answers ([{label, value}]) when the sender ticked "Send the RFI response"
    shared_response: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WorkItemComment(Base):
    __tablename__ = "crm_work_comments"

    id: Mapped[uuid.UUID] = _uuid()
    work_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_work_items.id", ondelete="CASCADE"), nullable=False, index=True)
    author_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="comment")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Course(Base):
    __tablename__ = "crm_courses"

    id: Mapped[uuid.UUID] = _uuid()
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="available")
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Interest(Base):
    """A person's interest in one course, with a pipeline stage. This is the 'lead'."""

    __tablename__ = "crm_interests"
    __table_args__ = (UniqueConstraint("contact_id", "course_id", name="uq_crm_interest"),)

    id: Mapped[uuid.UUID] = _uuid()
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_courses.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[str] = mapped_column(String(16), nullable=False, default="inquiry")
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RFIInvitation(Base):
    """A personal RFI link for one contact, so we know exactly whether they opened and submitted it."""

    __tablename__ = "crm_rfi_invitations"

    id: Mapped[uuid.UUID] = _uuid()
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, default=new_invite_token)
    rfi_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="CASCADE"), nullable=False)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(16), nullable=False, default="link")
    sent_by_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    open_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rfi_submissions.id", ondelete="SET NULL"), nullable=True)


class ContactEvent(Base):
    """Changes to a contact itself (created, edited, consent, stage, merged) for the journey timeline."""

    __tablename__ = "crm_contact_events"
    __table_args__ = (Index("ix_crm_contact_events", "contact_id", "created_at"),)

    id: Mapped[uuid.UUID] = _uuid()
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CustomFieldDef(Base):
    """Admin-defined extra fields for contacts (e.g. Employer ID, Graduation year)."""

    __tablename__ = "crm_custom_fields"

    id: Mapped[uuid.UUID] = _uuid()
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    field_type: Mapped[str] = mapped_column(String(16), nullable=False, default="text")
    options: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    help_text: Mapped[str] = mapped_column(String(255), nullable=False, default="", server_default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    """In-app notification (the bell): something was assigned to you, queued for your team, or changed."""

    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_unread", "user_id", "read_at"),)

    id: Mapped[uuid.UUID] = _uuid()
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False, default="info")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    link: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
