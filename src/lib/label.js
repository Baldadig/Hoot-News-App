// Het label boven een artikel in de Editie — één kleine, pure functie. Zelfde regels en DEZELFDE
// testgevallen als de app (ios/Hoot, Label.swift): tests/fixtures/label-cases.json, gelezen door
// tests/label.test.mjs en door de iOS-tests.
//   kicker  = alleen bij een sterke treffer 'interesse · onderwerp' ('Politiek · Den Haag'); anders
//             de rubriek van de plek, of die van het bericht. Een sportbron is Sport.
//             Sterk is een onderwerp dat je volgt en dat het verhaal echt draagt: het past bij de
//             rubriek van de plek (Binnenland → Binnenland of Politiek), of het staat in de kop of
//             is het vak van de bron (`mainTopics`, van de server). Een losse vermelding in de
//             samenvatting ('omroep' → Media bij een verhaal over migranten) is zwak en geeft geen
//             kicker.
//   why     = de waarom-regel van De Redacteur, alleen als die iets toevoegt: nooit 'Omdat je X
//             volgt' (bij een sterke treffer zegt de kicker het al, bij een zwakke klopt het niet).
//             Wel 'Vervolg op wat je las', 'Groot nieuws · N bronnen', 'Uit je voorkeursbron …',
//             'Naast je bubbel …', 'Omdat je vaak over X leest'.
//   outside = 'Buiten je bronnen' hoort bij de bronregel, niet bij de kicker.
import { INTERESTS, topicById } from './topics.js'

const INTEREST_OF = Object.fromEntries(INTERESTS.flatMap((i) => i.topics.map((t) => [t, i.id])))
// Deze redenen zegt het label zelf al (Why.js: WHY_IN_LABEL).
const IN_LABEL = new Set(['rubriek', 'extern', 'bubbel', 'breed'])
// Welke interesses passen bij de rubriek van een plek in de Editie (desks.mjs, DESK_NAMES).
export const DESK_INTERESTS = {
  binnenland: ['binnenland', 'politiek'],
  regio: ['binnenland'],
  buitenland: ['wereld', 'politiek'],
  vs: ['politiek', 'wereld'],
  middenoosten: ['wereld'],
  oekraine: ['wereld'],
  wetenschap: ['wetenschap'],
  tech: ['tech'],
  economie: ['economie'],
}

// Een gevolgde geografische tag mag een concreet vastgestelde andere plek niet vervangen.
const GEOGRAPHIC_TOPICS = new Set(['nederland', 'europa', 'vs-politiek', 'trump', 'oekraine', 'middenoosten', 'azie', 'afrika', 'latam'])
const PLACE_TOPICS = {
  binnenland: ['nederland'], regio: ['nederland'], vs: ['vs-politiek', 'trump'],
  middenoosten: ['middenoosten'], oekraine: ['oekraine'],
}

// Draagt dit onderwerp het verhaal? Het past bij de rubriek van de plek, of het staat in de kop.
export function strongTopic(t, { desk = null, mainTopics = [] } = {}) {
  if (GEOGRAPHIC_TOPICS.has(t) && PLACE_TOPICS[desk] && !PLACE_TOPICS[desk].includes(t)) return false
  return (DESK_INTERESTS[desk] || []).includes(INTEREST_OF[t]) || mainTopics.includes(t)
}

// `topics`: de onderwerpen van het verhaal. `mainTopics`: de onderwerpen uit de kop en het vak van
// de bron (deelverzameling van topics). `follows`: de onderwerpen die de lezer volgt. `cat`: de
// rubriek van de bron. `desk`/`deskLabel`: de plek in de Editie. `section`: de rubriek van het
// bericht zelf. `why`: { code, text } van De Redacteur. `followed`: de bron staat bij je bronnen.
export function labelFor({ topics = [], mainTopics = [], follows = [], cat = null, desk = null, deskLabel = null, section = null, why = null, followed = null } = {}) {
  const outside = followed === false || (followed == null && (desk === 'extern' || why?.code === 'extern'))
  const mine = topics.find((t) => follows.includes(t) && topicById(t) && INTEREST_OF[t] && strongTopic(t, { desk, mainTopics }))
  let kicker = null
  if (desk === 'bubbel' || desk === 'breed') kicker = deskLabel // 'Buiten je bubbel · via …', 'Waar iedereen over schrijft · N bronnen'
  else if (mine) {
    const interest = INTERESTS.find((i) => i.id === INTEREST_OF[mine]).label
    const topic = topicById(mine).label
    kicker = interest === topic ? interest : `${interest} · ${topic}`
  } else if (cat === 'sport') kicker = 'Sport'
  else kicker = (desk === 'extern' ? null : deskLabel) || section || null
  const text = why && typeof why.text === 'string' && why.text.trim() ? why.text : null
  // 'Omdat je X volgt': zegt de kicker het al (sterke treffer), of rust het op een zwakke treffer
  // ('Omdat je Media volgt' bij migranten op zee). In beide gevallen voegt het niets toe.
  const keep = text && (!IN_LABEL.has(why.code) || why.detail === true) && why.code !== 'interest' && !/^Omdat je .+ volgt\.?$/.test(text)
  return { kicker, why: keep ? { ...why } : null, outside }
}
