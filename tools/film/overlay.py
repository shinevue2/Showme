"""Authoring helper for the film masks (WP-03, DESIGN §7.3 step 1).

Draws a normalised coordinate grid and/or the polygons of tools/film/masks/<station>.json over the
source print, optionally zoomed into a region, so polygons can be authored by eye with the image reader.

  python3 -I tools/film/overlay.py grid  <station> <out.png> [x0 y0 x1 y1] [--step 0.05]
  python3 -I tools/film/overlay.py masks <station> <out.png> [x0 y0 x1 y1] [--layer name]
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COLS = [(230, 30, 60), (20, 140, 230), (40, 170, 60), (230, 140, 0), (150, 40, 200), (0, 170, 170), (200, 0, 140),
        (120, 90, 0), (0, 0, 0)]


def load(station):
    with open(os.path.join(ROOT, 'tools/film/masks', station + '.json')) as f:
        return json.load(f)


def src_for(station):
    m = load(station) if os.path.exists(os.path.join(ROOT, 'tools/film/masks', station + '.json')) else None
    if m:
        return os.path.join(ROOT, 'assets-src/images', m['image'])
    names = {'nihonbashi': '01-nihonbashi', 'hakone': '11-hakone', 'mishima': '12-mishima', 'hara': '14-hara',
             'shimada': '24-shimada', 'okazaki': '39-okazaki', 'shono': '46-shono'}
    return os.path.join(ROOT, 'assets-src/images/tokaido', names[station] + '.jpg')


def main():
    args = sys.argv[1:]
    mode, station, out = args[0], args[1], args[2]
    rest = args[3:]
    step = 0.05
    only = None
    box = None
    nums = []
    i = 0
    while i < len(rest):
        if rest[i] == '--step':
            step = float(rest[i + 1]); i += 2; continue
        if rest[i] == '--layer':
            only = rest[i + 1]; i += 2; continue
        nums.append(float(rest[i])); i += 1
    if len(nums) == 4:
        box = nums
    im = Image.open(src_for(station)).convert('RGB')
    W, H = im.size
    if box is None:
        box = [0, 0, 1, 1]
    x0, y0, x1, y1 = box
    crop = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    # upscale the crop to ~1600 px wide for reading
    scale = 1600 / crop.width
    crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
    cw, ch = crop.size
    d = ImageDraw.Draw(crop, 'RGBA')
    font = ImageFont.load_default(size=15)

    def tx(x):
        return (x - x0) / (x1 - x0) * cw

    def ty(y):
        return (y - y0) / (y1 - y0) * ch

    if mode == 'grid' or mode == 'masks':
        g = step if mode == 'grid' else max(step, 0.1)
        v = 0.0
        while v <= 1.0001:
            if x0 - 1e-6 <= v <= x1 + 1e-6:
                major = abs((v * 100) % 10) < 1e-6 or abs((v * 100) % 10 - 10) < 1e-6
                d.line([(tx(v), 0), (tx(v), ch)], fill=(255, 0, 80, 150 if major else 70), width=1)
                d.text((tx(v) + 2, 2), f'{v:.3f}'.rstrip('0'), fill=(255, 0, 80, 255), font=font)
            if y0 - 1e-6 <= v <= y1 + 1e-6:
                major = abs((v * 100) % 10) < 1e-6 or abs((v * 100) % 10 - 10) < 1e-6
                d.line([(0, ty(v)), (cw, ty(v))], fill=(0, 80, 255, 150 if major else 70), width=1)
                d.text((2, ty(v) + 2), f'{v:.3f}'.rstrip('0'), fill=(0, 80, 255, 255), font=font)
            v = round(v + g, 6)
    if mode == 'masks':
        m = load(station)
        for li, L in enumerate(m['layers']):
            if only and L['name'] != only:
                continue
            if 'poly' not in L:
                continue
            col = COLS[li % len(COLS)]
            pts = [(tx(p[0]), ty(p[1])) for p in L['poly']]
            d.polygon(pts, fill=col + (40,), outline=col + (255,))
            d.line(pts + [pts[0]], fill=col + (255,), width=2)
            cx = sum(p[0] for p in pts) / len(pts)
            cy = sum(p[1] for p in pts) / len(pts)
            d.text((cx, cy), L['name'], fill=col + (255,), font=ImageFont.load_default(size=22))
        for r in m.get('remove', []):
            pts = [(tx(p[0]), ty(p[1])) for p in r]
            d.polygon(pts, fill=(0, 0, 0, 90), outline=(0, 0, 0, 255))
        tp = m.get('traveller', {}).get('path')
        if tp:
            pts = [(tx(p[0]), ty(p[1])) for p in tp]
            d.line(pts, fill=(255, 0, 255, 255), width=3)
        vp = m.get('vp')
        if vp:
            d.ellipse([tx(vp[0]) - 6, ty(vp[1]) - 6, tx(vp[0]) + 6, ty(vp[1]) + 6], outline=(255, 0, 0, 255), width=3)
    crop.save(out)
    print(out, crop.size)


if __name__ == '__main__':
    main()
