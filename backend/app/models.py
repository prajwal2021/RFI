import enum
import secrets
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Enum as SAEnum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_publish_key() -> str:
    return secrets.token_urlsafe(6)


class RFIStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    ANSWERED = "answered"
    CLOSED = "closed"


class RFI(Base):
    __tablename__ = "rfis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[RFIStatus] = mapped_column(SAEnum(RFIStatus), default=RFIStatus.DRAFT)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    publish_key: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    responses: Mapped[list["RFIResponse"]] = relationship(back_populates="rfi", cascade="all, delete-orphan")
    submissions: Mapped[list["RFISubmission"]] = relationship(back_populates="rfi", cascade="all, delete-orphan")


class RFIResponse(Base):
    __tablename__ = "rfi_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfi_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="CASCADE"))
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    responded_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    rfi: Mapped["RFI"] = relationship(back_populates="responses")


class RFISubmission(Base):
    __tablename__ = "rfi_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfi_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="CASCADE"))
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    submitted_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitted_by_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    rfi: Mapped["RFI"] = relationship(back_populates="submissions")
