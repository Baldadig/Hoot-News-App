// De laadstapel: het wachtbeeld bij het eerste laden ("Even kijken bij je bronnen", nu zonder zin in
// beeld). Vellen schuiven rustig op elkaar tot een nette stapel: je bronnen worden verzameld. Alleen
// geometrie, geen h. en geen logo; bewust anders dan de Horizon van trek-om-te-verversen (geen lijn,
// geen zon, geen boog). Gelijk aan ios/Hoot/Views/LoadStack.swift (LoadStackGeometry).
//
// Vak 80 × 64 pt. Vier vellen van 40 × 24 pt, elk 8 pt naar rechts en 8 pt omlaag op het vorige
// (hoeken op 8 · 16 · 24 · 32): een stapel kaarten, schuin op elkaar, zodat het nooit leest als een
// menu van gelijke lijnen. Elk vel is papier met een haarlijn van 1 pt in inkt 3.
// Lus van 1600 ms, telkens één beweging (ease-glide):
//   0–400    de stapel schuift één plek naar achter (8 pt linksboven); het achterste vel vervaagt
//   400–800  een nieuw vel schuift van rechts (16 pt) vooraan op de stapel
//   800–1600 stil
// Na de lus ligt alles precies zoals ervoor: geen naad, en lang laden blijft kalm doorlopen.
// Klaar: de stapel staat, het voorste vel krijgt één rode kopregel (16 × 2 pt, 200 ms) en het geheel
// vervaagt naar de Editie (240 ms). Verminder beweging: de stapel staat stil; klaar is alleen dekking.
export const LOAD_STACK = {
  width: 80,
  box: 64,
  sheet: { width: 40, height: 24 },
  rhythm: 8,
  loop: 1600,
  step: 400,
  slide: 16,
  kop: { x: 40, y: 40, width: 16, height: 2 },
  kopIn: 200,
  fadeOut: 240,
}
export const LOAD_STACK_DONE = LOAD_STACK.kopIn + LOAD_STACK.fadeOut // 440 ms van klaar tot weg

// Plek k: 0 = achter … 3 = voor; -1 is de plek waar het achterste vel heen vervaagt.
export const slotCorner = (k) => 8 + LOAD_STACK.rhythm * k
const slot = (k, x = 0, opacity = 1) => ({ x: slotCorner(k) + x, y: slotCorner(k), width: LOAD_STACK.sheet.width, height: LOAD_STACK.sheet.height, opacity })

// --ease-glide: cubic-bezier(0.2, 0.8, 0.2, 1)
export function glide(t) {
  const x1 = 0.2, y1 = 0.8, x2 = 0.2, y2 = 1
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (u) => ((ax * u + bx) * u + cx) * u
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx
  const v = Math.min(1, Math.max(0, t))
  let u = v
  for (let i = 0; i < 8; i++) {
    const e = sx(u) - v, d = dx(u)
    if (Math.abs(e) < 1e-6 || !d) break
    u -= e / d
  }
  return ((ay * u + by) * u + cy) * u
}

const mix = (a, b, t) => a + (b - a) * t
const between = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), width: mix(a.width, b.width, t), height: a.height, opacity: mix(a.opacity, b.opacity, t) })

// De vijf vellen (vier op de stapel en het nieuwe) op tijdstip `ms` in de lus. `still`: de rust.
export function stackCards(ms = 0, still = false) {
  const rest = [0, 1, 2, 3].map((k) => slot(k))
  const fresh = slot(3, LOAD_STACK.slide, 0)
  if (still) return [...rest, fresh]
  const { loop, step } = LOAD_STACK
  const c = ((ms % loop) + loop) % loop
  const a = c < step ? glide(c / step) : 1
  const b = c < step ? 0 : c < 2 * step ? glide((c - step) / step) : 1
  const back = [0, 1, 2, 3].map((k) => between(slot(k), slot(k - 1, 0, k === 0 ? 0 : 1), a))
  // Het nieuwe vel is op de helft van zijn beweging al dicht: zo schemert de stapel er maar kort doorheen.
  const front = between(fresh, slot(3), b)
  return [...back, { ...front, opacity: Math.min(1, 2 * b) }]
}

// Blijft de stapel nog even staan na het laden (klaar), of gaat hij meteen weg (fout)?
// Pure stap voor useLoadStack: { prev, hold } → volgende toestand.
export function nextStackState(state, loading, ok = true) {
  if (state.prev === loading) return state
  return { prev: loading, hold: state.prev && !loading ? ok : loading ? false : state.hold }
}
