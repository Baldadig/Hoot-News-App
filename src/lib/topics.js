// Onderwerpen (smal) en interesses (breed) — pure gegevens en functies (tests/topics.test.mjs).
// De id's van de onderwerpen komen overeen met de trefwoorden op de server (netlify/lib/topics.mjs).
const T = (id, label) => ({ id, label })
// De volgorde hier is alleen die van de catalogus (en van de leesgeschiedenis van de testpersona's); de indeling per
// interesse staat in INTERESTS. Games staat daarom nog op zijn oude plek, al hoort het sinds 1.3 bij Cultuur.
export const TOPICS = [
  T('nederland', 'Den Haag'), T('europa', 'Europa'), T('vs-politiek', 'Verenigde Staten'), T('verkiezingen', 'Verkiezingen'),
  T('wonen', 'Wonen'), T('zorg', 'Zorg'), T('onderwijs', 'Onderwijs'), T('misdaad', 'Misdaad & recht'), T('migratie', 'Asiel & migratie'), T('verkeer', 'Verkeer & OV'),
  T('oekraine', 'Oekraïne & Rusland'), T('middenoosten', 'Midden-Oosten'), T('azie', 'China & Azië'), T('afrika', 'Afrika'), T('latam', 'Latijns-Amerika'), T('geopolitiek', 'Defensie & NAVO'),
  T('economie', 'Markten & beurs'), T('werk', 'Werk & inkomen'), T('bedrijven', 'Bedrijven'), T('energie', 'Energie'), T('geld', 'Geld & sparen'),
  T('ai', 'AI'), T('tech', 'Techbedrijven'), T('gadgets', 'Gadgets'), T('privacy', 'Hacks & privacy'), T('ev', 'Elektrisch rijden'), T('games', 'Games'),
  T('klimaat', 'Klimaat'), T('gezondheid', 'Gezondheid'), T('ruimte', 'Ruimte'), T('natuur', 'Natuur & dieren'), T('brein', 'Psychologie & brein'),
  T('muziek', 'Muziek'), T('film', 'Film & series'), T('boeken', 'Boeken'), T('kunst', 'Kunst & musea'), T('media', 'Media'),
  T('voetbal', 'Voetbal'), T('f1', 'Formule 1'), T('wielrennen', 'Wielrennen'), T('tennis', 'Tennis'), T('wintersport', 'Schaatsen & wintersport'), T('olympisch', 'Olympische sporten'),
]

// Breed → smal: wat je in de onboarding eerst kiest, en wat daaronder valt.
// `cats`: bronnen uit deze rubrieken horen ook bij deze interesse (een sportsite is sport).
export const INTERESTS = [
  { id: 'politiek', label: 'Politiek', topics: ['nederland', 'europa', 'vs-politiek', 'verkiezingen'], cats: [] },
  { id: 'binnenland', label: 'Binnenland', topics: ['wonen', 'zorg', 'onderwijs', 'misdaad', 'migratie', 'verkeer'], cats: ['regio'] },
  { id: 'wereld', label: 'Wereld', topics: ['oekraine', 'middenoosten', 'azie', 'afrika', 'latam', 'geopolitiek'], cats: [] },
  { id: 'economie', label: 'Economie', topics: ['economie', 'werk', 'bedrijven', 'energie', 'geld'], cats: ['economie'] },
  { id: 'tech', label: 'Tech', topics: ['ai', 'tech', 'gadgets', 'privacy', 'ev'], cats: ['tech'] },
  { id: 'wetenschap', label: 'Wetenschap', topics: ['klimaat', 'gezondheid', 'ruimte', 'natuur', 'brein'], cats: ['wetenschap'] },
  // Games hoort sinds 1.3 bij Cultuur (rubrieken, fase 2), niet meer bij Tech; zie currentChoice hieronder.
  { id: 'cultuur', label: 'Cultuur', topics: ['muziek', 'film', 'boeken', 'kunst', 'media', 'games'], cats: ['cultuur', 'games'] },
  { id: 'sport', label: 'Sport', topics: ['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'], cats: ['sport'] },
]
const INTEREST_OF = Object.fromEntries(INTERESTS.flatMap((i) => i.topics.map((t) => [t, i.id])))

