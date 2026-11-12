// Placeholderbeeld (build 46, keuze van Alex): heeft een stuk geen beeld, is het te klein voor de plek
// of laadt het niet, dan vult een Hoot-beeld het vak. Achttien losse beelden. De eerste tien in vijf
// sets: 1 tot 3 Zonnestand (de zon op de horizon in drie standen, steeds vol), 4 tot 6 Iris (uitsneden
// van de iris, steeds dichterbij), 7 Horizonlijnen (alleen lijnen), 8 en 9 Raster (met één rode punt) en
// 10 De stapel (vellen uit het laadteken). Sinds 12 november (ronde 2, alle acht goedgekeurd) elk een
// eigen set: 11 De kop en 12 Vouw (krant), 13 Baan en 14 Eclips (zonnestelsel), 15 Walsen en 16 Zetsel
// (drukpers), 17 De rij en 18 Koepels (de tel tot tien). Ze dragen geen betekenis: geen dagdeel, geen
// rubriek, geen tekst. Intern heten ze beeld 1 tot 18. Elk beeld heeft een kleine tekening voor het
// kleine vak rechts.
//
// Eén bron voor web en app: scripts/placeholders.mjs maakt hieruit de SVG's (src/assets/placeholder/),
// de CSS (src/placeholder.css) en de tabel voor SwiftUI (ios/Hoot/Views/PlaceholderBeelden.swift).
// Dezelfde keuze voor hetzelfde artikel: tests/fixtures/placeholder.json draait op web en iOS.

export const PLACEHOLDER_COUNT = 18

// FNV-1a (32 bit) over de UTF-8-bytes van de id. Dezelfde som in Beeldloos.swift.
export function fnv1a(s) {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(String(s))) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Het beeld van een artikel op zich: 0 tot 17 (beeld 1 tot 18). De hash strooit ze door elkaar.
export const placeholderBase = (id) => fnv1a(id) % PLACEHOLDER_COUNT

// De set van een beeld (0 tot 17): zon, iris, lijn, raster, stapel, of een van de acht nieuwe (elk een eigen set).
export const placeholderSet = (k) => PLACEHOLDERS[k].family

// Doorschuiven: drie verder (mod 18) valt altijd in een andere set. De sets liggen op volgorde
// (zon 0–2 · iris 3–5 · lijn 6 · raster 7–8 · stapel 9 · dan elf tot achttien elk een eigen set 10–17):
// zon → iris (3–5), iris → lijn of raster (6–8), lijn → stapel (9), raster → De kop of Vouw (10–11),
// en vanaf de stapel altijd een eenling of de zon (0–2). Alle stappen van 3 tot 15 zijn geldig; drie geeft
// bij achttien nog steeds de gelijkste verdeling (gemeten op 5000 en 20 000 ids). De tests lopen alle
// achttien beelden na.
export const PLACEHOLDER_SHIFT = 3

