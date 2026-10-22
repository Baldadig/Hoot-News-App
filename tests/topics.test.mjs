import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOPICS, INTERESTS, orderedTopics, resolveTopics, suggestSources, inInterest } from '../src/lib/topics.js'
import { keywordTopics } from '../netlify/lib/topics.mjs'

test('elk smal onderwerp hoort bij precies één interesse, en de server kent ze allemaal', () => {
  const all = INTERESTS.flatMap((i) => i.topics)
  assert.equal(new Set(all).size, all.length)
  assert.deepEqual(new Set(all), new Set(TOPICS.map((t) => t.id)))
  assert.equal(INTERESTS.length, 8)
})

test('niets aangetikt binnen een interesse = alles daarbinnen', () => {
  assert.deepEqual(resolveTopics(['tech', 'wereld'], ['oekraine']), ['oekraine', 'ai', 'tech', 'gadgets', 'privacy', 'ev', 'games'])
  assert.deepEqual(resolveTopics([], ['ai']), [])
})

test('bronnen vooraf: alleen gekozen bronnen, bij een passende interesse of onderwerp', () => {
  const src = [{ id: 'nos', pick: true }, { id: 'ad' }, { id: 'verge', pick: true, for: ['tech'] }, { id: 'ign', pick: true, forTopic: 'games' }]
  assert.deepEqual(suggestSources(src, ['politiek'], ['nederland']), ['nos'])
  assert.deepEqual(suggestSources(src, ['tech'], ['ai']), ['nos', 'verge'])
  assert.deepEqual(suggestSources(src, ['tech'], ['games']), ['nos', 'verge', 'ign'])
})

test('een bericht hoort bij een interesse via zijn onderwerp of zijn bron', () => {
  assert.equal(inInterest({ topics: ['voetbal'] }, 'sport'), true)
  assert.equal(inInterest({ topics: [] }, 'sport', { cat: 'sport' }), true)
  assert.equal(inInterest({ topics: ['ai'] }, 'sport', { cat: 'nl' }), false)
})

test('volg je onderwerpen, dan staan alleen die in de rij', () => {
  assert.deepEqual(orderedTopics(['ai'], ['tech', 'ai']).map((t) => t.id), ['ai', 'tech'])
})

test('trefwoorden: duidelijke gevallen goed, dubbelzinnige woorden niet', () => {
  assert.deepEqual(keywordTopics('Verstappen wint de Grand Prix'), ['f1'])
  assert.deepEqual(keywordTopics('Een soort oplossing voor het probleem'), [])
  assert.ok(keywordTopics('Kabinet wil meer woningbouw').includes('wonen'))
  assert.ok(!keywordTopics('Samsung Galaxy review').includes('ruimte'))
})

test('startset "Liever meteen lezen": bestaande, gratis bronnen, Nederlands voorop', async () => {
  const { SOURCES } = await import('../netlify/lib/sources.mjs')
  const { STARTER, starterGroups } = await import('../src/lib/topics.js')
  const ids = STARTER.flatMap((g) => g.ids)
  for (const id of ids) {
    const s = SOURCES.find((x) => x.id === id)
    assert.ok(s, `${id} bestaat`)
    assert.ok(!s.paid, `${id} is gratis`)
  }
  assert.equal(SOURCES.find((x) => x.id === STARTER[0].ids[0]).lang, 'nl')
  const groups = starterGroups(SOURCES)
  assert.equal(groups.flatMap((g) => g.sources).length, ids.length)
  assert.equal(starterGroups([{ id: 'nos', paid: true }]).length, 0) // een betaalde bron komt er nooit in
})