// Hoort dit bericht bij een interesse? Via zijn onderwerpen, of omdat de bron erover gaat.
export function inInterest(item, interestId, source) {
  const i = INTERESTS.find((x) => x.id === interestId)
  if (!i) return false
  return (item.topics || []).some((t) => INTEREST_OF[t] === interestId) || i.cats.includes(source?.cat)
}

export const topicById = (id) => TOPICS.find((t) => t.id === id)

// Onderwerpen die er niet meer zijn en waar ze nu onder vallen (1.1.0: "Trump" is gewoon Verenigde Staten,
// id vs-politiek). Opgeslagen voorkeuren, profielsync en oudere builds leveren de oude sleutel nog; elke
// plek die zulke gegevens inleest zet ze eerst om (prefs.js, profileOf, tests/vs-migratie.test.mjs).
export const RETIRED_TOPICS = { trump: 'vs-politiek' }
export const currentTopic = (id) => RETIRED_TOPICS[id] || id
// Een lijst onderwerpen: oude sleutels vervangen, geen dubbelen, volgorde blijft (de eerste plek wint).
export const currentTopics = (ids) => (Array.isArray(ids) ? [...new Set(ids.map((t) => (typeof t === 'string' ? currentTopic(t) : t)))] : ids)
// Een getal per onderwerp (smaak, leesprofiel): de waarden van oud en nieuw tellen op, begrensd door `cap`.
export function currentTopicMap(map, cap = Infinity) {
  if (!map || typeof map !== 'object') return map
  const out = {}
  for (const [k, v] of Object.entries(map)) {
    const key = currentTopic(k)
    out[key] = key in out && Number.isFinite(out[key]) && Number.isFinite(v) ? Math.max(-cap, Math.min(cap, out[key] + v)) : v
  }
  return out
}

// De indeling van de rubrieken heeft een versie (`prefs.rubrieken`, ook in de vraag aan de server). Versie 2
// (1.3): Games staat onder Cultuur in plaats van onder Tech. Bewaarde keuzes zonder versie zijn van de oude
// indeling en gaan één keer door currentChoice; daarna draagt alles RUBRIEKEN mee, zodat een keuze van nu
// (Cultuur zonder Games) nooit opnieuw als oude keuze wordt gelezen. Web: prefs.js; server: edition.mjs;
// app: Models.swift (RubriekVersie). Tests: tests/rubrieken-migratie.test.mjs.
export const RUBRIEKEN = 2
const OLD_TECH = ['ai', 'tech', 'gadgets', 'privacy', 'ev', 'games']
const OLD_CULTUUR = ['muziek', 'film', 'boeken', 'kunst', 'media']
// Van de oude naar de nieuwe indeling, zodat niemand een keuze verliest:
// - Tech met "Wat precies?" en Games aangetikt: Games blijft gekozen, nu onder Cultuur (Cultuur komt erbij,
//   met alleen Games aangetikt). Koos je onder Tech alleen Games, dan valt Tech weg (anders kreeg je ineens
//   heel Tech).
// - Tech zonder keuze (alles): Tech blijft alles, zonder Games. Wie Tech koos, bedoelde AI en technologie
//   (zo telde de Redacteur Games al niet mee voor het extra blok); Games is nu een keuze onder Cultuur.
// - Cultuur zonder keuze (alles): blijft alles, en dat is nu met Games.
// - Cultuur met een keuze: precies die keuze (plus Games als je dat onder Tech aantikte).
export function currentChoice(interests = [], topics = []) {
  const I = Array.isArray(interests) ? interests : []
  const T = Array.isArray(topics) ? topics : []
  const sharp = (old) => {
    const n = old.filter((t) => T.includes(t)).length
    return n > 0 && n < old.length
  }
  const games = I.includes('tech') && sharp(OLD_TECH) && T.includes('games')
  const cultuurAll = I.includes('cultuur') && !sharp(OLD_CULTUUR)
  const onlyGames = games && !OLD_TECH.some((t) => t !== 'games' && T.includes(t))
  let nextI = I.filter((i) => !(onlyGames && i === 'tech'))
  if (games && !nextI.includes('cultuur')) nextI = [...nextI, 'cultuur']
  let nextT = T.filter((t) => t !== 'games')
  const cultuur = INTERESTS.find((i) => i.id === 'cultuur').topics
  // Cultuur "alles" bewaart het welkom als de hele lijst; zonder enig cultuuronderwerp blijft het ook alles.
  if (cultuurAll && (OLD_CULTUUR.every((t) => T.includes(t)) || games)) nextT = [...nextT, ...cultuur.filter((t) => !nextT.includes(t))]
  else if (games) nextT = [...nextT, 'games']
  return { interests: nextI, topics: nextT }
}

