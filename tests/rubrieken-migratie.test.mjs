// Rubrieken, fase 2 (1.3): Games van Tech naar Cultuur, nieuwe namen. De id's blijven gelijk en niemand verliest
// een keuze: bewaarde keuzes van de oude indeling gaan één keer om (currentChoice), daarna draagt alles de versie
// mee (`rubrieken`). De app doet hetzelfde (ios/HootTests/RubriekVersieTests.swift, dezelfde gevallen).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INTERESTS, TOPICS, topicById, resolveTopics, currentChoice, RUBRIEKEN } from '../src/lib/topics.js'
import { normalizePrefs } from '../src/lib/prefs.js'
import { applyWelcome } from '../src/lib/welcome.js'
import { withRemoteChoice, SYNCED_PREFS } from '../src/lib/sync.js'
import { serverRequest } from '../src/lib/editionSync.js'
import { profileOf, W_INHERITED } from '../shared/editor.mjs'
import { choiceOf, anonKey } from '../netlify/functions/edition.mjs'
import { VAK_FIELDS } from '../shared/vak.mjs'

const CASES = JSON.parse(readFileSync(new URL('./fixtures/rubrieken-migratie.json', import.meta.url), 'utf8'))

test('de nieuwe indeling: Games onder Cultuur, Tech zonder Games, dezelfde id\'s', () => {
  const by = Object.fromEntries(INTERESTS.map((i) => [i.id, i]))
  assert.deepEqual(by.tech.topics, ['ai', 'tech', 'gadgets', 'privacy', 'ev'])
  assert.deepEqual(by.tech.cats, ['tech'])
  assert.deepEqual(by.cultuur.topics, ['muziek', 'film', 'boeken', 'kunst', 'media', 'games'])
  assert.deepEqual(by.cultuur.cats, ['cultuur', 'games'])
  // Elk onderwerp hoort bij precies één interesse, en er verdween geen id.
  const all = INTERESTS.flatMap((i) => i.topics)
  assert.equal(new Set(all).size, all.length)
  assert.deepEqual([...all].sort(), TOPICS.map((t) => t.id).sort())
  assert.equal(TOPICS.length, 43)
})

test('de namen: Techbedrijven, Hacks & privacy; in de Selectie Games, Hacks & privacy en Gadgets', () => {
  assert.equal(topicById('tech').label, 'Techbedrijven')
  assert.equal(topicById('privacy').label, 'Hacks & privacy')
  assert.equal(topicById('games').label, 'Games')
  assert.equal(topicById('gadgets').label, 'Gadgets')
  const vak = Object.fromEntries(VAK_FIELDS.map((f) => [f.id, f.label]))
  assert.equal(vak.gaming, 'Games')
  assert.equal(vak.security, 'Hacks & privacy')
  assert.equal(vak.gadgets, 'Gadgets')
  // Bewust breder dan de onderwerpen van de interesses: die blijven.
  assert.equal(vak.zorg, 'Zorg & gezondheid')
  assert.equal(vak.klimaat, 'Klimaat & energie')
  assert.equal(vak.vastgoed, 'Wonen & vastgoed')
  assert.equal(vak.geld, 'Geld & beleggen')
  const old = /Big Tech|Privacy & veiligheid|Security & privacy|Tech & gadgets|^Gaming$/
  for (const l of [...TOPICS.map((t) => t.label), ...VAK_FIELDS.map((f) => f.label)]) assert.doesNotMatch(l, old)
})

// De gedeelde gevallen (ook voor de app): oude keuze → nieuwe keuze.
test('bewaarde keuzes van de oude indeling: dezelfde keuzes in de nieuwe', () => {
  assert.ok(CASES.length >= 12)
  for (const c of CASES) assert.deepEqual(currentChoice(c.from.interests, c.from.topics), c.to, c.name)
})

// Wat de Redacteur ervan maakt (profileOf): per onderwerp hetzelfde gewicht als vóór de verhuizing, op de twee
// besluiten na (Games was bij Tech-alles geërfd en valt weg; bij Cultuur-alles erft Games nu mee).
const OLD = INTERESTS.map((i) => (i.id === 'tech' ? { ...i, topics: [...i.topics, 'games'] } : i.id === 'cultuur' ? { ...i, topics: i.topics.filter((t) => t !== 'games') } : i))
function explOf(defs, interests, topics) {
  const out = {}
  for (const f of defs) {
    if (!interests.includes(f.id)) continue
    const picked = f.topics.filter((t) => topics.includes(t))
    const sharp = picked.length > 0 && picked.length < f.topics.length
    for (const t of f.topics) {
      const v = sharp ? (picked.includes(t) ? 1 : 0) : W_INHERITED
      if (v) out[t] = v
    }
  }
  return out
}
const subsets = (xs) => xs.reduce((acc, x) => [...acc, ...acc.map((s) => [...s, x])], [[]])

