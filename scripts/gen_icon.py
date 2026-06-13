"""Gera os assets de icone do PetCare: icon, adaptive-icon, splash-icon, favicon.

Design: pata limpa em gradiente laranja da marca (#FFB27A -> #E66A3A) sobre
fundo navy (#0B1120), sem os detalhes de linhas que poluiam o icone anterior.
"""
from PIL import Image, ImageDraw, ImageFilter
import math

SCALE = 4
S = 1024 * SCALE  # canvas de trabalho em alta resolucao


def vertical_gradient(size, top, bottom):
    grad = Image.new('RGB', (1, size[1]), color=0)
    for y in range(size[1]):
        t = y / (size[1] - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        grad.putpixel((0, y), (r, g, b))
    return grad.resize(size)


def paw_mask(size):
    mask = Image.new('L', size, 0)
    d = ImageDraw.Draw(mask)
    # almofada principal
    d.rounded_rectangle([1100, 1430, 3000, 3440], radius=380, fill=255)
    # dedos (de fora para dentro)
    d.ellipse([990, 1060, 1550, 1920], fill=255)
    d.ellipse([2546, 1060, 3106, 1920], fill=255)
    d.ellipse([1530, 855, 2090, 1715], fill=255)
    d.ellipse([2006, 855, 2566, 1715], fill=255)
    return mask


def make_paw_foreground(out_size, paw_scale, glow=False):
    """Pata em gradiente laranja sobre fundo transparente, centrada."""
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))

    mask_full = paw_mask((S, S))

    # Reduz a pata para `paw_scale` do canvas e centraliza
    inner = int(S * paw_scale)
    mask_small = mask_full.resize((inner, inner), Image.LANCZOS)
    offset = (S - inner) // 2

    mask = Image.new('L', (S, S), 0)
    mask.paste(mask_small, (offset, offset))

    grad = vertical_gradient((S, S), (255, 178, 122), (230, 106, 58))

    if glow:
        glow_mask = mask.filter(ImageFilter.GaussianBlur(80))
        glow_layer = Image.new('RGBA', (S, S), (230, 106, 58, 0))
        glow_solid = Image.new('RGBA', (S, S), (230, 106, 58, 90))
        glow_layer = Image.composite(glow_solid, glow_layer, glow_mask)
        canvas = Image.alpha_composite(canvas, glow_layer)

    paw_rgba = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    paw_rgba = Image.composite(Image.merge('RGBA', (*grad.split(), Image.new('L', (S, S), 255))), paw_rgba, mask)
    canvas = Image.alpha_composite(canvas, paw_rgba)

    return canvas.resize(out_size, Image.LANCZOS)


def radial_navy_background():
    bg = Image.new('RGB', (S, S), (11, 17, 32))  # #0B1120
    overlay = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(overlay)
    cx, cy = S / 2, S * 0.42
    max_r = S * 0.75
    steps = 120
    for i in range(steps, 0, -1):
        r = max_r * i / steps
        alpha = int(40 * (1 - i / steps))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
    light = Image.new('RGB', (S, S), (27, 41, 64))  # #1B2940
    bg = Image.composite(light, bg, overlay)
    return bg


def make_icon():
    bg = radial_navy_background()
    mask = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(mask)
    radius = int(S * 0.176)
    d.rounded_rectangle([0, 0, S, S], radius=radius, fill=255)

    base = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    base = Image.composite(bg.convert('RGBA'), base, mask)

    paw = make_paw_foreground((S, S), paw_scale=0.74, glow=True)
    icon = Image.alpha_composite(base, paw)

    return icon.resize((1024, 1024), Image.LANCZOS)


def main():
    icon = make_icon()
    icon.convert('RGBA').save('assets/icon.png')

    adaptive = make_paw_foreground((1024, 1024), paw_scale=0.60)
    adaptive.save('assets/adaptive-icon.png')

    splash = make_paw_foreground((1024, 1024), paw_scale=0.46)
    splash.save('assets/splash-icon.png')

    favicon = icon.resize((48, 48), Image.LANCZOS)
    favicon.save('assets/favicon.png')

    print('done')


if __name__ == '__main__':
    main()
