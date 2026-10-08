import re
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record
from app.auth import require_admin, require_user
from app.database import get_db
from app.models import ImageAsset, User

router = APIRouter(prefix="/api/images", tags=["images"])

MAX_BYTES = 2 * 1024 * 1024
_UNSAFE_SVG = re.compile(
    rb"<\s*script|<\s*foreignObject|<\s*iframe|<\s*embed|<\s*object|<!ENTITY|javascript:|\son[a-z]+\s*=|xlink:href\s*=\s*[\"']\s*(?!#|data:image/)",
    re.IGNORECASE,
)


def sniff_mime(data: bytes) -> str | None:
    """Detect the real image type from content, ignoring the client-supplied content type."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    head = data[:2048].lstrip(b"\xef\xbb\xbf \t\r\n").lower()
    if (head.startswith(b"<svg") or head.startswith(b"<?xml")) and b"<svg" in data[:4096].lower():
        return "image/svg+xml"
    return None


def _meta(a: ImageAsset) -> dict:
    return {
        "id": str(a.id),
        "name": a.name,
        "category": a.category,
        "mime": a.mime,
        "size": a.size,
        "builtin": a.builtin,
        "url": f"/rfi-api/images/{a.id}/raw",
    }


@router.get("/")
async def list_images(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(ImageAsset).order_by(ImageAsset.category, ImageAsset.builtin.desc(), ImageAsset.name)
        )
    ).scalars().all()
    # Columns are listed explicitly in _meta so the binary payload is never serialised here.
    return [_meta(a) for a in rows]


@router.get("/{image_id}/raw")
async def raw_image(image_id: UUID, db: AsyncSession = Depends(get_db)):
    """Public on purpose: published forms embed these images. IDs are unguessable and the library holds
    only non-sensitive branding assets."""
    a = (await db.execute(select(ImageAsset).where(ImageAsset.id == image_id))).scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(
        content=a.data,
        media_type=a.mime,
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
            # Even if the file is opened directly, nothing may execute.
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
        },
    )


@router.post("/", status_code=201)
async def upload_image(
    name: str = Form(...),
    category: str = Form("Logos"),
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    name = name.strip()[:120]
    category = category.strip()[:40] or "Logos"
    if not name:
        raise HTTPException(status_code=400, detail="Give the image a name")

    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 2 MB")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty")
    mime = sniff_mime(data)
    if mime is None:
        raise HTTPException(status_code=415, detail="Unsupported file. Use PNG, JPEG, GIF, WebP or SVG")
    if mime == "image/svg+xml" and _UNSAFE_SVG.search(data):
        raise HTTPException(status_code=400, detail="This SVG contains scripts or external references and was rejected")

    asset = ImageAsset(name=name, category=category, mime=mime, data=data, size=len(data), builtin=False, created_by=admin.email)
    db.add(asset)
    await db.flush()
    record(db, admin, "image_uploaded", "image", asset.id, name, {"category": category, "size": len(data)})
    await db.commit()
    return _meta(asset)


@router.delete("/{image_id}", status_code=204)
async def delete_image(image_id: UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    a = (await db.execute(select(ImageAsset).where(ImageAsset.id == image_id))).scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Image not found")
    if a.builtin:
        raise HTTPException(status_code=400, detail="Built-in images cannot be deleted")
    record(db, admin, "image_deleted", "image", a.id, a.name)
    await db.delete(a)
    await db.commit()
