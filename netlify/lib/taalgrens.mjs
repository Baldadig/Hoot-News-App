// Eén gebeurtenis, één plek, ook over de taalgrens (frisse ogen · ronde 2, punt 6 van het rapport van 11 november).
// Op 11 november ochtend stonden NRC ("Amerikaanse militair in VK opgepakt … spionage voor Rusland") en Le Monde ("UK
// arrests US soldier suspected of spying for Russia") op twee plekken: koppen in twee talen delen bijna geen woorden, dus
// de gewone regels (sameHeadEvent) zien geen dubbel. Deze eindcontrole vertaalt een kleine, vaste woordenlijst naar
// begrippen en noemt twee koppen in verschillende talen één gebeurtenis bij
//   - dezelfde handeling (opgepakt, aangeklaagd, gedood, schietpartij, aanval, ontslag …), én
//   - dezelfde stad (Krakau en Krakow), of: hetzelfde land of dezelfde naam én samen minstens EVENT_SHARED gedeelde
//     begrippen (handeling, land en naam tellen mee).
// Alleen landen vertalen is te grof: "US charges 3 men over … plot at UK Fairford air base" deelt VS en VK met de militair,
// maar is een ander feit (aanklacht, geen arrestatie). Daarom de handeling als poort, en drie begrippen samen.
// Alleen tussen talen (Nederlands en Vlaams tegenover de rest): binnen één taal doen de gewone regels het.
// Bewust los van de meetlat (netlify/lib/scorekaart.mjs, crossLanguageSame): die telt anders, zodat een regel die
// zichzelf goedkeurt opvalt.
import { SOURCES } from './sources.mjs'

const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
export const EVENT_SHARED = 3

