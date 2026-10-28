from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_user
from app.crm_models import Notification
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _out(n: Notification) -> dict:
    return {
        "id": str(n.id), "kind": n.kind, "title": n.title, "body": n.body, "link": n.link,
        "created_at": n.created_at.isoformat() if n.created_at else None, "read": n.read_at is not None,
    }


@router.get("/")
async def list_notifications(limit: int = 30, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    """Newest first, plus how many are unread (shown on the bell)."""
    rows = (
        await db.execute(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(min(max(limit, 1), 100)))
    ).scalars().all()
    unread = (
        await db.execute(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.read_at.is_(None)))
    ).scalar_one()
    return {"unread": unread, "items": [_out(n) for n in rows]}


@router.post("/read-all", status_code=204)
async def read_all(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None)).values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()


@router.post("/{nid}/read", status_code=204)
async def read_one(nid: UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    n = (await db.execute(select(Notification).where(Notification.id == nid, Notification.user_id == user.id))).scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        await db.commit()
