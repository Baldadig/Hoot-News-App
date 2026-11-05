// Tekstgrootte (Instellingen D): vijf standen bovenop de tekstgrootte van je toestel, gelijk aan de app
// (TekstSchaal in ios/Hoot/Views/Letters.swift). De tweede stand is "Zoals je toestel": het systeem
// (Dynamic Type op een iPhone, de standaardmaat van de browser op een computer) blijft de basis.
// Per toestel bewaard, zoals Weergave: niet in de profielsync (src/lib/sync.js).
export const TEXT_SIZES = [
  { value: 'kleiner', label: 'Kleiner', factor: 0.9 },
  { value: 'normaal', label: 'Zoals je toestel', factor: 1 },
  { value: 'groter', label: 'Groter', factor: 1.15 },
  { value: 'nog-groter', label: 'Nog groter', factor: 1.3 },
  { value: 'grootst', label: 'Grootst', factor: 1.45 },
]
export const DEFAULT_TEXT_SIZE = 'normaal'
// Oudere keuzes (Klein, Normaal, Groot tot build 47) naar de dichtstbijzijnde stand.
const OLD = { klein: 'kleiner', groot: 'groter' }

export function textSizePref(value) {
  const v = OLD[value] || value
  return TEXT_SIZES.some((s) => s.value === v) ? v : DEFAULT_TEXT_SIZE
}
export const textSizeIndex = (value) => TEXT_SIZES.findIndex((s) => s.value === textSizePref(value))
export const textSizeOf = (value) => TEXT_SIZES[textSizeIndex(value)]

// De grootste body-maat van het systeem (AX5 in Safari, 53 px): groter dan × 1 nooit daarboven, zoals
// de app. Anders breekt een woord als "Interesses" bij de toegankelijkheidsmaten midden in het woord.
export const PLAFOND = 53
export function effectiveFactor(factor, bodyPx = 17) {
  if (!(factor > 1)) return factor > 0 ? factor : 1
  const body = Number.isFinite(bodyPx) && bodyPx > 0 ? bodyPx : 17
  return Math.min(factor, Math.max(1, PLAFOND / body))
}
