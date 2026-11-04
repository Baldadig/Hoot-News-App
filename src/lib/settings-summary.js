// De samenvatting in de accountkaart van Instellingen (Instellingen A met de samenvatting uit B):
// wat jouw Hoot is, in één regel. Gelijk aan AccountRow.summary in AccountView.swift.
export function hootSummary({ interests = 0, sources = 0 }) {
  const i = interests === 0 ? 'Alle interesses' : interests === 1 ? '1 interesse' : `${interests} interesses`
  const b = sources === 1 ? '1 bron' : `${sources} bronnen`
  return `${i} · ${b}`
}
