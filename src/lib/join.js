// Vragen of je een account wilt — pure functie (tests/join.test.mjs).
// Een account is er voor iedereen, maar Hoot moet zonder account even prettig zijn. Vanzelf vragen
// gebeurt daarom terughoudend: pas als je Hoot hebt ingesteld en echt aan het lezen bent (een eind
// gescrold in Editie of Stroom). "Niet nu" = over een paar dagen nog één keer; daarna niet meer.
// JOIN_AUTO is de schakelaar: zolang die uit staat, vraagt Hoot nooit vanzelf (alleen als jij op
// Inloggen tikt of de samenvatting wilt). Alex beslist later of hij aan gaat.
export const JOIN_AUTO = false
export const JOIN_SCROLL = 1200 // px
export const JOIN_PAUSE = 3 * 24 * 60 * 60 * 1000
export const JOIN_MAX = 2

export function shouldAskToJoin({ status, auto = JOIN_AUTO, onboarded, path, scrolled, asked = {}, now = Date.now() }) {
  if (!auto || status !== 'out' || !onboarded) return false
  if (path !== 'editie' && path !== 'stroom') return false
  if (scrolled < JOIN_SCROLL) return false
  if ((asked.n || 0) >= JOIN_MAX) return false
  return !asked.at || now - asked.at >= JOIN_PAUSE
}
