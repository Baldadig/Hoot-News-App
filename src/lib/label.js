// Het label boven een artikel in de Editie — één kleine, pure functie. Zelfde regels en DEZELFDE
// testgevallen als de app (ios/Hoot, Label.swift): tests/fixtures/label-cases.json, gelezen door
// tests/label.test.mjs en door de iOS-tests.
//   kicker  = alleen bij een sterke treffer 'interesse · onderwerp' ('Politiek · Den Haag'); anders
//             de rubriek van de plek, of die van het bericht. Een sportbron is Sport. Sport en cultuur gaan voor
//             de geografie (lightTopic), en een subonderwerp alleen als de indeling zeker is (strongTopic).
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
  // Sport en Cultuur zet De Redacteur voor de lezer (persona's 14 november, punt 6).
  sport: ['sport'],
  cultuur: ['cultuur'],
}

// Een gevolgde geografische tag mag een concreet vastgestelde andere plek niet vervangen.
const GEOGRAPHIC_TOPICS = new Set(['nederland', 'europa', 'vs-politiek', 'oekraine', 'middenoosten', 'azie', 'afrika', 'latam'])
const PLACE_TOPICS = {
  binnenland: ['nederland'], regio: ['nederland'], vs: ['vs-politiek'],
  middenoosten: ['middenoosten'], oekraine: ['oekraine'],
}

// Draagt dit onderwerp het verhaal? Het past bij de rubriek van de plek, of het staat in de kop.
// Een subonderwerp alleen als de indeling zeker is (persona's 14 november, punt 6: "Beurstips van de week: … SpaceX" onder
// Wetenschap · Ruimte, Miss Universe onder Wetenschap · Ruimte). Past het onderwerp niet bij de rubriek van de plek, dan
// telt de kop alleen als al zijn onderwerpen (`mainTopics`) bij één interesse horen: Media in de kop van een binnenlandse
// plek of AI op een Amerikaanse plek blijft, "tech" en "ruimte" naast elkaar in een kop over beurstips niet. Dan blijft de
// rubriek van de plek staan.
export function strongTopic(t, { desk = null, mainTopics = [] } = {}) {
  if (GEOGRAPHIC_TOPICS.has(t) && desk === 'buitenland' && !mainTopics.includes(t)) return false
  if (GEOGRAPHIC_TOPICS.has(t) && PLACE_TOPICS[desk] && !PLACE_TOPICS[desk].includes(t)) return false
  if ((DESK_INTERESTS[desk] || []).includes(INTEREST_OF[t])) return true
  return mainTopics.includes(t) && mainTopics.every((x) => INTEREST_OF[x] === INTEREST_OF[t])
}

// Sport en cultuur gaan voor de geografie (persona's 14 november, punt 6: Daleman op de 500 meter onder Buitenland, in
// Peking onder Wereld · China & Azië; de NS Publieksprijs voor een roman onder Binnenland · Verkeer & OV). Een plek onder
// Sport of Cultuur (De Redacteur zet die rubriek voor de lezer), een sportbron, of een sport- of cultuuronderwerp in de kop
// of als vak van de bron (`mainTopics`), maakt de kicker Sport of Cultuur, met het onderwerp erbij als je dat volgt. Niet op
// een plek onder Tech, Economie of Wetenschap: die gaan over een vak, niet over een plek. Media en Games horen bij Cultuur
// maar tellen hier niet ("omroep" in een kop).
const LIGHT_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch', 'muziek', 'film', 'boeken', 'kunst', 'showbizz'])
const VAK_DESKS = new Set(['tech', 'economie', 'wetenschap'])
// Geografie: een plaats (GEOGRAPHIC_TOPICS) of een onderwerp van Binnenland of Wereld.
const geographic = (t) => GEOGRAPHIC_TOPICS.has(t) || ['binnenland', 'wereld'].includes(INTEREST_OF[t])
// De interesse (sport of cultuur) en het onderwerp dat de kicker draagt, of null.
export function lightOf({ mainTopics = [], topics = [], cat = null, desk = null } = {}) {
  if (VAK_DESKS.has(desk)) return null
  const t = mainTopics.find((x) => LIGHT_TOPICS.has(x))
  if (t) return { interest: INTEREST_OF[t], topic: t }
  if (desk === 'sport' || cat === 'sport') return { interest: 'sport', topic: topics.find((x) => INTEREST_OF[x] === 'sport') || null }
  if (desk === 'cultuur') return { interest: 'cultuur', topic: topics.find((x) => LIGHT_TOPICS.has(x) && INTEREST_OF[x] === 'cultuur') || null }
  return null
}

// `topics`: de onderwerpen van het verhaal. `mainTopics`: de onderwerpen uit de kop en het vak van
// de bron (deelverzameling van topics). `follows`: de onderwerpen die de lezer volgt. `cat`: de
// rubriek van de bron. `desk`/`deskLabel`: de plek in de Editie. `section`: de rubriek van het
// bericht zelf. `why`: { code, text } van De Redacteur. `followed`: de bron staat bij je bronnen.
export function labelFor({ topics = [], mainTopics = [], follows = [], cat = null, desk = null, deskLabel = null, section = null, why = null, followed = null } = {}) {
  const outside = followed === false || (followed == null && (desk === 'extern' || why?.code === 'extern'))
  const mine = topics.find((t) => follows.includes(t) && topicById(t) && INTEREST_OF[t] && strongTopic(t, { desk, mainTopics }))
  const light = lightOf({ mainTopics, topics, cat, desk })
  let kicker = null
  if (desk === 'bubbel' || desk === 'breed') kicker = deskLabel // 'Buiten je bubbel · via …', 'Waar iedereen over schrijft · N bronnen'
  else if (light && (!mine || geographic(mine) || INTEREST_OF[mine] === light.interest)) {
    const interest = INTERESTS.find((i) => i.id === light.interest).label
    const own = mine && INTEREST_OF[mine] === light.interest ? mine : light.topic && follows.includes(light.topic) ? light.topic : null
    const topic = own && topicById(own)?.label
    kicker = topic && topic !== interest ? `${interest} · ${topic}` : interest
  } else if (mine) {
    const interest = INTERESTS.find((i) => i.id === INTEREST_OF[mine]).label
    const topic = topicById(mine).label
    kicker = interest === topic ? interest : `${interest} · ${topic}`
  } else if (cat === 'sport') kicker = 'Sport'
  else kicker = (desk === 'extern' ? null : deskLabel) || section || null
  const text = why && typeof why.text === 'string' && why.text.trim() ? why.text : null
  // 'Omdat je X volgt': zegt de kicker het al (sterke treffer), of rust het op een zwakke treffer
  // ('Omdat je Media volgt' bij migranten op zee). In beide gevallen voegt het niets toe.
  const keep = text && (!IN_LABEL.has(why.code) || why.detail === true) && why.code !== 'interest' && !/^Omdat je .+ volgt\.?$/.test(text)
  // "Groot nieuws" staat er één keer: de kicker van een brede plek ("Waar iedereen over schrijft") zegt het
  // al, en zegt de kicker hetzelfde als de waarom-regel, dan valt de waarom-regel weg.
  const plain = (t) => String(t || '').replace(/\s*·\s*\d+\s+bron(?:nen)?$/, '').trim().toLowerCase()
  const twice = keep && (((desk === 'breed' || desk === 'bubbel') && why.code === 'groot') || (kicker && plain(kicker) === plain(text)))
  return { kicker, why: keep && !twice ? { ...why } : null, outside }
}
