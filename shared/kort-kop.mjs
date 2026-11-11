// De korte kop van een plek in de Editie (`kortKop`), voor waar weinig ruimte is: de widgets op het
// beginscherm en het vergrendelscherm. Hooguit KORT_MAX tekens, altijd op een woordgrens, zonder de
// betekenis te veranderen. Generiek, geen lijst per bron. In volgorde:
//   1. Past de kop, dan de kop zelf.
//   2. Een eerste zin die eindigt op "?", "!" of "." en zelf een kop is, blijft; de rest valt weg
//      ("Wat wil jij weten van de klimaattop? Stel je vragen …"). De punt staat na een klein geschreven woord;
//      een afkorting als "Feat." is geen zinseinde.
//   3. Een dubbele punt ("A: B"):
//      a. A is een citaat en B een eigen kop: B, want daar staan spreker en onderwerp
//         ("“Zelden geziene heksenjacht”: advocaten van … ontkennen" → "Advocaten van … ontkennen").
//      b. B is een korte toevoeging (hooguit KORT_TOEVOEGING woorden), een citaat of een vraag, en A is
//         zelf een kop: A ("Groot onderzoek naar antidepressiva: verrassende uitkomst").
//      c. A is kort (een spreker of label, "Raad van State:"): A blijft staan, B wordt afgekapt (stap 6).
//      d. A en B zijn allebei een kop: B heeft een eigen onderwerp en is het nieuws ("Meteen twee seizoenen
//         besteld: Netflix blaast 'Twilight' nieuw leven in" → "Netflix blaast …"). Past B niet, dan
//         wordt B ingekort volgens deze regels. Alleen als B een eigen zin is in zinsopbouw, niet in
//         Title Case ("…: Forever and It's Only Been 6 Days" is geen zin maar het vervolg van een titel).
//      Een deel dat met een voorzetsel of voegwoord begint ("met eigen trekkers …", "from football …") heeft
//      geen eigen onderwerp en wordt nooit gekozen. Noemt B niets (geen naam of getal), dan blijft A
//      ("Amsterdam begint …: miljoenen voor opvang en zorg" → A). Heeft het gekozen deel op deze maat geen
//      veilige kop (zie 6), dan het andere deel.
//      e. Twijfel: de dubbele punt hoort waarschijnlijk bij een titel of naam. A eindigt op een naam of getal
//         en B begint met een naam ("The Elder Scrolls 6: Sentinel …", "WoW: Forever …"). Dan A noch B: de
//         hele kop wordt vanaf het begin ingekort (stap 4 tot 6), want alleen B of alleen A kan de betekenis
//         veranderen. Ook als B alleen in Title Case de reden is om B niet te kiezen.
//   4. Een toevoeging na een gedachtestreep (" – ", " — ", " - ") of tussen haakjes valt weg, als wat
//      overblijft een eigen kop is (minstens KERN_MIN tekens en drie woorden). Losse haakjes in de kop
//      ("(90)") vallen ook weg als de kop dan past, of om ruimte te maken voor stap 5 en 6. Haakjes met een
//      ontkenning erin ("Kabinet stemt (niet) in") blijven altijd staan.
//   5. Een bijzin na een komma valt weg als de hoofdzin ervoor een kop is en past
//      ("RIVM-laboratoria dreigen te sluiten, maar verhuizen kan nog niet"); met "…" erachter.
//   6. Anders afkappen op de laatste woordgrens die past, zonder los lidwoord, voorzetsel of voegwoord aan
//      het eind en zonder bijvoeglijk naamwoord dat zijn zelfstandig naamwoord kwijt is
//      ("voor verouderde…" → "voor…" → weg), met "…" erachter. Een ontkenning (ONTKENNINGEN) is nooit een
//      los einde ("…belastingplan niet…" mag), en valt nooit weg uit de zin waarin wordt afgekapt: dan keert
//      de betekenis om ("D66 en CDA zwichten niet …" → "D66 en CDA zwichten…"). Dan wordt afgekapt vóór die
//      zin (na een leesteken, een gedachtestreep of een bijzinswoord als "als", "maar", "that"); kan dat niet,
//      dan is er op deze maat geen korte kop (null) en kiest de widget een andere maat.
//   Onzichtbare tekens (U+200B–U+200D, U+FEFF) vallen vooraf weg.
// iOS spiegelt dit in KortKop (ios/HootWidgetShared/KortKop.swift) en draait dezelfde gevallen uit
// tests/fixtures/kort-kop.json; verander je hier iets, dan daar ook.

