"""
Generate 32x32 pixel art monster sprites for Bug Slayer
Using VS Code Dark+ palette colors
"""
from PIL import Image
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'public', 'sprites', 'monsters')
os.makedirs(OUT_DIR, exist_ok=True)

# VS Code Dark+ palette
C = {
    'transparent': (0, 0, 0, 0),
    'black': (0, 0, 0, 255),
    'dark_bg': (30, 30, 30, 255),
    'red': (244, 71, 71, 255),
    'dark_red': (180, 40, 40, 255),
    'orange': (206, 145, 120, 255),
    'yellow': (220, 220, 170, 255),
    'green': (106, 153, 85, 255),
    'dark_green': (60, 100, 50, 255),
    'light_green': (181, 206, 168, 255),
    'blue': (86, 156, 214, 255),
    'dark_blue': (50, 100, 160, 255),
    'light_blue': (156, 220, 254, 255),
    'purple': (197, 134, 192, 255),
    'dark_purple': (130, 80, 130, 255),
    'magenta': (190, 60, 160, 255),
    'white': (212, 212, 212, 255),
    'gray': (128, 128, 128, 255),
    'dark_gray': (80, 80, 80, 255),
    'brown': (150, 100, 60, 255),
    'dark_brown': (100, 65, 40, 255),
    'cyan': (78, 201, 176, 255),
    'dark_cyan': (50, 140, 120, 255),
}
T = C['transparent']
B = C['black']

def make_sprite(pixels_map, name):
    """Create a 32x32 sprite from a pixel map dict {(x,y): color}"""
    img = Image.new('RGBA', (32, 32), T)
    for (x, y), color in pixels_map.items():
        if 0 <= x < 32 and 0 <= y < 32:
            img.putpixel((x, y), color)
    path = os.path.join(OUT_DIR, f'{name}-south.png')
    img.save(path)
    print(f'  Saved {path} ({os.path.getsize(path)} bytes)')
    return img

def draw_outline(pixels, body_pixels, color=B):
    """Add black outline around body pixels"""
    outlined = dict(pixels)
    for (x, y) in body_pixels:
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in body_pixels and 0 <= nx < 32 and 0 <= ny < 32:
                outlined[(nx, ny)] = color
    return outlined

def nullpointer():
    """Purple ghost/phantom with void eyes - represents null reference"""
    body = {}
    body_set = set()
    # Ghost body (rounded top, wavy bottom)
    for y in range(8, 26):
        if y < 12:
            w = min((y - 8) * 2 + 2, 10)
        elif y < 22:
            w = 10
        else:
            w = 10
        for x in range(16 - w//2, 16 + w//2):
            # Wavy bottom edge
            if y >= 22:
                if (x + y) % 3 == 0:
                    continue
            col = C['purple'] if y < 18 else C['dark_purple']
            body[(x, y)] = col
            body_set.add((x, y))
    # Eyes - void/empty black
    for x in [13, 14]:
        for y in [14, 15, 16]:
            body[(x, y)] = C['dark_bg']
    for x in [18, 19]:
        for y in [14, 15, 16]:
            body[(x, y)] = C['dark_bg']
    # Eye glow
    body[(13, 14)] = C['light_blue']
    body[(18, 14)] = C['light_blue']
    # "NULL" text shimmer on body
    body[(14, 20)] = C['magenta']
    body[(16, 20)] = C['magenta']
    body[(18, 20)] = C['magenta']

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'nullpointer')

