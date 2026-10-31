#!/usr/bin/env python3
"""Herbouw de gedeelde deelkaartlettertypes (eenmalig: pip install fonttools).

Gebruik de ingecheckte package-lock.json en voer eerst npm ci uit. De app en
Netlify lezen dezelfde TTF's; normale web- en Xcode-builds hebben Python niet nodig.
"""
import json
import shutil
from pathlib import Path
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'shared/deelkaart'
IOS = ROOT / 'ios/Hoot/Resources/Deelkaart'
OUT.mkdir(parents=True, exist_ok=True)
IOS.mkdir(parents=True, exist_ok=True)
for family, weight, name in [('newsreader', 800, 'Newsreader-800'), ('source-sans-3', 600, 'SourceSans3-600')]:
    base = ROOT / f'node_modules/@fontsource/{family}'
    files = [base / 'files' / f'{family}-{subset}-{weight}-normal.woff' for subset in ['latin', 'latin-ext']]
    for source in files:
        if source.stat().st_size == 0:
            raise RuntimeError(f'Lege Dropbox-plekhouder: {source}')
    font = Merger().merge([str(p) for p in files])
    font.flavor = None
    originals = [TTFont(p, recalcTimestamp=False) for p in files]
    font['head'].created = min(f['head'].created for f in originals)
    font['head'].modified = max(f['head'].modified for f in originals)
    for original in originals:
        original.close()
    font.recalcTimestamp = False
    font.save(OUT / f'{name}.ttf')
    if family == 'newsreader':
        units = font['head'].unitsPerEm
        advances = {chr(c): font['hmtx'][glyph][0] / units for c, glyph in font.getBestCmap().items()}
        (OUT / 'advances.json').write_text(json.dumps(advances, ensure_ascii=False, separators=(',', ':')) + '\n')
    shutil.copy(base / 'LICENSE', OUT / f'{family}-OFL.txt')
for name in ['layout.json', 'advances.json', 'Newsreader-800.ttf', 'SourceSans3-600.ttf', 'newsreader-OFL.txt', 'source-sans-3-OFL.txt']:
    shutil.copy(OUT / name, IOS / name)
print('Deelkaart-assets en iOS-bundel gelijkgetrokken.')
