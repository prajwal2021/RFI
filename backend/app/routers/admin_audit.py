from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.database import get_db
from app.models import AuditLog

router = APIRouter(prefix="/api/admin/audit", tags=["admin-audit"], dependencies=[Depends(require_admin)])


def _like(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@router.get("/actions")
async def list_actions(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AuditLog.action).distinct().order_by(AuditLog.action))).scalars().all()
    return rows


@router.get("/")
async def list_audit(
    limit: int = 50,
    offset: int = 0,
    action: str = "",
    q: str = "",
    db: AsyncSession = Depends(get_db),
):
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)
    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if q.strip():
        pattern = _like(q.strip())
        conditions.append(
            or_(
                AuditLog.actor_email.ilike(pattern, escape="\\"),
                AuditLog.entity_name.ilike(pattern, escape="\\"),
                AuditLog.action.ilike(pattern, escape="\\"),
            )
        )
    total = (await db.execute(select(func.count(AuditLog.id)).where(*conditions))).scalar_one()
    rows = (
        await db.execute(
            select(AuditLog).where(*conditions).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "rows": [
            {
                "id": str(r.id),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "actor_email": r.actor_email,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "entity_name": r.entity_name,
                "details": r.details,
            }
            for r in rows
        ],
    }