test('elke combinatie van Tech en Cultuur: geen enkel gekozen onderwerp gaat verloren', () => {
  const techOld = OLD.find((i) => i.id === 'tech').topics
  const cultOld = OLD.find((i) => i.id === 'cultuur').topics
  let n = 0
  for (const interests of [['tech'], ['cultuur'], ['tech', 'cultuur'], ['politiek', 'tech', 'cultuur', 'sport']]) {
    for (const ts of subsets(techOld)) {
      for (const cs of subsets(cultOld)) {
        // Zoals het oude welkom bewaarde: per interesse wat je aantikte, of alles.
        const pickedT = interests.includes('tech') ? ts : []
        const pickedC = interests.includes('cultuur') ? cs : []
        const topics = [...new Set([...(pickedT.length ? pickedT : interests.includes('tech') ? techOld : []), ...(pickedC.length ? pickedC : interests.includes('cultuur') ? cultOld : [])])]
        const before = explOf(OLD, interests, topics)
        const next = currentChoice(interests, topics)
        const after = explOf(INTERESTS, next.interests, next.topics)
        const techAll = interests.includes('tech') && (!pickedT.length || pickedT.length === techOld.length)
        const cultAll = interests.includes('cultuur') && (!pickedC.length || pickedC.length === cultOld.length)
        const exp = { ...before }
        if (techAll) delete exp.games // besluit: Tech-alles bedoelde AI en technologie
        if (cultAll) exp.games = W_INHERITED // Cultuur-alles is nu met Games
        if (cultAll && before.games === 1) exp.games = W_INHERITED // Games aangetikt én Cultuur-alles: geërfd
        // Alles van Tech behalve Games aangetikt: dat is nu precies Tech, dus Tech zonder keuze (geërfd).
        const techFive = interests.includes('tech') && pickedT.length === 5 && !pickedT.includes('games')
        if (techFive) for (const t of techOld) if (t !== 'games') exp[t] = W_INHERITED
        assert.deepEqual(after, exp, JSON.stringify({ interests, topics }))
        // Wat je aantikte blijft gevolgd, en aangetikt waar dat nog iets betekent.
        for (const [t, v] of Object.entries(before)) {
          if (v !== 1) continue
          assert.ok(after[t] > 0, `${t} in ${JSON.stringify({ interests, topics })}`)
          if (!(t === 'games' && cultAll) && !techFive) assert.equal(after[t], 1, `${t} in ${JSON.stringify({ interests, topics })}`)
        }
        n++
      }
    }
  }
  assert.equal(n, 4 * 64 * 32)
})

test('Tech zonder keuze blijft Tech, ook in de Stroom-tabs; Games alleen via Cultuur', () => {
  const p = normalizePrefs({ interests: ['tech'], topics: ['ai', 'tech', 'gadgets', 'privacy', 'ev', 'games'] })
  assert.deepEqual(p.interests, ['tech'])
  assert.deepEqual(resolveTopics(p.interests, []), ['ai', 'tech', 'gadgets', 'privacy', 'ev'])
  const prof = profileOf({ interests: p.interests, topics: p.topics })
  assert.equal(prof.topicP.privacy, W_INHERITED)
  assert.equal(prof.topicP.tech, W_INHERITED)
  assert.equal(prof.topicP.games, undefined)
})

test('een bewaard profiel met Games, Hacks & privacy en Techbedrijven houdt precies die keuzes', () => {
  const p = normalizePrefs({ interests: ['tech'], topics: ['tech', 'privacy', 'games'], pinned: ['games', 'privacy'], taste: { topics: { games: 4 }, sources: {} } })
  assert.deepEqual(p.interests, ['tech', 'cultuur'])
  assert.deepEqual(p.topics, ['tech', 'privacy', 'games'])
  assert.deepEqual(p.pinned, ['games', 'privacy'])
  assert.deepEqual(p.taste.topics, { games: 4 })
  const prof = profileOf({ interests: p.interests, topics: p.topics })
  for (const t of ['tech', 'privacy']) assert.equal(prof.topicP[t], 1)
  assert.ok(prof.topicP.games > 0.99)
  for (const t of ['ai', 'gadgets', 'ev', 'muziek', 'film', 'boeken', 'kunst', 'media']) assert.equal(prof.topicP[t], undefined, t)
  assert.equal(prof.origin.games, 'gekozen')
})

