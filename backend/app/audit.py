from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def record(
    db: AsyncSession,
    actor: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: Any = None,
    entity_name: str | None = None,
    details: dict | None = None,
    actor_email: str | None = None,
) -> None:
    """Stage an audit row in the current session; it is persisted by the caller's commit."""
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else actor_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            entity_name=(entity_name or "")[:500] or None,
            details=details or None,
        )
    )
