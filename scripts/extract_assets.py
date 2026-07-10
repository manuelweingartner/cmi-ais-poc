# Extracts app icons from INPUTS/AnwendungenMockupIcons.png and samples the
# chart palette from INPUTS/Diagramme.png. Run from repo root:
#   python scripts/extract_assets.py
from PIL import Image
from collections import Counter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "public", "icons")
os.makedirs(ICON_DIR, exist_ok=True)

GREY = (88, 100, 117)  # CMI icon/border grey #586475

# Tile boxes detected from the mockup (border rectangles of #586475):
# (name, x0, y0, x1, y1) - outer border coords, rows y 183-302 and 370-489
TILES = [
    ("favoriten", 3, 183, 123, 302),
    ("suchcenter", 138, 183, 258, 302),
    ("tektonik", 787, 183, 907, 302),
    ("magazinverwaltung", 922, 183, 1042, 302),
    ("akzessionen", 1057, 183, 1177, 302),
    ("provenienzen", 1192, 183, 1312, 302),
    ("datenuebernahme", 3, 370, 123, 489),
    ("verarbeitung", 138, 370, 258, 489),
    ("preservation", 273, 370, 393, 489),
    ("systemeinstellungen", 787, 370, 907, 489),
    ("benutzereinstellungen", 922, 370, 1042, 489),
]


def extract_icons():
    im = Image.open(os.path.join(ROOT, "INPUTS", "AnwendungenMockupIcons.png")).convert("RGB")
    px = im.load()
    for name, x0, y0, x1, y1 in TILES:
        # icon area: tile interior, above the label text (~last 35px)
        ix0, iy0, ix1, iy1 = x0 + 3, y0 + 8, x1 - 3, y1 - 40
        # bbox of dark (icon) pixels
        minx, miny, maxx, maxy = 10**6, 10**6, -1, -1
        for y in range(iy0, iy1):
            for x in range(ix0, ix1):
                r, g, b = px[x, y]
                if r < 200 and g < 210:  # darker than white/bg
                    minx, miny = min(minx, x), min(miny, y)
                    maxx, maxy = max(maxx, x), max(maxy, y)
        if maxx < 0:
            print(f"WARN no icon pixels for {name}")
            continue
        pad = 2
        crop = im.crop((minx - pad, miny - pad, maxx + 1 + pad, maxy + 1 + pad))
        w, h = crop.size
        cp = crop.load()
        # alpha from darkness relative to white; color fixed to CMI grey
        grey_out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        white_out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        go, wo = grey_out.load(), white_out.load()
        for y in range(h):
            for x in range(w):
                r, g, b = cp[x, y]
                # white bg r=255 -> alpha 0; icon grey r=88 -> alpha 255
                a = (255 - r) / (255 - GREY[0])
                a = max(0.0, min(1.0, a))
                aa = int(round(a * 255))
                go[x, y] = (*GREY, aa)
                wo[x, y] = (255, 255, 255, aa)
        # upscale 2x for crispness
        grey_out.resize((w * 2, h * 2), Image.LANCZOS).save(os.path.join(ICON_DIR, f"{name}.png"))
        white_out.resize((w * 2, h * 2), Image.LANCZOS).save(os.path.join(ICON_DIR, f"{name}-white.png"))
        print(f"icon {name}: {w}x{h}")


def sample_palette():
    im = Image.open(os.path.join(ROOT, "INPUTS", "Diagramme.png")).convert("RGB")
    W, H = im.size
    # collect saturated/distinct colors across the whole image
    counts = Counter()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            c = im.getpixel((x, y))
            counts[c] += 1
    # filter: skip near-white/near-page-bg, keep colored + greys used by charts
    def interesting(c):
        r, g, b = c
        if r > 235 and g > 235 and b > 235:
            return False
        return True
    top = [(c, n) for c, n in counts.most_common(400) if interesting(c)]
    print("Top chart colors (rgb hex count):")
    seen = []
    for c, n in top:
        # dedupe similar
        if any(abs(c[0]-s[0]) + abs(c[1]-s[1]) + abs(c[2]-s[2]) < 30 for s in seen):
            continue
        seen.append(c)
        print(f"  #{c[0]:02X}{c[1]:02X}{c[2]:02X}  rgb{c}  n={n}")
        if len(seen) >= 12:
            break


if __name__ == "__main__":
    extract_icons()
    sample_palette()
