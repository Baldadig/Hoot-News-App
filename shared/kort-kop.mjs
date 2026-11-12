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
//      ("RIVM-laboratoria dreigen te sluiten, maar verhuizen kan pas later"); met "…" erachter.
//      (Ook dan geldt de bewaking: ", nog geen reactie VVD" valt niet weg.)
//   6. Anders afkappen op de laatste woordgrens die past, zonder los lidwoord, voorzetsel of voegwoord aan
//      het eind en zonder bijvoeglijk naamwoord dat zijn zelfstandig naamwoord kwijt is
//      ("voor verouderde…" → "voor…" → weg), met "…" erachter. Een ontkenning (ONTKENNINGEN) is nooit een
//      los einde ("…belastingplan niet…" mag). Is het afgekapte niet veilig (zie hieronder), dan eerder: vóór
//      de zin (na een leesteken, een gedachtestreep of een bijzinswoord als "als", "maar", "that").
//   De bewaking (`veilig`) geldt voor elke uitkomst, welke stap ook: valt er een ontkenning weg (ook "amper",
//   "nauwelijks", "zonder", "hardly", "without") die het deel raakt dat blijft, via een komma, dubbele punt,
//   gedachtestreep, bijstelling of wat ook, dan telt die uitkomst niet en volgt de volgende stap. Blijft er
//   niets veiligs over, dan is er op deze maat geen korte kop (null) en kiest de widget een andere maat; is er
//   op geen enkele maat een, dan krijgt de kop in de widget de regels die hij nodig heeft (WidgetZet.pas).
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
// Ook wat bijna ontkent ("amper", "nauwelijks", "hardly") en "zonder"/"without": zonder die woorden keert de
// betekenis om of valt de kern weg ("…Consider Future Without CEO Huang" → "…Consider Future…").
export const ONTKENNINGEN = new Set([
  'niet', 'geen', 'nooit', 'niets', 'niks', 'niemand', 'nergens', 'nee', 'noch', 'nimmer', 'geenszins', 'allerminst',
  'amper', 'nauwelijks', 'zonder',
  'not', 'no', 'never', 'nothing', 'none', 'nobody', 'nowhere', 'neither', 'nor', 'cannot', 'hardly', 'barely', 'scarcely',
  'without', 'cant', 'dont', 'doesnt', 'didnt', 'wont', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt', 'havent', 'hadnt',
  'shouldnt', 'wouldnt', 'couldnt', 'aint', 'mustnt', 'neednt', 'shant', 'mightnt', 'oughtnt',
  // Ontkennen zonder ontkenningswoord ("…; premier ontkent dat", "…; his office denies it").
  'ontkent', 'ontkennen', 'ontkende', 'ontkenden', 'onwaar', 'onjuist', 'deny', 'denies', 'denied', 'false',
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
// Accenten tellen niet: "níét" is "niet", "géén" is "geen" (NFD, dan de tekens zonder eigen letter eruit).
const zonderAccent = (w) => w.normalize('NFD').replace(/\p{M}/gu, '')
const letters = (w) => zonderAccent(w.toLowerCase()).replace(/[^\p{L}]/gu, '')
// Een ontkenning: een woord uit ONTKENNINGEN, of een Engelse samentrekking op n't ("mustn't", "needn’t").
export const ontkenning = (w) => ONTKENNINGEN.has(letters(w)) || /\p{L}n['’]t(?![\p{L}])/u.test(w.toLowerCase())
const heeftOntkenning = (s) => s.split(' ').some(ontkenning)
// Een deel dat met een persoonlijk voornaamwoord of verwijswoord begint ("it will not be the last", "that is not
// true"), is geen kop op zichzelf: waar het naar verwijst, staat ervoor. "Dit is …" wel: dat wijst vooruit.
const VOORNAAMWOORD = new Set([
  'it', 'he', 'she', 'they', 'we', 'i', 'that', 'which', 'so', 'hij', 'zij', 'ze', 'wij', 'ik', 'dat', 'zo',
])
// Begint dit deel met een voorzetsel of voegwoord?
const opent = (s) => OPENERS.has(letters(s.split(' ')[0] || ''))
// Woorden waarmee een nieuwe (bij)zin begint: een ontkenning daarna hoort bij die zin, niet bij wat ervoor
// staat ("…, maar door blessure kan Romelu Lukaku … niet …"), mits `losseZin` dat ook vindt.
// Geen "en", "of", "and" of "or": "Kamer steunt plan en begroting niet" ontkent ook het plan.
export const BIJZIN = new Set([
  'maar', 'want', 'omdat', 'als', 'terwijl', 'doordat', 'zodat', 'hoewel', 'nadat', 'toen', 'dat', 'die', 'wie',
  'waar', 'waardoor', 'waarna', 'waarin', 'waarmee', 'indien', 'tenzij', 'zolang', 'zodra',
  'but', 'as', 'while', 'because', 'although', 'though', 'that', 'which', 'who', 'when', 'where', 'unless', 'whereas', 'yet',
])
// Begint bij woord `i` een nieuwe zin of bijzin: na een leesteken, bij een gedachtestreep of een bijzinswoord.
const zinsbegin = (alle, i) => i > 0 && i < alle.length && (/[,;:.?!]$/u.test(alle[i - 1]) || /^[–—-]$/u.test(alle[i]) || BIJZIN.has(letters(alle[i])))
// De bewaking, voor elke uitkomst (welke stap ook): wat valt er weg uit de kop, en staat daar een ontkenning in
// die het deel raakt dat blijft? Dan is de uitkomst ongeldig. De korte kop wordt woord voor woord op de kop
// gelegd (hoofdletters, accenten, leestekens en "…" tellen niet), met zo weinig mogelijk weggevallen stukken. Een
// weggevallen ontkenning is standaard onveilig. Alleen onschuldig als ze in een losse (bij)zin staat die helemaal
// wegvalt en niets terugzegt over het blijvende deel (`losseZin`): die begint met een bijzinswoord of na een punt,
// vraag- of uitroepteken, niet met een voorwaarde ("als", "tenzij", "if", "unless", "yet") of een verwijswoord
// ("dat", "die", "het", "that", "it", ook niet direct na "maar"), en heeft een eigen, benoemd onderwerp (een naam
// of getal) voor de ontkenning ("Kruis over de knock-outfase? Vrouwen kunnen ook tegen Køge niet …"). Na een komma,
// dubbele punt of gedachtestreep zonder bijzinswoord hoort de ontkenning bij wat ervoor staat (", niet uit de
// ether", ": of toch niet?", "– maar niet voor 2040").
const sleutel = (w) => zonderAccent(w.toLowerCase()).replace(/[^\p{L}\p{N}]/gu, '')
// Welke woorden van de kop (index in `alle`) staan in de korte kop? null als hij er niet op past.
function gelegd(alle, kort) {
  const idx = []
  for (let i = 0; i < alle.length; i++) if (sleutel(alle[i])) idx.push(i)
  const sk = idx.map((i) => sleutel(alle[i]))
  const K = kort.replace(/…$/u, '').split(' ').map(sleutel).filter(Boolean)
  const n = idx.length
  const m = K.length
  for (const prefix of [false, true]) {
    const gelijk = (i, j) => sk[i] === K[j] || (prefix && j === m - 1 && sk[i].startsWith(K[j]))
    // f[d][i][j]: het minste aantal weggevallen stukken voor kop[i…] en kort[j…]; d: het vorige woord viel weg.
    const GROOT = 1e9
    const f = [0, 1].map(() => Array.from({ length: n + 1 }, () => new Array(m + 1).fill(GROOT)))
    for (const d of [0, 1]) f[d][n][m] = 0
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m; j >= 0; j--) {
        for (const d of [0, 1]) {
          const weg = (d ? 0 : 1) + f[1][i + 1][j]
          const mee = j < m && gelijk(i, j) ? f[0][i + 1][j + 1] : GROOT
          f[d][i][j] = Math.min(mee, weg)
        }
      }
    }
    if (f[0][0][0] >= GROOT) continue
    const mee = new Set()
    let j = 0
    let d = 0
    for (let i = 0; i < n; i++) {
      if (j < m && gelijk(i, j) && f[0][i + 1][j + 1] <= (d ? 0 : 1) + f[1][i + 1][j]) {
        mee.add(idx[i])
        j++
        d = 0
      } else d = 1
    }
    return mee
  }
  return null
}
// Verwijswoorden en persoonlijke voornaamwoorden: een zin die zo begint, zegt iets terug over wat ervoor staat
// ("Dat klopt niet", "maar dat gebeurt niet", "die komt er niet", "that is not true", "‘Dat ga ik niet doen’").
export const VERWIJS = new Set([
  'dat', 'dit', 'die', 'deze', 'het', 'er', 'zo', 'hij', 'zij', 'ze', 'ik', 'wij', 'we', 'jij', 'je', 'u',
  'that', 'this', 'these', 'those', 'it', 'which', 'so', 'he', 'she', 'they', 'i', 'we', 'you',
])
// Een voorwaarde of tegenstelling zet iets bij het blijvende deel: nooit een losse zin ("…, als het aan … ligt niet",
// "…, tenzij de VVD niet instemt").
export const VOORWAARDE = new Set(['als', 'tenzij', 'indien', 'mits', 'zolang', 'if', 'unless', 'yet', 'provided'])
// Is de (bij)zin van `s` tot de ontkenning op `p` een losse zin die niets terugzegt over het blijvende deel? Alleen
// als ze begint met een bijzinswoord of na een punt, vraag- of uitroepteken; niet met een voorwaarde; niet met een
// verwijswoord (ook niet direct na het bijzinswoord: "maar dat …"); en met een eigen, benoemd onderwerp voor de
// ontkenning (een naam of getal: "…, maar door blessure kan Romelu Lukaku … niet …"). Een weggevallen ontkenning is
// dus standaard onveilig.
function losseZin(alle, s, p) {
  const eerste = letters(alle[s])
  const opBijzin = BIJZIN.has(eerste)
  if (!opBijzin && !/[.?!]$/u.test(alle[s - 1] || '')) return false
  if (VOORWAARDE.has(eerste) || VERWIJS.has(eerste)) return false
  if (opBijzin && VERWIJS.has(letters(alle[s + 1] || ''))) return false
  const acroniem = /^[‘’“'"„«‚(]?\p{Lu}[\p{Lu}\d]+(?![\p{L}\p{N}])/u.test(alle[s])
  return acroniem || alle.slice(s + 1, p).some((x) => /^[‘’“'"„«‚(]?(?:\p{Lu}|\d)/u.test(x))
}
// Een citaat na een dubbele punt dat helemaal wegvalt, is een eigen uitspraak: "Vader van …: ‘Zwaardere straffen
// brengen haar niet terug’". Alleen als het citaat met een eigen onderwerp begint (geen voegwoord, ontkenning of
// verwijswoord vooraan: "‘Of toch niet?’", "‘Niet waar’", "‘Dat is niet waar’", "‘Dat ga ik niet doen’") en er
// minstens twee woorden voor de ontkenning staan.
function citaatWeg(alle, p, mee) {
  let q = p
  while (q >= 0 && !OPEN_CITAAT.test(alle[q])) {
    if (q < p && SLUIT_CITAAT.test(alle[q])) return false
    q--
  }
  let r = p
  while (r < alle.length && !SLUIT_CITAAT.test(alle[r])) r++
  if (q < 1 || r >= alle.length || p - q < 2 || !/:$/u.test(alle[q - 1])) return false
  const eerste = letters(alle[q])
  if (OPENERS.has(eerste) || ONTKENNINGEN.has(eerste) || VERWIJS.has(eerste)) return false
  for (let i = q; i <= r; i++) if (mee.has(i)) return false
  return true
}
export function veilig(kop, kort) {
  if (kort === null || kort === undefined) return false
  const alle = schoon(kop).split(' ')
  const mee = gelegd(alle, kort)
  if (!mee) return false
  for (let p = 0; p < alle.length; p++) {
    if (mee.has(p) || !ontkenning(alle[p])) continue
    let s = p
    while (s > 0 && !zinsbegin(alle, s)) s--
    let e = p + 1
    while (e < alle.length && !zinsbegin(alle, e)) e++
    let heelWeg = true
    for (let i = s; i < e; i++) if (mee.has(i)) heelWeg = false
    if (s > 0 && heelWeg && p - s >= 3 && losseZin(alle, s, p)) continue
    if (citaatWeg(alle, p, mee)) continue
    return false
  }
  return true
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

// Afkappen op een woordgrens binnen `max`, met "…" erachter. Is dat niet veilig (er valt een ontkenning weg, zie
// `veilig`), dan steeds eerder: terug naar het begin van een zin (na een leesteken, een gedachtestreep of een
// bijzinswoord). Is ook dat niet veilig, dan is er op deze maat geen korte kop (null).
function afkappen(t, max, kop) {
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
  let uit = staart(delen.join(' '))
  // Een enkel woord dat langer is dan alles: dan toch op de maat, met het beletselteken.
  if (!uit) uit = t.slice(0, ruimte)
  if (veilig(kop, `${uit}…`)) return `${uit}…`
  for (let j = delen.length - 1; j > 0; j--) {
    if (!zinsbegin(alle, j)) continue
    const terug = staart(zonderLosEinde(delen.slice(0, j)).join(' '))
    if (kern(terug, 2) && veilig(kop, `${terug}…`)) return `${terug}…`
  }
  return null
}

// Een citaat: tussen aanhalingstekens, van begin tot eind, en meer dan één woord (‘Romanticus’ is een bijnaam).
const isCitaat = (s) => OPEN_CITAAT.test(s) && SLUIT_CITAAT.test(s) && woorden(s) >= 2
// Heeft dit deel een eigen, benoemd onderwerp: een naam (een hoofdletter na het eerste woord) of een getal?
// `metEerste`: ook het eerste woord telt, als het een afkorting is (twee hoofdletters: "PSV aast op …"). Een
// gewoon woord met een hoofdletter vooraan ("Stuntfietser, veganist …") is het begin van de zin, geen naam.
const benoemd = (s, metEerste = false) => {
  const w = s.split(' ')
  const eerste = metEerste && /^[‘’“'"„«‚(]?\p{Lu}[\p{Lu}\d]+(?![\p{L}\p{N}])/u.test(w[0] || '')
  return /\d/u.test(s) || w.slice(eerste ? 0 : 1).some((x) => /^[‘’“'"„«‚(]?\p{Lu}/u.test(x))
}
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
  return kort(t, max, t)
}

// De korte kop van `t` (de hele kop, of een deel ervan), getoetst tegen de hele `kop`: elke uitkomst gaat langs
// `veilig`. Een uitkomst die niet veilig is, telt niet; dan de volgende stap.
function kort(t, max, kop) {
  const goed = (k) => (k && k.length <= max && veilig(kop, k) ? k : null)
  if (t.length <= max) return t === kop ? t : goed(t)

  // 2. De eerste zin, als die zelf een kop is.
  const zin = t.match(/^(.+?(?:[?!]|\s\p{Ll}{3,}\.))\s+\S/u)
  if (zin && kern(zin[1], 4) && goed(zin[1])) return zin[1]

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
    const bKop = kern(b, 4) && !opent(b) && !VOORNAAMWOORD.has(letters(b.split(' ')[0] || ''))
    const alsB = () => (bKop && !titleCase(b) ? kort(hoofdletter(b), max, kop) : null)
    if (isCitaat(a)) {
      // a. Het citaat valt weg; spreker en onderwerp staan erna.
      const k = bKop ? kort(hoofdletter(b), max, kop) : null
      if (k) return k
    } else if (kern(a, 4) && !titelOverPunt(a, b)) {
      // b. Een korte toevoeging, een citaat of een vraag erna: de kop ervoor.
      // d. Allebei een kop: het deel met het benoemde onderwerp. B wint als het met een naam begint, of als A
      //    niets benoemt (ook het eerste woord telt: "PSV aast op …: landskampioen legt contact met …" houdt PSV)
      //    en B wel, of als A zelf met een voorzetsel begint ("Voor je studie …: deze school leidt …"). Alleen als
      //    B een zin is, geen Title Case. Noemt B niets ("Amsterdam begint …: miljoenen voor opvang en zorg"),
      //    dan blijft A.
      // Heeft het gekozen deel op deze maat geen veilige kop (een ontkenning zou wegvallen), dan het andere.
      const wilB = !toevoegingB && bKop && (/^\p{Lu}/u.test(b) || opent(a) || (!benoemd(a, true) && benoemd(b)))
      // e. B in Title Case: twijfel, dan de hele kop inkorten (hieronder).
      if (!wilB || !titleCase(b)) {
        const k = wilB ? alsB() : kort(a, max, kop)
        if (k) return k
        // B als uitwijk alleen als B een eigen kop is, geen toevoeging, citaat of vraag zonder spreker.
        const ander = wilB ? kort(a, max, kop) : toevoegingB ? null : alsB()
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
    if (kern(voor, 3) && goed(voor)) return voor
  }
  const haakjes = t.match(/^(.+?)\s*\(([^()]*)\)$/u)
  if (haakjes && !heeftOntkenning(haakjes[2])) {
    const voor = staart(haakjes[1])
    if (kern(voor, 3) && goed(voor)) return voor
  }
  // Haakjes met een ontkenning erin ("Kabinet stemt (niet) in") blijven altijd staan.
  const zonderHaakjes = t.replace(/\s+\(([^()]*)\)(?=\s|$)/gu, (m, binnen) => (heeftOntkenning(binnen) ? m : ''))
  if (zonderHaakjes !== t && kern(zonderHaakjes, 3) && goed(zonderHaakjes)) return zonderHaakjes

  // Wat tussen haakjes staat ("(90)") kost ruimte die de kop beter kan gebruiken.
  const basis = zonderHaakjes !== t && kern(zonderHaakjes, 3) ? zonderHaakjes : t

  // 5. Een bijzin na een komma: de hoofdzin ervoor, als die een kop is en past (geen los citaat).
  const komma = basis.slice(0, max - 1).lastIndexOf(', ')
  if (komma > 0) {
    const voor = staart(zonderLosEinde(basis.slice(0, komma).split(' ')).join(' '))
    if (kern(voor, 4) && voor.length >= (max - 1) / 2 && !isCitaat(voor) && !opent(voor) && goed(`${voor}…`)) return `${voor}…`
  }

  // 6. Afkappen op een woordgrens.
  return afkappen(basis, max, kop)
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
