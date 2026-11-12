// De korte kop van een plek in de Editie (`kortKop`), voor waar weinig ruimte is: de widgets op het
// beginscherm en het vergrendelscherm. Hooguit KORT_MAX tekens, altijd op een woordgrens, zonder de
// betekenis te veranderen. Generiek, geen lijst per bron.
//
// De regel is dicht (besluit Alex, keuring 8): een korte vorm bestaat alleen als de kop één bewering is.
//   1. Past de kop, dan de kop zelf.
//   2. Anders vallen woorden weg aan het eind, met "…" erachter. Nergens anders: geen deel na een dubbele punt,
//      geen keuze tussen delen, niets vooraan weg.
//   3. Dat mag alleen als de kop één doorlopende zin is (zie `inkortbaar`). Anders is er GEEN korte vorm (null) en
//      staat de hele kop in de widget, met de regels die hij nodig heeft (WidgetZet.pas). Geen korte vorm als er
//      ergens in de kop staat:
//      - een zinsgrens of scheidingsteken: . ? ! ; : , aan het eind van een woord; … – — / [ ] ( ) overal; een
//        los streepje (" - ");
//      - een voorwaarde of uitzondering (VOORWAARDEN: "tenzij", "unless", "behalve", "except", "als", "if",
//        "mits", "provided", …);
//      - een tegenwoord (TEGENWOORDEN: "maar", "but", "terwijl", "while", "hoewel", …), met of zonder komma;
//      of als er in wat wegvalt een ontkenning of bijna-ontkenning staat (ONTKENNINGEN: "niet", "geen", "zonder",
//      "bijna", "almost", "ten onrechte", "wrongly", "vals", "op een haar na", …), ook in een samenstelling
//      ("niet-ontvankelijk") of op n't, of een citaat sluit met nog woorden erna (een toeschrijving: "‘…’ zegt X").
//      Een ontkenning in wat blijft staan, mag ("…belastingplan niet…").
//   Eén uitzondering: een label van één woord vooraan ("Nepnieuws:", "VIDEO –") telt niet mee en blijft altijd
//   staan. Een langer begin met een dubbele punt ("Raad van State:", "Fact check:") is geen label: dan de hele kop.
//   Geen los lidwoord, voorzetsel of voegwoord aan het eind, en geen bijvoeglijk naamwoord dat zijn zelfstandig
//   naamwoord kwijt is ("voor verouderde…" → "voor…" → weg); die woorden vallen dan ook weg. Er blijven minstens
//   twee woorden (na het label) staan.
//   Onzichtbare tekens (U+200B–U+200D, U+FEFF) vallen vooraf weg; U+0085 telt als spatie, zoals op iOS.
// Simpel en voorspelbaar boven slim. iOS spiegelt dit in KortKop (ios/HootWidgetShared/KortKop.swift) en draait
// dezelfde gevallen uit tests/fixtures/kort-kop.json; verander je hier iets, dan daar ook.

export const KORT_MAX = 60

// Woorden waarop een afgekapte kop niet mag eindigen (Nederlands en Engels): lidwoorden, voorzetsels,
// voegwoorden, voornaamwoorden en hulpwerkwoorden die een zin openlaten.
export const LOSSE_EINDES = new Set([
  'de', 'het', 'een', 'en', 'of', 'maar', 'van', 'in', 'op', 'aan', 'met', 'voor', 'naar', 'bij', 'om', 'te', 'tot',
  'door', 'over', 'uit', 'na', 'als', 'dat', 'die', 'dit', 'deze', 'wie', 'wat', 'is', 'zijn', 'wordt', 'worden', 'heeft',
  'hebben', 'moet', 'moeten', 'kan', 'kunnen', 'wil', 'willen', 'zal', 'zullen', 'gaat', 'gaan', 'nog',
  'zo', 'zó', 'er', 'ook', 'want', 'omdat', 'toen', 'tegen', 'onder', 'tussen', 'zonder', 'via', 'per', 'sinds',
  'rond', 'rondom', 'langs', 'binnen', 'buiten', 'nabij', 'jegens', 'achter', 'boven', 'naast', 'vanaf', 'volgens',
  'tijdens', 'wegens', 'vanwege', 'zoals', 'dan', 'hoe', 'waar', 'waarom', 'wanneer', 'nadat', 'terwijl', 'doordat',
  'zodat', 'opdat', 'hoewel', 'indien', 'waarna', 'waardoor', 'zich', 'hun', 'ze', 'zij', 'hij', 'we', 'wij', 'je',
  'jij', 'ik', 'mijn', 'onze', 'ons', 'jouw', 'uw', 'meer', 'minder', 'vol', 'wel', 'heel', 'zeer', 'zelfs',
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'for', 'on', 'at', 'by', 'with', 'from', 'as', 'is', 'are', 'was',
  'were', 'be', 'has', 'have', 'will', 'can', 'that', 'this', 'its', 'his', 'her', 'their', 'into', 'after', 'over',
  'about', 'amid', 'against', 'than', 'who', 'what', 'which', 'how', 'why', 'when', 'where', 'more', 'our', 'your', 'my',
  'could', 'would', 'should', 'may', 'might', 'must', 'does', 'do', 'did', 'had', 'been', 'being', 'if', 'he', 'she',
  'they', 'you', 'it', 'there', 'i',
])

