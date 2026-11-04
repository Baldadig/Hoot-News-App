// Placeholderbeeld (build 46, keuze van Alex): heeft een stuk geen beeld, is het te klein voor de plek
// of laadt het niet, dan vult een Hoot-beeld het vak. Zes losse beelden: 1 tot 3 uit Zonnestand (de zon
// op de horizon in drie standen), 4 tot 6 uit Iris (uitsneden van de iris, steeds dichterbij). Ze dragen
// geen betekenis: geen dagdeel, geen rubriek. Intern heten ze beeld 1 tot 6.
//
// Eén bron voor web en app: scripts/placeholders.mjs maakt hieruit de SVG's (src/assets/placeholder/),
// de CSS (src/placeholder.css) en de tabel voor SwiftUI (ios/Hoot/Views/PlaceholderBeelden.swift).
// Dezelfde keuze voor hetzelfde artikel: tests/fixtures/placeholder.json draait op web en iOS.

export const PLACEHOLDER_COUNT = 6

// FNV-1a (32 bit) over de UTF-8-bytes van de id. Dezelfde som in Beeldloos.swift.
export function fnv1a(s) {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(String(s))) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Het beeld van een artikel op zich: 0 tot 5 (beeld 1 tot 6).
export const placeholderBase = (id) => fnv1a(id) % PLACEHOLDER_COUNT

// Een lijst van boven naar onder: `rows` is [{ id, bare }], `bare` of die rij het placeholderbeeld toont.
// Twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld: is het beeld gelijk aan dat van
// de rij erboven, dan schuift het één door. Alleen de directe buur telt, dus een nieuw stuk bovenaan
// verschuift hooguit de rij eronder. Geeft een Map id → 0 tot 5 voor de beeldloze rijen.
export function placeholderPlan(rows) {
  const out = new Map()
  let prev = null
  for (const r of rows) {
    if (!r?.bare) {
      prev = null
      continue
    }
    let k = placeholderBase(r.id)
    if (k === prev) k = (k + 1) % PLACEHOLDER_COUNT
    out.set(r.id, k)
    prev = k
  }
  return out
}

// ---- Tekening ----
// Kleuren per familie en weergave (Licht, Donker, Nacht). Rood is alleen een accent.
export const PALETTES = {
  zon: {
    licht: { bg: '#EFE9DD', sun: '#A3201B', line: '#6B6457', outline: '#4B453B' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#766E61', outline: '#A39B8D' },
    nacht: { bg: '#12100E', sun: '#DF8276', line: '#5E574D', outline: '#8C826F' },
  },
  iris: {
    licht: { bg: '#ECE5D7', sun: '#A3201B', line: '#B0A48F', disc: '#E0D6C3' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#4A443A', disc: '#2A2620' },
    nacht: { bg: '#0E0D0B', sun: '#DF8276', line: '#2F2B25', disc: '#181612' },
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

export const PLACEHOLDERS = [
  // 1: de zon links, een derde boven de horizon.
  { family: 'zon', groot: zonGroot({ t: 'circle', cx: 88, cy: 120, r: 28, fill: 'sun', clip: true }), klein: zonKlein({ t: 'circle', cx: 24, cy: 44, r: 12, fill: 'sun', clip: true }) },
  // 2: de zon hoog in het midden, klein (r 16), zodat het rood een accent blijft.
  { family: 'zon', groot: zonGroot({ t: 'circle', cx: 179, cy: 56, r: 16, fill: 'sun', clip: true }), klein: zonKlein({ t: 'circle', cx: 48, cy: 20, r: 7, fill: 'sun', clip: true }) },
  // 3: de zon rechts, half onder de horizon, als omtrek.
  { family: 'zon', groot: zonGroot({ t: 'circle', cx: 270, cy: 111, r: 27, stroke: 'outline', sw: 2, clip: true }), klein: zonKlein({ t: 'circle', cx: 72, cy: 40, r: 11.5, stroke: 'outline', sw: 1, clip: true }) },
  // 4 tot 6: de iris, wijd, halverwege en dichtbij. In 3:2 valt x 50 tot 350 in beeld.
  { family: 'iris', groot: iris([115.4, 15.4, 288.2, 188.2], [[165.8, 65.8, 50.4], [228.8, 128.8, 25.2], [261.2, 161.2, 12.6]], [279.2, 179.2, 7]) },
  { family: 'iris', groot: iris([-25.6, -125.6, 281.6, 181.6], [[64, -36, 89.6], [176, 76, 44.8], [233.6, 133.6, 22.4]], [265.6, 165.6, 9.6]) },
  { family: 'iris', groot: iris([686, -390, 110, 186], [[308, -12, 84], [200, 96, 42]], [140, 156, 12]) },
]

export const THEMES = ['licht', 'donker', 'nacht']

// De SVG van beeld n (1 tot 6) in een weergave, groot of klein. Decoratie: aria-hidden.
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
