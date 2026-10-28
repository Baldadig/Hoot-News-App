// Verhalen (bundels), hoofdbericht en editie — pure functies, los van het ophalen,
// zodat ze te testen zijn (zie tests/).

import { DESKS, desksOf, primaryDesk, weight } from './desks.mjs'

import { hash } from '../../shared/util.mjs'
export { hash }

// Een onleesbare tijd telt als heel oud (anders geeft de vergelijking NaN en raakt de sortering,
// en daarmee het afbreken op tijd in buildStories, in de war).
const timeOf = (a) => Date.parse(a.publishedAt) || 0
export const byRecency = (a, b) => timeOf(b) - timeOf(a)

// Bronnen die in het Nederlands schrijven (voor taalvoorkeur bij het hoofdbericht).
export const NL_SOURCES = new Set(['nrc', 'nos', 'volkskrant', 'tweakers'])

const deaccent = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
const norm = (s) => deaccent(String(s || '')).toLowerCase()

// ---------- 1. Woordoverlap in koppen (zelfde taal) ----------
const STOP = new Set(
  'de het een en van op in te dat die voor met als om aan bij uit ook naar maar nog wordt worden heeft hebben zijn was werd niet wel meer jaar tegen door over deze onze the and for with that this from have will your about into over after their than what when which were been they them these those where while would could should more most some such also only just like said says year week time news live video update kills killed dead dies death attack attacks near least people police officials official after says report reports doden dood mensen zeker politie volgens aanval nieuwe eerste first three nobel prize prijs nobelprijs wins wint winner winnaar'.split(
    ' '
  )
)
export function sigWords(title) {
  const out = new Set()
  for (const w of norm(title).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w) // jaartallen en getallen zeggen niets
  return out
}
export function sharedCount(a, b) {
  let n = 0
  for (const w of a) if (b.has(w)) n++
  return n
}

// ---------- 2. Taaloverstijgend: namen, plaatsen en gebeurtenis-woorden ----------
// Namen zijn in beide talen gelijk ("Nidal Hasan", "New York"); gebeurtenis-woorden
// vertalen we met een kleine woordenlijst naar een gedeeld begrip.

// Verschillende schrijfwijzen → één naam.
const ALIAS = {
  vs: 'us', usa: 'us', amerika: 'us', amerikaanse: 'us', amerikaan: 'us', amerikanen: 'us', american: 'us', americans: 'us', america: 'us',
  rusland: 'russia', russische: 'russia', russen: 'russia', russian: 'russia', russians: 'russia',
  oekraine: 'ukraine', oekraiense: 'ukraine', ukrainian: 'ukraine',
  duitsland: 'germany', duitse: 'germany', german: 'germany',
  frankrijk: 'france', franse: 'france', french: 'france',
  brittannie: 'uk', britse: 'uk', british: 'uk', britain: 'uk', engeland: 'uk', england: 'uk',
  chinese: 'china', chinees: 'china',
  israelische: 'israel', israeli: 'israel', israelisch: 'israel', israelis: 'israel',
  iraanse: 'iran', iranian: 'iran',
  nederlandse: 'nederland', dutch: 'nederland', netherlands: 'nederland',
  europese: 'europe', european: 'europe', europa: 'europe', eu: 'europe',
  navo: 'nato', vn: 'un',
  poetin: 'putin', zelenski: 'zelensky', zelenskyy: 'zelensky',
  witte: 'whitehouse', white: 'whitehouse',
  koreaanse: 'korea', koreaans: 'korea', noordkoreaanse: 'northkorea', zuidkoreaanse: 'southkorea', koreanen: 'korea', korean: 'korea', koreans: 'korea',
  // Voornamen van wereldleiders tellen als die leider (anders is "Donald" een sterke naam).
  donald: 'trump', benjamin: 'netanyahu', vladimir: 'putin', volodymyr: 'zelensky', emmanuel: 'macron', keir: 'starmer', friedrich: 'merz', recep: 'erdogan', narendra: 'modi', giorgia: 'meloni', viktor: 'orban', kamala: 'harris', joe: 'biden', elon: 'musk', jinping: 'xi',
}
// Te algemeen om op zichzelf een gebeurtenis aan te wijzen: landen, steden, regeringsleiders,
// diensten. Twee verhalen die alleen zo'n naam delen gaan niet samen (zie sameEvent).
const WEAK = new Set(
  'us russia ukraine germany france uk china israel iran nederland europe nato un putin zelensky trump biden harris vance netanyahu musk xi macron starmer merz erdogan modi meloni orban schoof pentagon congress senate senaat congres kremlin whitehouse ice fbi cia nasa who gaza taiwan india japan canada mexico brazil turkije turkey syria syrie venezuela korea northkorea southkorea texas california florida georgia carolina virginia ohio michigan arizona nevada pennsylvania wisconsin washington brussel brussels londen london parijs paris moskou moscow kyiv kiev berlijn berlin seoul busan pyongyang tokio tokyo peking beijing jeruzalem jerusalem teheran tehran amsterdam rotterdam'.split(
    ' '
  )
)
// Hoofdletterwoorden die geen naam zijn (dagen, maanden, titels, delen van namen, bronnen).
// Prijzen ook: de Ballon d'Or wijst net zo min als de Nobelprijs één gebeurtenis aan. Een stuk over
// Mbappé dat terloops "de Ballon d'Or" noemt, kwam anders in het verhaal over winnaar Kane terecht.
const NOT_A_NAME = new Set(
  'new the of van der den des het een and for with from north south east west noord zuid oost voor tegen saint san los las great united states verenigde staten house huis kamer eerste tweede president minister premier koning king queen prins prince paus pope major maj gen general sen rep dr mr mrs ms sir lord secretary department ministerie defense defensie monday tuesday wednesday thursday friday saturday sunday maandag dinsdag woensdag donderdag vrijdag zaterdag zondag january february march april may june july august september october november december januari februari maart mei juni juli augustus oktober republican republicans democrat democrats democratic republikeinen democraten gop times guardian bbc nos nrc npr volkskrant wired verge atlantic economist politico reuters associated press getty afp images photo photos foto video live update breaking opinion analyse analysis why how what when who where this that these those here there after before more most just also only nobel nobelprijs nobelcomite ballon prize prijs literature literatuur peace vrede force air royal city stad agent police politie court national international'.split(
    ' '
  )
)

