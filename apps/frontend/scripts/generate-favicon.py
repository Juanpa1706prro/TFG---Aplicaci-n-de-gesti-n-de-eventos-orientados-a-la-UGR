"""
Favicon de pestaña = logo UGR en círculo de contraste (legible en pestañas oscuras).
Apple-touch = logo sin círculo, a mayor tamaño.

  python apps/frontend/scripts/generate-favicon.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "ugr-eventos-logo.png"

# Design tokens UGR Eventos
CIRCLE_FILL = "#ffffff"
CIRCLE_BORDER = "#9b002e"
LOGO_FRAC_IN_CIRCLE = 0.68


def content_bbox(im: Image.Image, alpha_threshold: int = 24) -> tuple[int, int, int, int]:
    w, h = im.size
    pixels = im.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < alpha_threshold:
                continue
            if r + g + b < 35:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if max_x <= min_x or max_y <= min_y:
        box = im.getbbox()
        return box if box else (0, 0, w, h)
    return min_x, min_y, max_x + 1, max_y + 1


def logo_mark_square(im: Image.Image) -> Image.Image:
    """Solo el hexágono (sin bandas negras del lienzo ancho)."""
    left, top, right, bottom = content_bbox(im)
    content = im.crop((left, top, right, bottom))
    cw, ch = content.size
    side = max(cw, ch)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - cw) // 2
    oy = (side - ch) // 2
    canvas.paste(content, (ox, oy), content)
    return canvas


def fit_logo_plain(mark: Image.Image, size: int, padding: float = 0.04) -> Image.Image:
    """Logo sin halo (apple-touch, PWA)."""
    inner = max(1, int(size * (1 - 2 * padding)))
    fitted = mark.resize((inner, inner), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = (size - inner) // 2
    canvas.paste(fitted, (offset, offset), fitted)
    return canvas


def fit_logo_with_circle(mark: Image.Image, size: int) -> Image.Image:
    """Pestaña: círculo blanco + borde granate para contraste en tabs oscuras."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    cx = size / 2
    cy = size / 2
    r_outer = size / 2 - 0.5

    draw.ellipse(
        (cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer),
        fill=CIRCLE_FILL,
    )
    border_w = max(1, int(round(size * 0.0625)))
    draw.ellipse(
        (cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer),
        outline=CIRCLE_BORDER,
        width=border_w,
    )

    inner = max(1, int(size * LOGO_FRAC_IN_CIRCLE))
    fitted = mark.resize((inner, inner), Image.Resampling.LANCZOS)
    if size <= 48:
        fitted = ImageEnhance.Contrast(fitted).enhance(1.06)
        fitted = ImageEnhance.Sharpness(fitted).enhance(1.12)

    offset = (size - inner) // 2
    canvas.paste(fitted, (offset, offset), fitted)
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"No se encuentra {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    mark = logo_mark_square(src)

    master = fit_logo_with_circle(mark, 256)

    tab_sizes = {
        "favicon-16.png": 16,
        "favicon-32.png": 32,
        "favicon-48.png": 48,
    }
    for name, px in tab_sizes.items():
        icon = master.resize((px, px), Image.Resampling.LANCZOS)
        if px <= 32:
            icon = ImageEnhance.Sharpness(icon).enhance(1.08)
        icon.save(PUBLIC / name, format="PNG", optimize=True)

    ico_sizes = [16, 32, 48]
    ico_images = [
        master.resize((s, s), Image.Resampling.LANCZOS) for s in ico_sizes
    ]
    ico_images[0].save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=ico_images[1:],
    )

    for name, px in {
        "ugr-eventos-icon.png": 192,
        "apple-touch-icon.png": 180,
    }.items():
        fit_logo_plain(mark, px, padding=0.04).save(PUBLIC / name, format="PNG", optimize=True)

    # Logo recortado (hexágono) para auth, sidebar, etc. — no usar el PNG ancho.
    fit_logo_plain(mark, 512, padding=0.02).save(
        PUBLIC / "ugr-eventos-mark.png", format="PNG", optimize=True
    )

    svg_path = PUBLIC / "favicon.svg"
    if svg_path.exists():
        svg_path.unlink()

    print("OK: favicon (circulo), ugr-eventos-mark.png, apple-touch")


if __name__ == "__main__":
    main()
