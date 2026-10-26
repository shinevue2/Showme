"""Film plates — DESIGN §7.3 step 2 (owner WP-03).

Python 3.12 + Pillow only (run with `python3 -I tools/film/plates.py [station …] [--preview]`).

For every station mask (tools/film/masks/<station>.json):
  1. crop the print, white-balance its aged paper to the cool paper #F7FCFE, upscale to ≤ 2048 px wide
     (plus authored extension margins beyond the print edge, filled by push-pull inpainting);
  2. split the print the way a woodblock is cut: a KEY LINE (adaptive dark-line threshold → plate 1 紺) and
     COLOUR FIELDS (lines inpainted away, median-smoothed, quantize(48, MEDIANCUT), every cluster mapped to the
     nearest colour of P_k and of P_{k-1} by CIEDE2000, ModeFilter to remove speckle);
  3. per depth layer: anti-aliased polygon mask at 4× supersampling, refined along the cut by flooding through
     background-coloured field pixels (so the cut follows the drawing), smoothed; regions hidden by nearer layers
     and `remove[]` polygons (Mishima's torii …) are inpainted from the layer's own surroundings before
     quantising, so parallax never reveals a ghost;
  4. writes PNG-8 plates `assets-src/film/plates/<station>/<layer>.<k>.png` and `<layer>.<k-1>.png`, a soft
     contact-shadow alpha `<layer>.shadow.png`, and `assets-src/film/plates/plates.json` for the scene.
Sky layers are not cut from the print: they are procedural bokashi gradients described in the mask JSON.
"""
import json
import math
import os
import sys
import time

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MASKS = os.path.join(ROOT, 'tools/film/masks')
OUT = os.path.join(ROOT, 'assets-src/film/plates')
STATIONS = ['nihonbashi', 'hakone', 'mishima', 'hara', 'shimada', 'okazaki', 'shono']

PAPER = (0xF7, 0xFC, 0xFE)
PLATES = ['#0F2540', '#5DAC81', '#91989F', '#F4A7B9', '#A5DEE4', '#205C81', '#656765', '#FFB11B']
MAX_W = 2048


# ---------------------------------------------------------------- colour science (pure Python)
def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def srgb_to_lab(c):
    def lin(u):
        u /= 255.0
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(x) for x in c)
    X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b)
    Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def ciede2000(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    else:
        hbp = (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dth = 30 * math.exp(-((hbp - 275) / 25) ** 2)
    RC = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    SL = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    SC = 1 + 0.045 * Cbp
    SH = 1 + 0.015 * Cbp * T
    RT = -math.sin(math.radians(2 * dth)) * RC
    return math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH))


TINTS = (('', 0.0), ('a', 0.25), ('h', 0.5), ('q', 0.75))   # plate at 100 / 75 / 50 / 25 % over paper


def palette(k):
    """P_k = cool paper + plates 1…k, each at full strength and as paper tints (50 % per DESIGN §7.2, plus 75 %
    and 25 % steps so the quantised plates keep the tonal depth of a real impression).
    Names: paper, p1, p1a (75 %), p1h (50 %), p1q (25 %), p2 …"""
    names, cols = ['paper'], [PAPER]
    for i in range(1, k + 1):
        c = hx(PLATES[i - 1])
        for suf, t in TINTS:
            names.append(f'p{i}{suf}')
            cols.append(mix(c, PAPER, t))
    return names, cols


# ---------------------------------------------------------------- Pillow helpers (C-level ops only)
def lut255(fn):
    return [max(0, min(255, int(round(fn(v))))) for v in range(256)]


def thresh(img, t):
    return img.point(lambda v: 255 if v >= t else 0)


def m_and(a, b):
    return ImageChops.darker(a, b)


def m_or(a, b):
    return ImageChops.lighter(a, b)


def m_not(a):
    return ImageChops.invert(a)


def dilate(m, px):
    """Binary dilation by ~px pixels (blur + threshold keeps it fast for any radius)."""
    if px <= 0:
        return m
    if px <= 2:
        for _ in range(px):
            m = m.filter(ImageFilter.MaxFilter(3))
        return m
    return thresh(m.filter(ImageFilter.GaussianBlur(px * 0.5)), 8)


def erode(m, px):
    return m_not(dilate(m_not(m), px))