// Een lijst van boven naar onder: `rows` is [{ id, bare }], `bare` of die rij het placeholderbeeld toont.
// Twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld en nooit dezelfde set: zit het
// beeld in dezelfde set als dat van de rij erboven, dan schuift het drie door, naar een andere set.
// Alleen de directe buur telt, dus een nieuw stuk bovenaan verschuift hooguit de rij eronder. Geeft een
// Map id → 0 tot 17 voor de beeldloze rijen.
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
  // Ronde 2 (12 november): acht beelden, elk een eigen set, alleen kleuren die hierboven al staan.
  // De kop: bg uit Zonnestand, kop = `faint` van Horizonlijnen, kolom = `disc` van Iris (Nacht: #1E1B17,
  // de Iris-schijf van Nacht valt op dit vlak weg).
  kop: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', kop: '#C5BEB2', kolom: '#E0D6C3' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', kop: '#49443D', kolom: '#2A2620' },
    nacht: { bg: '#12100E', sun: '#DF8276', kop: '#39342D', kolom: '#1E1B17' },
  },
  // Vouw: vlak en schijf van Iris als papier en vel, de Iris-lijnkleur als achterkant van de klep, de
  // puntkleur van Raster als drukwerk. Eén rood: de punt.
  vouw: {
    licht: { bg: '#EFE9DD', sheet: '#E0D6C3', flap: '#B0A48F', dot: '#A0998D', sun: '#9A3324' },
    donker: { bg: '#1E1B17', sheet: '#2A2620', flap: '#4A443A', dot: '#6E685E', sun: '#EC7A70' },
    nacht: { bg: '#0E0D0B', sheet: '#181612', flap: '#2F2B25', dot: '#5B5448', sun: '#DF8276' },
  },
  // Baan: precies het Iris-palet. Banen in de schijfkleur, planeten in de lijnkleur, de zon rood.
  baan: {
    licht: { bg: '#ECE5D7', sun: '#9A3324', ring: '#E0D6C3', planet: '#B0A48F' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', ring: '#2A2620', planet: '#4A443A' },
    nacht: { bg: '#0E0D0B', sun: '#DF8276', ring: '#181612', planet: '#2F2B25' },
  },
  // Eclips: het vlak van Zonnestand, de maan in de Iris-lijnkleur, de baan in de Iris-schijfkleur.
  eclips: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', moon: '#B0A48F', ring: '#E0D6C3' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', moon: '#4A443A', ring: '#2A2620' },
    nacht: { bg: '#12100E', sun: '#DF8276', moon: '#2F2B25', ring: '#181612' },
  },
  // Walsen: precies het Iris-palet. Rollen in `disc`, het vel in `line`, één vel rood.
  walsen: {
    licht: { bg: '#ECE5D7', sun: '#9A3324', line: '#B0A48F', disc: '#E0D6C3' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#4A443A', disc: '#2A2620' },
    nacht: { bg: '#0E0D0B', sun: '#DF8276', line: '#2F2B25', disc: '#181612' },
  },
  // Zetsel: bg uit Zonnestand, disc uit Iris, faint uit Horizonlijnen (Nacht: de vierde lijntint).
  zetsel: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', disc: '#E0D6C3', faint: '#C5BEB2' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', disc: '#2A2620', faint: '#49443D' },
    nacht: { bg: '#12100E', sun: '#DF8276', disc: '#28251F', faint: '#39342D' },
  },
  // De rij: stroken in raster.dot en zon.line, het kwartvlak in iris.disc (Donker lijn.fainter, Nacht
  // raster.grid); in Donker en Nacht de lichte strook in lijn.faint, zodat het om-en-om blijft lezen.
  rij: {
    licht: { bg: '#EFE9DD', vlak: '#E0D6C3', inkt: '#6B6457', dot: '#A0998D', sun: '#9A3324' },
    donker: { bg: '#1E1B17', vlak: '#36322C', inkt: '#766E61', dot: '#49443D', sun: '#EC7A70' },
    nacht: { bg: '#12100E', vlak: '#2A2721', inkt: '#5E574D', dot: '#39342D', sun: '#DF8276' },
  },
  // Koepels: bg, sun en line van Zonnestand, disc van Iris, faint en soft van Horizonlijnen.
  koepels: {
    licht: { bg: '#EFE9DD', sun: '#9A3324', line: '#6B6457', disc: '#E0D6C3', faint: '#C5BEB2', soft: '#ADA69A' },
    donker: { bg: '#1E1B17', sun: '#EC7A70', line: '#766E61', disc: '#2A2620', faint: '#49443D', soft: '#605B52' },
    nacht: { bg: '#12100E', sun: '#DF8276', line: '#5E574D', disc: '#181612', faint: '#39342D', soft: '#4F493E' },
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

// ---- Ronde 2: elf tot achttien (de bronnen staan in Hoot-design/placeholders-nieuw-2/concept-N.mjs) ----
const r1 = (v) => Math.round(v * 10) / 10
const r2 = (v) => Math.round(v * 100) / 100

// 11 De kop: een kopbalk die links uit beeld loopt, drie kolommen eronder, en een rode halve zon met de
// platte kant op de onderkant van de kop en de rechterkant op het eind van de kop (clipY = onderkant kop).
const krant = (W, H, [kx, ky, kw, kh], top, kolommen, r) => ({
  w: W, h: H, clipY: ky + kh,
  shapes: [
    { t: 'rect', x: kx, y: ky, w: kw, h: kh, fill: 'kop' },
    ...kolommen.map(([x, w, eind]) => ({ t: 'rect', x, y: top, w, h: eind - top, fill: 'kolom' })),
    { t: 'circle', cx: kx + kw - r, cy: ky + kh, r, fill: 'sun', clip: true },
  ],
})

// 12 Vouw: een vel (x, y, b, h; loopt over de rand) met de rechterbovenhoek over `f` dubbelgevouwen, een
// puntraster als drukwerk en de rode punt waar de punt van de klep landt. De vouw loopt van (cut, y) naar
// (x2, y + f), onder 45 graden. Het concept nam de hoek voorbij de vouw weg met de rand van een cirkel van
// r 4000 (die buigt in het midden f² / 8R, groot 0,7 punt, en wordt op grote schermen meer dan een pixel
// krom). Hier is het een brede rechte lijn in de vlakkleur (`sw`, groeit mee met het beeld), met één
// kant precies op de vouw: hetzelfde beeld, maar de vouw is echt recht, op web en in SwiftUI.
const vouw = (W, H, [x, y, w, h], f, xs, ys, r, rr) => {
  const x2 = x + w, cut = x2 - f
  const onder = (px, py) => py - y >= px - cut // op het vel, niet voorbij de vouw
  const klep = (px, py) => px >= cut - 0.01 && py <= y + f + 0.01
  const tip = [cut, y + f]
  // De lijn ligt een halve breedte (f / 2) naar rechtsboven van de vouw en steekt aan beide kanten f uit.
  const o = f / 2 / Math.SQRT2, e = f / Math.SQRT2
  return {
    w: W, h: H,
    shapes: [
      { t: 'rect', x, y, w, h, fill: 'sheet' },
      ...ys.flatMap((py) => xs.filter((px) => px > x && px < x2 && py > y && py < y + h && onder(px, py) && !klep(px, py) && Math.hypot(px - tip[0], py - tip[1]) > rr + 3).map((px) => ({ t: 'circle', cx: px, cy: py, r, fill: 'dot' }))),
      { t: 'rect', x: cut, y, w: f, h: f, fill: 'flap' },
      { t: 'line', x1: r2(cut - e + o), y1: r2(y - e - o), x2: r2(x2 + e + o), y2: r2(y + f + e - o), stroke: 'bg', sw: f },
      { t: 'circle', cx: tip[0], cy: tip[1], r: rr, fill: 'sun' },
    ],
  }
}

// 13 Baan: een rode zon die van onder de rand opkomt, banen als brede ringen (stroke + sw, groeit mee),
// op elke baan een schijf ([baan, hoek in graden, straal]). Banen, dan planeten, dan de zon.
const baan = (W, H, cx, cy, rz, banen, planeten) => ({
  w: W, h: H,
  shapes: [
    ...banen.map(([r, sw]) => ({ t: 'circle', cx, cy, r, stroke: 'ring', sw })),
    ...planeten.map(([i, hoek, r]) => {
      const a = (hoek * Math.PI) / 180, R = banen[i][0]
      return { t: 'circle', cx: r2(cx + R * Math.cos(a)), cy: r2(cy + R * Math.sin(a)), r, fill: 'planet' }
    }),
    { t: 'circle', cx, cy, r: rz, fill: 'sun' },
  ],
})

// 15 Walsen: twee liggende rollen (lijf tot x, kop een cirkel op x), het vel als balk dat rechts in
// gelijke vellen uiteenvalt; het eerste losse vel is rood.
const rect = (x, y, w, h, fill) => ({ t: 'rect', x, y, w, h, fill })
const rol = (x, cy, R) => [rect(0, cy - R, x, 2 * R, 'disc'), { t: 'circle', cx: x, cy, r: R, fill: 'disc' }]
const vel = (x0, xs, y, h, len, gap, W) => {
  const out = [rect(x0, y, xs - gap - x0, h, 'line')]
  for (let x = xs, i = 0; x < W; x += len + gap, i++) {
    const last = W - (x + len + gap) < len / 2
    out.push(rect(x, y, last ? W - x : len, h, i === 0 ? 'sun' : 'line'))
    if (last) break
  }
  return out
}

// 16 Zetsel: een letterkast van vakken van s × s met g lucht. B/b blok (disc/faint), . open,
// D/d/Z halve cirkel op de onderkant van het vak (disc/faint/rood), 1 2 3 4 kwartcirkel als hoek
// (linksboven, rechtsboven, linksonder, rechtsonder). Halve en kwartcirkels: een cirkel waarvan het
// overtollige deel wordt afgedekt door vlakken in `bg` (die overlappen en steken 1 uit, tegen spikkels
// van anti-aliasing). Volgorde: hoeken, halve cirkels van boven naar onder, blokken.
const VUL = { B: 'disc', b: 'faint', R: 'sun', Z: 'sun', D: 'disc', d: 'faint', 1: 'disc', 2: 'disc', 3: 'disc', 4: 'disc' }
function zetsel(W, H, x0, y0, s, g, rows) {
  const cellen = rows.flatMap((row, r) => [...row].map((t, k) => ({ r, k, t, x: x0 + k * (s + g), y: y0 + r * (s + g) }))).filter((c) => c.t !== '.')
  const shapes = []
  for (const c of cellen.filter((c) => '1234'.includes(c.t))) {
    const { x, y } = c, f = VUL[c.t]
    if (c.t === '1') shapes.push({ t: 'circle', cx: x + s, cy: y + s, r: s, fill: f }, rect(x - 1, y + s, 2 * s + 2, s + 1, 'bg'), rect(x + s, y - 1, s + 1, s + 2, 'bg'))
    if (c.t === '2') shapes.push({ t: 'circle', cx: x, cy: y + s, r: s, fill: f }, rect(x - s - 1, y + s, 2 * s + 2, s + 1, 'bg'), rect(x - s - 1, y - 1, s + 1, s + 2, 'bg'))
    if (c.t === '3') shapes.push({ t: 'circle', cx: x + s, cy: y, r: s, fill: f }, rect(x - 1, y - s - 1, 2 * s + 2, s + 1, 'bg'), rect(x + s, y - 1, s + 1, s + 2, 'bg'))
    if (c.t === '4') shapes.push({ t: 'circle', cx: x, cy: y, r: s, fill: f }, rect(x - s - 1, y - s - 1, 2 * s + 2, s + 1, 'bg'), rect(x - s - 1, y - 1, s + 1, s + 2, 'bg'))
  }
  for (const c of cellen.filter((c) => 'DdZ'.includes(c.t))) {
    if ('1234'.includes(rows[c.r + 1]?.[c.k] ?? '.')) throw new Error(`zetsel: halve cirkel boven een hoek (${c.r},${c.k})`)
    shapes.push({ t: 'circle', cx: c.x + s / 2, cy: c.y + s, r: s / 2, fill: VUL[c.t] }, rect(c.x - 1, c.y + s, s + 2, s / 2 + 1, 'bg'))
  }
  for (const c of cellen.filter((c) => 'BbR'.includes(c.t))) shapes.push(rect(c.x, c.y, s, s, VUL[c.t]))
  return { w: W, h: H, shapes }
}

// 17 De rij: tien stroken (breedte b) hangen van de bovenrand en eindigen in een halve cirkel, om en om
// lang en kort, licht en donker. Plek `open` is leeg; die strook staat als rode schijf ([cy, r]) eronder.
// `plaat` [cx, cy, r] is het kwartvlak.
const strook = (x, eind, b, fill) => [
  { t: 'rect', x: r2(x - b / 2), y: 0, w: b, h: r2(eind - b / 2), fill },
  { t: 'circle', cx: r2(x), cy: r2(eind - b / 2), r: r2(b / 2), fill },
]
const rij = (W, H, x0, stap, b, lang, kort, open, rood, plaat) => ({
  w: W, h: H,
  shapes: [
    { t: 'circle', cx: plaat[0], cy: plaat[1], r: plaat[2], fill: 'vlak' },
    ...Array.from({ length: 10 }, (_, i) => (i === open ? [] : strook(x0 + i * stap, i % 2 ? kort : lang, b, i % 2 ? 'inkt' : 'dot'))).flat(),
    { t: 'circle', cx: r2(x0 + open * stap), cy: rood[0], r: rood[1], fill: 'sun' },
  ],
})

// 18 Koepels: tien halve cirkels op de horizon hy, op vaste steek; de straal groeit langs een kwart sinus,
// getekend van groot naar klein (de kleine liggen voor), tonen disc · faint · soft rond, koepel `zon` rood
// (een sikkel op de flank, niet in de top). Onder de horizon een balk in de lijnkleur.
const KOEPELTONEN = ['disc', 'faint', 'soft']
const koepels = ({ w, h, hy, x0, step, rmin, rmax, bar, zon }) => {
  const ks = Array.from({ length: 10 }, (_, i) => ({
    t: 'circle', cx: r1(x0 + i * step), cy: hy, r: r1(rmin + (rmax - rmin) * Math.sin((Math.PI / 2) * (i / 9))),
    fill: i === zon ? 'sun' : KOEPELTONEN[i % 3], clip: true,
  }))
  return { w, h, clipY: hy, shapes: [...ks.reverse(), { t: 'rect', x: 0, y: hy, w, h: bar, fill: 'line' }] }
}

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
  // 11: De kop. Kop 24 hoog op y 40, kolommen breed, smal en kort, breed; de halve zon r 30.
  { family: 'kop', groot: krant(358, 179, [0, 40, 262, 24], 76, [[24, 100, 179], [136, 36, 132], [184, 78, 179]], 30), klein: krant(96, 64, [0, 16, 72, 9], 30, [[8, 30, 64], [44, 10, 50], [60, 12, 64]], 12) },
  // 12: Vouw. Raster en vouw op één steek (groot 12, klein 6), rondom dezelfde marge (24, klein 8).
  { family: 'vouw', groot: vouw(358, 179, [-10, -10, 271.5, 200], 105.5, steek(24, 10, 12), steek(23.5, 12, 12), 1.25, 5), klein: vouw(96, 64, [-4, -4, 72, 72], 30, steek(8, 4, 6), steek(8, 9, 6), 0.9, 3) },
  // 13: Baan. De zon (r 38) komt links van onder de rand op; drie banen, oplopende schijven. Klein: twee.
  {
    family: 'baan',
    groot: baan(358, 179, 92, 190, 38, [[88, 12], [148, 12], [212, 12]], [[0, -62, 10], [1, -50, 15], [2, -26, 21]]),
    klein: baan(96, 64, 24, 66, 13, [[30, 5], [52, 5]], [[0, -64, 4.5], [1, -34, 7]]),
  },
  // 14: Eclips. De maan schuift voor de zon, een rode sikkel blijft; een baan met een planeet als kraal en
  // een kwartcirkel als tegenwicht. Klein: de eclips dichterbij, zonder planeet en kwartcirkel.
  {
    family: 'eclips',
    groot: { w: 358, h: 179, shapes: [
      { t: 'circle', cx: 358, cy: 179, r: 46, fill: 'ring' },
      { t: 'circle', cx: 160, cy: 98, r: 64, stroke: 'ring', sw: 8 },
      { t: 'circle', cx: 160, cy: 98, r: 34, fill: 'sun' },
      { t: 'circle', cx: 178, cy: 82, r: 30, fill: 'moon' },
      { t: 'circle', cx: 114.75, cy: 52.75, r: 6, fill: 'moon' },
    ] },
    klein: { w: 96, h: 64, shapes: [
      { t: 'circle', cx: 46, cy: 32, r: 23, stroke: 'ring', sw: 4 },
      { t: 'circle', cx: 46, cy: 32, r: 13, fill: 'sun' },
      { t: 'circle', cx: 52, cy: 27, r: 11, fill: 'moon' },
    ] },
  },
  // 15: Walsen. Rollen r 52 (klein 20), de knijp in het midden; het eerste losse vel rood.
  {
    family: 'walsen',
    groot: { w: 358, h: 179, shapes: [...vel(150, 242, 85, 10, 34, 6, 358), ...rol(150, 33, 52), ...rol(150, 147, 52)] },
    klein: { w: 96, h: 64, shapes: [...vel(38, 62, 29, 6, 14, 3, 96), ...rol(38, 9, 20), ...rol(38, 55, 20)] },
  },
  // 16: Zetsel. Zes bij drie vakken van 32 (klein vier bij drie van 16), één rode halve cirkel.
  {
    family: 'zetsel',
    groot: zetsel(358, 179, 73, 37.5, 32, 4, ['1DB.D2', 'B.bZBB', '3BD.B4']),
    klein: zetsel(96, 64, 11.5, 5, 16, 3, ['1DB2', 'b.ZB', '3B.4']),
  },
  // 17: De rij. Tien stroken, plek zeven als rode schijf uit de rij gestapt. Klein: plek vier tot negen.
  { family: 'rij', groot: rij(358, 179, 26, 34, 20, 100, 76, 6, [140, 15], [0, 179, 112]), klein: rij(96, 64, -42.5, 17, 10, 34, 26, 6, [49, 6], [0, 64, 30]) },
  // 18: Koepels. Tien halve cirkels op de horizon, koepel acht rood.
  {
    family: 'koepels',
    groot: koepels({ w: 358, h: 179, hy: 154, x0: 34, step: 26, rmin: 12, rmax: 136, bar: 8, zon: 7 }),
    klein: koepels({ w: 96, h: 64, hy: 56, x0: 8, step: 7.5, rmin: 4, rmax: 50, bar: 4, zon: 7 }),
  },
]

