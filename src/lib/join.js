// Vragen of je een account wilt — pure functie (tests/join.test.mjs).
// Een account is er voor iedereen, maar Hoot moet zonder account even prettig zijn. Vanzelf vragen
// gebeurt daarom terughoudend: pas als je Hoot hebt ingesteld en echt aan het lezen bent (een eind
// gescrold in Editie of Stroom). "Niet nu" = over een paar dagen nog één keer; daarna niet meer.
// JOIN_AUTO is de schakelaar. Aan sinds 1.1.0 (keuze Alex: terughoudend vragen om een account):
// pas na het lezen, en hooguit twee keer (JOIN_MAX).
export const JOIN_AUTO = true
export const JOIN_SCROLL = 1200 // px
export const JOIN_PAUSE = 3 * 24 * 60 * 60 * 1000
export const JOIN_MAX = 2

// `end` (alleen de Editie): waar de rode eindkaart is. 'none' (geen kaart), 'before' (nog niet gezien),
// 'inview' (in beeld) of 'after' (gezien, nu uit beeld). Keuze r5-einde-rust (5 november): een vraag
// komt pas ná het einde en schuift nooit over de eindkaart; tijdens het lezen van de Editie vragen we niets.
export function shouldAskToJoin({ status, auto = JOIN_AUTO, onboarded, path, scrolled, asked = {}, now = Date.now(), end = 'none' }) {
  if (!auto || status !== 'out' || !onboarded) return false
  if (path !== 'editie' && path !== 'stroom') return false
  if (path === 'editie' && (end === 'before' || end === 'inview')) return false
  if (scrolled < JOIN_SCROLL) return false
  if ((asked.n || 0) >= JOIN_MAX) return false
  return !asked.at || now - asked.at >= JOIN_PAUSE
}