def inpaint(rgb, known, smooth=0):
    """Push-pull fill of the pixels where `known` is 0 from the known ones (weighted pyramid); `smooth` blurs
    only the filled pixels so coarse pyramid levels never leave blocky steps."""
    a = rgb.convert('RGBA')
    a.putalpha(known)
    pyr = [a]
    while min(pyr[-1].size) > 2:
        cur = pyr[-1]
        w, h = cur.size
        s = cur.convert('RGBa').resize(((w + 1) // 2, (h + 1) // 2), Image.BOX).convert('RGBA')
        s.putalpha(s.getchannel('A').point(lambda v: 255 if v > 0 else 0))
        pyr.append(s)
    top = pyr[-1]
    if top.getchannel('A').getextrema()[1] == 0:
        return rgb.copy()
    cur = top.convert('RGB')
    for lvl in reversed(pyr[:-1]):
        up = cur.resize(lvl.size, Image.BILINEAR)
        cur = Image.composite(lvl.convert('RGB'), up, lvl.getchannel('A'))
    if smooth:
        blurred = cur.filter(ImageFilter.GaussianBlur(smooth))
        cur = Image.composite(cur, blurred, known.filter(ImageFilter.GaussianBlur(max(1, smooth * 0.35))))
        cur = Image.composite(rgb.convert('RGB'), cur, known)
    return cur


def drop_small(mask, min_px):
    """Remove 8-connected components smaller than min_px from a binary L mask (pure Python BFS over set pixels)."""
    W, H = mask.size
    work = bytearray(mask.tobytes())
    out = bytearray(len(work))
    pos = 0
    n = len(work)
    while True:
        i = work.find(255, pos)
        if i < 0:
            break
        pos = i
        comp = [i]
        work[i] = 0
        stack = [i]
        while stack:
            j = stack.pop()
            y, x = divmod(j, W)
            for dy in (-1, 0, 1):
                yy = y + dy
                if yy < 0 or yy >= H:
                    continue
                base = yy * W
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < W:
                        k = base + xx
                        if work[k]:
                            work[k] = 0
                            stack.append(k)
                            comp.append(k)
        if len(comp) >= min_px:
            for k in comp:
                out[k] = 255
    return Image.frombytes('L', (W, H), bytes(out))


def poly_mask(size, polys, ss=4):
    """Anti-aliased union of polygons (canvas pixel coords) rendered at ss× inside their bounding box only."""
    W, H = size
    out = Image.new('L', (W, H), 0)
    xs = [x for p in polys for x, _ in p]
    ys = [y for p in polys for _, y in p]
    x0, y0 = max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2)
    x1, y1 = min(W, int(max(xs)) + 3), min(H, int(max(ys)) + 3)
    if x1 <= x0 or y1 <= y0:
        return out
    big = Image.new('L', ((x1 - x0) * ss, (y1 - y0) * ss), 0)
    d = ImageDraw.Draw(big)
    for p in polys:
        d.polygon([((x - x0) * ss, (y - y0) * ss) for x, y in p], fill=255)
    out.paste(big.resize((x1 - x0, y1 - y0), Image.BOX), (x0, y0))
    return out


def fill_vertical(img, mask):
    """Fill masked pixels by interpolating each column between the nearest known pixels above and below
    (keeps vertical structure such as the stripes of Nihonbashi's kido gates)."""
    bb = mask.getbbox()
    out = img.copy()
    if not bb:
        return out
    W, H = img.size
    mp = mask.load()
    ip = img.load()
    op = out.load()
    for x in range(bb[0], bb[2]):
        y = bb[1]
        while y < bb[3]:
            if mp[x, y] > 127:
                y0 = y
                while y < H and mp[x, y] > 127:
                    y += 1
                a = ip[x, y0 - 1] if y0 > 0 else ip[x, min(H - 1, y)]
                b = ip[x, y] if y < H else a
                n = y - y0 + 1
                for k in range(y0, y):
                    t = (k - y0 + 1) / n
                    op[x, k] = tuple(int(a[c] + (b[c] - a[c]) * t) for c in range(3))
            else:
                y += 1
    return out


def despeckle(idx, r=5):
    """Merge colour islands thinner than ~r px into their surroundings: per colour a morphological opening
    (C-level Min/Max filters); pixels no opening keeps are re-inked from a wide mode filter. Smooths the
    pixel-jagged boundaries of quantised fields too — a woodblock colour field has no specks."""
    hist = idx.histogram()
    keep = Image.new('L', idx.size, 0)
    for c, n in enumerate(hist):
        if n == 0:
            continue
        lut = [0] * 256
        lut[c] = 255
        m = idx.point(lut)
        keep = m_or(keep, m.filter(ImageFilter.MinFilter(r)).filter(ImageFilter.MaxFilter(r)))
    out = idx
    for _ in range(3):
        wide = out.filter(ImageFilter.ModeFilter(9))
        out = Image.composite(idx, wide, keep)
        keep = m_or(keep, keep.filter(ImageFilter.MaxFilter(3)))
    return out


def _pad_axis(img, before, after):
    """Extend img left/right by `before`/`after` px: each margin column repeats the edge column blurred along
    the edge with a radius that grows with the distance from the print (a soft, calm continuation)."""
    w, h = img.size
    out = Image.new('RGB', (w + before + after, h))
    out.paste(img, (before, 0))
    levels = [0, 3, 8, 18, 36, 70, 130, 240]
    for side, n in (('l', before), ('r', after)):
        if n <= 0:
            continue
        col = img.crop((0, 0, 2, h) if side == 'l' else (w - 2, 0, w, h)).resize((1, h), Image.BOX)
        blurred = [col if r == 0 else col.filter(ImageFilter.GaussianBlur(r)) for r in levels]
        for d in range(n):
            r = 0.55 * d
            i = 0
            while i < len(levels) - 2 and levels[i + 1] < r:
                i += 1
            t = min(1.0, max(0.0, (r - levels[i]) / max(1e-6, levels[i + 1] - levels[i])))
            c = Image.blend(blurred[i], blurred[i + 1], t)
            x = before - 1 - d if side == 'l' else before + w + d
            out.paste(c, (x, 0))
    return out


def clamp_pad(img, W, H, x0, y0):
    """Place img at (x0, y0) in a W×H canvas; margins continue its edges (rows first, then columns)."""
    w, h = img.size
    a = _pad_axis(img, x0, W - x0 - w)
    b = _pad_axis(a.transpose(Image.Transpose.TRANSPOSE), y0, H - y0 - h).transpose(Image.Transpose.TRANSPOSE)
    return b


def drop_small(mask, min_px):
    """Remove 8-connected components smaller than min_px from a binary L mask (pure Python BFS over set pixels)."""
    W, H = mask.size
    work = bytearray(mask.tobytes())
    out = bytearray(len(work))
    pos = 0
    n = len(work)
    while True:
        i = work.find(255, pos)
        if i < 0:
            break
        pos = i
        comp = [i]
        work[i] = 0
        stack = [i]
        while stack:
            j = stack.pop()
            y, x = divmod(j, W)
            for dy in (-1, 0, 1):
                yy = y + dy
                if yy < 0 or yy >= H:
                    continue
                base = yy * W
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < W:
                        k = base + xx
                        if work[k]:
                            work[k] = 0
                            stack.append(k)
                            comp.append(k)
        if len(comp) >= min_px:
            for k in comp:
                out[k] = 255
    return Image.frombytes('L', (W, H), bytes(out))


def poly_mask(size, polys, ss=4):
    """Anti-aliased union of polygons (canvas pixel coords) rendered at ss× inside their bounding box only."""
    W, H = size
    out = Image.new('L', (W, H), 0)
    xs = [x for p in polys for x, _ in p]
    ys = [y for p in polys for _, y in p]
    x0, y0 = max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2)
    x1, y1 = min(W, int(max(xs)) + 3), min(H, int(max(ys)) + 3)
    if x1 <= x0 or y1 <= y0:
        return out
    big = Image.new('L', ((x1 - x0) * ss, (y1 - y0) * ss), 0)
    d = ImageDraw.Draw(big)
    for p in polys:
        d.polygon([((x - x0) * ss, (y - y0) * ss) for x, y in p], fill=255)
    out.paste(big.resize((x1 - x0, y1 - y0), Image.BOX), (x0, y0))
    return out


