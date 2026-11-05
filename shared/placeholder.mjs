// Placeholderbeeld (build 46, keuze van Alex): heeft een stuk geen beeld, is het te klein voor de plek
// of laadt het niet, dan vult een Hoot-beeld het vak. Tien losse beelden in vijf sets: 1 tot 3
// Zonnestand (de zon op de horizon in drie standen, steeds vol), 4 tot 6 Iris (uitsneden van de iris,
// steeds dichterbij), 7 Horizonlijnen (alleen lijnen), 8 en 9 Raster (met één rode punt) en 10 De stapel
// (vellen uit het laadteken). Ze dragen geen betekenis: geen dagdeel, geen rubriek, geen tekst.
// Intern heten ze beeld 1 tot 10. Elk beeld heeft een kleine tekening voor het kleine vak rechts.
//
// Eén bron voor web en app: scripts/placeholders.mjs maakt hieruit de SVG's (src/assets/placeholder/),
// de CSS (src/placeholder.css) en de tabel voor SwiftUI (ios/Hoot/Views/PlaceholderBeelden.swift).
// Dezelfde keuze voor hetzelfde artikel: tests/fixtures/placeholder.json draait op web en iOS.

export const PLACEHOLDER_COUNT = 10

// FNV-1a (32 bit) over de UTF-8-bytes van de id. Dezelfde som in Beeldloos.swift.
export function fnv1a(s) {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(String(s))) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Het beeld van een artikel op zich: 0 tot 9 (beeld 1 tot 10). De hash strooit ze door elkaar.
export const placeholderBase = (id) => fnv1a(id) % PLACEHOLDER_COUNT

// De set van een beeld (0 tot 9): zon, iris, lijn, raster of stapel.
export const placeholderSet = (k) => PLACEHOLDERS[k].family

// Doorschuiven: drie verder (mod 10) valt altijd in een andere set. De sets liggen op volgorde
// (zon 0–2 · iris 3–5 · lijn 6 · raster 7–8 · stapel 9): zon → iris (3–5), iris → lijn of raster (6–8),
// lijn → stapel (9), raster → zon (0–1), stapel → zon (2). Van de geldige stappen geeft drie de gelijkste
// verdeling; de tests lopen alle tien beelden na.
export const PLACEHOLDER_SHIFT = 3

// Een lijst van boven naar onder: `rows` is [{ id, bare }], `bare` of die rij het placeholderbeeld toont.
// Twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld en nooit dezelfde set: zit het
// beeld in dezelfde set als dat van de rij erboven, dan schuift het drie door, naar een andere set.
// Alleen de directe buur telt, dus een nieuw stuk bovenaan verschuift hooguit de rij eronder. Geeft een
// Map id → 0 tot 9 voor de beeldloze rijen.
export function placeholderPlan(rows) {
  const out = new Map()
  let prev = null
  for (const r of rows) {
    if (!r?.bare) {
      prev = null
      continue
    }
    let k = placeholderBase(r.id)
    if (prev != null && placeholderSet(k) === placeholderSet(prev)) k = (k + PLACEHOLDER_SHIFT) % PLACEHOLDER_COUNT
    out.set(r.id, k)
    prev = k
  }
  return out
}

// ---- Tekening ----
// Kleuren per familie en weergave (Licht, Donker, Nacht). Rood is alleen een accent.
export const PALETTES = {
  zon: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', line: '#6B6457', outline: '#4B453B' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#766E61', outline: '#A39B8D' },
    nacht: { bg: '#12100E', sun: '#DF8276', line: '#5E574D', outline: '#8C826F' },
  },
  iris: {
    licht: { bg: '#ECE5D7', sun: '#9A3324', line: '#B0A48F', disc: '#E0D6C3' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#4A443A', disc: '#2A2620' },
    nacht: { bg: '#0E0D0B', sun: '#DF8276', line: '#2F2B25', disc: '#181612' },
  },
  // Horizonlijnen: alleen lijnen. De horizon in de lijnkleur van Zonnestand, de rest steeds zachter
  // (de lijnkleur gemengd met het vlak: 50, 32 en 18 procent). Geen rood.
  lijn: {
    licht: { bg: '#EFE9DD', line: '#6B6457', soft: '#ADA69A', faint: '#C5BEB2', fainter: '#D7D1C5' },
    donker: { bg: '#1E1B17', line: '#766E61', soft: '#605B52', faint: '#49443D', fainter: '#36322C' },
    nacht: { bg: '#12100E', line: '#5E574D', soft: '#4F493E', faint: '#39342D', fainter: '#28251F' },
  },
  // Raster: punten (60 procent) of haarlijnen (20 procent), en één rode punt.
  raster: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', dot: '#A0998D', grid: '#D5CEC2' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', dot: '#6E685E', grid: '#39352F' },
    nacht: { bg: '#12100E', sun: '#DF8276', dot: '#5B5448', grid: '#2A2721' },
  },
  // De stapel: vellen als haarlijnen, zoals het laadteken. Het bovenste vel draagt de rode kopstreep,
  // zoals bij het landen van het laadteken.
  stapel: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', line: '#857F72' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#888175' },
    nacht: { bg: '#12100E', sun: '#DF8276', line: '#746B5C' },
  },
}

