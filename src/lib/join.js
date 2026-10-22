// Vragen of je een account wilt — pure functie (tests/join.test.mjs).
// Pas als je Hoot hebt ingesteld en echt aan het lezen bent (een eind gescrold in Editie of
// Stroom). "Niet nu" = over een paar dagen nog één keer; daarna niet meer.
export const JOIN_SCROLL = 1200 // px
export const JOIN_PAUSE = 3 * 24 * 60 * 60 * 1000
export const JOIN_MAX = 2

export function shouldAskToJoin({ status, onboarded, path, scrolled, asked = {}, now = Date.now() }) {
  if (status !== 'out' || !onboarded) return false
  if (path !== 'editie' && path !== 'stroom') return false
  if (scrolled < JOIN_SCROLL) return false
  if ((asked.n || 0) >= JOIN_MAX) return false
  return !asked.at || now - asked.at >= JOIN_PAUSE
}
