"""Built-in image library.

Contains the official Texas Tech logos (bundled files from ttu.edu and the TTU brand site), plus original generated
artwork in scarlet and black: department wordmarks, backgrounds, icons, banners and badges. Administrators can add more
on the Image library page.
"""
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ImageAsset

RED = "#cc0000"
DARK_RED = "#8f0000"
BLACK = "#1a1a1a"

_FONT = 'font-family="Arial,Helvetica,sans-serif"'

# Official Texas Tech artwork lives in app/assets/official (downloaded from ttu.edu / the TTU brand site).
_ASSETS = Path(__file__).parent / "assets" / "official"
_DT_VIEWBOX = "263 345.7 85.9 100.7"  # viewBox of the official dbl__T.svg


def _read_asset(name: str) -> bytes | None:
    p = _ASSETS / name
    return p.read_bytes() if p.exists() else None


def _double_t_parts() -> tuple[str, str] | None:
    """(full-colour inner markup, black silhouette path) taken from the official Double T."""
    raw = _read_asset("dbl__T.svg")
    if raw is None:
        return None
    text = raw.decode("utf-8", "ignore")
    inner = re.search(r"<svg[^>]*>(.*)</svg>", text, re.S)
    black = re.search(r'id="Black"\s+d="([^"]+)"', text, re.S)
    if not inner or not black:
        return None
    return inner.group(1), black.group(1)


def _double_t(colour_mode: str, x: float, y: float, w: float, h: float) -> str:
    """Nested <svg> with the official Double T: 'full' colour, or a one-colour silhouette ('#rrggbb')."""
    parts = _double_t_parts()
    if parts is None:  # assets missing: fall back to a plain scarlet block so logos still render
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{RED}"/>'
    inner, black = parts
    body = inner if colour_mode == "full" else f'<path d="{black}" fill="{colour_mode}"/>'
    return f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{_DT_VIEWBOX}">{body}</svg>'


def _logo(title: str, sub: str, dark: bool = False, accent: str = RED) -> str:
    fg = "#ffffff" if dark else BLACK
    sub_fg = "#d4d4d4" if dark else "#555555"
    mark = _double_t("#ffffff" if dark else "full", 8, 30, 52, 61)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" width="560" height="120">'
        f"{mark}"
        f'<text x="82" y="62" {_FONT} font-size="34" font-weight="700" fill="{fg}">{title}</text>'
        f'<text x="83" y="90" {_FONT} font-size="15" letter-spacing="3" fill="{sub_fg}">{sub}</text>'
        "</svg>"
    )


