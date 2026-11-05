// Twaalf synthetische lezers. Elke persona heeft:
//  - wat hij in het welkom koos (interests, topics) en hoe hij daarna zijn bronnen bijstelde
//    (enable: extra aan, mute: uit), plus voorkeursbronnen (favorites, de ster);
//  - een "echte" smaak (latent: onderwerpen en bronrubrieken) — de grondwaarheid waartegen we
//    relevantie meten. Die kan breder zijn dan wat hij opgaf (een verborgen interesse die alleen
//    uit zijn leesgedrag blijkt);
//  - leesgedrag: `reads` keer openen, waarvan een deel bewaren, en `noise` aandeel willekeurig;
//  - meer/minder hiervan (more/less): onderwerpen waar hij expliciet op stemde.
// Leesgeschiedenis is synthetisch (onderwerp + bron, het enige wat learn() gebruikt), met een vast
// zaad per persona: zo lekt de editie van vandaag niet in de geschiedenis en is alles herhaalbaar.
// Kopie van meting/algoritme/lib/personas.mjs (Hoot-design), met de imports naar deze checkout.
import * as A from '../../src/lib/affinity.js'
import * as T from '../../src/lib/topics.js'
import * as P from '../../src/lib/prefs.js'
import * as W from '../../src/lib/welcome.js'
import * as S from '../../src/lib/sourcesel.js'

export const PERSONAS = [
  {
    id: 'haags', name: 'Haagse watcher',
    interests: ['politiek'], topics: ['nederland', 'verkiezingen', 'europa'],
    enable: ['trouw', 'politico-eu'], mute: [], favorites: ['nrc'],
    latent: { topics: ['nederland', 'verkiezingen', 'europa', 'migratie', 'wonen'], cats: [] },
    reads: 60, noise: 0.2, more: ['verkiezingen'], less: ['voetbal'],
  },
  {
    id: 'ai', name: 'AI-professional',
    interests: ['tech'], topics: ['ai', 'privacy'],
    enable: ['mittr', 'techcrunch'], mute: ['volkskrant'], favorites: ['theverge'],
    latent: { topics: ['ai', 'privacy', 'tech', 'bedrijven'], cats: ['tech'] },
    reads: 80, noise: 0.15, more: ['ai'], less: ['games', 'voetbal'],
  },
  {
    id: 'gamer', name: 'Gamer-student',
    interests: ['tech', 'sport'], topics: ['games', 'voetbal'],
    enable: ['nu'], mute: ['nrc', 'volkskrant'], favorites: ['ign'],
    latent: { topics: ['games', 'voetbal', 'gadgets'], cats: ['games'] },
    reads: 40, noise: 0.3, more: ['games'], less: ['vs-politiek'],
  },
  {
    id: 'klimaat', name: 'Klimaatonderzoeker',
    interests: ['wetenschap'], topics: ['klimaat', 'natuur'],
    enable: ['nature', 'guardian'], mute: [], favorites: ['carbonbrief'],
    latent: { topics: ['klimaat', 'natuur', 'energie'], cats: ['wetenschap'] },
    reads: 50, noise: 0.2, more: ['klimaat'], less: ['f1'],
  },
  {
    id: 'belegger', name: 'Belegger',
    interests: ['economie'], topics: ['economie', 'bedrijven', 'geld', 'energie'],
    enable: ['bloomberg'], mute: ['volkskrant'], favorites: ['fd'],
    latent: { topics: ['economie', 'bedrijven', 'geld', 'energie', 'ai'], cats: ['economie'] }, // AI alleen uit gedrag
    reads: 70, noise: 0.15, more: ['economie'], less: ['muziek'],
  },
  {
    id: 'wereld', name: 'Geopoliticus',
    interests: ['wereld'], topics: ['oekraine', 'geopolitiek', 'middenoosten'],
    enable: ['aljazeera', 'dw'], mute: [], favorites: ['foreignpolicy'],
    latent: { topics: ['oekraine', 'geopolitiek', 'middenoosten', 'azie'], cats: [] },
    reads: 60, noise: 0.15, more: ['geopolitiek'], less: ['film'],
  },
  {
    id: 'muziek', name: 'Muziekliefhebber',
    interests: ['cultuur'], topics: ['muziek', 'film'],
    enable: ['pitchfork', 'guardian-music', 'stereogum'], mute: ['nrc'], favorites: ['3voor12'],
    latent: { topics: ['muziek', 'film', 'boeken'], cats: ['cultuur'] },
    reads: 50, noise: 0.25, more: ['muziek'], less: ['vs-politiek', 'economie'],
  },
  {
    id: 'koers', name: 'Wieler- en F1-fan',
    interests: ['sport'], topics: ['wielrennen', 'f1'],
    enable: ['sporza', 'ad'], mute: ['volkskrant'], favorites: ['wielerflits'],
    latent: { topics: ['wielrennen', 'f1', 'wintersport'], cats: ['sport'] },
    reads: 45, noise: 0.25, more: ['wielrennen'], less: ['muziek'],
  },
  {
    id: 'vlaming', name: 'Vlaamse lezer',
    interests: ['politiek', 'binnenland'], topics: [],
    enable: ['vrt', 'standaard', 'demorgen', 'hln'], mute: ['nos', 'nrc', 'volkskrant'], favorites: ['standaard'],
    latent: { topics: ['europa', 'misdaad', 'onderwijs', 'verkeer', 'zorg'], cats: ['vl'] },
    reads: 40, noise: 0.25, more: [], less: ['vs-politiek'],
  },
  {
    id: 'brabant', name: 'Brabantse regiolezer',
    interests: ['binnenland'], topics: ['misdaad', 'verkeer', 'wonen'],
    enable: ['bd', 'ed', 'ad'], mute: ['nrc'], favorites: ['bd'],
    latent: { topics: ['misdaad', 'verkeer', 'wonen', 'voetbal'], cats: ['regio'] },
    reads: 35, noise: 0.3, more: ['misdaad'], less: [],
  },
  {
    id: 'nieuw', name: 'Nieuwe lezer (geen keuzes)',
    interests: [], topics: [], enable: [], mute: [], favorites: [],
    latent: null, // geen grondwaarheid: koude start
    reads: 0, noise: 0, more: [], less: [],
  },
  {
    id: 'vs', name: 'VS-politiek-junkie',
    interests: ['politiek'], topics: ['vs-politiek'],
    enable: ['npr'], mute: [], favorites: ['atlantic'],
    latent: { topics: ['vs-politiek', 'verkiezingen', 'ai'], cats: [] }, // AI alleen uit gedrag
    reads: 70, noise: 0.15, more: ['vs-politiek'], less: ['wielrennen'],
  },
]