// Gebeurtenis-woorden, Nederlands én Engels → één begrip. "rare" = zegt veel over wát er gebeurde.
const CONCEPTS = [
  ['execution', /\b(executie|geexecuteerd|execution|executed|execute)\b/, true],
  ['firingsquad', /\b(vuurpeloton|firing squad)\b/, true],
  ['livestream', /(livestream|live-stream|live uitzend|live uitgezonden|streamed live|live te zien)/, true],
  ['nobel', /\bnobel/, true],
  ['quake', /\b(aardbeving|earthquake)/, true],
  ['flood', /\b(overstroming|flood)/, true],
  ['hurricane', /\b(orkaan|hurricane|tyfoon|typhoon)/, true],
  ['ceasefire', /\b(wapenstilstand|staakt-het-vuren|ceasefire|truce)\b/, true],
  ['hostage', /\b(gijzel|hostage)/, true],
  ['sanctions', /\b(sanctie|sanction)/, true],
  ['tariffs', /\b(invoerheffing|importheffing|heffingen|tariff)/, true],
  ['merger', /\b(fusie|megafusie|overname|merger|acquisition|takeover)\b/, true],
  ['bankrupt', /\b(faillie|bankrupt)/, true],
  ['vaccine', /\bvaccin/, true],
  ['nuclear', /\b(kernwapen|kerncentrale|kernprogramma|nuclear|nucleair)/, true],
  ['derail', /\b(ontspoor|derail)/, true],
  ['planecrash', /\b(neergestort|vliegtuigcrash|plane crash|crashed)\b/, true],
  ['impeach', /\b(impeach|afzetting|afzettingsprocedure)/, true],
  ['shoot', /\b(schiet|schoot|neergeschoten|doodgeschoten|schietpartij|shoot|shoots|shot|shooting|gunman|schutter)\b/, false],
  ['dead', /\b(doden|dood|gedood|omgekomen|sterft|overleden|overlijdt|dies|died|dead|death|killed|kills)\b/, false],
  ['attack', /\b(aanval|aanvallen|aanslag|luchtaanval|attack|attacks|airstrike|strike|strikes|bombard\w*)\b/, false],
  ['arrest', /\b(arrest\w*|gearresteerd|opgepakt|aangehouden|detained)\b/, false],
  ['court', /\b(rechter|rechtbank|rechtszaak|vonnis|veroordeeld|hooggerechtshof|court|judge|trial|convicted|sentenced|verdict)\b/, false],
  ['charged', /\b(aangeklaagd|aanklacht|indicted|charged|indictment)\b/, false],
  ['election', /(\w*verkiezing\w*|\belection\w*|\bmidterm\w*|\bstembus|\bstemlokal\w*|\bhead to the polls)\b/, false],
  ['resign', /\b(aftreden|treedt af|stapt op|opgestapt|ontslagen|resign\w*|steps down|fired)\b/, false],
  ['fire', /\b(brand|branden|bosbrand\w*|wildfire\w*|blaze)\b/, false],
  ['protest', /\b(protest\w*|betoging\w*|demonstratie\w*|demonstrat\w*)\b/, false],
  ['police', /\b(politie|police|agent|agenten|officer|officers)\b/, false],
  ['military', /\b(leger|militair\w*|military|army|troops|troepen|soldier\w*|soldaat|soldaten)\b/, false],
  ['immigration', /\b(immigra\w*|migrant\w*|asiel\w*|asylum|deport\w*|uitgezet|uitzetting)\b/, false],
  ['child', /\b(kind|kinderen|child|children|\d+-jarig\w*|\d+-year-old)\b/, false],
  ['award', /\b(wint|winnaar|gewonnen|wins|winner|awarded|award)\b/, false],
  ['missile', /\b(raket\w*|missile\w*|rocket\w*|drone\w*)\b/, false],
]