export const KORT_MAX = 60
export const KERN_MIN = 24
export const KORT_TOEVOEGING = 4

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

// Een ontkenning is nooit een los einde: zonder haar keert de betekenis om ("D66 en CDA zwichten niet" →
// "D66 en CDA zwichten…"). Eindigen op "…belastingplan niet…" mag; valt er een ontkenning weg uit de zin
// waarin wordt afgekapt, dan wordt die zin niet afgekapt (zie `afkappen`).
export const ONTKENNINGEN = new Set([
  'niet', 'geen', 'nooit', 'niets', 'niks', 'niemand', 'nergens', 'not', 'no', 'never', 'nothing', 'none', 'nobody', 'neither', 'nor',
])
// Een deel dat met een voorzetsel of voegwoord begint ("met eigen trekkers …", "from football …", "Ondanks …")
// heeft geen eigen onderwerp vooraan: het is nooit een kop op zichzelf.
export const OPENERS = new Set([
  'van', 'in', 'op', 'aan', 'met', 'voor', 'naar', 'bij', 'om', 'te', 'tot', 'door', 'over', 'uit', 'na', 'als', 'tegen',
  'onder', 'tussen', 'zonder', 'via', 'per', 'sinds', 'rond', 'rondom', 'langs', 'binnen', 'buiten', 'nabij', 'achter',
  'boven', 'naast', 'vanaf', 'volgens', 'tijdens', 'wegens', 'vanwege', 'zoals', 'ondanks', 'dankzij', 'namens', 'richting',
  'en', 'of', 'maar', 'want', 'dus', 'omdat', 'toen', 'nadat', 'terwijl', 'doordat', 'zodat', 'hoewel', 'indien', 'mits',
  'of', 'to', 'for', 'on', 'at', 'by', 'with', 'from', 'into', 'after', 'before', 'over', 'about', 'amid', 'against',
  'as', 'than', 'through', 'since', 'until', 'under', 'between', 'despite', 'without', 'during', 'towards', 'toward',
  'and', 'or', 'but', 'if', 'because', 'while', 'although', 'though', 'unless', 'whether',
])