def fill_vertical(img, mask):
    """Fill masked pixels by interpolating each column between the nearest known pixels above and below
    (keeps vertical structure such as the stripes of Nihonbashi's kido gates)."""
    bb = mask.getbbox()
    out = img.copy()
    if not bb:
        return out
    W, H = img.size
    mp = mask.load()
    ip = img.load()
    op = out.load()
    for x in range(bb[0], bb[2]):
        y = bb[1]
        while y < bb[3]:
            if mp[x, y] > 127:
                y0 = y
                while y < H and mp[x, y] > 127:
                    y += 1
                a = ip[x, y0 - 1] if y0 > 0 else ip[x, min(H - 1, y)]
                b = ip[x, y] if y < H else a
                n = y - y0 + 1
                for k in range(y0, y):
                    t = (k - y0 + 1) / n
                    op[x, k] = tuple(int(a[c] + (b[c] - a[c]) * t) for c in range(3))
            else:
                y += 1
    return out


def mirror_pad(img, W, H, x0, y0):
    """Place img at (x0, y0) in a W×H canvas and fill the margins by mirroring it across its edges."""
    w, h = img.size
    from PIL import ImageOps
    fx, fy, fxy = ImageOps.mirror(img), ImageOps.flip(img), ImageOps.flip(ImageOps.mirror(img))
    out = Image.new('RGB', (W, H))
    for j in range(-2, 3):
        for i in range(-2, 3):
            tile = img if (i % 2 == 0 and j % 2 == 0) else fx if j % 2 == 0 else fy if i % 2 == 0 else fxy
            ox, oy = x0 + i * w, y0 + j * h
            if ox + w <= 0 or oy + h <= 0 or ox >= W or oy >= H:
                continue
            out.paste(tile, (ox, oy))
    return out


def smooth_curve(pts, closed=True, sub=6):
    """Catmull-Rom through authored points → smooth cut lines (no straight polygon facets)."""
    n = len(pts)
    if n < 3:
        return pts
    out = []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed else pts[max(i - 1, 0)]
        p1 = pts[i]
        p2 = pts[(i + 1) % n] if closed else pts[min(i + 1, n - 1)]
        p3 = pts[(i + 2) % n] if closed else pts[min(i + 2, n - 1)]
        for s in range(sub):
            t = s / sub
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    if not closed:
        out.append(pts[-1])
    return out


def sky_colour(stops, y, which='stops'):
    """Bokashi gradient: stops = [[y, plate, amount], …]; amount mixes the plate over paper (0 = paper)."""
    def col(st):
        _, pl, amt = st
        if pl == 0 or amt == 0:
            return PAPER
        return mix(PAPER, hx(PLATES[pl - 1]), amt)
    if y <= stops[0][0]:
        return col(stops[0])
    for a, b in zip(stops, stops[1:]):
        if a[0] <= y <= b[0]:
            t = (y - a[0]) / max(1e-6, b[0] - a[0])
            t = t * t * (3 - 2 * t)
            ca, cb = col(a), col(b)
            return tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return col(stops[-1])


