"""Archived v1 SVG draft, rejected by the user. Design archive only, never runtime.
Current assets: image_gen masters + scripts/package_rouqiu_images.js.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design/assets/rouqiu-theme/legacy-v1'

# One little Samoyed: upright ears, a wide fluffy ruff, dark nose and sage bandana.
# Drawings use distinct poses and facial expressions, not a face pasted on every tool.
def face(mood='smile'):
    eyes = {
        'smile': '<ellipse cx="34" cy="41" rx="1.8" ry="2.2" fill="INK"/><ellipse cx="62" cy="41" rx="1.8" ry="2.2" fill="INK"/>',
        'sleep': '<path d="M29 42q4 4 8 0m22 0q4 4 8 0"/>',
        'curious': '<ellipse cx="34" cy="41" rx="2" ry="2.8" fill="INK"/><ellipse cx="62" cy="40" rx="2" ry="2.8" fill="INK"/>',
        'happy': '<path d="M29 42q4-5 8 0m22 0q4-5 8 0"/>',
    }[mood]
    mouth = '<path d="M39 56q9 4 18 0-1 10-9 10t-9-10z" fill="INK"/><path d="M44 60h8v5q-4 5-8 0z" fill="PINK" stroke="none"/>' if mood == 'happy' else '<path d="M48 53v4m-10-2q8 10 20 0"/>'
    return ('<path d="M21 30q-1-12 5-17 9 3 12 12l8-3 10 3q8-10 17-11 5 7 3 19l6 5-3 4 6 7-5 2 3 8-8-1 1 7-8-2-2 7-8-3q-11 6-22-1l-8 3-2-7-8 1 1-7-7 1 3-8-5-2 6-6-2-4z" fill="FUR" stroke="OUTLINE"/>'
        '<path d="m27 21 1 10 6-4m36-6-2 10-6-4" stroke="FURSHADE"/>'
        '<path d="M34 50q3-8 14-8 12 0 15 9 0 13-15 14-14-1-14-15z" fill="MUZZLE" stroke="none"/>'
        + eyes + '<path d="M43 48q5-3 10 0 0 6-5 6-5-1-5-6z" fill="INK"/>' + mouth +
        '<path d="M32 66q16 9 33-1L49 81z" fill="SAGE" stroke="OUTLINE"/><path d="m43 72 6 4 5-5" stroke="SAGEDARK"/>')

def group(content, transform):
    return '<g transform="' + transform + '">' + content + '</g>'

def seated(mood='smile'):
    body = '<path d="M33 53q-13 10-10 18l-3 2 3 5-6 4q7 8 19 3h23q15 2 21-7-12 4-14-6l2-3-3-2q-2-10-9-13" fill="FUR" stroke="OUTLINE"/><path d="m36 69-2 14m22-14 3 14M29 84h12m11 0h13" stroke="OUTLINE"/>'
    return body + group(face(mood), 'translate(7 1) scale(.85)')

def side(pose):
    tail = '<path d="M67 46q10-21 19-8 7 12-6 19l-5-4q10-6 5-12-3-3-7 5" fill="FUR" stroke="OUTLINE"/>'
    body = '<path d="M26 45q7-9 20-4l3-3 4 4 4-2 3 4q13 0 13 12l3 4-5 2 1 7-7-2q-8 7-13-1l-6 2-4-4-9 1-6 5 1-8-5-2z" fill="FUR" stroke="OUTLINE"/>'
    legs = {
        'walk': '<path d="m29 59-7 17-9 2q-3 4 2 5h12l11-20m17-3 10 12 10 1q5 5 0 7H64L49 64" fill="FUR" stroke="OUTLINE"/>',
        'pee': '<path d="m29 59-2 21h10l3-17m20-2-1 18h11l-2-24M48 61l9-11 10 5" fill="FUR" stroke="OUTLINE"/>',
        'poop': '<path d="m30 59-1 21h10l4-15m16-2-9 12 6 7h13" fill="FUR" stroke="OUTLINE"/>',
    }[pose]
    head = group(face('happy' if pose == 'walk' else 'curious'), 'translate(-1 12) scale(.59)')
    extra = '<path d="m71 65 3 5m1 3 3 4" stroke="GOLD"/>' if pose == 'pee' else ''
    if pose == 'poop':
        extra = '<path d="M76 74q6-3 3-7 8 2 6 8 6 1 4 6 5 2 1 6H74q-5-4 0-7-2-4 2-6z" fill="SAND" stroke="OUTLINE"/>'
    return tail + body + legs + head + extra

bowl = '<path d="M22 70q26-5 51 0l-6 16q-19 5-39 0z" fill="SAGE" stroke="OUTLINE"/><path d="M22 70q25 6 51 0" stroke="SAGEDARK"/>'
marks = {
    'logo': group(face('smile'), 'translate(-3 3) scale(1.06)'),
    'sleep': seated('sleep'),
    'food': group(face('happy'), 'translate(0 15) rotate(-5 48 42)') + bowl + '<path d="m34 70 3-4 4 4m6 0 3-4 4 4m5-1 3-3" stroke="GOLD"/><path d="M78 31q6-3 7-8m-5 16 7-1" stroke="SAGEDARK"/>',
    'water': group(face('curious'), 'translate(4 5) rotate(12 48 42) scale(.88)') + '<path d="M48 54v12q4 5 7 0V55" fill="PINK"/>' + bowl + '<path d="M31 72q5-3 10 0t10 0 10 0" stroke="SAGEDARK"/><path d="M77 52q-7 9 0 9 7 0 0-9z" fill="SAGE" stroke="SAGEDARK"/>',
    'pee': side('pee'),
    'poop': side('poop'),
    'footprints': side('walk'),
    'notebook': group(face('sleep'), 'translate(2 2) scale(.9)') + '<path d="M15 62q18-4 32 3 15-7 32-3v25q-16-4-32 2-15-6-32-2z" fill="SAND" stroke="OUTLINE"/><path d="M47 66v23m-22-17 13 2m18 0 14-2m-45 6 11 2m20 0 14-2" stroke="SAGEDARK"/><path d="M24 59q-7-1-7 5 0 7 9 6m44-11q7-1 7 5 0 7-9 6" fill="FUR" stroke="OUTLINE"/>',
    'scale': '<path d="M18 73q30-4 60 0l4 15H14z" fill="SAGE" stroke="OUTLINE"/><path d="M40 82h16" stroke="SAGEDARK"/>' + group(seated('curious'), 'translate(8 -3) scale(.83)'),
    'pencil': group(seated('smile'), 'translate(-3 -3) rotate(-7 48 48)') + '<path d="m68 48 7 3-13 29-7 5-1-8z" fill="SAND" stroke="OUTLINE"/><path d="m67 53 6 3m-19 21 8 3" stroke="OUTLINE"/><path d="M54 67q9-5 12 0 0 6-10 7" fill="FUR" stroke="OUTLINE"/>',
    'image': group(face('happy'), 'translate(0 0) scale(.92)') + '<path d="m20 59 52 4-2 27-52-4z" fill="SAND" stroke="OUTLINE"/><path d="m25 80 10-12 8 9 7-5 12 11" stroke="SAGEDARK"/><circle cx="60" cy="69" r="2" fill="GOLD" stroke="none"/><path d="M24 58q-7 0-7 6 0 7 9 6m41-9q8-1 8 5-1 7-9 5" fill="FUR" stroke="OUTLINE"/>',
    'bell': group(face('curious'), 'translate(-2 2) rotate(-9 48 40) scale(.91)') + '<path d="M37 83q7-5 7-15 1-10 10-10 11 0 12 10 0 10 7 15z" fill="SAND" stroke="OUTLINE"/><path d="M51 58v-3h6v3m-8 27q5 7 10 0" stroke="OUTLINE"/><path d="m76 62 5-3m-5 11 6 1" stroke="SAGEDARK"/>',
}

for mode in ['light', 'dark']:
    colors = dict(INK='#363b36', FUR='#fffaf0', FURSHADE='#ddcdb3', MUZZLE='#f0e9dc', PINK='#d99990',
                  SAGE='#b2c7b8', SAGEDARK='#526b5b', SAND='#eddec3', GOLD='#90734c',
                  OUTLINE='#626e60' if mode == 'light' else '#b4c6b7')
    for name, drawing in marks.items():
        svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" stroke="INK" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + drawing + '</svg>\n'
        for key in sorted(colors, key=len, reverse=True): svg = svg.replace(key, colors[key])
        for base in [SOURCE]:
            directory = base / mode
            directory.mkdir(parents=True, exist_ok=True)
            (directory / (name + '.svg')).write_text(svg)

manifest = {'name': '肉球', 'version': 1, 'format': 'SVG', 'viewBox': '0 0 96 96',
            'source': 'Original project vector drawings; scripts/build_rouqiu_theme.py',
            'reference': 'User-described Rouqiu and previously supplied Samoyed photographs: upright ears, fluffy white cheeks, dark nose, sage bandana.',
            'assets': list(marks), 'modes': ['light', 'dark'],
            'photos': 'Awaiting real Rouqiu reference files from the user. Create a stylized built-in background with imagegen from those references. No photo-picker or user-configurable background.'}
(SOURCE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Built', len(marks), 'Rouqiu drawings in two modes.')