// Een tekening: een vlak van w × h in de achtergrondkleur, dan de vormen. Het beeld vult het vak zoals
// een foto (cover: de kortste kant past, de rest valt weg, gecentreerd). `clipY`: vormen met `clip`
// vallen weg onder die lijn (de zon onder de horizon). Een lijn met `fixed` is altijd 1 punt dik.
// `klein` is de tekening voor de miniatuur (3:2) als die anders is.
const zonGroot = (sun) => ({ w: 358, h: 179, clipY: 111, shapes: [sun, { t: 'rect', x: 24, y: 111, w: 310, h: 1, fill: 'line' }] })
const zonKlein = (sun) => ({ w: 96, h: 64, clipY: 40, shapes: [sun, { t: 'rect', x: 12, y: 40, w: 72, h: 1, fill: 'line' }] })
const iris = (line, discs, sun) => ({
  w: 400,
  h: 200,
  shapes: [{ t: 'line', x1: line[0], y1: line[1], x2: line[2], y2: line[3], stroke: 'line', fixed: true }, ...discs.map(([cx, cy, r]) => ({ t: 'circle', cx, cy, r, fill: 'disc' })), { t: 'circle', cx: sun[0], cy: sun[1], r: sun[2], fill: 'sun' }],
})

// Iris klein (96 × 64): dezelfde uitsnede als groot in 3:2 (schaal 0,32, 16 naar links), de rode punt
// minstens r 3 zodat hij op de miniatuur nog leest.
const irisKlein = (g) => {
  const k = 0.32, dx = -16, r1 = (v) => Math.round(v * 10) / 10
  const pt = (x, y) => [r1(x * k + dx), r1(y * k)]
  return {
    w: 96,
    h: 64,
    shapes: g.shapes.map((s) => {
      if (s.t === 'line') { const [x1, y1] = pt(s.x1, s.y1), [x2, y2] = pt(s.x2, s.y2); return { ...s, x1, y1, x2, y2 } }
      const [cx, cy] = pt(s.cx, s.cy)
      return { ...s, cx, cy, r: s.fill === 'sun' ? Math.max(3, r1(s.r * k)) : r1(s.r * k) }
    }),
  }
}
// Een haarlijn van 1 punt, hoe groot het beeld ook wordt (fixed), in kleur `stroke`; y (of x) is de
// bovenkant (linkerkant) van de lijn.
const h1 = (x, y, w, stroke) => ({ t: 'line', x1: x, y1: y + 0.5, x2: x + w, y2: y + 0.5, stroke, fixed: true })
const v1 = (x, y, h, stroke) => ({ t: 'line', x1: x + 0.5, y1: y, x2: x + 0.5, y2: y + h, stroke, fixed: true })
// Horizonlijnen (7): de horizon hoog, eronder lijnen over de volle breedte, de afstand groeit, de kleur zakt weg.
const lijnen8 = (W, H, x0, ys) => ({
  w: W, h: H,
  shapes: ys.map((y, i) => h1(x0, y, W - 2 * x0, ['line', 'soft', 'soft', 'faint', 'fainter'][i])),
})
// Raster 8: punten op een vaste steek, één punt is rood (en iets groter).
const punten = (W, H, xs, ys, r, red, R) => ({
  w: W, h: H,
  shapes: [...ys.flatMap((y) => xs.filter((x) => !(x === red[0] && y === red[1])).map((x) => ({ t: 'circle', cx: x, cy: y, r, fill: 'dot' }))), { t: 'circle', cx: red[0], cy: red[1], r: R, fill: 'sun' }],
})
// Raster 9: haarlijnen van rand tot rand, de rode punt op een kruising.
const lijnraster = (W, H, xs, ys, red, R) => ({
  w: W, h: H,
  shapes: [...xs.map((x) => v1(x, 0, H, 'grid')), ...ys.map((y) => h1(0, y, W, 'grid')), { t: 'circle', cx: red[0], cy: red[1], r: R, fill: 'sun' }],
})
// De stapel 10: vier vellen als haarlijnen (opzij −4 · 0 · +4 · −2, geschaald), het bovenste is de rode kopstreep.
const stapelLijnen = (W, H, len, step, offs, top, kop) => ({
  w: W, h: H,
  shapes: offs.map((o, i) => (i === 0 ? { t: 'rect', x: (W - len) / 2 + o, y: top - kop / 2, w: len, h: kop, fill: 'sun' } : h1((W - len) / 2 + o, top + i * step, len, 'line'))),
})
const steek = (from, n, step) => Array.from({ length: n }, (_, i) => from + i * step)