// Een woord → begrippen. Een begrip met `!` is een handeling, met `@` een land, met `#` een stad (een stad hoort ook bij
// zijn land).
const W = {}
const add = (concept, words) => { for (const w of words.split(' ')) W[w] = [...new Set([...(W[w] || []), ...[concept].flat()])] }
// Handelingen.
add('!opgepakt', 'arrested arrests arrest detained detains detain apprehended opgepakt aangehouden gearresteerd arrestatie arrestaties opgepakte aanhouding')
add('!aangeklaagd', 'charged charges charge indicted indictment indicts aangeklaagd aanklacht aanklachten vervolgd vervolging')
add('!veroordeeld', 'sentenced convicted convicts jailed guilty veroordeeld veroordeelt schuldig celstraf gevangenisstraf')
add('!gedood', 'killed kills kill killing dead deaths death doden dood gedood omgekomen dodelijk dodelijke doodgeschoten dodental slachtoffers victims')
add('!overleden', 'died dies overleden overlijdt overleed sterft gestorven')
add('!schieten', 'shooting shootings shot gun guns gunfire gunman gunmen shooter shooters schietpartij schutter schutters beschoten neergeschoten')
add('!aanval', 'attack attacks attacked strike strikes airstrike airstrikes bombing bombed bombardement bombardementen aanval aanvallen luchtaanval luchtaanvallen raketaanval')
add('!ontslag', 'resigns resigned resignation quits ontslag ontslagen opgestapt aftreden treedt')
add('!wint', 'wins won victory winner wint gewonnen overwinning zege')
add('!spionage', 'spying spy spies espionage spionage spion spionnen')
add('!hack', 'hack hacked hackers hacking cyberattack cyberaanval gehackt hackers')
add('!aardbeving', 'earthquake quake aardbeving')
add('!overstroming', 'flood floods flooding overstroming overstromingen')
add('!neergestort', 'crash crashes crashed neergestort neerstort ongeluk')
add('!dreiging', 'threat threats threatened bommelding bommeldingen dreiging')
add('!afzetting', 'impeachment impeached impeach ousted afzetting afzettingsprocedure afgezet')
add('!bestand', 'ceasefire truce bestand wapenstilstand wapenbestand')
add('!ontvoerd', 'kidnapped abducted kidnapping abduction ontvoerd ontvoering')
add('!vrijgelaten', 'released freed vrijgelaten vrijlating')
add('!benoemd', 'appointed appoints nominee nominated benoemd benoemt voorgedragen')
add('!verbod', 'ban bans banned verbod verbiedt verboden')
add('!heffingen', 'tariffs tariff heffingen importheffingen')
add('!akkoord', 'deal agreement akkoord overeenkomst')
add('!staking', 'strike-action walkout staking staken')
// Landen en plaatsen.
add('@vk', 'uk britain british briton britons brits britse vk engeland england')
add('@vs', 'usa american americans amerikaanse amerikaans amerikaan')
add('@rusland', 'russia russian russians russische russisch russen rusland kremlin')
add('@oekraine', 'ukraine ukrainian ukrainians oekraine oekraiense oekraiens')
add('@israel', 'israel israeli israelis israelische israelisch')
add('@iran', 'iran iranian iraanse iraans')
add('@china', 'china chinese')
add('@frankrijk', 'france french franse frans frankrijk')
add('@duitsland', 'germany german duitse duits duitsland')
add('@polen', 'poland polish poolse pools polen')
add('@nederland', 'netherlands dutch nederlandse nederland')
add('@belgie', 'belgium belgian belgische belgie')
add('@gaza', 'gaza gazastrook')
add('@venezuela', 'venezuela venezuelan venezolaanse')
add('@ierland', 'ireland irish ierse ierland')
add('@spanje', 'spain spanish spaanse spanje')
add('@italie', 'italy italian italiaanse italie')
add('@turkije', 'turkey turkish turkse turkije')
add('@syrie', 'syria syrian syrische syrie')
add('@libanon', 'lebanon lebanese libanese libanon')
add('@japan', 'japan japanese japanse')
add('@india', 'india indian indiase')
add('@canada', 'canada canadian canadese')
add('@mexico', 'mexico mexican mexicaanse')
add('@brazilie', 'brazil brazilian braziliaanse brazilie')
add('@argentinie', 'argentina argentinian argentijnse argentinie')
add('@sudan', 'sudan sudanese soedan soedanese')
// Steden met een eigen naam in het Nederlands (exoniemen), plus een paar hoofdsteden: een stad is preciezer dan een land.
const city = (name, country, words) => add(['#' + name, '@' + country], words)
city('krakau', 'polen', 'krakow krakau')
city('warschau', 'polen', 'warsaw warschau')
city('kyiv', 'oekraine', 'kyiv kiev kyiv')
city('moskou', 'rusland', 'moscow moskou')
city('londen', 'vk', 'london londen')
city('parijs', 'frankrijk', 'paris parijs')
city('berlijn', 'duitsland', 'berlin berlijn')
city('brussel', 'belgie', 'brussels brussel')
city('peking', 'china', 'beijing peking')
city('teheran', 'iran', 'tehran teheran')
city('jeruzalem', 'israel', 'jerusalem jeruzalem')
city('rome', 'italie', 'rome')
city('madrid', 'spanje', 'madrid')
city('dublin', 'ierland', 'dublin')
city('lissabon', 'portugal', 'lisbon lissabon')
city('wenen', 'oostenrijk', 'vienna wenen')
city('praag', 'tsjechie', 'prague praag')
city('kopenhagen', 'denemarken', 'copenhagen kopenhagen')
city('geneve', 'zwitserland', 'geneva geneve')
city('amsterdam', 'nederland', 'amsterdam')
city('rotterdam', 'nederland', 'rotterdam')
// Gewone zelfstandige naamwoorden die vaak in beide talen in de kop staan.
add('militair', 'soldier soldiers serviceman troops militair militairen soldaat soldaten')
add('president', 'president presidente')
add('premier', 'premier prime-minister')
add('minister', 'minister ministers')
add('rechter', 'court judge judges rechter rechtbank hof')
add('kinderen', 'children kids kinderen')
add('vrouw', 'woman women vrouw vrouwen')
add('vliegtuig', 'plane planes flight flights aircraft vliegtuig vliegtuigen vlucht vluchten')
add('school', 'school schools school scholen')
add('verkiezing', 'election elections verkiezing verkiezingen')
add('paus', 'pope paus')
add('koning', 'king koning')
// Te gewone woorden: tellen nooit.
const STOP = new Set('the and for with from after over into about amid says said that this will have been their than more what when where which while would could should under against between being after before during new een het van voor met naar over door bij uit aan als dat die zijn wordt worden niet nog maar ook wel toch tegen tussen onder hun haar deze dit wat wie hoe waarom heeft hebben werd waren gaat komt zegt wil moet kan man men mannen zeker least people mensen year years jaar jaren day days dag dagen'.split(' '))

