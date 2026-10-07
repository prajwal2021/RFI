from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.database import Base, get_db

# Read-only browser over the application's own tables (anything in the ORM metadata). Table names from the
# URL are only ever looked up in that registry, never interpolated into SQL.
router = APIRouter(prefix="/api/admin/db", tags=["admin-db"], dependencies=[Depends(require_admin)])

MASKED_COLUMNS = {"password_hash"}
MAX_STR = 4000


def _truncate(value: Any) -> Any:
    if isinstance(value, str):
        return value if len(value) <= MAX_STR else f"{value[:MAX_STR]}… [truncated, {len(value)} chars]"
    if isinstance(value, dict):
        return {k: _truncate(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_truncate(v) for v in value]
    return value


def _table(name: str):
    table = Base.metadata.tables.get(name)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


@router.get("/tables")
async def list_tables(db: AsyncSession = Depends(get_db)):
    out = []
    for name, table in sorted(Base.metadata.tables.items()):
        count = (await db.execute(select(func.count()).select_from(table))).scalar_one()
        out.append(
            {
                "name": name,
                "row_count": count,
                "columns": [
                    {
                        "name": c.name,
                        "type": str(c.type),
                        "nullable": c.nullable,
                        "primary_key": c.primary_key,
                        "foreign_key": bool(c.foreign_keys),
                    }
                    for c in table.columns
                ],
            }
        )
    return out


@router.get("/tables/{name}")
async def table_rows(name: str, limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
    table = _table(name)
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    if "created_at" in table.c:
        order = desc(table.c.created_at)
    else:
        order = next(iter(table.primary_key.columns), list(table.columns)[0])

    total = (await db.execute(select(func.count()).select_from(table))).scalar_one()
    rows = (await db.execute(select(table).order_by(order).limit(limit).offset(offset))).mappings().all()

    columns = [c.name for c in table.columns]
    data = []
    for row in rows:
        item = {}
        for col in columns:
            if col in MASKED_COLUMNS:
                item[col] = "••••••••"
            else:
                item[col] = _truncate(jsonable_encoder(row[col]))
        data.append(item)
    return {"name": name, "total": total, "limit": limit, "offset": offset, "columns": columns, "rows": data}
