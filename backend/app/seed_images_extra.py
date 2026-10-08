"""Extra built-in artwork: patterned/gradient backgrounds, icons, banners, badges and department wordmarks.

All generated from code (original artwork, no third-party assets). Colours are plain hex values so the form
designer's image editor can recolour them.
"""
import random

from app.seed_images import BLACK, DARK_RED, RED, _logo, _svg

# ── Palettes (dark → mid → accent) ──

PALETTES: dict[str, tuple[str, str, str]] = {
    "Scarlet": ("#1a1a1a", "#2b0a0a", "#cc0000"),
    "Charcoal": ("#0f0f10", "#1f2022", "#3a3d42"),
    "Midnight": ("#0b1020", "#16224a", "#2f4fb3"),
    "Ocean": ("#04202e", "#0a4a63", "#17a2b8"),
    "Forest": ("#0b1f14", "#14452b", "#2f9e5b"),
    "Violet": ("#1a0b2e", "#3b1a6e", "#8b5cf6"),
    "Sunset": ("#2b0a0a", "#cc0000", "#ff9a3c"),
    "Gold": ("#1a1405", "#6b4e0a", "#f5b301"),
    "Slate": ("#0f172a", "#334155", "#94a3b8"),
    "Light": ("#ffffff", "#f1f5f9", "#e2e8f0"),
    "Cream": ("#fffdf7", "#faf3e0", "#f1e4c4"),
}
DARK_PALS = ["Scarlet", "Charcoal", "Midnight", "Ocean", "Forest", "Violet", "Sunset", "Gold", "Slate"]
LIGHT_PALS = ["Light", "Cream"]
W, H = 1600, 900


def _stops(p: tuple[str, str, str]) -> str:
    return f'<stop offset="0" stop-color="{p[0]}"/><stop offset=".55" stop-color="{p[1]}"/><stop offset="1" stop-color="{p[2]}"/>'


