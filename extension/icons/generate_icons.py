#!/usr/bin/env python3
"""Génère les icônes PNG de l'extension à partir du logo Tracr (graphe réseau).

Aucune dépendance externe : rasterisation maison + supersampling 4x pour
l'anti-aliasing, puis encodage PNG via zlib (stdlib).

Usage : python generate_icons.py  ->  icon16.png, icon32.png, icon48.png, icon128.png
"""
import math
import struct
import zlib

# Palette alignée sur la DA (index.css) : fond #1a1a1a, accent violet.
BG = (26, 26, 26)          # #1a1a1a
PRIMARY = (139, 92, 246)   # #8b5cf6
SECONDARY = (167, 139, 250) # #a78bfa
WHITE = (255, 255, 255)

# Noeuds (coords sur viewBox 100, dérivées du logo.svg avec translate(15,15)).
NODES = [
    (30, 30, 5, PRIMARY),
    (50, 50, 6, SECONDARY),
    (70, 35, 5, PRIMARY),
    (65, 70, 4, WHITE),
]
EDGES = [
    (30, 30, 50, 50, PRIMARY, 2, 0.6),
    (50, 50, 70, 35, PRIMARY, 2, 0.6),
    (50, 50, 65, 70, PRIMARY, 2, 0.6),
    (30, 30, 70, 35, SECONDARY, 1.5, 0.3),
    (65, 70, 70, 35, SECONDARY, 1.5, 0.3),
]


def _blend(dst, color, alpha):
    return tuple(int(round(c * alpha + d * (1 - alpha))) for c, d in zip(color, dst))


def _dist_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def render(size):
    ss = 4
    n = size * ss
    scale = n / 100.0
    radius = n * 0.16  # coins arrondis (rx=10 sur viewBox 100)
    # buffer RGBA
    buf = [[(0, 0, 0, 0)] * n for _ in range(n)]

    for y in range(n):
        for x in range(n):
            # Masque coins arrondis
            cx = min(x, n - 1 - x)
            cy = min(y, n - 1 - y)
            inside = True
            if cx < radius and cy < radius:
                if math.hypot(radius - cx, radius - cy) > radius:
                    inside = False
            if inside:
                buf[y][x] = (BG[0], BG[1], BG[2], 255)

    def put(x, y, color, alpha):
        if 0 <= x < n and 0 <= y < n:
            r, g, b, a = buf[y][x]
            if a == 0:
                return  # hors du fond arrondi
            nr, ng, nb = _blend((r, g, b), color, alpha)
            buf[y][x] = (nr, ng, nb, 255)

    # Arêtes
    for (x1, y1, x2, y2, color, w, op) in EDGES:
        X1, Y1, X2, Y2 = x1 * scale, y1 * scale, x2 * scale, y2 * scale
        hw = (w * scale) / 2
        minx = int(min(X1, X2) - hw - 2); maxx = int(max(X1, X2) + hw + 2)
        miny = int(min(Y1, Y2) - hw - 2); maxy = int(max(Y1, Y2) + hw + 2)
        for y in range(max(0, miny), min(n, maxy)):
            for x in range(max(0, minx), min(n, maxx)):
                d = _dist_seg(x + 0.5, y + 0.5, X1, Y1, X2, Y2)
                edge = hw - d
                if edge > -1:
                    a = max(0.0, min(1.0, edge + 0.5)) * op
                    if a > 0:
                        put(x, y, color, a)

    # Noeuds
    for (cx, cy, r, color) in NODES:
        CX, CY, R = cx * scale, cy * scale, r * scale
        minx = int(CX - R - 2); maxx = int(CX + R + 2)
        miny = int(CY - R - 2); maxy = int(CY + R + 2)
        for y in range(max(0, miny), min(n, maxy)):
            for x in range(max(0, minx), min(n, maxx)):
                d = math.hypot(x + 0.5 - CX, y + 0.5 - CY)
                edge = R - d
                if edge > -1:
                    a = max(0.0, min(1.0, edge + 0.5))
                    if a > 0:
                        put(x, y, color, a)

    # Downsample box ss×ss -> size
    out = bytearray()
    for oy in range(size):
        for ox in range(size):
            r = g = b = a = 0
            for j in range(ss):
                for i in range(ss):
                    pr, pg, pb, pa = buf[oy * ss + j][ox * ss + i]
                    r += pr; g += pg; b += pb; a += pa
            cnt = ss * ss
            out += bytes((r // cnt, g // cnt, b // cnt, a // cnt))
    return bytes(out)


def write_png(path, size, rgba):
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filtre None
        raw += rgba[y * stride:(y + 1) * stride]

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    for s in (16, 32, 48, 128):
        write_png(f"icon{s}.png", s, render(s))
        print(f"icon{s}.png généré")