// Deterministische PRNG (mulberry32) met een zaad uit de persona-id.
export function rng(seedText) {
  let s = 0
  for (const c of seedText) s = (Math.imul(s, 31) + c.charCodeAt(0)) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]

// Instellingen zoals het welkom ze zou zetten, daarna bijgesteld.
export function prefsFor(persona, sources) {
  const pickable = sources.filter((s) => s.followed !== false && s.kind !== 'sociaal')
  const suggested = T.suggestSources(pickable, persona.interests, persona.topics)
  const chosen = [...new Set([...suggested, ...persona.enable])].filter((id) => !persona.mute.includes(id) && pickable.some((s) => s.id === id))
  const p = W.applyWelcome({ ...P.DEFAULT_PREFS, onboarded: false }, { interests: persona.interests, topics: persona.topics, sources: chosen, all: pickable })
  return { ...p, favorites: persona.favorites.filter((id) => chosen.includes(id)) }
}

export function followedFor(prefs, sources) {
  const off = S.mutedSet(prefs, sources)
  return new Set(sources.filter((s) => s.kind !== 'sociaal' && !off.has(s.id)).map((s) => s.id))
}

// Leesgeschiedenis → affinity (via de echte learn()), stemmen → taste (via de echte vote()).
export function historyFor(persona, followed, sources) {
  const r = rng(persona.id)
  const own = [...followed]
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  const latentSources = persona.latent ? own.filter((id) => persona.latent.cats.includes(catOf.get(id)) || persona.favorites.includes(id)) : []
  const allTopics = T.TOPICS.map((t) => t.id)
  let aff = A.emptyAffinity()
  for (let n = 0; n < persona.reads; n++) {
    const onTaste = persona.latent && r() >= persona.noise
    const topic = onTaste ? pick(r, persona.latent.topics) : pick(r, allTopics)
    const source = onTaste && latentSources.length && r() < 0.6 ? pick(r, latentSources) : pick(r, own)
    const weight = r() < 0.1 ? A.SAVE : A.READ
    aff = A.learn(aff, { kind: 'article', source, topics: [topic] }, weight)
  }
  let taste = A.emptyTaste()
  for (const t of persona.more) taste = A.vote(taste, [{ kind: 'article', topics: [t] }], 1)
  for (const t of persona.less) taste = A.vote(taste, [{ kind: 'article', topics: [t] }], -1)
  return { affinity: persona.reads ? aff : null, taste: { ...taste, sources: {} } }
}

// Alles wat composePersonal van een persona nodig heeft. `variant`:
//  - 'echt'        : eigen bronnen + alle persoonlijke signalen (de basislijn)
//  - 'kaal'        : eigen bronnen, géén interesses/geschiedenis/stemmen/voorkeuren
//                    (wat bronkeuze alleen al doet)
//  - 'zelfdebron'  : één brede, vaste bronnenset voor iedereen (SHARED_SOURCES), maar wél alle
//                    signalen (wat het algoritme alleen doet, los van bronkeuze)
// Breed genoeg dat er in elke interesse iets te kiezen valt.
export const SHARED_SOURCES = ['nos', 'nu', 'nrc', 'volkskrant', 'nyt', 'guardian', 'bbc', 'theverge', 'tweakers', 'fd', 'quanta', 'nos-sport', 'nos-cultuur', 'ign']
export function setupFor(persona, sources, variant = 'echt') {
  const prefs = prefsFor(persona, sources)
  const followed = variant === 'zelfdebron' ? new Set(SHARED_SOURCES.filter((id) => sources.some((s) => s.id === id))) : followedFor(prefs, sources)
  const hist = historyFor(persona, followed, sources)
  if (variant === 'kaal') return { followed, interests: [], topics: [], favorites: [], affinity: null, taste: P.DEFAULT_PREFS.taste }
  return {
    followed,
    interests: persona.interests,
    topics: persona.topics,
    favorites: variant === 'zelfdebron' ? [] : prefs.favorites,
    affinity: hist.affinity,
    taste: hist.taste,
  }
}
