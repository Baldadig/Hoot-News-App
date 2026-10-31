// De punt als zon (brandboard v2, 'De punt als zon'; iOS OnboardingArt.swift): de rekenregels
// van de vier tekeningen in Welkom, los van de tekening zelf (components/SunArt.jsx), zodat
// tests/sun.test.mjs ze kan nalopen. Kader 168 × 140, eenheid k = 1,25, horizon op 72 %.
// Tijd t in seconden op één klok voor alle tekeningen; `local` is de tijd sinds de tekening er is.

export const K = 1.25
export const W = 168
export const H = 140
export const HZ = 0.72 * H // horizon: 100,8
export const CX = W / 2
export const LINE = 56 * K // halve breedte van de horizon (140 breed)

export const BREATH_S = 5.5 // adem en halo
export const RISE_S = 6 // op (en onder) in de Editie, opkomst in de intro
export const WATER_PT_S = 9 // stromend water in de Stroom

// Verminder beweging: een stilbeeld. De Editie op t = 4 (genoeg zon), de intro staat op, de rest
// op t = 1,6.
export const STILL = { intro: 1.6, editie: 4, stroom: 1.6, selectie: 1.6 }

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
export const lerp = (a, b, p) => a + (b - a) * p
export const quad = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) // easeInOutQuad
export const tri = (x) => {
  const m = ((x % 2) + 2) % 2
  return m < 1 ? m : 2 - m
}
// Adem: 0,975 + 0,075 · sin(2πt / 5,5).
export const breathe = (t) => 0.975 + 0.075 * Math.sin((2 * Math.PI * t) / BREATH_S)
// Halo: r 20k → 27k, dekking 35 % → 8 %, in 5,5 s heen en weer.
export function halo(t) {
  const p = (1 - Math.cos((2 * Math.PI * t) / BREATH_S)) / 2
  return { r: (20 + 7 * p) * K, o: 0.35 - 0.27 * p }
}

// De intro: de zon komt één keer op achter de horizon (6 s, easeInOutQuad) en ademt dan.
// Stil: hij staat op.
export function introSun(t, local, still = false) {
  const p = still ? 1 : quad(clamp(local / RISE_S))
  return { r: 22 * K * (still ? 1 : breathe(t)), cy: lerp(HZ + 23 * K, HZ - 10 * K, p) }
}

// De Editie: op en onder (driehoeksgolf, 6 s op en 6 s onder) en ademend.
export function editieSun(t) {
  const p = quad(tri(t / RISE_S))
  return { r: 22 * K * breathe(t), cy: HZ - 10 * K + (1 - p) * 30 * K }
}

// De Stroom: het water schuift 9 pt/s naar links, met een herhaling van 140k.
export const waterShift = (t) => ((t / 5) * 36 * K) % (140 * K)
