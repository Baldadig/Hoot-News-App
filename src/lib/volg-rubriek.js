// De rubriek die voor het label "Je volgt" staat in de Stroom ("Politiek · ✓ Je volgt"). In de Stroom heeft een stuk
// verder geen rubriekregel, dus zonder rubriek stond het label er kaal. De volgorde (gelijk aan StreamView.rubriekLabel
// in de app, dezelfde gevallen in tests/fixtures/volg-rubriek-cases.json):
//   1. de rubriek van de uitgever (`section`);
//   2. de hoofdrubriek waarin de lezer nu kijkt (de lijn), als het er een is: Politiek, Sport, ...;
//   3. de eerste hoofdrubriek waar het stuk bij hoort, via zijn onderwerpen of de rubriek van zijn bron;
//   4. niets: dan staat er alleen het label.
// Nooit onder Buiten je bubbel (daar geeft de rekenkern geen label, en de Editie ook niet).
import { INTERESTS, inInterest } from './topics.js'

export function rubriekVoorLabel(item, { lijn = '', source = null } = {}) {
  const s = (item?.section || '').trim()
  if (s) return s
  const eigen = INTERESTS.find((i) => i.id === lijn)
  if (eigen) return eigen.label
  const t = INTERESTS.find((i) => inInterest(item || {}, i.id, source))
  return t ? t.label : null
}
