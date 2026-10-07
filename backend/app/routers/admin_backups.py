import os
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record
from app.auth import require_admin
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/admin/backups", tags=["admin-backups"], dependencies=[Depends(require_admin)])

BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", "/backups"))
TRIGGER = BACKUP_DIR / ".trigger"
NAME_RE = re.compile(r"^rfi_\d{8}_\d{6}\.dump$")


@router.get("/")
async def list_backups():
    if not BACKUP_DIR.is_dir():
        return {"available": False, "items": [], "pending": False}
    items = []
    for p in BACKUP_DIR.iterdir():
        if p.is_file() and NAME_RE.match(p.name):
            st = p.stat()
            items.append(
                {
                    "name": p.name,
                    "size": st.st_size,
                    "created_at": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
                }
            )
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return {"available": True, "items": items, "pending": TRIGGER.exists()}


@router.post("/run", status_code=202)
async def run_backup(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if not BACKUP_DIR.is_dir():
        raise HTTPException(status_code=503, detail="Backup storage is not available")
    if TRIGGER.exists():
        raise HTTPException(status_code=409, detail="A backup is already queued")
    TRIGGER.touch()
    record(db, admin, "backup_requested", "backup")
    await db.commit()
    return {"queued": True}


@router.get("/{name}")
async def download_backup(name: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if not NAME_RE.match(name):
        raise HTTPException(status_code=404, detail="Backup not found")
    path = (BACKUP_DIR / name).resolve()
    if path.parent != BACKUP_DIR.resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    record(db, admin, "backup_downloaded", "backup", None, name)
    await db.commit()
    return FileResponse(path, media_type="application/octet-stream", filename=name)