// Ontkenningen en bijna-ontkenningen: zonder hen keert de betekenis om ("Ajax wint … bijna" → "Ajax wint…").
// "non" staat erin voor samenstellingen ("non-profit"): zie `ontkenning`.
export const ONTKENNINGEN = new Set([
  'niet', 'geen', 'nooit', 'niets', 'niks', 'niemand', 'nergens', 'nee', 'noch', 'nimmer', 'geenszins', 'allerminst',
  'amper', 'nauwelijks', 'zelden', 'evenmin', 'zonder', 'non', 'allesbehalve',
  'not', 'no', 'never', 'nothing', 'none', 'nobody', 'nowhere', 'neither', 'nor', 'cannot', 'hardly', 'barely', 'scarcely',
  'rarely', 'seldom', 'without', 'cant', 'dont', 'doesnt', 'didnt', 'wont', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt',
  'havent', 'hadnt', 'shouldnt', 'wouldnt', 'couldnt', 'aint', 'mustnt', 'neednt', 'shant', 'mightnt', 'oughtnt',
  // Ontkennen zonder ontkenningswoord.
  'ontkent', 'ontkennen', 'ontkende', 'ontkenden', 'onwaar', 'onjuist', 'deny', 'denies', 'denied', 'false',
  // Bijna, ten onrechte, vals (keuring 8). "op een haar na" staat in `inkortbaar`.
  'bijna', 'vrijwel', 'haast', 'tevergeefs', 'almost', 'nearly', 'onrechte', 'onterecht', 'onterechte', 'wrongly',
  'falsely', 'vals', 'valse',
])
// Een voorwaarde of uitzondering: zonder haar wordt een voorbehoud een feit (keuring 8).
export const VOORWAARDEN = new Set([
  'tenzij', 'behalve', 'als', 'mits', 'indien', 'zolang', 'unless', 'except', 'if', 'provided', 'providing',
])
// Een tegenwoord begint een eigen bewering, met of zonder komma (keuring 8).
export const TEGENWOORDEN = new Set([
  'maar', 'terwijl', 'hoewel', 'ofschoon', 'doch', 'echter', 'but', 'while', 'whereas', 'although', 'though', 'yet',
  'however',
])

