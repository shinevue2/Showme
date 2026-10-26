"""Contact sheet of captured film frames (review aid, WP-03).

  python3 -I tools/film/contact.py <out.jpg> <cols> <frame.png> [<frame.png> …]
Tiles the frames (scaled to 640 px wide) with their file names underneath.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def main():
    out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    ims = [Image.open(f).convert('RGB') for f in files]
    tw = 640 if ims[0].width >= ims[0].height else 300
    th = round(ims[0].height * tw / ims[0].width)
    rows = -(-len(ims) // cols)
    sheet = Image.new('RGB', (cols * (tw + 8) + 8, rows * (th + 26) + 8), (40, 44, 52))
    d = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=14)
    for i, (im, f) in enumerate(zip(ims, files)):
        x = 8 + (i % cols) * (tw + 8)
        y = 8 + (i // cols) * (th + 26)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x, y + th + 4), os.path.basename(f), fill=(230, 230, 230), font=font)
    sheet.save(out, quality=90)
    print(out, sheet.size)


if __name__ == '__main__':
    main()
