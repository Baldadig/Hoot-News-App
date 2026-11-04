#!/usr/bin/env python3
"""Herbouw de lettertypes van de iPhone-app en de schreefloze letter van de deelkaart.

Lezen in Newsreader, bedienen in Inter (tekstfont-advies 4 november 2026). Het web laadt de
variabele woff2's uit src/fonts/ (zie src/fonts/README.md); de app kan geen variabele as op
lettermaat zetten met Dynamische tekst, dus die krijgt vaste standen uit dezelfde bron:

  Newsreader Kop    800, opsz 16  (= de statische Newsreader 800 van het web en de deelkaart)
  Newsreader Tekst  400 en 430 (Nacht), opsz 17 (de intro van 17); voor de lezer ook 700 en cursief
  Inter             400, 600, 700, 800, opsz 14

Bron: de officiële variabele TTF's uit github.com/google/fonts (eenmalig ophalen):

  curl -LO 'https://github.com/google/fonts/raw/main/ofl/newsreader/Newsreader%5Bopsz,wght%5D.ttf'
  curl -LO 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf'
  curl -LO 'https://github.com/google/fonts/raw/main/ofl/newsreader/Newsreader-Italic%5Bopsz,wght%5D.ttf'
  python3 scripts/build-fonts.py 'Newsreader[opsz,wght].ttf' 'Inter[opsz,wght].ttf' 'Newsreader-Italic[opsz,wght].ttf'

Alleen voor dit script: Python met fonttools (pip install fonttools). Normale web- en
Xcode-builds lezen de ingecheckte bestanden.

Regelval: Newsreader heeft een lijnhoogte van precies 1 em (stijgen 0,735 + dalen 0,265). Op het
web zet CSS de regelhoogte zelf; SwiftUI rekent met de letter. Daarom krijgen de app-standen van
Newsreader de lijnhoogte van New York (1,193 em), met de daling van Newsreader zelf, zodat de
bestaande regelafstanden van de app blijven kloppen. Inter houdt zijn eigen maten (1,21 em, SF 1,18).
"""
import sys
from datetime import datetime, timezone
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

STAMP = int((datetime(2026, 11, 1, tzinfo=timezone.utc) - datetime(1904, 1, 1, tzinfo=timezone.utc)).total_seconds())
ROOT = Path(__file__).resolve().parent.parent
IOS = ROOT / 'ios/Hoot/Resources/Fonts'
DEELKAART = ROOT / 'shared/deelkaart'

# Latin en latin-ext, dezelfde reeksen als de woff2's van het web (Fontsource), plus pijlen.
RANGES = (
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,'
    'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,'
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,'
    'U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF,U+2190-2199'
)


def unicodes():
    out = set()
    for part in RANGES.split(','):
        a, _, b = part.removeprefix('U+').partition('-')
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out


def rename(font, family, style, ps, weight):
    name = font['name']
    for rec in list(name.names):
        if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 21, 22, 25):
            name.removeNames(nameID=rec.nameID)
    for nid, value in {1: family, 2: style, 3: f'{ps};hoot', 4: f'{family} {style}', 6: ps}.items():
        name.setName(value, nid, 3, 1, 0x409)
        name.setName(value, nid, 1, 0, 0)
    os2 = font['OS/2']
    os2.usWeightClass = weight
    bits = {'Bold': 0b100000, 'Italic': 0b1}.get(style, 0b1000000)
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | bits
    font['head'].macStyle = {'Bold': 1, 'Italic': 2}.get(style, 0)


def vertical(font, ascent_em):
    upm = font['head'].unitsPerEm
    hhea, os2 = font['hhea'], font['OS/2']
    descent = -hhea.descent
    ascent = round(ascent_em * upm) - descent
    hhea.ascent, hhea.lineGap = ascent, 0
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ascent, -descent, 0
    os2.usWinAscent = max(os2.usWinAscent, ascent)


def instance(source, loc, family, style, ps, weight, out, line_em=None):
    font = instantiateVariableFont(TTFont(source), loc, updateFontNames=False)
    for table in ('STAT', 'MVAR', 'HVAR', 'avar'):
        if table in font:
            del font[table]
    rename(font, family, style, ps, weight)
    if line_em:
        vertical(font, line_em)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    options.hinting = False
    options.glyph_names = False
    sub = subset.Subsetter(options)
    sub.populate(unicodes=unicodes())
    sub.subset(font)
    font['head'].created = font['head'].modified = STAMP  # vast: zelfde bytes bij herbouwen
    font.recalcTimestamp = False
    font.save(out)
    print('  ', out.relative_to(ROOT))


def main(newsreader, inter, italic):
    IOS.mkdir(parents=True, exist_ok=True)
    ny = 1.193  # lijnhoogte van New York: (1950 + 494) / 2048
    instance(newsreader, {'wght': 800, 'opsz': 16}, 'Newsreader Kop', 'ExtraBold', 'NewsreaderKop-ExtraBold', 800, IOS / 'NewsreaderKop-800.ttf', ny)
    instance(newsreader, {'wght': 400, 'opsz': 17}, 'Newsreader Tekst', 'Regular', 'NewsreaderTekst-Regular', 400, IOS / 'NewsreaderTekst-400.ttf', ny)
    instance(newsreader, {'wght': 430, 'opsz': 17}, 'Newsreader Tekst Nacht', 'Regular', 'NewsreaderTekst-Nacht', 430, IOS / 'NewsreaderTekst-430.ttf', ny)
    # Vet en cursief van dezelfde tekstletter, voor de lezer (strong, em en tussenkoppen in een artikel).
    instance(newsreader, {'wght': 700, 'opsz': 17}, 'Newsreader Tekst', 'Bold', 'NewsreaderTekst-Bold', 700, IOS / 'NewsreaderTekst-700.ttf', ny)
    instance(italic, {'wght': 400, 'opsz': 17}, 'Newsreader Tekst', 'Italic', 'NewsreaderTekst-Italic', 400, IOS / 'NewsreaderTekst-400-cursief.ttf', ny)
    for weight, style in [(400, 'Regular'), (600, 'SemiBold'), (700, 'Bold'), (800, 'ExtraBold')]:
        instance(inter, {'wght': weight, 'opsz': 14}, 'Inter' if weight in (400, 700) else f'Inter {style}', 'Regular' if weight not in (400, 700) else style, f'Inter-{style}', weight, IOS / f'Inter-{weight}.ttf')
    # De deelkaart: dezelfde Inter 600 als de app (server en app gelijk, tests/deelkaart.test.mjs).
    (DEELKAART / 'Inter-600.ttf').write_bytes((IOS / 'Inter-600.ttf').read_bytes())
    print('Lettertypes van de app en de deelkaart herbouwd.')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
