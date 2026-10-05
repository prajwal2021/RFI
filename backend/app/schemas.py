from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.models import RFIStatus


class RFIResponseCreate(BaseModel):
    answer: str
    responded_by: str


class RFIResponseOut(BaseModel):
    id: UUID
    rfi_id: UUID
    answer: str
    responded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RFICreate(BaseModel):
    subject: str
    question: str = ""
    created_by: str
    assigned_to: str | None = None
    content: dict[str, Any] | None = None


class RFIUpdate(BaseModel):
    subject: str | None = None
    question: str | None = None
    status: RFIStatus | None = None
    assigned_to: str | None = None
    content: dict[str, Any] | None = None


class RFIOut(BaseModel):
    id: UUID
    subject: str
    question: str
    status: RFIStatus
    created_by: str
    assigned_to: str | None
    content: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    responses: list[RFIResponseOut] = []

    model_config = {"from_attributes": True}