const IRIS = [
  iris([115.4, 15.4, 288.2, 188.2], [[165.8, 65.8, 50.4], [228.8, 128.8, 25.2], [261.2, 161.2, 12.6]], [279.2, 179.2, 7]),
  iris([-25.6, -125.6, 281.6, 181.6], [[64, -36, 89.6], [176, 76, 44.8], [233.6, 133.6, 22.4]], [265.6, 165.6, 9.6]),
  iris([686, -390, 110, 186], [[308, -12, 84], [200, 96, 42]], [140, 156, 12]),
]

export const PLACEHOLDERS = [
  // 1: de zon links, een derde boven de horizon.
  { family: 'zon', groot: zonGroot({ t: 'circle', cx: 88, cy: 120, r: 28, fill: 'sun', clip: true }), klein: zonKlein({ t: 'circle', cx: 24, cy: 44, r: 12, fill: 'sun', clip: true }) },
  // 2: de zon hoog in het midden, klein (r 16), zodat het rood een accent blijft.
  { family: 'zon', groot: zonGroot({ t: 'circle', cx: 179, cy: 56, r: 16, fill: 'sun', clip: true }), klein: zonKlein({ t: 'circle', cx: 48, cy: 20, r: 7, fill: 'sun', clip: true }) },
  // 3: de zon rechts, half onder de horizon, vol (keuze Alex: niet meer als omtrek).
  { family: 'zon', groot: zonGroot({ t: 'circle', cx: 270, cy: 111, r: 27, fill: 'sun', clip: true }), klein: zonKlein({ t: 'circle', cx: 72, cy: 40, r: 11.5, fill: 'sun', clip: true }) },
  // 4 tot 6: de iris, wijd, halverwege en dichtbij. In 3:2 valt x 50 tot 350 in beeld; klein is die uitsnede.
  ...IRIS.map((groot) => ({ family: 'iris', groot, klein: irisKlein(groot) })),
  // 7: Horizonlijnen. Alleen lijnen, heel stil.
  { family: 'lijn', groot: lijnen8(358, 179, 24, [72, 90, 110, 134, 162]), klein: lijnen8(96, 64, 12, [22, 30, 38, 47, 57]) },
  // 8 en 9: Raster met één rode punt. Punten op steek 24 (klein 12), of haarlijnen op steek 32 (klein 16).
  { family: 'raster', groot: punten(358, 179, steek(23, 14, 24), steek(17, 7, 24), 1.25, [215, 113], 4), klein: punten(96, 64, steek(12, 7, 12), steek(8, 5, 12), 0.9, [60, 44], 3) },
  { family: 'raster', groot: lijnraster(358, 179, steek(19, 11, 32), steek(9, 6, 32), [243.5, 73.5], 4), klein: lijnraster(96, 64, steek(8, 6, 16), steek(8, 4, 16), [56.5, 24.5], 3) },
  // 10: De stapel, uit het laadteken. Vier vellen als haarlijnen.
  { family: 'stapel', groot: stapelLijnen(358, 179, 128, 12, [-8, 0, 8, -4], 72, 2), klein: stapelLijnen(96, 64, 44, 7, [-3, 0, 3, -2], 22, 2) },
]

export const THEMES = ['licht', 'donker', 'nacht']

// De SVG van beeld n (1 tot 10) in een weergave, groot of klein. Decoratie: aria-hidden.
export function placeholderSvg(n, theme = 'licht', klein = false) {
  const p = PLACEHOLDERS[n - 1]
  const L = (klein && p.klein) || p.groot
  const c = PALETTES[p.family][theme]
  const clip = L.clipY != null ? `<defs><clipPath id="h"><rect width="${L.w}" height="${L.clipY}"/></clipPath></defs>` : ''
  const shape = (s) => {
    let el
    if (s.t === 'rect') el = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${c[s.fill]}"/>`
    else if (s.t === 'line') el = `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${c[s.stroke]}" stroke-width="1"${s.fixed ? ' vector-effect="non-scaling-stroke"' : ''}/>`
    else el = `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${s.fill ? `fill="${c[s.fill]}"` : `fill="none" stroke="${c[s.stroke]}" stroke-width="${s.sw}"`}/>`
    return s.clip && L.clipY != null ? `<g clip-path="url(#h)">${el}</g>` : el
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${clip}<rect width="${L.w}" height="${L.h}" fill="${c.bg}"/>${L.shapes.map(shape).join('')}</svg>\n`
}

// Bestandsnaam: beeld-1.svg, beeld-1-donker.svg, beeld-1-nacht-klein.svg.
export const placeholderFile = (n, theme = 'licht', klein = false) => `beeld-${n}${theme === 'licht' ? '' : '-' + theme}${klein ? '-klein' : ''}.svg`