const OPEN_CITAAT = /^[‘’“'"„«‚]/u
const SLUIT_CITAAT = /[’”'"»]$/u

const woorden = (s) => s.split(' ').filter(Boolean).length
// Onzichtbare tekens (zero-width space, joiner, BOM) eruit; witruimte wordt één spatie.
const schoon = (s) => String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/gu, '').replace(/\s+/g, ' ').trim()
// Leestekens die aan het eind van een ingekorte kop niets meer doen.
const staart = (s) => s.replace(/[\s,;:–—\-‘“'"(]+$/u, '')
// Een eigen kop: lang genoeg en een paar woorden.
const kern = (s, min) => s.length >= KERN_MIN && woorden(s) >= min
// Het eerste woord met een hoofdletter, als het een gewoon woord is ("advocaten" → "Advocaten", niet "iPhone").
const hoofdletter = (s) => (/^\p{Ll}\p{Ll}/u.test(s) ? s[0].toLocaleUpperCase('nl') + s.slice(1) : s)
const letters = (w) => w.toLowerCase().replace(/[^\p{L}]/gu, '')
const ontkenning = (w) => ONTKENNINGEN.has(letters(w))
const heeftOntkenning = (s) => s.split(' ').some(ontkenning)
// Begint dit deel met een voorzetsel of voegwoord?
const opent = (s) => OPENERS.has(letters(s.split(' ')[0] || ''))
// Woorden waarmee een nieuwe (bij)zin begint: een ontkenning daarna hoort bij die zin, niet bij wat ervoor
// staat ("… as talks end with no big breakthrough", "VVD twijfelt … als D66 en CDA niet inbinden").
// Geen "en", "of", "and" of "or": "Kamer steunt plan en begroting niet" ontkent ook het plan.
export const BIJZIN = new Set([
  'maar', 'want', 'omdat', 'als', 'terwijl', 'doordat', 'zodat', 'hoewel', 'nadat', 'toen', 'dat', 'die', 'wie',
  'waar', 'waardoor', 'waarna', 'waarin', 'waarmee', 'indien', 'tenzij', 'zolang', 'zodra',
  'but', 'as', 'while', 'because', 'although', 'though', 'that', 'which', 'who', 'when', 'where', 'unless', 'whereas', 'yet',
])
// Begint bij woord `i` een nieuwe zin of bijzin: na een leesteken, bij een gedachtestreep of een bijzinswoord.
const zinsbegin = (alle, i) => i > 0 && i < alle.length && (/[,;:.?!]$/u.test(alle[i - 1]) || /^[–—-]$/u.test(alle[i]) || BIJZIN.has(letters(alle[i])))
// Valt er een ontkenning weg uit de zin waarin na `n` woorden wordt afgekapt? Dan keert de betekenis om.
function ontkenningWeg(alle, n) {
  for (let i = n; i < alle.length; i++) {
    if (zinsbegin(alle, i)) return false
    if (ontkenning(alle[i])) return true
  }
  return false
}

// Zonder los lidwoord, voorzetsel of voegwoord aan het eind ("…, maar" → "…").
// Een woord met een leesteken erachter (een sluitend aanhalingsteken, een vraagteken) sluit iets af en blijft.
function zonderLosEinde(delen, set = LOSSE_EINDES) {
  const d = [...delen]
  while (d.length > 1 && /\p{L}$/u.test(d[d.length - 1]) && set.has(letters(d[d.length - 1]))) d.pop()
  return d
}
// Voor het deel voor een dubbele punt alleen de voegwoorden: "haalt hard uit:" houdt zijn "uit".
const VOEGWOORDEN = new Set(['en', 'of', 'maar', 'want', 'dus', 'and', 'or', 'but'])

// Afkappen op een woordgrens binnen `max`, met "…" erachter.
function afkappen(t, max) {
  const ruimte = max - 1
  const alle = t.split(' ')
  let delen = t.slice(0, ruimte).split(' ')
  // Viel de grens midden in een woord, dan dat woord eraf.
  if (t[ruimte] !== ' ') delen.pop()
  // Een beletselteken in de kop zelf ("liefhebber van… kringloopwinkels") komt niet dubbel.
  if (delen.length > 1) delen[delen.length - 1] = delen[delen.length - 1].replace(/…+$/u, '')
  if (delen.length > 1 && !delen[delen.length - 1]) delen.pop()
  delen = zonderLosEinde(delen)
  // Een bijvoeglijk naamwoord zonder zijn zelfstandig naamwoord ("voor verouderde…"): eraf, zolang er genoeg
  // overblijft. Herkend aan de buiging (klein geschreven, op -e) en aan wat er in de kop op volgt: een gewoon
  // woord, geen voorzetsel of voegwoord ("campagne tegen" blijft).
  for (;;) {
    const laatste = delen[delen.length - 1] || ''
    const volgende = alle[delen.length] || ''
    if (delen.length <= 2 || !/^\p{Ll}[\p{L}-]{2,}e$/u.test(laatste) || !/^[(‘’“'"]?\p{L}/u.test(volgende) || LOSSE_EINDES.has(letters(volgende))) break
    const korter = zonderLosEinde(delen.slice(0, -1))
    if (korter.join(' ').length < ruimte / 3) break
    delen = korter
  }
  // Valt er een ontkenning weg uit de zin waarin wordt afgekapt, dan die zin helemaal niet: terug naar het
  // begin van die zin (na een leesteken, een gedachtestreep of een bijzinswoord). Blijft er dan geen kop over,
  // dan is er op deze maat geen veilige kop (null).
  let j = delen.length - 1
  while (j > 0 && !zinsbegin(alle, j)) j--
  if (delen.length > 0 && ontkenningWeg(alle, delen.length)) {
    const terug = staart(zonderLosEinde(delen.slice(0, j)).join(' '))
    return j > 0 && kern(terug, 2) ? `${terug}…` : null
  }
  let uit = staart(delen.join(' '))
  // Een enkel woord dat langer is dan alles: dan toch op de maat, met het beletselteken.
  if (!uit) uit = t.slice(0, ruimte)
  return `${uit}…`
}

// Een citaat: tussen aanhalingstekens, van begin tot eind, en meer dan één woord (‘Romanticus’ is een bijnaam).
const isCitaat = (s) => OPEN_CITAAT.test(s) && SLUIT_CITAAT.test(s) && woorden(s) >= 2
// Heeft dit deel een eigen, benoemd onderwerp: een naam (een hoofdletter na het eerste woord) of een getal?
const benoemd = (s) => /\d/u.test(s) || s.split(' ').slice(1).some((w) => /^[‘’“'"„«‚(]?\p{Lu}/u.test(w))
// Title Case: na het eerste woord begint het merendeel van de woorden (minstens drie met letters) met een
// hoofdletter, en ook een klein woord als "It's" of "Been" ("Forever and It's Only Been 6 Days"). Een gewone
// zin met een paar namen telt niet ("dit is ‘Snorremans’ Cameron Mason").
function titleCase(s) {
  const w = s.split(' ').slice(1).filter((x) => /\p{L}/u.test(x))
  const groot = w.filter((x) => /^[‘’“'"„«‚(]?\p{Lu}/u.test(x))
  return w.length >= 3 && groot.length / w.length >= 0.6 && groot.some((x) => LOSSE_EINDES.has(letters(x)))
}
// Loopt een titel of naam door over de dubbele punt: A eindigt op een naam of getal, B begint met een naam.
function titelOverPunt(a, b) {
  const laatste = a.split(' ').pop() || ''
  return /^[‘’“'"„«‚(]?(?:\p{Lu}|\d)/u.test(laatste) && /^(?:\p{Lu}|\d)/u.test(b)
}

export function kortKop(title, max = KORT_MAX) {
  const t = schoon(title)
  if (t.length <= max) return t

  // 2. De eerste zin, als die zelf een kop is.
  const zin = t.match(/^(.+?(?:[?!]|\s\p{Ll}{3,}\.))\s+\S/u)
  if (zin && zin[1].length <= max && kern(zin[1], 4)) return zin[1]

  // 3. Dubbele punt, of een citaat vooraan zonder dubbele punt ("‘Nog 1 kamer vrij!’ Brussel presenteert …").
  // Zonder dubbele punt telt een citaat vooraan pas vanaf drie woorden: "‘Little Britain’ Star …" is een titel.
  const vooraan = t.match(/^([‘“'"„«‚][^’”'"»]+[’”'"»])\s(\p{Lu}.+)$/u)
  const punt = t.match(/^([^:]+):\s(.+)$/u) || (vooraan && woorden(vooraan[1]) >= 3 ? vooraan : null)
  if (punt) {
    const a = staart(zonderLosEinde(punt[1].split(' '), VOEGWOORDEN).join(' '))
    const b = punt[2].trim()
    const toevoegingB = woorden(b) <= KORT_TOEVOEGING || OPEN_CITAAT.test(b) || b.endsWith('?')
    // B kan alleen een kop zijn als het niet met een voorzetsel of voegwoord begint ("met eigen trekkers …",
    // "from football …"): dan mist het zijn onderwerp.
    const bKop = kern(b, 4) && !opent(b)
    const alsB = () => (bKop && !titleCase(b) ? kortKop(hoofdletter(b), max) : null)
    if (isCitaat(a)) {
      // a. Het citaat valt weg; spreker en onderwerp staan erna.
      const k = bKop ? kortKop(hoofdletter(b), max) : null
      if (k) return k
    } else if (kern(a, 4) && !titelOverPunt(a, b)) {
      // b. Een korte toevoeging, een citaat of een vraag erna: de kop ervoor.
      // d. Allebei een kop: het deel met het benoemde onderwerp. B wint als het met een naam begint, of als A
      //    niets benoemt en B wel ("Meteen twee seizoenen besteld: Netflix …"), en alleen als B een zin is, geen
      //    Title Case. Noemt B niets ("Amsterdam begint …: miljoenen voor opvang en zorg"), dan blijft A, tenzij
      //    A zelf met een voorzetsel begint ("Voor je studie …: deze school leidt …").
      // Heeft het gekozen deel op deze maat geen veilige kop (een ontkenning zou wegvallen), dan het andere.
      const wilB = !toevoegingB && bKop && (/^\p{Lu}/u.test(b) || (!benoemd(a) && (benoemd(b) || opent(a))))
      // e. B in Title Case: twijfel, dan de hele kop inkorten (hieronder).
      if (!wilB || !titleCase(b)) {
        const k = wilB ? alsB() : kortKop(a, max)
        if (k) return k
        const ander = wilB ? kortKop(a, max) : alsB()
        if (ander) return ander
      }
    }
    // e. Een titel over de dubbele punt: de hele kop inkorten (hieronder).
    // c. Een kort label of spreker ervoor: blijft staan, en wat erna komt wordt afgekapt (stap 6).
  }

  // 4. Toevoeging na een gedachtestreep, of tussen haakjes (aan het eind, of los in de kop).
  const streep = t.match(/^(.+?)\s[–—-]\s.+$/u)
  if (streep) {
    const voor = staart(streep[1])
    if (voor.length <= max && kern(voor, 3)) return voor
  }
  const haakjes = t.match(/^(.+?)\s*\(([^()]*)\)$/u)
  if (haakjes && !heeftOntkenning(haakjes[2])) {
    const voor = staart(haakjes[1])
    if (voor.length <= max && kern(voor, 3)) return voor
  }
  // Haakjes met een ontkenning erin ("Kabinet stemt (niet) in") blijven altijd staan.
  const zonderHaakjes = t.replace(/\s+\(([^()]*)\)(?=\s|$)/gu, (m, binnen) => (heeftOntkenning(binnen) ? m : ''))
  if (zonderHaakjes !== t && zonderHaakjes.length <= max && kern(zonderHaakjes, 3)) return zonderHaakjes

  // Wat tussen haakjes staat ("(90)") kost ruimte die de kop beter kan gebruiken.
  const basis = zonderHaakjes !== t && kern(zonderHaakjes, 3) ? zonderHaakjes : t

  // 5. Een bijzin na een komma: de hoofdzin ervoor, als die een kop is en past (geen los citaat).
  const komma = basis.slice(0, max - 1).lastIndexOf(', ')
  if (komma > 0) {
    const voor = staart(zonderLosEinde(basis.slice(0, komma).split(' ')).join(' '))
    if (kern(voor, 4) && voor.length >= (max - 1) / 2 && !isCitaat(voor) && !opent(voor)) return `${voor}…`
  }

  // 6. Afkappen op een woordgrens.
  return afkappen(basis, max)
}

// De Editie met `kortKop` per plek: de kop die er staat (de getoonde kop van De Redacteur, anders die van
// het hoofdstuk), ingekort. Raakt niets anders aan; zonder kop, of zonder veilige korte kop, geen `kortKop`.
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