test('de versie: eenmaal omgezet blijft het zo, en een keuze van nu wordt nooit als oude gelezen', () => {
  const old = { interests: ['cultuur'], topics: ['muziek', 'film', 'boeken', 'kunst', 'media'] }
  const once = normalizePrefs(old)
  assert.equal(once.rubrieken, RUBRIEKEN)
  assert.deepEqual(once.topics, ['muziek', 'film', 'boeken', 'kunst', 'media', 'games'])
  assert.deepEqual(normalizePrefs(once), once)
  // Nu gekozen: Cultuur zonder Games (vijf van de zes aangetikt). Dat blijft zonder Games.
  const now = applyWelcome({ onboarded: true }, { interests: ['cultuur'], topics: ['muziek', 'film', 'boeken', 'kunst', 'media'], sources: [], all: [] })
  assert.equal(now.rubrieken, RUBRIEKEN)
  assert.deepEqual(normalizePrefs(now).topics, ['muziek', 'film', 'boeken', 'kunst', 'media'])
  // Geen interesses (nog niet door het welkom): niets om te zetten.
  assert.deepEqual(normalizePrefs({}).interests, [])
})

test('je account: de versie gaat mee met interesses en onderwerpen', () => {
  assert.ok(SYNCED_PREFS.includes('rubrieken'))
  const local = { interests: ['cultuur'], topics: ['muziek'], rubrieken: 2, layout: 'krant' }
  // Van een oudere app (zonder versie): de versie van dit toestel hoort er niet meer bij.
  const fromOld = withRemoteChoice({ ...local, interests: ['tech'], topics: ['ai', 'games'] }, { interests: ['tech'], topics: ['ai', 'games'] })
  assert.equal('rubrieken' in fromOld, false)
  assert.deepEqual(normalizePrefs(fromOld).interests, ['tech', 'cultuur'])
  // Van het web of app 1.3: met versie.
  assert.equal(withRemoteChoice(local, { interests: ['cultuur'], topics: ['muziek'], rubrieken: 2 }).rubrieken, 2)
  // Zonder interesses en onderwerpen in de rij: niets aan de versie veranderen.
  assert.equal(withRemoteChoice(local, { layout: 'tijdlijn' }).rubrieken, 2)
})

test('de server: zonder versie (app 1.2.1) eerst omzetten; de afdruk blijft die van de vraag', () => {
  const body = { v: 2, interests: ['tech'], topics: ['ai', 'games'] }
  const c = choiceOf(body)
  assert.deepEqual(c.asked, { interests: ['tech'], topics: ['ai', 'games'] })
  assert.deepEqual([c.interests, c.topics], [['tech', 'cultuur'], ['ai', 'games']])
  const marked = choiceOf({ ...body, interests: ['tech', 'cultuur'], rubrieken: RUBRIEKEN })
  assert.deepEqual([marked.interests, marked.topics], [['tech', 'cultuur'], ['ai', 'games']])
  // Het web stuurt de versie mee.
  assert.equal(serverRequest({ interests: ['cultuur'], topics: [] }).rubrieken, RUBRIEKEN)
  // Zelfde vraag in oude en nieuwe indeling, andere betekenis: een andere afdruk voor de cache.
  const p = (b) => ({ followed: ['nos'], favorites: [], readIds: [], taste: null, reading: null, ...choiceOf(b) })
  const oldCult = { interests: ['cultuur'], topics: ['muziek', 'film', 'boeken', 'kunst', 'media'] }
  assert.notEqual(anonKey('e1', p(oldCult), []), anonKey('e1', p({ ...oldCult, rubrieken: RUBRIEKEN }), []))
  // Niets om te zetten: dezelfde afdruk als vóór de versie bestond.
  const plain = { interests: ['politiek'], topics: [] }
  const before = { followed: ['nos'], favorites: [], readIds: [], taste: null, reading: null, interests: ['politiek'], topics: [] }
  assert.equal(anonKey('e1', p(plain), []), anonKey('e1', before, []))
})