const woorden = (s) => s.split(' ').filter(Boolean).length
// Onzichtbare tekens (zero-width space, joiner, BOM) eruit; witruimte wordt één spatie.
// U+0085 (NEL) telt mee als witruimte, zoals in ICU (iOS): JavaScript rekent hem niet tot `\s`.
const schoon = (s) => String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/gu, '').replace(/[\s\u0085]+/gu, ' ').trim()
// Leestekens die aan het eind van een ingekorte kop niets meer doen.
const staart = (s) => s.replace(/[\s,;:–—\-‘“'"(]+$/u, '')
// Accenten tellen niet: "níét" is "niet" (NFD, dan de tekens zonder eigen letter eruit).
const zonderAccent = (w) => w.normalize('NFD').replace(/\p{M}/gu, '')
const letters = (w) => zonderAccent(w.toLowerCase()).replace(/[^\p{L}]/gu, '')
// Een ontkenning: een woord uit ONTKENNINGEN, ook als deel van een samenstelling met een streepje ("niet-ontvankelijk",
// "non-profit", "not-guilty"), of een Engelse samentrekking op n't ("mustn't", "needn’t", "canʼt" met U+02BC).
const APOSTROF = /[’ʼ`´＇‘]/gu
export const ontkenning = (w) => {
  const a = w.toLowerCase().replace(APOSTROF, "'")
  return ONTKENNINGEN.has(letters(a)) || a.split(/[-‐‑–—]/u).some((d) => ONTKENNINGEN.has(letters(d))) || /\p{L}n't(?![\p{L}])/u.test(a)
}

// Leestekens die een eigen bewering kunnen beginnen: overal in een woord, of aan het eind ervan.
const GRENS_OVERAL = /[…\/\[\]()–—]/u
const GRENS_EIND = /[.?!;:,][^\p{L}\p{N}]*$/u
const grens = (w) => GRENS_OVERAL.test(w) || GRENS_EIND.test(w) || /^-+$/u.test(w)
// Maakt dit woord (op plek `p`, na het label) de kop meer dan één bewering, of mag het niet wegvallen? Een grens, een
// voorwaarde of een tegenwoord waar ook; een ontkenning alleen als ze wegvalt (vanaf plek `blijft`).
// Een sluitend aanhalingsteken op of na het laatste woord dat blijft, met nog woorden erna die wegvallen: daar
// begint een toeschrijving of een vervolg ("‘Premier treedt af’ zegt oppositie …"). Aan het eind van de kop niet:
// dan sluit alleen het citaat.
const zwaar = (blijft, laatste) => (w, p) => grens(w) || VOORWAARDEN.has(letters(w)) || TEGENWOORDEN.has(letters(w))
  || (p >= blijft && ontkenning(w)) || (p >= blijft - 1 && p < laatste && /[’”»"'][^\p{L}\p{N}]*$/u.test(w))

// Een label vooraan: één woord met een dubbele punt ("Nepnieuws:") of met een los streepje erachter ("VIDEO –").
// Het telt niet als bewering en blijft altijd staan. Hoeveel woorden is het label (0, 1 of 2 met het streepje)?
const label = (alle) => (alle.length > 2 && /^\p{L}[\p{L}\p{N}-]*:$/u.test(alle[0]) ? 1
  : alle.length > 3 && /^\p{L}[\p{L}\p{N}-]*$/u.test(alle[0]) && /^[–—-]$/u.test(alle[1]) ? 2 : 0)

// Mogen de woorden vanaf `n` wegvallen? Alleen als de kop (na een label) één bewering is: nergens een grens, een
// voorwaarde of een tegenwoord, en in wat wegvalt geen ontkenning. Zie de regel bovenaan.
function inkortbaar(alle, n) {
  const l = label(alle)
  if (n - l < 2 || n >= alle.length) return false
  if (alle.slice(l).some(zwaar(n - l, alle.length - 1 - l))) return false
  // "op een haar na", ook als het begin ervan nog blijft staan.
  return !/(?:^| )op een haar na(?: |$)/u.test(alle.slice(Math.max(0, n - 3)).map(letters).join(' '))
}

// Zonder los lidwoord, voorzetsel of voegwoord aan het eind ("…, maar" → "…").
// Een woord met een leesteken erachter (een sluitend aanhalingsteken, een vraagteken) sluit iets af en blijft.
function zonderLosEinde(delen) {
  const d = [...delen]
  while (d.length > 1 && /\p{L}$/u.test(d[d.length - 1]) && LOSSE_EINDES.has(letters(d[d.length - 1]))) d.pop()
  return d
}

// De bewaking: is `kort` een korte kop die `kortKop` voor `kop` zou mogen geven? De kop zelf, of de eerste woorden
// van de kop met "…" erachter, als de kop inkortbaar is. Ook voor een korte kop van de server (iOS: KortKop.trap).
export function veilig(kop, kort) {
  if (kort === null || kort === undefined) return false
  const t = schoon(kop)
  if (kort === t) return true
  if (!kort.endsWith('…')) return false
  const alle = t.split(' ')
  const k = kort.slice(0, -1).split(' ')
  if (k.length >= alle.length || k.some((w, i) => (i < k.length - 1 ? w !== alle[i] : w !== staart(alle[i]) || !w))) return false
  return inkortbaar(alle, k.length)
}

// De korte kop op hooguit `max` tekens, of null: dan is er op deze maat geen korte vorm en staat de hele kop in de
// widget. Een kop die past, blijft precies zo.
export function kortKop(title, max = KORT_MAX) {
  const t = schoon(title)
  if (t.length <= max) return t
  const alle = t.split(' ')
  // Zoveel hele woorden als er passen, met ruimte voor het beletselteken.
  let n = 0
  let lengte = -1
  while (n < alle.length && lengte + 1 + alle[n].length <= max - 1) lengte += 1 + alle[n++].length
  let delen = zonderLosEinde(alle.slice(0, n))
  // Een bijvoeglijk naamwoord zonder zijn zelfstandig naamwoord ("voor verouderde…"): eraf, zolang er genoeg
  // overblijft. Herkend aan de buiging (klein geschreven, op -e) en aan wat er in de kop op volgt: een gewoon
  // woord, geen voorzetsel of voegwoord ("campagne tegen" blijft).
  for (;;) {
    const laatste = delen[delen.length - 1] || ''
    const volgende = alle[delen.length] || ''
    if (delen.length <= 2 || !/^\p{Ll}[\p{L}-]{2,}e$/u.test(laatste) || !/^[(‘’“'"]?\p{L}/u.test(volgende) || LOSSE_EINDES.has(letters(volgende))) break
    const korter = zonderLosEinde(delen.slice(0, -1))
    if (korter.join(' ').length < (max - 1) / 3) break
    delen = korter
  }
  const uit = staart(delen.join(' '))
  if (!inkortbaar(alle, woorden(uit))) return null
  return `${uit}…`
}

// De Editie met `kortKop` per plek: de kop die er staat (de getoonde kop van De Redacteur, anders die van
// het hoofdstuk), ingekort. Raakt niets anders aan; zonder kop, of zonder korte kop, geen `kortKop`.
export function metKorteKoppen(edition) {
  if (!edition || !Array.isArray(edition.entries)) return edition
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  return {
    ...edition,
    entries: edition.entries.map((e) => {
      const kop = byId.get(e.kind === 'story' ? e.leadId || e.id : e.id)?.title || e.title
      const kort = kop ? kortKop(kop) : null
      return kort ? { ...e, kortKop: kort } : e
    }),
  }
}
