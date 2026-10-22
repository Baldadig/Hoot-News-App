// Onderwerpen (smal) en interesses (breed) — pure gegevens en functies (tests/topics.test.mjs).
// De id's van de onderwerpen komen overeen met de trefwoorden op de server (netlify/lib/topics.mjs).
const T = (id, label) => ({ id, label })
export const TOPICS = [
  T('nederland', 'Den Haag'), T('europa', 'Europa'), T('vs-politiek', 'VS-politiek'), T('trump', 'Trump'), T('verkiezingen', 'Verkiezingen'),
  T('wonen', 'Wonen'), T('zorg', 'Zorg'), T('onderwijs', 'Onderwijs'), T('misdaad', 'Misdaad & recht'), T('migratie', 'Asiel & migratie'), T('verkeer', 'Verkeer & OV'),
  T('oekraine', 'Oekraïne & Rusland'), T('middenoosten', 'Midden-Oosten'), T('azie', 'China & Azië'), T('afrika', 'Afrika'), T('latam', 'Latijns-Amerika'), T('geopolitiek', 'Defensie & NAVO'),
  T('economie', 'Markten & beurs'), T('werk', 'Werk & inkomen'), T('bedrijven', 'Bedrijven'), T('energie', 'Energie'), T('geld', 'Geld & sparen'),
  T('ai', 'AI'), T('tech', 'Big Tech'), T('gadgets', 'Gadgets'), T('privacy', 'Privacy & veiligheid'), T('ev', 'Elektrisch rijden'), T('games', 'Games'),
  T('klimaat', 'Klimaat'), T('gezondheid', 'Gezondheid'), T('ruimte', 'Ruimte'), T('natuur', 'Natuur & dieren'), T('brein', 'Psychologie & brein'),
  T('muziek', 'Muziek'), T('film', 'Film & series'), T('boeken', 'Boeken'), T('kunst', 'Kunst & musea'), T('media', 'Media'),
  T('voetbal', 'Voetbal'), T('f1', 'Formule 1'), T('wielrennen', 'Wielrennen'), T('tennis', 'Tennis'), T('wintersport', 'Schaatsen & wintersport'), T('olympisch', 'Olympische sporten'),
]

// Breed → smal: wat je in de onboarding eerst kiest, en wat daaronder valt.
// `cats`: bronnen uit deze rubrieken horen ook bij deze interesse (een sportsite is sport).
export const INTERESTS = [
  { id: 'politiek', label: 'Politiek', topics: ['nederland', 'europa', 'vs-politiek', 'trump', 'verkiezingen'], cats: [] },
  { id: 'binnenland', label: 'Binnenland', topics: ['wonen', 'zorg', 'onderwijs', 'misdaad', 'migratie', 'verkeer'], cats: ['regio'] },
  { id: 'wereld', label: 'Wereld', topics: ['oekraine', 'middenoosten', 'azie', 'afrika', 'latam', 'geopolitiek'], cats: [] },
  { id: 'economie', label: 'Economie', topics: ['economie', 'werk', 'bedrijven', 'energie', 'geld'], cats: ['economie'] },
  { id: 'tech', label: 'Tech', topics: ['ai', 'tech', 'gadgets', 'privacy', 'ev', 'games'], cats: ['tech', 'games'] },
  { id: 'wetenschap', label: 'Wetenschap', topics: ['klimaat', 'gezondheid', 'ruimte', 'natuur', 'brein'], cats: ['wetenschap'] },
  { id: 'cultuur', label: 'Cultuur', topics: ['muziek', 'film', 'boeken', 'kunst', 'media'], cats: ['cultuur'] },
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

// Wat je volgt: per gekozen interesse de onderwerpen die je aantikte, of alle als je er geen koos.
export function resolveTopics(interests = [], picked = []) {
  return INTERESTS.filter((i) => interests.includes(i.id)).flatMap((i) => {
    const mine = i.topics.filter((t) => picked.includes(t))
    return mine.length ? mine : i.topics
  })
}

// Welke bronnen staan vooraf aan bij deze keuzes. Alleen bronnen met `pick`; daarvan: zonder
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
export const catLabel = (cat) => SOURCE_CATS.find(([c]) => c === cat)?.[1] || cat
