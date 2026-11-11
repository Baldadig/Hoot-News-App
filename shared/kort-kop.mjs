// De korte kop van een plek in de Editie (`kortKop`), voor waar weinig ruimte is: de widgets op het
// beginscherm en het vergrendelscherm. Hooguit KORT_MAX tekens, altijd op een woordgrens, zonder de
// betekenis te veranderen. Generiek, geen lijst per bron:
//   1. Past de kop, dan de kop zelf.
//   2. Een toevoeging na een gedachtestreep (" – ", " — ", " - ") of tussen haakjes aan het eind valt weg,
//      als wat overblijft een eigen kop is (minstens KERN_MIN tekens en drie woorden).
//   3. Na een dubbele punt: is het deel ervoor kort (een spreker of label, "Raad van State:"), dan blijft
//      het staan, want zonder dat deel verandert de betekenis. Is het deel ervoor zelf een kop
//      (minstens KERN_MIN tekens en vier woorden), dan valt het deel erna weg.
//   4. Anders afkappen op de laatste woordgrens die past, zonder los lidwoord of voorzetsel aan het
//      eind, met "…" erachter.
// iOS spiegelt dit in KortKop (ios/HootWidgetShared/KortKop.swift) en draait dezelfde gevallen uit
// tests/fixtures/kort-kop.json; verander je hier iets, dan daar ook.

export const KORT_MAX = 60
export const KERN_MIN = 24

// Woorden waarop een afgekapte kop niet mag eindigen (Nederlands en Engels): lidwoorden, voorzetsels,
// voegwoorden en hulpwerkwoorden die een zin openlaten.
export const LOSSE_EINDES = new Set([
  'de', 'het', 'een', 'en', 'of', 'maar', 'van', 'in', 'op', 'aan', 'met', 'voor', 'naar', 'bij', 'om', 'te', 'tot',
  'door', 'over', 'uit', 'na', 'als', 'dat', 'die', 'dit', 'deze', 'wie', 'wat', 'is', 'zijn', 'wordt', 'worden', 'heeft',
  'hebben', 'moet', 'moeten', 'kan', 'kunnen', 'wil', 'willen', 'zal', 'zullen', 'gaat', 'gaan', 'nog', 'niet', 'geen',
  'zo', 'zó', 'er', 'ook', 'want', 'omdat', 'toen', 'tegen', 'onder', 'tussen', 'zonder', 'via', 'per', 'sinds',
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'for', 'on', 'at', 'by', 'with', 'from', 'as', 'is', 'are', 'was',
  'were', 'be', 'has', 'have', 'will', 'can', 'that', 'this', 'its', 'his', 'her', 'their', 'into', 'after', 'over',
])

const woorden = (s) => s.split(' ').filter(Boolean).length
const schoon = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
// Leestekens die aan het eind van een ingekorte kop niets meer doen.
const staart = (s) => s.replace(/[\s,;:–—\-‘“'"(]+$/u, '')

// Een eigen kop: lang genoeg en een paar woorden.
const kern = (s, min) => s.length >= KERN_MIN && woorden(s) >= min

export function kortKop(title, max = KORT_MAX) {
  const t = schoon(title)
  if (t.length <= max) return t

  // 2. Toevoeging na een gedachtestreep of tussen haakjes aan het eind.
  const streep = t.match(/^(.+?)\s[–—-]\s.+$/u)
  if (streep) {
    const voor = staart(streep[1])
    if (voor.length <= max && kern(voor, 3)) return voor
  }
  const haakjes = t.match(/^(.+?)\s*\([^()]*\)$/u)
  if (haakjes) {
    const voor = staart(haakjes[1])
    if (voor.length <= max && kern(voor, 3)) return voor
  }

  // 3. Dubbele punt: een lange kern ervoor blijft, de uitwerking erna valt weg.
  const punt = t.match(/^([^:]+):\s.+$/u)
  if (punt) {
    const voor = staart(punt[1])
    if (voor.length <= max && kern(voor, 4)) return voor
  }

  // 4. Afkappen op een woordgrens, met ruimte voor het beletselteken.
  const ruimte = max - 1
  const delen = t.slice(0, ruimte).split(' ')
  // Viel de grens midden in een woord, dan dat woord eraf.
  if (t[ruimte] !== ' ') delen.pop()
  while (delen.length > 1 && LOSSE_EINDES.has(delen[delen.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ''))) delen.pop()
  let uit = staart(delen.join(' '))
  // Een enkel woord dat langer is dan alles: dan toch op de maat, met het beletselteken.
  if (!uit) uit = t.slice(0, ruimte)
  return `${uit}…`
}

// De Editie met `kortKop` per plek: de kop die er staat (de getoonde kop van De Redacteur, anders die van
// het hoofdstuk), ingekort. Raakt niets anders aan; zonder kop geen `kortKop`.
export function metKorteKoppen(edition) {
  if (!edition || !Array.isArray(edition.entries)) return edition
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  return {
    ...edition,
    entries: edition.entries.map((e) => {
      const kop = byId.get(e.kind === 'story' ? e.leadId || e.id : e.id)?.title || e.title
      return kop ? { ...e, kortKop: kortKop(kop) } : e
    }),
  }
}