def typemismatch():
    """Red/orange glitchy creature - half one type, half another"""
    body = {}
    body_set = set()
    # Body - split down middle with different colors
    for y in range(6, 28):
        if y < 10:
            w = min((y - 6) * 2 + 4, 14)
        elif y < 24:
            w = 14
        else:
            w = max(14 - (y - 24) * 3, 4)
        cx = 16
        for x in range(cx - w//2, cx + w//2):
            if x < cx:
                col = C['red'] if y % 2 == 0 else C['dark_red']
            else:
                col = C['orange'] if y % 2 == 0 else C['yellow']
            # Glitch effect - shift some rows
            if y % 5 == 0:
                shift = 1 if x < cx else -1
                body[(x + shift, y)] = col
                body_set.add((x + shift, y))
            else:
                body[(x, y)] = col
                body_set.add((x, y))
    # Split line down center
    for y in range(8, 26):
        body[(16, y)] = B
    # Eyes - mismatched
    body[(13, 12)] = C['white']
    body[(14, 12)] = C['white']
    body[(13, 13)] = C['red']
    body[(14, 13)] = C['white']
    # Right eye different shape
    body[(18, 11)] = C['yellow']
    body[(19, 12)] = C['yellow']
    body[(18, 13)] = C['yellow']
    # Angry mouth
    for x in range(13, 20):
        body[(x, 18)] = C['dark_bg']
    body[(14, 17)] = C['dark_bg']
    body[(18, 17)] = C['dark_bg']

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'typemismatch')

def offbyone():
    """Green shifted bug - slightly offset, asymmetric"""
    body = {}
    body_set = set()
    # Bug body - oval with offset features
    for y in range(8, 26):
        if y < 12:
            w = min((y - 8) * 2 + 4, 12)
        elif y < 22:
            w = 12
        else:
            w = max(12 - (y - 22) * 2, 4)
        cx = 15  # Slightly off-center (off by one!)
        for x in range(cx - w//2, cx + w//2):
            col = C['green'] if (x + y) % 3 != 0 else C['dark_green']
            body[(x, y)] = col
            body_set.add((x, y))
    # Antenna - offset
    body[(14, 7)] = C['light_green']
    body[(14, 6)] = C['light_green']
    body[(13, 5)] = C['light_green']
    body[(17, 7)] = C['light_green']
    body[(17, 6)] = C['light_green']
    body[(18, 5)] = C['light_green']
    # Eyes - one higher than the other (off by one!)
    body[(12, 13)] = C['white']
    body[(13, 13)] = C['white']
    body[(12, 14)] = C['yellow']
    body[(13, 14)] = C['white']
    body[(17, 12)] = C['white']  # One pixel higher
    body[(18, 12)] = C['white']
    body[(17, 13)] = C['yellow']
    body[(18, 13)] = C['white']
    # Legs - 6 legs like a bug
    for dx in [-1, 0, 1]:
        lx = 10 + dx * 3
        rx = 19 + dx * 3
        body[(lx, 24 + abs(dx))] = C['dark_green']
        body[(rx, 24 + abs(dx))] = C['dark_green']
        body[(lx, 25 + abs(dx))] = C['dark_green']
        body[(rx, 25 + abs(dx))] = C['dark_green']
    # [1] index marker
    body[(15, 19)] = C['yellow']
    body[(16, 19)] = C['yellow']

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'offbyone')

def stackoverflow_boss():
    """Boss - Large dark stacked creature with layered frames"""
    body = {}
    body_set = set()
    # Larger body - stacked rectangles representing stack frames
    layers = [
        (8, 10, 24, 14, C['dark_red']),    # top frame
        (7, 14, 25, 18, C['red']),          # middle frame
        (6, 18, 26, 23, C['dark_red']),     # bottom frame
        (5, 23, 27, 27, C['red']),          # base frame (widest)
    ]
    for lx, ly, rx, ry, col in layers:
        for y in range(ly, ry):
            for x in range(lx, rx):
                body[(x, y)] = col
                body_set.add((x, y))
        # Frame borders
        for x in range(lx, rx):
            body[(x, ly)] = C['yellow']
            body[(x, ry-1)] = C['dark_brown']
        for y in range(ly, ry):
            body[(lx, y)] = C['yellow']
            body[(rx-1, y)] = C['dark_brown']
    # Crown/horns (boss indicator)
    for x in [12, 16, 20]:
        body[(x, 8)] = C['yellow']
        body[(x, 9)] = C['yellow']
    body[(11, 9)] = C['yellow']
    body[(21, 9)] = C['yellow']
    body_set.update([(12,8),(16,8),(20,8),(12,9),(16,9),(20,9),(11,9),(21,9)])
    # Menacing eyes
    for x in [12, 13]:
        body[(x, 12)] = C['yellow']
        body[(x, 13)] = C['yellow']
    for x in [19, 20]:
        body[(x, 12)] = C['yellow']
        body[(x, 13)] = C['yellow']
    # Pupils
    body[(13, 13)] = C['dark_bg']
    body[(19, 13)] = C['dark_bg']
    # Mouth
    for x in range(13, 20):
        body[(x, 16)] = C['dark_bg']
    body[(14, 15)] = C['dark_bg']
    body[(18, 15)] = C['dark_bg']
    # "OVERFLOW" text effect
    for x in range(10, 22):
        if x % 2 == 0:
            body[(x, 25)] = C['yellow']

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'stackoverflow')