# ---------------------------------------------------------------- station processing
class Station:
    def __init__(self, m):
        self.m = m
        self.id = m['station']
        self.k = m['k']
        src = Image.open(os.path.join(ROOT, 'assets-src/images', m['image'])).convert('RGB')
        self.srcW, self.srcH = src.size
        cx0, cy0, cx1, cy1 = m['crop']
        ext = m.get('extend', [0, 0, 0, 0])            # l, t, r, b in units of the crop width / height
        self.ext = ext
        # canvas = crop box + extension margins, in normalised source coords
        self.nx0 = cx0 - ext[0] * (cx1 - cx0)
        self.ny0 = cy0 - ext[1] * (cy1 - cy0)
        self.nx1 = cx1 + ext[2] * (cx1 - cx0)
        self.ny1 = cy1 + ext[3] * (cy1 - cy0)
        cropW = (cx1 - cx0) * self.srcW
        self.scale = min(MAX_W / cropW, m.get('maxScale', 1.6))   # the print itself at ≤ 2048 px
        self.W = int(round((self.nx1 - self.nx0) * self.srcW * self.scale)) // 2 * 2
        self.H = int(round((self.ny1 - self.ny0) * self.srcH * self.scale)) // 2 * 2
        # print area inside the canvas (pixels)
        self.px0 = int(round((cx0 - self.nx0) * self.srcW * self.scale))
        self.py0 = int(round((cy0 - self.ny0) * self.srcH * self.scale))
        cw = int(round(cropW * self.scale))
        chh = int(round((cy1 - cy0) * self.srcH * self.scale))
        crop = src.crop((int(round(cx0 * self.srcW)), int(round(cy0 * self.srcH)),
                         int(round(cx1 * self.srcW)), int(round(cy1 * self.srcH))))
        crop = crop.resize((cw, chh), Image.LANCZOS)
        crop = self.white_balance(crop)
        def cpx(p):
            return ((p[0] - cx0) * self.srcW * self.scale, (p[1] - cy0) * self.srcH * self.scale)
        removes = []
        for r in m.get('remove', []):
            removes.append(r if isinstance(r, dict) else {'poly': r, 'fill': 'pp'})
        # the printed border's cut corners (and any border remnants) must never be mirrored into the margins
        cs = m.get('corners', 0.05)
        if cs:
            ax, ay = cs, cs * 1.5
            for (qx, qy) in ((cx0, cy0), (cx1 - ax, cy0), (cx0, cy1 - ay), (cx1 - ax, cy1 - ay)):
                removes.append({'poly': [[qx - 0.01, qy - 0.01], [qx + ax, qy - 0.01], [qx + ax, qy + ay], [qx - 0.01, qy + ay]], 'fill': 'pp', 'raw': True})
        for r in removes:
            # inpaint removed motifs (Mishima's torii and lanterns, signatures, seals, border corners) out of the
            # print before mirror padding, so neither key line, colour field, key-out nor the margins see them
            pts = [cpx(p) for p in r['poly']]
            rm = thresh(poly_mask(crop.size, [pts if r.get('raw') else smooth_curve(pts)]), 128)
            rm = dilate(rm, 3)
            if r.get('fill') == 'v':
                filled = fill_vertical(crop, rm)
            else:
                filled = inpaint(crop, m_not(rm), smooth=5)
            crop = Image.composite(filled, crop, rm)
        self.canvas = clamp_pad(crop, self.W, self.H, self.px0, self.py0)
        self.inside = Image.new('L', (self.W, self.H), 0)
        self.inside.paste(255, (self.px0, self.py0, min(self.W, self.px0 + cw), min(self.H, self.py0 + chh)))
        self.printbox = (self.px0, self.py0, min(self.W, self.px0 + cw), min(self.H, self.py0 + chh))
        # beyond the print the canvas continues the print's edges with growing blur (clamp_pad),
        # so everything is 'known' for inpainting; `inside` still marks the print proper
        self.inside_known = Image.new('L', (self.W, self.H), 255)
        self.names_k, self.cols_k = palette(self.k)
        self.names_p, self.cols_p = palette(max(self.k - 1, 1))

    # normalised source coords → canvas pixels
    def to_px(self, p):
        return ((p[0] - self.nx0) * self.srcW * self.scale, (p[1] - self.ny0) * self.srcH * self.scale)

    def poly_px(self, poly, smooth=True):
        pts = [self.to_px(p) for p in poly]
        return smooth_curve(pts) if smooth else pts

    def white_balance(self, img):
        lv = self.m.get('levels', {})
        paper = lv.get('paper', [235, 226, 204])
        black = lv.get('black', 0) / 255.0
        gamma = lv.get('gamma', 1.0)
        sat = lv.get('saturation', 1.0)
        chans = []
        for ci, ch in enumerate(img.split()):
            pw = paper[ci] / 255.0
            tgt = PAPER[ci]

            def f(v, pw=pw, tgt=tgt):
                x = (v / 255.0 - black) / max(1e-3, pw - black)
                x = max(0.0, x) ** gamma
                return x * tgt
            chans.append(ch.point(lut255(f)))
        out = Image.merge('RGB', chans)
        lo, hi = lv.get('lo', 0.0), lv.get('hi', 1.0)
        if lo or hi != 1.0:
            out = out.point(lut255(lambda v: (v / 255.0 - lo) / (hi - lo) * 255.0) * 3)
        if sat != 1.0:
            from PIL import ImageEnhance
            out = ImageEnhance.Color(out).enhance(sat)
        return out

    # ------------------------------------------------------------ key line + colour fields
    def analyse(self):
        m = self.m
        lp = m.get('line', {})
        W, H = self.W, self.H
        g = self.canvas.convert('L')
        if lp.get('enabled', True):
            # adaptive dark-line threshold on a 2× bicubic upsample → smooth contours after box downsampling
            g2 = g.resize((W * 2, H * 2), Image.BICUBIC).filter(ImageFilter.GaussianBlur(lp.get('pre', 1.2)))
            loc = g2.filter(ImageFilter.GaussianBlur(lp.get('blur', 14)))
            diff = ImageChops.subtract(loc, g2)
            l2 = m_and(thresh(diff, lp.get('delta', 16)), g2.point(lambda v: 255 if v < lp.get('abs', 160) else 0))
            l2 = l2.filter(ImageFilter.MedianFilter(5))
            cov = l2.resize((W, H), Image.BOX)
            lb = m_and(thresh(cov, lp.get('cov', 110)), self.inside)
            lb = drop_small(lb, int(lp.get('minPx', 24) * self.scale * self.scale))
        else:
            lb = Image.new('L', (W, H), 0)
        self.line = lb
        # colour fields: lines inpainted away, iterated median at half resolution (edge-preserving, removes
        # paper fibre and baren texture), bicubic back up so the quantised contours stay smooth
        sm = m.get('smooth', {})
        hw, hh = W // 2, H // 2
        half = self.canvas.resize((hw, hh), Image.BOX)
        known = m_not(dilate(lb, 1)).resize((hw, hh), Image.BOX).point(lambda v: 255 if v > 250 else 0)
        fh = inpaint(half, known, smooth=4)
        for _ in range(sm.get('iters', 5)):
            fh = fh.filter(ImageFilter.MedianFilter(sm.get('median', 5)))
        self.fields_half = fh
        self.fields = fh.resize((W, H), Image.BICUBIC)
        self.q = self.fields.quantize(48, method=Image.Quantize.MEDIANCUT)
        qp = self.q.getpalette()[:48 * 3]
        self.clusters = [tuple(qp[i * 3:i * 3 + 3]) for i in range(48)]
        self.lut_k = self.cluster_lut(self.cols_k, self.names_k)
        self.lut_p = self.cluster_lut(self.cols_p, self.names_p) if self.k > 1 else None

    def cluster_lut(self, cols, names, allow=None):
        bias = self.m.get('bias', {})
        forbid = set(self.m.get('forbid', []))
        labs = [srgb_to_lab(c) for c in cols]
        lut = []
        for c in self.clusters:
            lab = srgb_to_lab(c)
            best, bd = 0, 1e9
            for j, pl in enumerate(labs):
                if names[j] in forbid or (allow is not None and names[j] not in allow):
                    continue
                d = ciede2000(lab, pl) * bias.get(names[j], 1.0)
                if d < bd:
                    best, bd = j, d
            lut.append(best)
        return lut + [0] * (256 - len(lut))

    def layer_luts(self, l):
        """Per-layer palette restriction (`palette`, `palettePrev`): a fog bank printed in two or three tints reads
        as flat silhouettes, as in the print, instead of a mottle of every tone the bokashi passes through."""
        allow = l.get('palette')
        if not allow:
            return self.lut_k, self.lut_p
        lk = self.cluster_lut(self.cols_k, self.names_k, set(allow))
        lp = None
        if self.lut_p:
            ap = l.get('palettePrev') or [n for n in allow if n in self.names_p] + ['p1q', 'p1h']
            lp = self.cluster_lut(self.cols_p, self.names_p, set(ap))
        return lk, lp

    def map_fields(self, rgb, lut):
        """RGB field image → palette index image (L) via the station cluster palette and a CIEDE2000 LUT."""
        q = rgb.quantize(palette=self.q, dither=Image.Dither.NONE)
        idx = Image.frombytes('L', q.size, q.tobytes()).point(lut)
        sm = self.m.get('smooth', {})
        for _ in range(sm.get('modePasses', 2)):
            idx = idx.filter(ImageFilter.ModeFilter(sm.get('mode', 5)))
        r = sm.get('despeckle', 5)
        if r:
            idx = despeckle(idx, r)
        return idx

    # ------------------------------------------------------------ layers
    def build_layers(self):
        m = self.m
        L = [l for l in m['layers'] if l.get('kind', 'cut') == 'cut']
        L.sort(key=lambda l: l['z'])                               # back → front
        self.layers = L
        size = (self.W, self.H)
        raw = {}
        for l in L:
            sm = l.get('smooth', True)
            polys = [self.poly_px(l['poly'], sm)] + [self.poly_px(p, sm) for p in l.get('add', [])]
            mask = poly_mask(size, polys)
            for p in l.get('cut', []):
                mask = m_and(mask, m_not(poly_mask(size, [self.poly_px(p, sm)])))
            raw[l['name']] = mask
        idx_all = self.map_fields(self.fields, self.lut_k)
        self.idx_all = idx_all
        remove = None
        alphas = {}
        for l in L:
            a = thresh(raw[l['name']], 128)
            key = l.get('key')
            if key:
                names = l.get('keyOut', ['paper'])
                kl = [0] * 256
                for n in names:
                    if n in self.names_k:
                        kl[self.names_k.index(n)] = 255
                if l.get('blur'):
                    # blurred layers decide their silhouette on the blurred field too (soft fog banks, not blotches)
                    fb = self.fields_half.filter(ImageFilter.GaussianBlur(l['blur'] * self.scale / 2)).resize((self.W, self.H), Image.BICUBIC)
                    keymask = self.map_fields(fb, self.lut_k).point(kl)
                else:
                    keymask = idx_all.point(kl)
                if not l.get('keyLines'):
                    keymask = m_and(keymask, m_not(self.line))
                if remove is not None:
                    keymask = m_or(keymask, m_and(remove, a)) if l.get('keyRemoved') else keymask
                if key == 'all':
                    removed = m_and(keymask, a)
                else:
                    px = int(l.get('edgePx', 28) * self.scale)
                    bb = a.getbbox() or (0, 0, 1, 1)
                    bb = (max(0, bb[0] - 4), max(0, bb[1] - 4), min(self.W, bb[2] + 4), min(self.H, bb[3] + 4))
                    ac = a.crop(bb)
                    region = m_not(ac)
                    passable = m_or(keymask.crop(bb), region)
                    for _ in range(px):
                        region = m_and(region.filter(ImageFilter.MaxFilter(3)), passable)
                    removed = Image.new('L', a.size, 0)
                    removed.paste(m_and(region, ac), bb[:2])
                a = m_and(a, m_not(removed))
                cl = l.get('clean', 2)
                if cl:
                    a = a.filter(ImageFilter.MedianFilter(2 * cl + 1))
            if l.get('minBlob'):
                a = drop_small(a, int(l['minBlob'] * self.scale * self.scale))
            if l.get('fillHoles'):
                a = m_not(drop_small(m_not(a), int(l['fillHoles'] * self.scale * self.scale)))
            a = thresh(a.filter(ImageFilter.GaussianBlur(l.get('soft', 1.4))), 128)
            alphas[l['name']] = a
        self.alphas = alphas
        results = []
        not_line = m_not(dilate(self.line, 1))
        for i, l in enumerate(L):
            a = alphas[l['name']]
            bb = a.getbbox()
            if not bb:
                continue
            pad = 12
            bb = (max(0, bb[0] - pad) // 2 * 2, max(0, bb[1] - pad) // 2 * 2,
                  min(self.W, (bb[2] + pad + 1) // 2 * 2), min(self.H, (bb[3] + pad + 1) // 2 * 2))
            nearer = Image.new('L', size, 0)
            for l2 in L[i + 1:]:
                if l2.get('occludes', True) and l2['z'] > l['z'] + 1e-6:
                    nearer = m_or(nearer, alphas[l2['name']])
            # holes = exactly what nearer plates cover (+1 px for their anti-aliasing): a wider pad would leave a
            # light ring of inpainted colour around every front object at rest
            hole = dilate(nearer, max(1, int(l.get('holePad', 0.5) * self.scale)))
            if remove is not None and not l.get('keepRemoved'):
                hole = m_or(hole, dilate(remove, 2))
            # margins: a margin pixel is known only if the print-edge pixel it continues belongs to this layer
            # (otherwise the clamp would smear an occluding layer's colour into this one)
            k_in = m_and(m_and(m_and(a, m_not(hole)), self.inside), not_line)
            pb = self.printbox
            k_crop = k_in.crop(pb).convert('RGB')
            k_pad = clamp_pad(k_crop, self.W, self.H, pb[0], pb[1]).convert('L').point(lambda v: 255 if v > 250 else 0)
            known = m_and(m_and(a, m_or(k_in, m_and(k_pad, m_not(self.inside)))), m_not(hole))
            kc = known.crop(bb)
            if kc.getextrema()[1] == 0:
                kc = m_and(a, self.inside).crop(bb)
            hb = (bb[0] // 2, bb[1] // 2, bb[2] // 2, bb[3] // 2)
            fh = self.fields_half.crop(hb)
            kh = kc.resize(fh.size, Image.BOX).point(lambda v: 255 if v > 250 else 0)
            if kh.getextrema()[1] == 0:
                kh = kc.resize(fh.size, Image.BOX).point(lambda v: 255 if v > 0 else 0)
            filled = inpaint(fh, kh, smooth=l.get('fillSmooth', 16))
            if l.get('blur'):
                # broad, calm surfaces (water, ground): a wide blur turns texture into clean bokashi bands
                filled = filled.filter(ImageFilter.GaussianBlur(l['blur'] * self.scale / 2))
            filled = filled.resize((bb[2] - bb[0], bb[3] - bb[1]), Image.BICUBIC)
            if not l.get('blur'):
                filled = Image.composite(self.fields.crop(bb), filled, kc)
            ac = a.crop(bb)
            line = m_and(m_and(self.line.crop(bb), ac), m_not(hole.crop(bb)))
            if l.get('noLines'):
                line = Image.new('L', ac.size, 0)
            lut_k, lut_p = self.layer_luts(l)
            idx_k = self.map_fields(filled, lut_k)
            idx_p = self.map_fields(filled, lut_p) if lut_p else None
            if l.get('remap'):
                # re-ink a surface with this chapter's plate (e.g. Shimada's river → 瓶覗) in the P_k impression only
                rl = list(range(256))
                for a_, b_ in l['remap'].items():
                    rl[self.names_k.index(a_)] = self.names_k.index(b_)
                idx_k = idx_k.point(rl)
            if l.get('vbands'):
                # stepped bokashi (e.g. a lake deepening towards the viewer): horizontal bands of palette colours
                vb = Image.new('L', ac.size, 0)
                d_ = ImageDraw.Draw(vb)
                for bi, (yv, nm) in enumerate(l['vbands']):
                    y0p = self.to_px([0, yv])[1] - bb[1]
                    y1p = (self.to_px([0, l['vbands'][bi + 1][0]])[1] - bb[1]) if bi + 1 < len(l['vbands']) else ac.size[1]
                    d_.rectangle([0, max(0, int(y0p)), ac.size[0], int(y1p)], fill=self.names_k.index(nm))
                idx_k = vb
                if idx_p is not None:
                    vp = Image.new('L', ac.size, 0)
                    d_ = ImageDraw.Draw(vp)
                    for bi, (yv, nm) in enumerate(l.get('vbandsPrev', l['vbands'])):
                        lst = l.get('vbandsPrev', l['vbands'])
                        y0p = self.to_px([0, yv])[1] - bb[1]
                        y1p = (self.to_px([0, lst[bi + 1][0]])[1] - bb[1]) if bi + 1 < len(lst) else ac.size[1]
                        d_.rectangle([0, max(0, int(y0p)), ac.size[0], int(y1p)], fill=self.names_p.index(nm))
                    idx_p = vp
            if l.get('outside'):
                # beyond the print edge this layer is one flat colour (e.g. the shadowed boards of a gate)
                outm = m_not(self.inside).crop(bb)
                idx_k = Image.composite(Image.new('L', ac.size, self.names_k.index(l['outside'])), idx_k, outm)
                if idx_p is not None:
                    idx_p = Image.composite(Image.new('L', ac.size, self.names_p.index(l['outside'])), idx_p, outm)
                line = m_and(line, m_not(outm))
            if l.get('fill'):
                idx_k = Image.new('L', ac.size, self.names_k.index(l['fill']))
                if idx_p is not None:
                    fp = l.get('fillPrev', l['fill'])
                    idx_p = Image.new('L', ac.size, self.names_p.index(fp) if fp in self.names_p else 0)
            if l.get('outside'):
                outm = m_not(self.inside).crop(bb)
                idx_k = Image.composite(Image.new('L', ac.size, self.names_k.index(l['outside'])), idx_k, outm)
                if idx_p is not None:
                    idx_p = Image.composite(Image.new('L', ac.size, self.names_p.index(l['outside'])), idx_p, outm)
                line = m_and(line, m_not(outm))
            results.append((l, bb, ac, line, idx_k, idx_p))
        self.results = results

    def sky_image(self, which):
        sky = self.m.get('sky') or {}
        stops = sky.get('stops' if which == 'k' else 'stopsPrev') or sky.get('stops')
        img = Image.new('RGB', (1, self.H))
        for y in range(self.H):
            img.putpixel((0, y), sky_colour(stops, self.from_px_y(y)) if stops else PAPER)
        return img.resize((self.W, self.H))

    def from_px_y(self, py):
        return py / (self.srcH * self.scale) + self.ny0

    def write(self, preview=False):
        od = os.path.join(OUT, self.id)
        os.makedirs(od, exist_ok=True)
        for f in os.listdir(od):
            if f.endswith('.png') or f.endswith('.jpg'):
                os.remove(os.path.join(od, f))
        entries = []
        comp = {'k': self.sky_image('k') if preview else None, 'p': self.sky_image('p') if preview and self.k > 1 else None}
        for (l, bb, ac, line, idx_k, idx_p) in self.results:
            # layers wider than 2048 px are split into equal tiles (every PNG ≤ 2048 px wide)
            bw = bb[2] - bb[0]
            nt = max(1, -(-bw // MAX_W))
            edges = [bb[0] + round(bw * t / nt) for t in range(nt + 1)]
            span = [bb[0] / self.W, bw / self.W]
            for ti in range(nt):
                tb = (edges[ti], bb[1], edges[ti + 1], bb[3])
                lc = (tb[0] - bb[0], 0, tb[2] - bb[0], bb[3] - bb[1])
                suffix = f'-t{ti + 1}' if nt > 1 else ''
                files = {}
                for tag, idx, names, cols in (('k', idx_k, self.names_k, self.cols_k), ('p', idx_p, self.names_p, self.cols_p)):
                    if idx is None:
                        continue
                    n = len(cols)
                    ind = idx.point([min(v, n - 1) + 1 for v in range(256)])
                    p1 = names.index('p1') + 1
                    ind = Image.composite(Image.new('L', ind.size, p1), ind, line)
                    ind = Image.composite(ind, Image.new('L', ind.size, 0), ac)
                    ind = ind.crop(lc)
                    out = Image.frombytes('P', ind.size, ind.tobytes())
                    pal = [0, 0, 0]
                    for c in cols:
                        pal += list(c)
                    out.putpalette(pal + [0] * (768 - len(pal)))
                    trn = bytes([0] + [255] * n)
                    kk = self.k if tag == 'k' else self.k - 1
                    fn = f"{l['name']}{suffix}.{kk}.png"
                    out.save(os.path.join(od, fn), optimize=True, transparency=trn)
                    files[tag] = fn
                    if preview and comp[tag] is not None:
                        out.info['transparency'] = trn
                        rgba = out.convert('RGBA')
                        comp[tag].paste(rgba, (tb[0], tb[1]), rgba)
                sa = ac.crop(lc)
                sh = sa.resize((max(1, sa.width // 4), max(1, sa.height // 4)), Image.BOX).filter(ImageFilter.GaussianBlur(2.2))
                sfn = f"{l['name']}{suffix}.shadow.png"
                sh.save(os.path.join(od, sfn), optimize=True)
                entries.append({
                    'name': l['name'] + suffix, 'z': l['z'],
                    'rect': [tb[0] / self.W, tb[1] / self.H, (tb[2] - tb[0]) / self.W, (tb[3] - tb[1]) / self.H],
                    'span': span,
                    'px': [tb[2] - tb[0], tb[3] - tb[1]],
                    'k': files.get('k'), 'p': files.get('p'), 'shadow': sfn,
                    'curl': l.get('curl', 0.012), 'shadowAlpha': l.get('shadow', 0.0),
                    'stencil': bool(l.get('stencil', False)),
                    'seed': sum(ord(c) for c in l['name']),
                })
        if preview:
            for tag in ('k', 'p'):
                if comp[tag] is None:
                    continue
                comp[tag].resize((self.W // 2, self.H // 2), Image.BOX).save(os.path.join(od, f'_canvas.{tag}.jpg'), quality=85)
                for nm, pose, asp in (('rest', self.m['rest'], 16 / 9), ('restp', self.m['restPortrait'], 9 / 16)):
                    cx, cy = self.to_px([pose['cx'], pose['cy']])
                    fw = pose['w'] * (self.m['crop'][2] - self.m['crop'][0]) * self.srcW * self.scale
                    fh = fw / asp
                    box = (int(cx - fw / 2), int(cy - fh / 2), int(cx + fw / 2), int(cy + fh / 2))
                    comp[tag].crop(box).save(os.path.join(od, f'_{nm}.{tag}.jpg'), quality=90)

        def norm_pt(p):
            x, y = self.to_px(p)
            return [x / self.W, y / self.H]
        m = self.m
        sky = dict(m.get('sky') or {})
        # sky stop y values → canvas-normalised
        for key in ('stops', 'stopsPrev'):
            if sky.get(key):
                sky[key] = [[self.to_px([0, s[0]])[1] / self.H, s[1], s[2]] for s in sky[key]]
        pb = self.printbox
        rec = {
            'station': self.id, 'k': self.k, 'canvas': [self.W, self.H],
            'aspect': self.W / self.H,
            'print': [pb[0] / self.W, pb[1] / self.H, (pb[2] - pb[0]) / self.W, (pb[3] - pb[1]) / self.H],
            'layers': entries,
            'sky': sky,
            'vp': norm_pt(m['vp']) if 'vp' in m else None,
            'rest': self.norm_pose(m['rest']),
            'restPortrait': self.norm_pose(m['restPortrait']),
            'traveller': self.norm_traveller(m.get('traveller')),
            'extras': self.norm_extras(m.get('extras', {})),
            'palette': {'k': [list(c) for c in self.cols_k], 'p': [list(c) for c in self.cols_p]},
        }
        return rec

    def meta(self):
        m = self.m
        sky = dict(m.get('sky') or {})
        for key in ('stops', 'stopsPrev'):
            if sky.get(key):
                sky[key] = [[self.to_px([0, s_[0]])[1] / self.H, s_[1], s_[2]] for s_ in sky[key]]
        vp = None
        if 'vp' in m:
            x, y = self.to_px(m['vp'])
            vp = [x / self.W, y / self.H]
        return {'sky': sky, 'vp': vp, 'rest': self.norm_pose(m['rest']), 'restPortrait': self.norm_pose(m['restPortrait']),
                'traveller': self.norm_traveller(m.get('traveller')), 'extras': self.norm_extras(m.get('extras', {}))}

    def norm_pose(self, pose):
        x, y = self.to_px([pose['cx'], pose['cy']])
        w = pose['w'] * (self.m['crop'][2] - self.m['crop'][0]) * self.srcW * self.scale / self.W
        out = dict(pose)
        out.update({'cx': x / self.W, 'cy': y / self.H, 'w': w})
        return out

    def norm_traveller(self, t):
        if not t:
            return None
        out = dict(t)
        out['path'] = [[self.to_px(p)[0] / self.W, self.to_px(p)[1] / self.H] for p in t['path']]
        if t.get('pathPortrait'):
            out['pathPortrait'] = [[self.to_px(p)[0] / self.W, self.to_px(p)[1] / self.H] for p in t['pathPortrait']]
        return out

    def norm_extras(self, ex):
        out = dict(ex)
        if 'fujiPeak' in ex:
            x, y = self.to_px(ex['fujiPeak'])
            out['fujiPeak'] = [x / self.W, y / self.H]
        return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    preview = '--preview' in sys.argv
    todo = args or STATIONS
    os.makedirs(OUT, exist_ok=True)
    pj = os.path.join(OUT, 'plates.json')
    data = {'version': 1, 'stations': {}}
    if os.path.exists(pj):
        with open(pj) as f:
            data = json.load(f)
    for sid in todo:
        t0 = time.time()
        with open(os.path.join(MASKS, sid + '.json')) as f:
            m = json.load(f)
        st = Station(m)
        if '--meta' in sys.argv and sid in data['stations']:
            # framing / traveller / sky / extras only: keep the rendered plates
            data['stations'][sid].update(st.meta())
            print(f'{sid}: meta updated', flush=True)
            continue
        st.analyse()
        t1 = time.time()
        st.build_layers()
        t2 = time.time()
        rec = st.write(preview)
        data['stations'][sid] = rec
        print(f'{sid}: {len(rec["layers"])} layers, canvas {st.W}x{st.H}, analyse {t1 - t0:.1f}s layers {t2 - t1:.1f}s '
              f'write {time.time() - t2:.1f}s', flush=True)
    data['order'] = [s for s in STATIONS if s in data['stations']]
    data['paper'] = list(PAPER)
    data['plates'] = PLATES
    with open(pj, 'w') as f:
        json.dump(data, f, indent=1)


if __name__ == '__main__':
    main()