export const THEMES = ['licht', 'donker', 'nacht']

// De SVG van beeld n (1 tot 18) in een weergave, groot of klein. Decoratie: aria-hidden.
export function placeholderSvg(n, theme = 'licht', klein = false) {
  const p = PLACEHOLDERS[n - 1]
  const L = (klein && p.klein) || p.groot
  const c = PALETTES[p.family][theme]
  const clip = L.clipY != null ? `<defs><clipPath id="h"><rect width="${L.w}" height="${L.clipY}"/></clipPath></defs>` : ''
  const shape = (s) => {
    let el
    if (s.t === 'rect') el = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${c[s.fill]}"/>`
    else if (s.t === 'line') el = `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${c[s.stroke]}" stroke-width="${s.fixed ? 1 : s.sw ?? 1}"${s.fixed ? ' vector-effect="non-scaling-stroke"' : ''}/>`
    else el = `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${s.fill ? `fill="${c[s.fill]}"` : `fill="none" stroke="${c[s.stroke]}" stroke-width="${s.sw}"`}/>`
    return s.clip && L.clipY != null ? `<g clip-path="url(#h)">${el}</g>` : el
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${clip}<rect width="${L.w}" height="${L.h}" fill="${c.bg}"/>${L.shapes.map(shape).join('')}</svg>\n`
}

// Bestandsnaam: beeld-1.svg, beeld-1-donker.svg, beeld-1-nacht-klein.svg.
export const placeholderFile = (n, theme = 'licht', klein = false) => `beeld-${n}${theme === 'licht' ? '' : '-' + theme}${klein ? '-klein' : ''}.svg`