def racecondition():
    """Blue split/twin - two overlapping ghostly forms racing"""
    body = {}
    body_set = set()
    # Twin 1 (slightly left, blue)
    for y in range(8, 24):
        w = 8 if y < 20 else max(8 - (y - 20), 4)
        cx = 13
        for x in range(cx - w//2, cx + w//2):
            body[(x, y)] = C['blue']
            body_set.add((x, y))
    # Twin 2 (slightly right, light blue, overlapping)
    for y in range(9, 25):
        w = 8 if y < 21 else max(8 - (y - 21), 4)
        cx = 19
        for x in range(cx - w//2, cx + w//2):
            # Blend where overlapping
            if (x, y) in body:
                body[(x, y)] = C['cyan']
            else:
                body[(x, y)] = C['light_blue']
            body_set.add((x, y))
    # Twin 1 eye
    body[(12, 13)] = C['white']
    body[(13, 13)] = C['white']
    body[(12, 14)] = C['dark_bg']
    # Twin 2 eye
    body[(18, 14)] = C['white']
    body[(19, 14)] = C['white']
    body[(19, 15)] = C['dark_bg']
    # Speed lines
    for y in [11, 15, 19]:
        body[(7, y)] = C['dark_blue']
        body[(6, y)] = C['dark_blue']
        body[(24, y+1)] = C['dark_blue']
        body[(25, y+1)] = C['dark_blue']
        body_set.update([(7,y),(6,y),(24,y+1),(25,y+1)])

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'racecondition')

def memoryleak():
    """Green oozing/dripping blob creature"""
    body = {}
    body_set = set()
    # Blob body
    for y in range(7, 24):
        if y < 11:
            w = min((y - 7) * 3 + 4, 16)
        elif y < 20:
            w = 16
        else:
            w = max(16 - (y - 20) * 2, 8)
        cx = 16
        for x in range(cx - w//2, cx + w//2):
            shade = C['green'] if (x + y) % 2 == 0 else C['light_green']
            body[(x, y)] = shade
            body_set.add((x, y))
    # Drips hanging from bottom
    drips = [(10, 3), (14, 5), (18, 4), (22, 2)]
    for dx, length in drips:
        for dy in range(length):
            body[(dx, 24 + dy)] = C['green'] if dy % 2 == 0 else C['dark_green']
            body_set.add((dx, 24 + dy))
    # Droopy eyes
    body[(12, 13)] = C['white']
    body[(13, 13)] = C['white']
    body[(12, 14)] = C['white']
    body[(13, 14)] = C['dark_bg']
    body[(19, 13)] = C['white']
    body[(20, 13)] = C['white']
    body[(19, 14)] = C['dark_bg']
    body[(20, 14)] = C['white']
    # Drool/ooze from mouth
    body[(15, 18)] = C['dark_green']
    body[(16, 18)] = C['dark_green']
    body[(17, 18)] = C['dark_green']
    body[(16, 19)] = C['dark_green']
    body[(16, 20)] = C['dark_green']
    # Bubbles
    body[(22, 9)] = C['light_green']
    body[(24, 7)] = C['light_green']
    body[(23, 8)] = C['light_green']
    body_set.update([(22,9),(24,7),(23,8)])

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'memoryleak')

def deadlock():
    """Gray chained creature with interlocking rings"""
    body = {}
    body_set = set()
    # Central body - sturdy, blocky
    for y in range(9, 25):
        if y < 13:
            w = min((y - 9) * 2 + 6, 14)
        elif y < 21:
            w = 14
        else:
            w = max(14 - (y - 21) * 2, 6)
        cx = 16
        for x in range(cx - w//2, cx + w//2):
            col = C['gray'] if (x + y) % 2 == 0 else C['dark_gray']
            body[(x, y)] = col
            body_set.add((x, y))
    # Chain links on left
    chain_l = [(7, 14), (8, 13), (8, 15), (7, 16), (6, 15), (6, 13)]
    for x, y in chain_l:
        body[(x, y)] = C['brown']
        body_set.add((x, y))
    # Chain links on right
    chain_r = [(25, 14), (24, 13), (24, 15), (25, 16), (26, 15), (26, 13)]
    for x, y in chain_r:
        body[(x, y)] = C['brown']
        body_set.add((x, y))
    # Lock symbol on chest
    for x in range(14, 19):
        body[(x, 16)] = C['yellow']
        body[(x, 17)] = C['yellow']
    body[(15, 14)] = C['yellow']
    body[(17, 14)] = C['yellow']
    body[(15, 15)] = C['yellow']
    body[(17, 15)] = C['yellow']
    body[(16, 17)] = C['dark_bg']  # Keyhole
    # Angry eyes
    body[(12, 12)] = C['red']
    body[(13, 12)] = C['red']
    body[(19, 12)] = C['red']
    body[(20, 12)] = C['red']
    # Frown
    for x in range(13, 20):
        body[(x, 19)] = C['dark_bg']
    body[(13, 18)] = C['dark_bg']
    body[(19, 18)] = C['dark_bg']

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'deadlock')

def heisenbug_boss():
    """Boss - Multi-colored flickering quantum creature, larger"""
    body = {}
    body_set = set()
    # Larger ethereal body with quantum uncertainty
    colors = [C['purple'], C['blue'], C['cyan'], C['light_blue'], C['magenta']]
    for y in range(5, 28):
        if y < 10:
            w = min((y - 5) * 3 + 2, 18)
        elif y < 24:
            w = 18
        else:
            w = max(18 - (y - 24) * 3, 6)
        cx = 16
        for x in range(cx - w//2, cx + w//2):
            ci = (x * 3 + y * 7) % len(colors)
            body[(x, y)] = colors[ci]
            body_set.add((x, y))
    # Crown/horns (boss)
    for x in [11, 14, 16, 18, 21]:
        body[(x, 4)] = C['magenta']
        body[(x, 3)] = C['magenta']
        body_set.update([(x, 4), (x, 3)])
    # Multiple eyes (quantum observer effect)
    eye_positions = [(11, 13), (14, 11), (18, 11), (21, 13)]
    for ex, ey in eye_positions:
        body[(ex, ey)] = C['white']
        body[(ex+1, ey)] = C['white']
        body[(ex, ey+1)] = C['yellow']
        body[(ex+1, ey+1)] = C['white']
    # Uncertainty mouth - wavy
    for x in range(11, 22):
        my = 18 + (1 if x % 3 == 0 else 0)
        body[(x, my)] = C['dark_bg']
    # Quantum particles floating around
    particles = [(6, 8), (26, 10), (5, 18), (27, 16), (8, 25), (24, 26)]
    for px, py in particles:
        body[(px, py)] = C['light_blue']
        body_set.add((px, py))
    # "?" symbol
    body[(16, 21)] = C['yellow']
    body[(16, 23)] = C['yellow']

    pixels = draw_outline(body, body_set)
    pixels.update(body)
    make_sprite(pixels, 'heisenbug')

if __name__ == '__main__':
    print('Generating monster sprites...')
    print('\nChapter 1:')
    nullpointer()
    typemismatch()
    offbyone()
    stackoverflow_boss()
    print('\nChapter 2:')
    racecondition()
    memoryleak()
    deadlock()
    heisenbug_boss()
    print(f'\nDone! All sprites saved to {OUT_DIR}')
