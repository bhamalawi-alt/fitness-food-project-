#!/usr/bin/env python3
"""Generate FitFuel PWA icons (192/512) — emerald rounded square, white flame-ish leaf F."""
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def make_icon(size: int, path: str) -> None:
    s = size * 4  # supersample for smooth edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background: vertical emerald gradient rounded square
    top, bottom = (16, 185, 129), (5, 150, 105)
    grad = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / max(1, s - 1)
        gd.line([(0, y), (s, y)], fill=(
            int(top[0] + (bottom[0] - top[0]) * t),
            int(top[1] + (bottom[1] - top[1]) * t),
            int(top[2] + (bottom[2] - top[2]) * t),
            255,
        ))
    mask = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)

    # subtle highlight circle top-left
    hl = Image.new("L", (s, s), 0)
    hd = ImageDraw.Draw(hl)
    hd.ellipse([int(-s*0.15), int(-s*0.2), int(s*0.75), int(s*0.45)], fill=26)
    img.paste(Image.new("RGBA", (s, s), (255, 255, 255, 255)), (0, 0), hl)

    # white "F" monogram
    font = ImageFont.truetype(FONT, int(s * 0.62))
    bbox = d.textbbox((0, 0), "F", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((s - w) / 2 - bbox[0], (s - h) / 2 - bbox[1]), "F", font=font, fill=(255, 255, 255, 255))

    img = img.resize((size, size), Image.LANCZOS)
    img.save(path)
    print(f"wrote {path} ({size}x{size})")

make_icon(192, "/home/z/my-project/public/icon-192.png")
make_icon(512, "/home/z/my-project/public/icon-512.png")
# apple-touch-icon should be opaque square (no transparency handling surprises)
make_icon(180, "/home/z/my-project/public/apple-touch-icon.png")