def _base(p, body: str) -> str:
    return _svg(W, H, f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">{_stops(p)}</linearGradient></defs>{body}')


def _on_color(p) -> str:
    """Contrast colour for decorative overlays: white on dark palettes, slate on light ones."""
    return "#ffffff" if p[0] not in ("#ffffff", "#fffdf7") else "#475569"


def bg_gradient(p) -> str:
    return _base(p, f'<rect width="{W}" height="{H}" fill="url(#g)"/>')


def bg_mesh(p, seed: int) -> str:
    r = random.Random(seed)
    blobs = ""
    for i in range(4):
        cx, cy, rad = r.randint(100, 1500), r.randint(50, 850), r.randint(380, 700)
        col = p[2] if i % 2 == 0 else p[1]
        blobs += (
            f'<radialGradient id="b{i}"><stop offset="0" stop-color="{col}" stop-opacity=".85"/>'
            f'<stop offset="1" stop-color="{col}" stop-opacity="0"/></radialGradient>'
            f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="url(#b{i})"/>'
        )
    return _svg(W, H, f'<rect width="{W}" height="{H}" fill="{p[0]}"/>{blobs}')


def bg_stripes(p) -> str:
    oc = _on_color(p)
    return _base(
        p,
        f'<defs><pattern id="s" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">'
        f'<rect width="26" height="56" fill="{oc}" fill-opacity=".07"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#s)"/>',
    )


def bg_dots(p) -> str:
    oc = _on_color(p)
    return _base(
        p,
        f'<defs><pattern id="d" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="2.2" fill="{oc}" fill-opacity=".22"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#d)"/>',
    )


def bg_grid(p) -> str:
    oc = _on_color(p)
    return _base(
        p,
        f'<defs><pattern id="gr" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="{oc}" stroke-opacity=".10"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#gr)"/>',
    )


def bg_diamonds(p) -> str:
    oc = _on_color(p)
    return _base(
        p,
        f'<defs><pattern id="dm" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M40 6L74 40L40 74L6 40Z" fill="none" stroke="{oc}" stroke-opacity=".12" stroke-width="2"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#dm)"/>',
    )


def bg_crosses(p) -> str:
    oc = _on_color(p)
    return _base(
        p,
        f'<defs><pattern id="cr" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 22v16M22 30h16" stroke="{oc}" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#cr)"/>',
    )


def bg_waves(p) -> str:
    return _svg(
        W, H,
        f'<rect width="{W}" height="{H}" fill="{p[0]}"/>'
        f'<path d="M0 520 C300 440 520 640 820 560 S1320 440 1600 550 V900 H0 Z" fill="{p[1]}"/>'
        f'<path d="M0 640 C320 570 560 750 860 680 S1340 580 1600 670 V900 H0 Z" fill="{p[2]}" fill-opacity=".75"/>'
        f'<path d="M0 760 C340 700 600 840 900 790 S1380 710 1600 780 V900 H0 Z" fill="{p[2]}"/>',
    )


def bg_lowpoly(p, seed: int) -> str:
    r = random.Random(seed)
    cols, rows = 10, 6
    cw, ch = W / cols, H / rows
    pts = [[(c * cw + (r.uniform(-.3, .3) * cw if 0 < c < cols else 0), rw * ch + (r.uniform(-.3, .3) * ch if 0 < rw < rows else 0)) for c in range(cols + 1)] for rw in range(rows + 1)]
    polys = ""
    for rw in range(rows):
        for c in range(cols):
            a, b, d, e = pts[rw][c], pts[rw][c + 1], pts[rw + 1][c], pts[rw + 1][c + 1]
            for tri in ((a, b, d), (b, e, d)):
                col = p[2] if r.random() < .35 else p[1]
                op = r.uniform(.25, .9)
                coords = " ".join(f"{x:.0f},{y:.0f}" for x, y in tri)
                polys += f'<polygon points="{coords}" fill="{col}" fill-opacity="{op:.2f}"/>'
    return _svg(W, H, f'<rect width="{W}" height="{H}" fill="{p[0]}"/>{polys}')


def bg_topo(p) -> str:
    oc = _on_color(p)
    rings = "".join(
        f'<ellipse cx="{900 + i * 12}" cy="{420 - i * 6}" rx="{120 + i * 85}" ry="{80 + i * 55}" fill="none" stroke="{oc}" stroke-opacity="{0.06 + (i % 3) * 0.03:.2f}" stroke-width="2" transform="rotate({i * 4} 900 420)"/>'
        for i in range(14)
    )
    return _base(p, f'<rect width="{W}" height="{H}" fill="url(#g)"/>{rings}')


def bg_chevrons(p) -> str:
    oc = _on_color(p)
    return _base(
        p,
        f'<defs><pattern id="ch" width="90" height="60" patternUnits="userSpaceOnUse"><path d="M0 40L45 10L90 40" fill="none" stroke="{oc}" stroke-opacity=".12" stroke-width="3"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#ch)"/>',
    )


def bg_bokeh(p, seed: int) -> str:
    r = random.Random(seed)
    oc = _on_color(p)
    dots = "".join(
        f'<circle cx="{r.randint(0, W)}" cy="{r.randint(0, H)}" r="{r.randint(30, 150)}" fill="{oc if i % 3 == 0 else p[2]}" fill-opacity="{r.uniform(.05, .18):.2f}"/>'
        for i in range(26)
    )
    return _base(p, f'<rect width="{W}" height="{H}" fill="url(#g)"/>{dots}')


def bg_split(p) -> str:
    return _svg(
        W, H,
        f'<rect width="{W}" height="{H}" fill="{p[0]}"/><polygon points="{W * .42:.0f},0 {W},0 {W},{H} {W * .18:.0f},{H}" fill="{p[1]}"/>'
        f'<polygon points="{W * .7:.0f},0 {W},0 {W},{H} {W * .5:.0f},{H}" fill="{p[2]}" fill-opacity=".85"/>',
    )


def bg_confetti(light: bool, seed: int) -> str:
    r = random.Random(seed)
    cols = [RED, BLACK, "#94a3b8", "#f5b301", DARK_RED]
    bits = ""
    for _ in range(90):
        x, y, s, rot = r.randint(0, W), r.randint(0, H), r.randint(10, 26), r.randint(0, 180)
        c = r.choice(cols)
        shape = (
            f'<rect x="{x}" y="{y}" width="{s}" height="{s // 2}" rx="3" fill="{c}" fill-opacity=".8" transform="rotate({rot} {x} {y})"/>'
            if r.random() < .6
            else f'<circle cx="{x}" cy="{y}" r="{s // 3}" fill="{c}" fill-opacity=".8"/>'
        )
        bits += shape
    return _svg(W, H, f'<rect width="{W}" height="{H}" fill="{"#ffffff" if light else "#111827"}"/>{bits}')


def _backgrounds() -> list[tuple[str, str, str, str]]:
    out: list[tuple[str, str, str, str]] = []

    def add(key: str, name: str, svg: str) -> None:
        out.append((f"bg2-{key}", name, "Backgrounds", svg))

    for n in DARK_PALS + LIGHT_PALS:
        add(f"grad-{n.lower()}", f"{n} Gradient", bg_gradient(PALETTES[n]))
    for i, n in enumerate(["Scarlet", "Midnight", "Ocean", "Violet", "Sunset", "Forest"]):
        add(f"mesh-{n.lower()}", f"{n} Mesh", bg_mesh(PALETTES[n], 10 + i))
    for n in ["Scarlet", "Charcoal", "Midnight", "Forest", "Light", "Cream"]:
        add(f"stripes-{n.lower()}", f"{n} Stripes", bg_stripes(PALETTES[n]))
    for n in ["Scarlet", "Charcoal", "Ocean", "Slate", "Light", "Cream"]:
        add(f"dots-{n.lower()}", f"{n} Dots", bg_dots(PALETTES[n]))
    for n in ["Scarlet", "Charcoal", "Midnight", "Slate", "Light", "Cream"]:
        add(f"grid-{n.lower()}", f"{n} Grid", bg_grid(PALETTES[n]))
    for n in ["Scarlet", "Midnight", "Violet", "Gold", "Light"]:
        add(f"diamonds-{n.lower()}", f"{n} Diamonds", bg_diamonds(PALETTES[n]))
    for n in ["Scarlet", "Charcoal", "Forest", "Cream"]:
        add(f"crosses-{n.lower()}", f"{n} Crosses", bg_crosses(PALETTES[n]))
    for n in ["Scarlet", "Charcoal", "Midnight", "Ocean", "Forest", "Violet"]:
        add(f"waves-{n.lower()}", f"{n} Waves", bg_waves(PALETTES[n]))
    for i, n in enumerate(["Scarlet", "Charcoal", "Midnight", "Ocean", "Sunset", "Slate"]):
        add(f"lowpoly-{n.lower()}", f"{n} Low-Poly", bg_lowpoly(PALETTES[n], 40 + i))
    for n in ["Scarlet", "Midnight", "Forest", "Light"]:
        add(f"topo-{n.lower()}", f"{n} Contours", bg_topo(PALETTES[n]))
    for n in ["Scarlet", "Charcoal", "Ocean", "Cream"]:
        add(f"chevrons-{n.lower()}", f"{n} Chevrons", bg_chevrons(PALETTES[n]))
    for i, n in enumerate(["Scarlet", "Midnight", "Violet", "Sunset", "Gold"]):
        add(f"bokeh-{n.lower()}", f"{n} Bokeh", bg_bokeh(PALETTES[n], 70 + i))
    for n in ["Scarlet", "Charcoal", "Midnight", "Forest"]:
        add(f"split-{n.lower()}", f"{n} Split", bg_split(PALETTES[n]))
    add("confetti-light", "Celebration Confetti (light)", bg_confetti(True, 5))
    add("confetti-dark", "Celebration Confetti (dark)", bg_confetti(False, 6))
    return out


# ── Icons (24×24 grid, stroked) ──

ICON_PATHS: dict[str, tuple[str, str]] = {
    "home": ("Home", '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    "school": ("School", '<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/><path d="M12 4V2"/>'),
    "book-open": ("Open Book", '<path d="M12 6c-2-1.5-5-2-9-2v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2z"/><path d="M12 6v14"/>'),
    "pencil": ("Pencil", '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>'),
    "lightbulb": ("Idea", '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'),
    "trophy": ("Trophy", '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3"/><path d="M12 13v4M8 20h8M10 17h4"/>'),
    "award": ("Award", '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>'),
    "star": ("Star", '<path d="M12 3l2.8 6 6.2.7-4.7 4.3 1.4 6.5L12 17.2 6.3 20.5l1.4-6.5L3 9.7 9.2 9z"/>'),
    "heart": ("Heart", '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>'),
    "shield-check": ("Shield", '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
    "lock": ("Lock", '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    "key": ("Key", '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'),
    "mail": ("Mail", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    "phone": ("Phone", '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    "chat": ("Chat", '<path d="M4 5h16v11H9l-5 4V5z"/>'),
    "calendar": ("Calendar", '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    "clock": ("Clock", '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    "bell": ("Bell", '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>'),
    "flag": ("Flag", '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>'),
    "map-pin": ("Location", '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    "users": ("People", '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M15 14.5a5 5 0 0 1 6 5.5"/>'),
    "user": ("Person", '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    "briefcase": ("Briefcase", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>'),
    "bar-chart": ("Bar Chart", '<path d="M4 20V11M10 20V4M16 20v-7M2 21h20"/>'),
    "pie-chart": ("Pie Chart", '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>'),
    "target": ("Target", '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
    "rocket": ("Rocket", '<path d="M5 19l3-1 8-8a6 6 0 0 0 3-6 6 6 0 0 0-6 3l-8 8-1 3z"/><path d="M9 15l-4 4"/><circle cx="14.5" cy="9.5" r="1"/>'),
    "grid": ("Dashboard", '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
    "settings": ("Settings", '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    "search": ("Search", '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>'),
    "download": ("Download", '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>'),
    "upload": ("Upload", '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>'),
    "link": ("Link", '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    "camera": ("Camera", '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 7l1.5-3h5L16 7"/>'),
    "video": ("Video", '<rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l7-4v12l-7-4"/>'),
    "play": ("Play", '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
    "headphones": ("Headphones", '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 15h3v5H5a1 1 0 0 1-1-1v-4zM20 15h-3v5h2a1 1 0 0 0 1-1v-4z"/>'),
    "wifi": ("Wi-Fi", '<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/>'),
    "cloud": ("Cloud", '<path d="M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 18H7z"/>'),
    "laptop": ("Laptop", '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>'),
    "tablet": ("Tablet", '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>'),
    "smartphone": ("Smartphone", '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
    "code": ("Code", '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
    "database": ("Database", '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
    "bookmark": ("Bookmark", '<path d="M6 3h12v18l-6-4-6 4V3z"/>'),
    "clipboard-check": ("Checklist", '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>'),
    "file-text": ("Document", '<path d="M6 3h8l5 5v13H6V3z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'),
    "folder": ("Folder", '<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>'),
    "help": ("Help", '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'),
    "info": ("Information", '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
    "warning": ("Warning", '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>'),
    "check-circle": ("Success", '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),
    "x-circle": ("Error", '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
    "thumbs-up": ("Thumbs Up", '<path d="M7 11v9H4v-9h3z"/><path d="M7 11l4-8a2.5 2.5 0 0 1 3 3l-1 4h6a2 2 0 0 1 2 2l-1.5 6a2 2 0 0 1-2 1.5H7"/>'),
    "graduation": ("Graduation", '<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>'),
    "globe": ("Globe", '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>'),
    "sparkles": ("Sparkles", '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'),
    "zap": ("Lightning", '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
    "smile": ("Smile", '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>'),
    "send": ("Send", '<path d="M3 11l18-8-8 18-2-8-8-2z"/>'),
    "edit": ("Edit", '<rect x="4" y="4" width="14" height="16" rx="2"/><path d="M8 9h6M8 13h4M18 10l2 2-6 6h-2v-2l6-6z"/>'),
    "accessibility": ("Accessibility", '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5M9 21l3-6 3 6"/>'),
}


def _icon_svg(body: str, colour: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke="{colour}" '
        f'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'
    )


def _icons() -> list[tuple[str, str, str, str]]:
    out = []
    for key, (name, body) in ICON_PATHS.items():
        out.append((f"icon2-{key}", name, "Icons", _icon_svg(body, RED)))
        out.append((f"icon2-{key}-dark", f"{name} (dark)", "Icons", _icon_svg(body, BLACK)))
        out.append((f"icon2-{key}-white", f"{name} (white)", "Icons", _icon_svg(body, "#ffffff")))
    return out


# ── Banners ──

BANNERS = [
    ("welcome", "Welcome", "We are glad you are here"),
    ("thank-you", "Thank You", "Your response has been recorded"),
    ("rfi", "Request for Information", "Tell us what you need"),
    ("feedback", "Feedback Survey", "Help us improve"),
    ("registration", "Registration", "Reserve your place"),
    ("evaluation", "Course Evaluation", "Share your experience"),
    ("help-desk", "Help Desk", "How can we help?"),
    ("application", "Application", "Start your application"),
]


def _banner(title: str, sub: str, p) -> str:
    return _svg(
        1200, 300,
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">{_stops(p)}</linearGradient></defs>'
        '<rect width="1200" height="300" fill="url(#g)"/>'
        '<circle cx="1060" cy="60" r="190" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>'
        '<circle cx="1060" cy="60" r="130" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>'
        '<circle cx="1130" cy="250" r="90" fill="#fff" fill-opacity=".06"/>'
        f'<text x="64" y="148" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="700" fill="#fff">{title}</text>'
        f'<text x="66" y="198" font-family="Arial,Helvetica,sans-serif" font-size="26" fill="#fff" fill-opacity=".8">{sub}</text>',
    )


def _banners() -> list[tuple[str, str, str, str]]:
    out = []
    for key, title, sub in BANNERS:
        for pal in ("Scarlet", "Charcoal", "Midnight"):
            out.append((f"banner-{key}-{pal.lower()}", f"{title} ({pal})", "Banners", _banner(title, sub, PALETTES[pal])))
    return out


# ── Badges ──

BADGES = [
    ("thank-you", "THANK YOU", ""), ("new", "NEW", ""), ("verified", "VERIFIED", "OFFICIAL"), ("certified", "CERTIFIED", "TTU ONLINE"),
    ("complete", "COMPLETE", ""), ("welcome", "WELCOME", "TTU ONLINE"), ("winner", "WINNER", "TOP PICK"), ("top-rated", "TOP RATED", "5 STARS"),
    ("open", "NOW OPEN", ""), ("closed", "CLOSED", ""), ("beta", "BETA", ""), ("priority", "PRIORITY", "URGENT"),
]


def _badge(a: str, b: str, fill: str, ink: str) -> str:
    second = f'<text x="128" y="158" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="3" fill="{ink}" fill-opacity=".85">{b}</text>' if b else ""
    size = 34 if len(a) <= 8 else 27
    y = 138 if b else 142
    return _svg(
        256, 256,
        f'<circle cx="128" cy="128" r="116" fill="{fill}"/><circle cx="128" cy="128" r="102" fill="none" stroke="{ink}" stroke-opacity=".55" stroke-width="3" stroke-dasharray="6 6"/>'
        f'<text x="128" y="{y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="{size}" font-weight="700" fill="{ink}">{a}</text>{second}',
    )


def _badges() -> list[tuple[str, str, str, str]]:
    out = []
    for key, a, b in BADGES:
        label = a.title()
        out.append((f"badge-{key}-scarlet", f"{label} (scarlet)", "Badges", _badge(a, b, RED, "#ffffff")))
        out.append((f"badge-{key}-dark", f"{label} (dark)", "Badges", _badge(a, b, BLACK, "#ffffff")))
        out.append((f"badge-{key}-light", f"{label} (light)", "Badges", _badge(a, b, "#f1f5f9", RED)))
    return out


# ── Department wordmarks ──

DEPARTMENTS = [
    ("student-services", "Student Services"), ("admissions", "Admissions"), ("financial-aid", "Financial Aid"),
    ("advising", "Academic Advising"), ("library", "Library"), ("it-help-desk", "IT Help Desk"),
    ("faculty-support", "Faculty Support"), ("online-learning", "Online Learning"), ("academic-affairs", "Academic Affairs"),
    ("research", "Research"), ("alumni", "Alumni"), ("career-services", "Career Services"), ("registrar", "Registrar"),
    ("student-success", "Student Success"), ("instructional-design", "Instructional Design"), ("accessibility", "Accessibility Services"),
    ("tutoring", "Tutoring"), ("wellness", "Wellness"), ("veterans", "Veterans Services"), ("bursar", "Bursar"),
]


def _departments() -> list[tuple[str, str, str, str]]:
    out = []
    for key, name in DEPARTMENTS:
        out.append((f"logo2-{key}", name, "Logos", _logo(name, "TTU ONLINE")))
        out.append((f"logo2-{key}-dark", f"{name} (for dark backgrounds)", "Logos", _logo(name, "TTU ONLINE", dark=True)))
    return out


EXTRA_SEEDS: list[tuple[str, str, str, str]] = _backgrounds() + _icons() + _banners() + _badges() + _departments()