// Samengestelde landnamen als één woord, zodat "Noord-" en "Zuid-" geen losse namen worden.
const COMPOUND = [
  [/\b(Noord|North)[- ]Korea\b/g, 'Northkorea'],
  [/\b(Zuid|South)[- ]Korea\b/g, 'Southkorea'],
]
const joinCompounds = (text) => COMPOUND.reduce((t, [re, to]) => t.replace(re, to), String(text || ''))
const tokenize = (text) => joinCompounds(text).replace(/\b([A-Z])\.(?=[A-Z]\.)/g, '$1').replace(/\b([A-Z]{2,})\./g, '$1').replace(/[’']s\b/g, '').match(/[\p{L}\p{N}]+/gu) || []
const isCap = (w) => /^\p{Lu}\p{Ll}/u.test(w)
const isAcronym = (w) => /^\p{Lu}{2,6}$/u.test(w)
// Koppen In Titelkast (NYT, Wired) zeggen niets over wat een naam is.
const isTitleCase = (title) => {
  const words = tokenize(title).filter((w) => w.length >= 4)
  return words.length >= 3 && words.filter(isCap).length / words.length >= 0.6
}

// Woordenschat van namen: woorden die midden in een gewone zin met een hoofdletter staan.
function nameVocabulary(articles) {
  const vocab = new Set()
  const scan = (text) => {
    let sentenceStart = true
    for (const part of String(text || '').split(/(\s+)/)) {
      if (!part.trim()) continue
      const words = tokenize(part)
      for (const w of words) {
        if (!sentenceStart && isCap(w) && w.length >= 3) vocab.add(norm(w))
        sentenceStart = false
      }
      if (/[.!?:;"“‘(]$/.test(part) || /^["“‘(]/.test(part)) sentenceStart = /[.!?:]["”’)]?$/.test(part)
    }
  }
  for (const a of articles) {
    if (!isTitleCase(a.title)) scan(a.title)
    scan(a.text || a.summary)
  }
  return vocab
}

// Kenmerk van één artikel: sterke namen, zwakke namen, gebeurtenis-begrippen.
function signature(article, vocab) {
  const raw = `${article.title}. ${article.text || article.summary || ''}`
  const strong = new Set()
  const weak = new Set()
  const known = new Set() // bekende algemene namen, ook uit koppen in Titelkast (alleen voor sameSubject)
  for (const w of tokenize(raw)) {
    if (isCap(w) || isAcronym(w)) {
      const k = ALIAS[norm(w)] || norm(w)
      if (WEAK.has(k)) known.add(k)
    }
    let key = null
    if (isAcronym(w)) key = norm(w)
    // Alleen woorden mét hoofdletter die ook elders midden in een zin als naam voorkomen.
    else if (w.length >= 4 && isCap(w) && vocab.has(norm(w))) key = norm(w)
    if (!key) continue
    key = ALIAS[key] || key
    if (NOT_A_NAME.has(key)) continue
    if (WEAK.has(key)) weak.add(key)
    else if (key.length >= 3) strong.add(key)
  }
  const text = norm(raw)
  const concepts = new Set()
  let rare = 0
  for (const [id, re, isRare] of CONCEPTS) {
    if (re.test(text)) {
      concepts.add(id)
      if (isRare) rare++
    }
  }
  return { words: sigWords(article.title), strong, weak, known, concepts, rareIds: new Set(CONCEPTS.filter(([id, , r]) => r && concepts.has(id)).map(([id]) => id)), t: timeOf(article) }
}

const WORD_WINDOW = 48 * 60 * 60 * 1000
const EVENT_WINDOW = 36 * 60 * 60 * 1000

// Gaan twee artikelen over dezelfde gebeurtenis?
export function sameEvent(a, b) {
  const dt = Math.abs(a.t - b.t)
  // Beide noemen namen, maar geen enkele dezelfde: twee gebeurtenissen van dezelfde soort
  // ("president erkent nederlaag bij verkiezingen" in Brazilië en in Servië).
  if (a.strong.size && b.strong.size && !sharedCount(a.strong, b.strong) && !sharedCount(a.weak, b.weak)) return false
  // Zelfde taal: ≥3 gedeelde kernwoorden in de kop én ≥40% van de kortste kop.
  if (dt <= WORD_WINDOW) {
    const n = sharedCount(a.words, b.words)
    if (n >= 3 && n / Math.min(a.words.size, b.words.size) >= 0.4) return true
  }
  if (dt > EVENT_WINDOW) return false
  const strong = sharedCount(a.strong, b.strong)
  const weak = sharedCount(a.weak, b.weak)
  const concepts = sharedCount(a.concepts, b.concepts)
  const rare = sharedCount(a.rareIds, b.rareIds)
  // A. Twee gedeelde namen plus nog iets (voorkomt: zelfde persoon, andere gebeurtenis).
  if (strong >= 2 && strong + weak + concepts >= 3) return true
  // B. Eén naam, hetzelfde soort gebeurtenis, en nog een aanknopingspunt.
  if (strong >= 1 && concepts >= 1 && weak + concepts >= 2) return true
  // C. Geen naam gemeen, maar een zeldzame combinatie van gebeurtenis-woorden.
  if (rare >= 2 && concepts >= 3 && weak + strong >= 1) return true
  // D. Zelfde taal, drie gedeelde kernwoorden in de kop en ook een gedeelde naam (lange koppen
  //    halen de 40% van de woordregel niet altijd).
  if (sharedCount(a.words, b.words) >= 3 && strong + weak >= 1) return true
  return false
}

// Voor de editie (niet voor het bundelen): gaan twee berichten over hetzelfde onderwerp van nu?
// Strenger dan sameEvent: twee algemene namen ("Israël", "Netanyahu") plus hetzelfde soort
// gebeurtenis ("verkiezingen") is genoeg om maar één plek te krijgen. Zo staan er geen drie stukken
// over één verkiezingsdag in tien verhalen.
const BROAD = new Set(['us', 'europe', 'un', 'nato', 'uk', 'trump', 'whitehouse', 'congress', 'nederland'])
export function sameSubject(a, b) {
  if (sameEvent(a, b)) return true
  if (Math.abs(a.t - b.t) > EVENT_WINDOW) return false
  const shared = [...a.known].filter((k) => b.known.has(k))
  const concepts = sharedCount(a.concepts, b.concepts)
  if (!concepts) return false
  // Eén gedeelde naam is genoeg, behalve een heel brede (de VS, Trump, Europa): Amerikaanse
  // verkiezingsverhalen zijn er vele, en die wil je niet allemaal op één plek.
  return shared.length >= 2 || shared.some((k) => !BROAD.has(k)) || (shared.length >= 1 && sharedCount(a.strong, b.strong) >= 1)
}

export function signatures(articles) {
  const vocab = nameVocabulary(articles)
  return new Map(articles.map((a) => [a.id, signature(a, vocab)]))
}

// Volgorde van kandidaten voor het hoofdbericht: eigen bronnen eerst, dan Nederlands,
// dan met preview, met beeld, en het nieuwste.
// `preferred`: je voorkeursbronnen (de ster bij een bron); die gaan nog vóór je andere bronnen.
export function leadCandidates(items, mainIds, preferred = null) {
  // Een opiniestuk is nooit het hoofdbericht als er een nieuwsbericht is.
  // Een podcast of liveblog is ook nooit het hoofdbericht (een promo, of over van alles tegelijk).
  const score = (i) => (i.type === 'opinie' ? -16 : 0) + (/\bpodcast\b/i.test(i.title || '') || isLive(i) ? -16 : 0) + (preferred?.has(i.source) ? 12 : 0) + (mainIds.has(i.source) ? 8 : 0) + (NL_SOURCES.has(i.source) ? 4 : 0) + (i.summary ? 2 : 0) + (i.image ? 1 : 0)
  return [...items].sort((a, b) => score(b) - score(a) || byRecency(a, b))
}

// Verhalen: verbonden groepen van artikelen over dezelfde gebeurtenis (≥2 bronnen).
// `registry` (item-id → { s: verhaal-id }) houdt de id stabiel als een bundel groeit of
// twee bundels samengaan; de afgevallen id's blijven vindbaar via `formerIds`.
// Dagoverzichten en liveblogs gaan over van alles tegelijk en trekken daardoor bundels aan elkaar.
const DIGEST = /^(wekdienst|liveblog|live:|podcast|nieuwsoverzicht|het nieuws van|the morning|morning briefing|evening briefing|what to know|five takeaways)/i
// Liveblogs ("LIVE | …", "▶ Live - …", "… latest", …/liveblog/…) volgen een heel onderwerp, niet
// één gebeurtenis: ze staan los in de Stroom en tellen niet mee in een verhaal.
const LIVE_TITLE = /^\W*live\b|\blive ?blog\b|\b(war|oorlog) (latest|live)\b|\blatest:|\blatest updates\b/i
export const isLive = (a) => LIVE_TITLE.test(a.title || '') || /\/live(blog)?[-/]|[-/]liveblog/i.test(a.url || '')
// Een grote bundel is pas één gebeurtenis als elk bericht met meerdere andere is verbonden (twee
// vanaf zes berichten, drie vanaf tien): wat er via één of twee schakels aan hangt (een analyse,
// een ander nieuwtje over dezelfde mensen) valt los en vormt eventueel een eigen verhaal.
const CORE_FROM = 6
const coreDegree = (size) => (size >= 10 ? 3 : 2)

export function buildStories(articles, registry = {}, { mainIds = new Set() } = {}) {
  const list = articles.filter((a) => !DIGEST.test(a.title || '') && !isLive(a)).sort(byRecency)
  const sig = signatures(list)
  // 1. Alle paren die over dezelfde gebeurtenis gaan.
  const links = new Map(list.map((a) => [a.id, new Set()]))
  for (let i = 0; i < list.length; i++) {
    const si = sig.get(list[i].id)
    if (si.words.size < 3 && si.strong.size < 1) continue
    for (let j = i + 1; j < list.length; j++) {
      const sj = sig.get(list[j].id)
      if (si.t && sj.t && si.t - sj.t > WORD_WINDOW) break // gesorteerd op tijd
      if (sameEvent(si, sj)) {
        links.get(list[i].id).add(list[j].id)
        links.get(list[j].id).add(list[i].id)
      }
    }
  }
  // 2. Groepen: verbonden berichten. 3. Grote groepen terug naar hun kern (zie CORE_DEGREE);
  //    wat los valt, vormt onderling opnieuw groepjes.
  const groups = new Map()
  const byId = new Map(list.map((a) => [a.id, a]))
  // In een grote bundel telt een verbinding alleen als nog een derde bericht met beide verbonden
  // is: één losse schakel (een reactie die over twee verkiezingen tegelijk gaat) trekt dan geen
  // twee gebeurtenissen meer aan elkaar.
  const embedded = (ids) => {
    const adj = new Map()
    for (const x of ids) adj.set(x, new Set([...links.get(x)].filter((y) => ids.has(y) && [...links.get(y)].some((z) => z !== x && ids.has(z) && links.get(x).has(z)))))
    return adj
  }
  const components = (ids, adj = links) => {
    const seen = new Set()
    const out = []
    for (const id of ids) {
      if (seen.has(id)) continue
      const comp = []
      const stack = [id]
      seen.add(id)
      while (stack.length) {
        const x = stack.pop()
        comp.push(x)
        for (const y of adj.get(x)) if (ids.has(y) && !seen.has(y)) (seen.add(y), stack.push(y))
      }
      out.push(comp)
    }
    return out
  }
  const settle = (ids) => {
    for (const comp of components(ids)) {
      if (comp.length < CORE_FROM) {
        groups.set(comp[0], comp.map((id) => byId.get(id)))
        continue
      }
      const core = new Set(comp)
      const adj = embedded(core)
      const need = coreDegree(comp.length)
      let pruned = true
      while (pruned) {
        pruned = false
        for (const x of [...core]) if ([...adj.get(x)].filter((y) => core.has(y)).length < need) (core.delete(x), (pruned = true))
      }
      const loose = new Set(comp.filter((x) => !core.has(x)))
      if (core.size >= 2) {
        const parts = components(core, adj)
        for (const part of parts) groups.set(part[0], part.map((id) => byId.get(id)))
      } else for (const x of core) loose.add(x)
      if (loose.size === comp.length) for (const id of comp) groups.set(id, [byId.get(id)]) // geen kern: allemaal los
      else if (loose.size) settle(loose)
    }
  }
  settle(new Set(list.map((a) => a.id)))
  for (const g of groups.values()) g.sort(byRecency)

  const stories = []
  const used = new Set()
  for (const items of groups.values()) {
    const sourceIds = new Set(items.map((i) => i.source))
    if (sourceIds.size < 2) continue
    const votes = {}
    for (const i of items) {
      const sid = registry[i.id]?.s
      if (sid) votes[sid] = (votes[sid] || 0) + 1
    }
    const known = Object.keys(votes).sort((a, b) => votes[b] - votes[a])
    let id = known[0] || 's' + hash(items[items.length - 1].id)
    while (used.has(id)) id = 's' + hash(id + '+')
    used.add(id)
    const own = items.filter((i) => mainIds.has(i.source))
    const names = []
    for (const i of items) if (!names.includes(i.sourceName)) names.push(i.sourceName)
    stories.push({
      id,
      formerIds: known.slice(1).filter((x) => x !== id),
      leadId: leadCandidates(items, mainIds)[0].id,
      itemIds: items.map((i) => i.id),
      sourceCount: sourceIds.size,
      ownCount: new Set(own.map((i) => i.source)).size,
      sourceNames: names,
      latestAt: items[0].publishedAt || null,
      firstAt: items[items.length - 1].publishedAt || null,
    })
  }
  return stories
}

// ---------- Editie ----------
export const EDITION_SIZE = 10
const MAX_LEADS_PER_SOURCE = 3

// De editie vóór deze: middag → ochtend, avond → middag, ochtend → gisteravond.
export function previousSlotId(slot) {
  if (slot.slot === 'avond') return `${slot.date}-middag`
  if (slot.slot === 'middag') return `${slot.date}-ochtend`
  const [y, m, d] = slot.date.split('-').map(Number)
  return `${new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)}-avond`
}

// Wat uit een vastgelegde editie telt als "stond er al" (zie selectEdition).
export function previousOf(edition) {
  if (!edition?.entries?.length) return null
  const stories = edition.entries.filter((e) => e.kind === 'story')
  const lead = edition.entries[0]
  return {
    storyIds: new Set(stories.flatMap((e) => [e.id, e.formerId].filter(Boolean))),
    itemIds: new Set([...edition.entries.map((e) => e.leadId || e.id), ...stories.flatMap((e) => e.itemIds || []), ...(edition.stories || []).flatMap((st) => st.itemIds || [])]),
    leadIds: new Set([lead.leadId || lead.id]),
    leadStoryId: lead.kind === 'story' ? lead.id : null,
    at: Date.parse(edition.builtAt) || 0,
  }
}

export function editionSlot(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  const parts = (d) => Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  const p = parts(now)
  const h = Number(p.hour)
  // Drie edities per dag: ochtend (06:00), middag (12:00), avond (17:00).
  if (h >= 17) return { id: `${p.year}-${p.month}-${p.day}-avond`, slot: 'avond', date: `${p.year}-${p.month}-${p.day}`, next: '06:00' }
  if (h >= 12) return { id: `${p.year}-${p.month}-${p.day}-middag`, slot: 'middag', date: `${p.year}-${p.month}-${p.day}`, next: '17:00' }
  if (h >= 6) return { id: `${p.year}-${p.month}-${p.day}-ochtend`, slot: 'ochtend', date: `${p.year}-${p.month}-${p.day}`, next: '12:00' }
  // Vóór 06:00 geldt de avondeditie van gisteren. Gisteren op de kalender, niet "nu min zes
  // uur": op de nacht van de wintertijd is 05:59 min zes uur nog dezelfde datum.
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day - 1))
  const date = d.toISOString().slice(0, 10)
  return { id: `${date}-avond`, slot: 'avond', date, next: '06:00' }
}

// Selectie op drie zichtbare gronden: dekking (aantal bronnen), versheid, en of je eigen
// bronnen erover schrijven. Eén gebeurtenis krijgt één plek: vóór het plaatsen controleren
// we elke kandidaat nogmaals tegen wat er al staat. Het hoofdbericht wisselt van bron
// (niet twee keer dezelfde achter elkaar, hooguit drie per editie) zolang het verhaal
// een alternatief uit je eigen bronnen heeft.
// `bonus(items)` (optioneel): extra gewicht voor een kandidaat, bijvoorbeeld voor de interesses
// van een lezer (de persoonlijke editie in de app); de server gebruikt hem niet.
// `strict`: een rubriek alleen voor wat er echt over gaat (niet "raakt het ook"); voor de
// persoonlijke editie, waar een techreview anders "Buitenland" kon heten.
// `previous`: de vorige editie ({ storyIds, itemIds, leadIds, at }). Wat daar al in stond, komt
// alleen terug als er sindsdien echt iets bij kwam, en wordt niet weer vanzelf het hoofdverhaal:
// anders zijn ochtend, middag en avond drie keer dezelfde krant.
export const REPEAT_PENALTY = 70 // zelfde verhaal, weinig nieuws: zakt achter verhalen van nu
export const DEVELOPING_PENALTY = 25 // zelfde verhaal dat zich ontwikkelt: mag blijven, maar lager
export const REPEAT_LEAD_PENALTY = 30 // was het hoofdverhaal: niet nog een keer bovenaan
export function repeatPenalty(st, items, previous) {
  if (!previous) return 0
  const seen = previous.storyIds?.has(st.id) || items.some((i) => previous.itemIds?.has(i.id))
  if (!seen) return 0
  const fresh = items.filter((i) => !previous.itemIds?.has(i.id) && i.publishedAt && Date.parse(i.publishedAt) > previous.at).length
  const developing = fresh >= 3 && fresh / items.length >= 0.3
  const wasLead = previous.leadStoryId === st.id || items.some((i) => previous.leadIds?.has(i.id))
  return (developing ? DEVELOPING_PENALTY : REPEAT_PENALTY) + (wasLead ? REPEAT_LEAD_PENALTY : 0)
}

// Een verhaal of bericht uit een voorkeursbron weegt zwaarder (zo'n twee bronnen dekking).
export const FAVORITE_BONUS = 8
export function selectEdition(stories, pool, { mainIds = new Set(), now = Date.now(), size = EDITION_SIZE, bonus = null, strict = false, previous = null, preferred = null } = {}) {
  const byId = new Map(pool.map((i) => [i.id, i]))
  const sig = signatures(pool)
  const fresh = (iso, hours) => iso && now - Date.parse(iso) < hours * 60 * 60 * 1000
  const entries = []
  const placed = [] // kenmerken van alles wat al een plek heeft
  const leadCount = {}
  let prevLead = null
  const clashes = (ids) => ids.some((id) => sig.has(id) && placed.some((s) => sameSubject(sig.get(id), s)))
  const place = (ids) => {
    for (const id of ids) if (sig.has(id)) placed.push(sig.get(id))
  }
  const pickLead = (items) => {
    const cands = leadCandidates(items, mainIds, preferred)
    const ownOnly = cands.filter((i) => mainIds.has(i.source))
    const from = ownOnly.length ? ownOnly : cands
    return from.find((i) => i.source !== prevLead && (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from.find((i) => (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from[0]
  }

  // Kandidaten: verhalen (meerdere publicaties) en losse berichten uit je eigen bronnen.
  const cands = []
  for (const st of stories) {
    if (!fresh(st.latestAt, 24)) continue
    const items = st.itemIds.map((id) => byId.get(id)).filter(Boolean)
    if (!items.length) continue
    const per = items.map((it) => desksOf(it))
    const fav = preferred?.size && items.some((i) => preferred.has(i.source)) ? FAVORITE_BONUS : 0
    cands.push({ kind: 'story', st, items, ids: st.itemIds, desks: new Set(per.flatMap((x) => [...x])), primary: primaryDesk(per), w: weight(st, now) - repeatPenalty(st, items, previous) + fav })
  }
  for (const it of pool) {
    if (!mainIds.has(it.source) || it.kind !== 'article' || it.type === 'opinie' || it.storyId || isLive(it)) continue // een liveblog is geen editieplek
    if (!fresh(it.publishedAt, 14) || !(it.summary || it.image)) continue
    if (previous?.itemIds?.has(it.id)) continue // stond er al
    const desks = desksOf(it)
    cands.push({ kind: 'item', it, ids: [it.id], desks, primary: primaryDesk([desks]), w: weight({ sourceCount: 1, ownCount: 1, latestAt: it.publishedAt }, now) - 2 + (preferred?.has(it.source) ? FAVORITE_BONUS : 0) })
  }
  if (bonus) for (const c of cands) c.w += bonus(c.kind === 'story' ? c.items : [c.it])
  cands.sort((a, b) => b.w - a.w)

  const used = new Set()
  const take = (c, desk) => {
    if (used.has(c) || clashes(c.ids)) return false
    used.add(c)
    place(c.ids)
    if (c.kind === 'story') {
      const lead = pickLead(c.items)
      leadCount[lead.source] = (leadCount[lead.source] || 0) + 1
      prevLead = lead.source
      entries.push({ kind: 'story', id: c.st.id, leadId: lead.id, desk, w: c.w })
    } else entries.push({ kind: 'item', id: c.it.id, desk, w: c.w })
    return true
  }
  // 1. Per rubriek het belangrijkste verhaal.
  //    Eerst wat er vooral over gaat; alleen als dat er niet is, iets wat het ook raakt.
  for (const desk of DESKS) {
    if (entries.length >= size) break
    if (!cands.some((c) => c.primary === desk && take(c, desk)) && !strict) cands.some((c) => c.desks.has(desk) && take(c, desk))
  }
  // 2. Aanvullen met het belangrijkste wat er verder is.
  for (const c of cands) {
    if (entries.length >= size) break
    take(c, null)
  }
  // Volgorde: belangrijkste eerst (het hoofdverhaal is het zwaarste nieuws van het moment).
  entries.sort((a, b) => b.w - a.w)
  return entries.map(({ w, ...e }) => e)
}

// De editie ligt vast, maar verhaal-id's niet: na een latere verversing kan een id bij een andere
// bundel horen (gesplitst of opnieuw ingedeeld). Daarom bij elke uitlevering:
// - elk verhaal-onderdeel krijgt de momentopname van toen (`itemIds`, `sourceCount`), en
// - zit het hoofdbericht niet meer in het verhaal met die id, dan wijzen we naar het verhaal waar
//   het nu wél in zit (of tonen het als los bericht), met de rubriek van wat we dan tonen.
export function relinkEdition(entries = [], { stories = [], snapshot = [], byId = new Map() } = {}) {
  const live = new Map(stories.map((st) => [st.id, st]))
  const then = new Map(snapshot.map((st) => [st.id, st]))
  const storyOf = new Map()
  for (const st of stories) for (const id of st.itemIds || []) storyOf.set(id, st)
  const deskOf = (ids) => primaryDesk(ids.map((id) => byId.get(id)).filter(Boolean).map((it) => desksOf(it)))
  const taken = new Set(entries.map((e) => e.id)) // twee onderdelen mogen niet naar hetzelfde verhaal wijzen
  return entries.map((e) => {
    if (e.kind !== 'story') return e
    const snap = then.get(e.id)
    const out = { ...e, itemIds: snap?.itemIds || e.itemIds || [], sourceCount: snap?.sourceCount || e.sourceCount || 0, leadDesk: deskOf([e.leadId]) }
    const cur = live.get(e.id)
    if (!e.leadId || cur?.itemIds?.includes(e.leadId)) return out
    const now = storyOf.get(e.leadId)
    if (now && !taken.has(now.id)) {
      taken.add(now.id)
      return { ...out, id: now.id, formerId: e.id, desk: deskOf(now.itemIds) || out.leadDesk || e.desk }
    }
    return { kind: 'item', id: e.leadId, formerId: e.id, desk: out.leadDesk || e.desk, w: e.w }
  })
}

// "Waar iedereen over schrijft": de breedst gedekte verhalen van dit moment, elk met een bericht
// van een gratis bron (wie geen abonnement heeft, moet het kunnen lezen), bij voorkeur in het
// Nederlands en met een intro. Sport telt niet mee (de editie is nieuws). De app kiest er per
// lezer één uit die buiten diens interesses valt (src/lib/personal.js).
export function widelyCovered(stories = [], byId = new Map(), { isFree = () => false, isDutch = () => false, isSport = () => false, min = 6, max = 8 } = {}) {
  const out = []
  for (const st of [...stories].sort((a, b) => b.sourceCount - a.sourceCount)) {
    if (out.length >= max || st.sourceCount < min) break
    const items = st.itemIds.map((id) => byId.get(id)).filter(Boolean)
    if (!items.length || items.filter(isSport).length * 2 >= items.length) continue
    const free = items.filter((i) => isFree(i.source) && !isLive(i) && i.type !== 'opinie')
    const lead = free.find((i) => isDutch(i.source) && i.summary) || free.find((i) => i.summary) || free[0]
    if (!lead) continue
    out.push({ storyId: st.id, sourceCount: st.sourceCount, topics: [...new Set(items.flatMap((i) => i.topics || []))], item: lead })
  }
  return out
}