const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '')
// "US", "U.S.", "USA" (hoofdletters) is de VS; "us" in kleine letters is een voornaamwoord. "U.K." is "UK".
const prep = (title) => fold(title).replace(/\bU\.S\.A?\.?(?=\s|$|[^\p{L}])/gu, ' usa ').replace(/\bU\.K\.?/g, ' uk ').replace(/\bUS\b/g, ' usa ').replace(/\bUSA\b/g, ' usa ')
const tokens = (title) => prep(title).split(/[^\p{L}\p{N}-]+/u).flatMap((w) => (w.includes('-') ? [w, ...w.split('-')] : [w])).filter(Boolean)
// Nederlandse samenstellingen: "spionageschandaal", "afzettingsprocedure", "luchtaanval". Een stam van minstens zes letters
// aan het begin of eind van een woord telt als dat begrip.
const STEMS = Object.entries(W).filter(([w]) => w.length >= 6 && !w.includes('-'))
function conceptsOf(w) {
  const k = w.toLowerCase()
  if (W[k]) return W[k]
  if (k.length >= 9) for (const [s, c] of STEMS) if (k.startsWith(s) || k.endsWith(s)) return c
  return null
}

// De begrippen en namen van een kop. Een naam: een woord met een hoofdletter dat niet vooraan staat (Nederlandse koppen
// zijn in zinsvorm), van minstens vier letters, geen begrip uit de lijst. In een Engelse kop met hoofdletters per woord
// herkennen we geen namen: daar telt een naam als hij letterlijk in de andere kop staat.
export function eventTerms(title) {
  const ws = tokens(title)
  const concepts = new Set()
  const words = new Set()
  const names = new Set()
  ws.forEach((w, k) => {
    const lw = w.toLowerCase()
    if (STOP.has(lw)) return
    const c = conceptsOf(w)
    if (c) for (const x of c) concepts.add(x)
    else if (lw.length >= 3) {
      words.add(lw)
      if (k > 0 && /^\p{Lu}/u.test(w) && lw.length >= 4) names.add(lw)
    }
  })
  return { concepts, words, names }
}

const langOf = (item) => {
  const lang = item?.lang || SOURCE.get(item?.source)?.lang || null
  return lang === 'nl' ? 'nl' : lang ? 'xx' : null
}

// Zijn de koppen van `a` en `b` (stukken met title, source, lang) dezelfde gebeurtenis in twee talen? Geeft de gedeelde
// begrippen terug (voor het archief en de toetsen), of null.
export function crossLanguageEvent(a, b) {
  const la = langOf(a)
  const lb = langOf(b)
  if (!la || !lb || la === lb) return null
  const [nl, xx] = la === 'nl' ? [a, b] : [b, a]
  const tn = eventTerms(nl.title)
  const tx = eventTerms(xx.title)
  const concepts = [...tn.concepts].filter((c) => tx.concepts.has(c))
  // Een naam uit de Nederlandse kop die letterlijk in de andere kop staat (Hegseth, Huang, Fairford).
  const names = [...tn.names].filter((n) => tx.words.has(n))
  const acts = concepts.filter((c) => c[0] === '!')
  const cities = concepts.filter((c) => c[0] === '#')
  const places = concepts.filter((c) => c[0] === '@')
  if (!acts.length) return null
  if (!cities.length && (!(places.length || names.length) || concepts.length + names.length < EVENT_SHARED)) return null
  return { begrippen: concepts, namen: names }
}

// De eindcontrole over de plekken van een Editie. `leadOf(e)`: het kopstuk van een plek. Geeft de paren [hoger, lager]
// (indexen) die dezelfde gebeurtenis zijn; de bubbelplek doet niet mee.
export function crossLanguagePairs(entries, { leadOf }) {
  const out = []
  for (let a = 0; a < entries.length; a++) {
    if (entries[a].desk === 'bubbel') continue
    for (let b = a + 1; b < entries.length; b++) {
      if (entries[b].desk === 'bubbel') continue
      const hit = crossLanguageEvent(leadOf(entries[a]), leadOf(entries[b]))
      if (hit) out.push({ hoger: a, lager: b, ...hit })
    }
  }
  return out
}
