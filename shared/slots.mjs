// De drie dagdelen van de Editie in één tabel: per slot de naam (met hoofdletter, zoals Editie),
// wanneer de volgende er is en het dagdeel zelf. Geen kloktijden: de server stuurt wel `next`
// mee, maar de tekst gebruikt alleen deze woorden. Het web leest hieruit (src/lib/edition.js,
// views/Edition.jsx); iOS spiegelt dit bestand (Desk.slots en EditionView.upNext) en toetst het in
// HootTests. Verander je hier een woord, dan daar ook.
export const SLOTS = {
  ochtend: { naam: 'Ochtendeditie', volgende: 'in de middag', dagdeel: 'in de ochtend' },
  middag: { naam: 'Middageditie', volgende: 'in de vroege avond', dagdeel: 'in de middag' },
  avond: { naam: 'Avondeditie', volgende: 'morgenochtend', dagdeel: 'in de vroege avond' },
}