def _svg(w: int, h: int, body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'


def _bg_scarlet() -> str:
    return _svg(
        1600, 900,
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{BLACK}"/><stop offset=".55" stop-color="#2b0a0a"/><stop offset="1" stop-color="{RED}"/>'
        '</linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>',
    )


def _bg_grid() -> str:
    return _svg(
        1600, 900,
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{BLACK}"/><stop offset=".55" stop-color="#2b0a0a"/><stop offset="1" stop-color="{RED}"/></linearGradient>'
        '<radialGradient id="r" cx=".85" cy=".9" r=".7"><stop offset="0" stop-color="#ff3b30" stop-opacity=".5"/>'
        '<stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>'
        '<pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse">'
        '<path d="M60 0H0V60" fill="none" stroke="#fff" stroke-opacity=".06"/></pattern></defs>'
        '<rect width="1600" height="900" fill="url(#g)"/><rect width="1600" height="900" fill="url(#p)"/>'
        '<rect width="1600" height="900" fill="url(#r)"/>',
    )


def _bg_soft() -> str:
    return _svg(
        1600, 900,
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/>'
        '<stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>'
        f'<circle cx="1350" cy="180" r="260" fill="{RED}" fill-opacity=".05"/>'
        f'<circle cx="1350" cy="180" r="170" fill="{RED}" fill-opacity=".05"/>'
        f'<circle cx="220" cy="760" r="300" fill="{BLACK}" fill-opacity=".04"/>',
    )


def _bg_waves() -> str:
    return _svg(
        1600, 900,
        f'<rect width="1600" height="900" fill="{BLACK}"/>'
        '<path d="M0 560 C300 480 520 680 820 600 S1320 480 1600 590 V900 H0 Z" fill="#262626"/>'
        '<path d="M0 650 C320 580 560 760 860 690 S1340 590 1600 680 V900 H0 Z" fill="#3a0f0f"/>'
        f'<path d="M0 760 C340 700 600 840 900 790 S1380 710 1600 780 V900 H0 Z" fill="{DARK_RED}"/>',
    )


def _bg_geometric() -> str:
    return _svg(
        1600, 900,
        f'<rect width="1600" height="900" fill="{BLACK}"/>'
        f'<polygon points="0,900 520,260 980,900" fill="{RED}" fill-opacity=".85"/>'
        f'<polygon points="420,900 1000,180 1500,900" fill="{DARK_RED}" fill-opacity=".9"/>'
        '<polygon points="900,900 1300,420 1600,900" fill="#ffffff" fill-opacity=".08"/>'
        '<polygon points="1100,0 1600,0 1600,420" fill="#ffffff" fill-opacity=".05"/>',
    )


def _bg_skyline() -> str:
    buildings = [
        (0, 640, 110), (110, 560, 90), (200, 690, 120), (320, 600, 80), (400, 520, 100), (500, 660, 130),
        (630, 580, 90), (720, 480, 70), (790, 620, 110), (900, 540, 100), (1000, 690, 120), (1120, 590, 90),
        (1210, 500, 110), (1320, 650, 100), (1420, 570, 90), (1510, 680, 90),
    ]
    rects = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{900 - y}"/>' for x, y, w in buildings)
    return _svg(
        1600, 900,
        '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1a1a"/>'
        f'<stop offset=".55" stop-color="{DARK_RED}"/><stop offset="1" stop-color="#ff7a45"/></linearGradient></defs>'
        '<rect width="1600" height="900" fill="url(#s)"/>'
        '<circle cx="1180" cy="470" r="120" fill="#ffd9a8" fill-opacity=".85"/>'
        f'<g fill="{BLACK}">{rects}'
        '<rect x="738" y="330" width="34" height="150"/><polygon points="735,330 755,250 775,330"/></g>',
    )


def _bg_dots_dark() -> str:
    return _svg(
        1600, 900,
        '<defs><pattern id="d" width="40" height="40" patternUnits="userSpaceOnUse">'
        '<circle cx="20" cy="20" r="2" fill="#fff" fill-opacity=".14"/></pattern></defs>'
        '<rect width="1600" height="900" fill="#111827"/><rect width="1600" height="900" fill="url(#d)"/>',
    )


def _bg_dots_light() -> str:
    return _svg(
        1600, 900,
        '<defs><pattern id="d" width="40" height="40" patternUnits="userSpaceOnUse">'
        '<circle cx="20" cy="20" r="2" fill="#94a3b8" fill-opacity=".5"/></pattern></defs>'
        '<rect width="1600" height="900" fill="#ffffff"/><rect width="1600" height="900" fill="url(#d)"/>',
    )


def _icon(body: str) -> str:
    return _svg(256, 256, body)


def _ic_cap() -> str:
    return _icon(
        f'<polygon points="128,56 232,104 128,152 24,104" fill="{RED}"/>'
        f'<path d="M72 132v44c0 24 112 24 112 0v-44l-56 28z" fill="{DARK_RED}"/>'
        f'<path d="M222 108v64" stroke="{BLACK}" stroke-width="6" stroke-linecap="round"/>'
        f'<circle cx="222" cy="178" r="9" fill="{BLACK}"/>'
    )


def _ic_certificate() -> str:
    return _icon(
        f'<rect x="28" y="52" width="200" height="140" rx="12" fill="#fff" stroke="{BLACK}" stroke-width="8"/>'
        f'<path d="M60 92h136M60 120h136M60 148h80" stroke="{BLACK}" stroke-width="8" stroke-linecap="round"/>'
        f'<circle cx="180" cy="178" r="26" fill="{RED}"/>'
        f'<path d="M168 198l-8 38 20-12 20 12-8-38z" fill="{DARK_RED}"/>'
    )


def _ic_book() -> str:
    return _icon(
        f'<path d="M128 70c-24-18-62-22-92-14v136c30-8 68-4 92 14z" fill="{RED}"/>'
        f'<path d="M128 70c24-18 62-22 92-14v136c-30-8-68-4-92 14z" fill="{DARK_RED}"/>'
        '<path d="M128 70v136" stroke="#fff" stroke-width="6"/>'
    )


def _ic_laptop() -> str:
    return _icon(
        f'<rect x="52" y="64" width="152" height="104" rx="10" fill="{BLACK}"/>'
        f'<rect x="62" y="74" width="132" height="84" rx="4" fill="{RED}"/>'
        f'<path d="M28 188h200l-14 18H42z" fill="{BLACK}"/>'
    )


def _ic_globe() -> str:
    return _icon(
        f'<circle cx="128" cy="128" r="84" fill="none" stroke="{RED}" stroke-width="12"/>'
        f'<ellipse cx="128" cy="128" rx="38" ry="84" fill="none" stroke="{RED}" stroke-width="10"/>'
        f'<path d="M44 128h168M60 86h136M60 170h136" stroke="{RED}" stroke-width="10" stroke-linecap="round"/>'
    )


def _ic_check() -> str:
    return _icon(
        f'<circle cx="128" cy="128" r="88" fill="{RED}"/><circle cx="128" cy="128" r="72" fill="none" stroke="#fff" stroke-width="5" stroke-opacity=".6"/>'
        '<path d="M84 130l32 32 58-66" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>'
    )


# (key, name, category, svg)
SEEDS: list[tuple[str, str, str, str]] = [
    ("logo-ttu-online", "TTU Online", "Logos", _logo("TTU Online", "TEXAS TECH UNIVERSITY")),
    ("logo-ttu-online-dark", "TTU Online (for dark backgrounds)", "Logos", _logo("TTU Online", "TEXAS TECH UNIVERSITY", dark=True)),
    ("logo-texas-tech", "Texas Tech University", "Logos", _logo("Texas Tech", "UNIVERSITY")),
    ("logo-texas-tech-dark", "Texas Tech University (for dark backgrounds)", "Logos", _logo("Texas Tech", "UNIVERSITY", dark=True)),
    ("logo-k12", "TTU K-12", "Logos", _logo("TTU K-12", "TEXAS TECH UNIVERSITY K-12")),
    ("logo-k12-dark", "TTU K-12 (for dark backgrounds)", "Logos", _logo("TTU K-12", "TEXAS TECH UNIVERSITY K-12", dark=True)),
    ("logo-flexible-learning", "Flexible Learning", "Logos", _logo("Flexible Learning", "TTU ONLINE")),
    ("logo-flexible-learning-dark", "Flexible Learning (for dark backgrounds)", "Logos", _logo("Flexible Learning", "TTU ONLINE", dark=True)),
    ("logo-micro-credentials", "Micro-Credentials", "Logos", _logo("Micro-Credentials", "TTU ONLINE")),
    ("logo-micro-credentials-dark", "Micro-Credentials (for dark backgrounds)", "Logos", _logo("Micro-Credentials", "TTU ONLINE", dark=True)),
    ("logo-online-programs", "Online Programs", "Logos", _logo("Online Programs", "TTU ONLINE")),
    ("logo-professional-development", "Professional Development", "Logos", _logo("Professional Dev.", "TTU ONLINE")),
    ("logo-continuing-education", "Continuing Education", "Logos", _logo("Continuing Ed", "TTU ONLINE")),
    ("bg-scarlet-gradient", "Scarlet Gradient", "Backgrounds", _bg_scarlet()),
    ("bg-raider-grid", "Scarlet Grid Glow", "Backgrounds", _bg_grid()),
    ("bg-charcoal-waves", "Charcoal Waves", "Backgrounds", _bg_waves()),
    ("bg-red-geometric", "Red Geometric", "Backgrounds", _bg_geometric()),
    ("bg-campus-skyline", "Campus Skyline at Dusk", "Backgrounds", _bg_skyline()),
    ("bg-soft-light", "Soft Light", "Backgrounds", _bg_soft()),
    ("bg-dots-dark", "Dark Dots", "Backgrounds", _bg_dots_dark()),
    ("bg-dots-light", "Light Dots", "Backgrounds", _bg_dots_light()),
    ("icon-graduation-cap", "Graduation Cap", "Icons", _ic_cap()),
    ("icon-certificate", "Certificate", "Icons", _ic_certificate()),
    ("icon-book", "Open Book", "Icons", _ic_book()),
    ("icon-laptop", "Laptop", "Icons", _ic_laptop()),
    ("icon-globe", "Globe", "Icons", _ic_globe()),
    ("icon-check-seal", "Check Seal", "Icons", _ic_check()),
]


def _official() -> list[tuple[str, str, str, bytes, str]]:
    """Official Texas Tech brand files (bundled in app/assets/official) plus one-colour Double T variants."""
    cat = "Official Logos"
    out: list[tuple[str, str, str, bytes, str]] = []
    files = [
        ("official-double-t", "Texas Tech Double T (official)", "double-t.svg", "image/svg+xml"),
        ("official-wordmark", "Texas Tech wordmark (official)", "ttu-wordmark.png", "image/png"),
        ("official-wordmark-stack", "Texas Tech stacked wordmark (official)", "ttu-wordmark-stack.png", "image/png"),
        ("official-wordmark-wide", "Texas Tech University lettering (official, wide)", "ttu-wordmark-wide.svg", "image/svg+xml"),
        ("official-k12", "TTU K-12 logo (official)", "ttu-k-12-logo.png", "image/png"),
        ("official-k12-horizontal", "TTU K-12 horizontal logo (official)", "ttu-k-12-logo-horizontal.png", "image/png"),
    ]
    for key, name, filename, mime in files:
        data = _read_asset(filename)
        if data:
            out.append((key, name, cat, data, mime))

    parts = _double_t_parts()
    if parts:
        for suffix, label, colour in (("black", "black", "#000000"), ("scarlet", "scarlet", "#cc0000"), ("white", "white", "#ffffff")):
            svg = (
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{_DT_VIEWBOX}" width="343" height="402">'
                f'<path d="{parts[1]}" fill="{colour}"/></svg>'
            )
            out.append(
                (f"official-double-t-{suffix}", f"Double T, one colour: {label} (from official artwork)", cat, svg.encode("utf-8"), "image/svg+xml")
            )
    return out


async def seed_images(db: AsyncSession) -> None:
    """Create missing built-in images and refresh built-in ones whose artwork changed.

    Rows uploaded by admins (builtin = false) are never modified or removed.
    """
    from app.seed_images_extra import EXTRA_SEEDS  # imported lazily: the extra module builds on helpers defined here

    items: list[tuple[str, str, str, bytes, str]] = [
        (key, name, category, svg.encode("utf-8"), "image/svg+xml") for key, name, category, svg in [*SEEDS, *EXTRA_SEEDS]
    ] + _official()

    rows = (await db.execute(select(ImageAsset).where(ImageAsset.key.is_not(None)))).scalars().all()
    by_key = {r.key: r for r in rows}
    changed = False
    for key, name, category, data, mime in items:
        row = by_key.get(key)
        if row is None:
            db.add(ImageAsset(key=key, name=name, category=category, mime=mime, data=data, size=len(data), builtin=True))
            changed = True
        elif row.builtin and (row.data != data or row.name != name or row.category != category or row.mime != mime):
            row.data, row.size, row.name, row.category, row.mime = data, len(data), name, category, mime
            changed = True
    if changed:
        await db.commit()