// Wat je volgt: per gekozen interesse de onderwerpen die je aantikte, of alle als je er geen koos.
export function resolveTopics(interests = [], picked = []) {
  return INTERESTS.filter((i) => interests.includes(i.id)).flatMap((i) => {
    const mine = i.topics.filter((t) => picked.includes(t))
    return mine.length ? mine : i.topics
  })
}

// Welke bronnen stonden vooraf aan bij deze keuzes (het oude welkom; nu alleen nog de basis van de
// testpersona's in tests/fixtures/personas.mjs, het welkom zelf gebruikt proposeSources). Alleen bronnen met `pick`; daarvan: zonder
// voorwaarde altijd, met `for` als een van je interesses past, met `forTopic` als je dat onderwerp volgt.
export function suggestSources(sources = [], interests = [], topics = []) {
  return sources
    .filter((s) => s.pick)
    .filter((s) => (s.forTopic ? topics.includes(s.forTopic) : !s.for || s.for.some((f) => interests.includes(f))))
    .map((s) => s.id)
}

// De rij onderwerpen in de Stroom: "Alles", dan wat je vooraan wilt, dan de rest. Volg je
// bepaalde onderwerpen (onboarding), dan alleen die.
export function orderedTopics(pinned = [], mine = []) {
  const pool = mine.length ? mine.map(topicById).filter(Boolean) : TOPICS
  const first = pinned.map((id) => pool.find((t) => t.id === id)).filter(Boolean)
  return [...first, ...pool.filter((t) => !pinned.includes(t.id))]
}

// Rubrieken van de bronnencatalogus (`cat` in netlify/lib/sources.mjs), in de volgorde van
// de Bronnen-pagina. Eén plek voor de namen; het welkom kiest zelf welke het toont.
export const SOURCE_CATS = [
  ['nl', 'Nederland'],
  ['int', 'Internationaal'],
  ['regio', 'Regionaal'],
  ['vl', 'Vlaanderen'],
  ['economie', 'Economie'],
  ['tech', 'Tech'],
  ['games', 'Games'],
  ['wetenschap', 'Wetenschap'],
  ['sport', 'Sport'],
  ['cultuur', 'Cultuur en muziek'],
]

// "Liever meteen lezen": een zachte landing. Alleen Nederlandse bronnen, allemaal gratis, dus elk
// stuk is helemaal te lezen; over een paar interesses verdeeld. Alles is later aan te passen.
// Geen sport: sport komt alleen als je het zelf kiest (een interesse of een bron die je volgt).
// Zelfde set als de app (HootStore.starter).
export const STARTER = [
  { label: 'Nieuws', ids: ['nos', 'nu', 'rtl'] },
  { label: 'Tech', ids: ['tweakers'] },
  { label: 'Cultuur', ids: ['nos-cultuur', '3voor12'] },
]

// De startset zoals die er nu is: alleen bronnen die bestaan en gratis zijn.
export function starterGroups(sources = []) {
  const byId = new Map(sources.map((s) => [s.id, s]))
  return STARTER.map((g) => ({ ...g, sources: g.ids.map((id) => byId.get(id)).filter((s) => s && !s.paid) })).filter((g) => g.sources.length)
}
