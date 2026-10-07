import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, literal_column, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.access import rfi_visible_clause
from app.auth import require_user
from app.database import get_db
from app.models import RFI, RFISubmission, User, Workspace

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

_TZ = re.compile(r"^[A-Za-z_]+(/[A-Za-z_+\-0-9]+)*$")


async def _compute(db: AsyncSession, user: User, days: int, tz: str) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days + 1)
    visible = rfi_visible_clause(user)
    # Inlined (not bound) so SELECT and GROUP BY use the identical expression; `tz` is regex-validated by the caller.
    tzl = literal_column(f"'{tz}'")

    created_day = func.date(func.timezone(tzl, RFI.created_at))
    created_rows = (
        await db.execute(
            select(created_day, RFI.id, RFI.subject)
            .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
            .where(visible, RFI.created_at >= since)
            .order_by(RFI.created_at)
        )
    ).all()

    resp_day = func.date(func.timezone(tzl, RFISubmission.created_at))
    resp_rows = (
        await db.execute(
            select(resp_day, RFI.id, RFI.subject, func.count(RFISubmission.id))
            .join(RFI, RFI.id == RFISubmission.rfi_id)
            .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
            .where(visible, RFISubmission.created_at >= since)
            .group_by(resp_day, RFI.id, RFI.subject)
        )
    ).all()

    by_day: dict[str, dict] = {}

    def slot(d) -> dict:
        key = d.isoformat()
        return by_day.setdefault(key, {"date": key, "created": [], "responses": [], "created_count": 0, "responses_count": 0})

    for d, rfi_id, subject in created_rows:
        s = slot(d)
        s["created"].append({"id": str(rfi_id), "subject": subject})
        s["created_count"] += 1
    for d, rfi_id, subject, count in resp_rows:
        s = slot(d)
        s["responses"].append({"rfi_id": str(rfi_id), "subject": subject, "count": count})
        s["responses_count"] += count

    total_forms = (
        await db.execute(
            select(func.count(RFI.id)).outerjoin(Workspace, RFI.workspace_id == Workspace.id).where(visible)
        )
    ).scalar_one()
    published = (
        await db.execute(
            select(func.count(RFI.id))
            .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
            .where(visible, RFI.is_published.is_(True))
        )
    ).scalar_one()
    total_responses = (
        await db.execute(
            select(func.count(RFISubmission.id))
            .join(RFI, RFI.id == RFISubmission.rfi_id)
            .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
            .where(visible)
        )
    ).scalar_one()

    return {
        "days": sorted(by_day.values(), key=lambda x: x["date"]),
        "totals": {"forms": total_forms, "published": published, "responses": total_responses},
    }


@router.get("/")
async def overview(
    days: int = 90,
    tz: str = "UTC",
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    days = min(max(days, 7), 365)
    tz = tz if _TZ.match(tz) else "UTC"
    known = (await db.execute(text("SELECT 1 FROM pg_timezone_names WHERE name = :n"), {"n": tz})).first()
    return await _compute(db, user, days, tz if known else "UTC")
