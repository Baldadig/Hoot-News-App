// Persona's 14 november, punt 1: gekozen interesses krijgen echt ruimte. Wie alleen Cultuur en Sport koos, kreeg in elke
// Editie precies twee van zulke plekken (EXTRA_MAX) en acht plekken nieuws uit de rubriekvulling. Het plafond groeit nu
// mee met het aandeel sport en cultuur in de keuze (extraMaxOf), zonder dat groot nieuws of de voorpagina wegvalt.
// Generiek: de lezer hieronder volgt muziekbronnen uit de bewaarde feed; geen titels in de regel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal, extraMaxOf, EXTRA_MAX } from '../src/lib/personal.js'
import { EDITION_SIZE } from '../netlify/lib/stories.mjs'

const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const both = new Set(['sport', 'cultuur'])

test('extraMaxOf: het plafond groeit mee met het aandeel sport en cultuur in de keuze', () => {
  assert.equal(EDITION_SIZE, 10)
  assert.equal(extraMaxOf(['cultuur', 'sport'], both), 5, 'alleen Cultuur en Sport: de helft')
  assert.equal(extraMaxOf(['cultuur'], both), 5, 'alleen Cultuur: de helft')
  assert.equal(extraMaxOf(['cultuur', 'sport', 'binnenland'], both), 3)
  assert.equal(extraMaxOf(['politiek', 'binnenland', 'sport'], both), EXTRA_MAX, 'meer nieuws gekozen: zoals altijd')
  assert.equal(extraMaxOf(['politiek', 'binnenland', 'wereld', 'economie', 'tech', 'wetenschap', 'cultuur', 'sport'], both), EXTRA_MAX)
  assert.equal(extraMaxOf([], both), EXTRA_MAX, 'zonder interesses: zoals altijd')
  assert.equal(extraMaxOf(['cultuur', 'sport'], new Set()), EXTRA_MAX, 'een gebied dat niet in het extra blok meedoet, telt niet')
  assert.equal(extraMaxOf(['cultuur', 'sport'], new Set(['cultuur'])), Math.max(EXTRA_MAX, Math.floor(10 / 4)))
})

const reader = { followed: new Set(['nos', '3voor12', 'rollingstone', 'stereogum', 'pitchfork', 'quietus']), interests: ['cultuur', 'sport'], topics: ['muziek', 'film', 'boeken', 'kunst', 'media', 'games', 'voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'] }
const catOf = (feed) => new Map(feed.sources.map((s) => [s.id, s.cat]))
// Een plek uit het extra blok: geen rubriek erboven en een kop van een cultuur- of sportbron, of met een sport- of cultuuronderwerp.
const LIGHT = new Set(['muziek', 'film', 'boeken', 'kunst', 'media', 'games', 'voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
const lightPlace = (feed, byId) => (e) => {
  const it = byId.get(e.leadId || e.id)
  // Sinds punt 6 zet De Redacteur Sport of Cultuur als rubriek boven zo'n plek (`rubriek`); `desk` blijft leeg.
  return e.desk == null && !!it && (['cultuur', 'sport', 'games'].includes(catOf(feed).get(it.source)) || (it.topics || []).some((t) => LIGHT.has(t)))
}

for (const f of ['live-feed-2026-11-11-ochtend', 'live-feed-2026-11-07']) {
  test(`alleen Cultuur en Sport (${f}): meer dan twee plekken uit de keuze, groot nieuws blijft`, () => {
    const feed = load(f)
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, ...reader, now, builtAt: feed.edition.builtAt })
    const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
    assert.equal(regular.length, EDITION_SIZE)
    const light = regular.filter(lightPlace(feed, byId))
    assert.ok(light.length > EXTRA_MAX, `${light.length} plekken uit Cultuur en Sport`)
    assert.ok(light.length <= extraMaxOf(reader.interests, both), 'niet meer dan het plafond')
    // Groot nieuws gaat voor: dezelfde lezer met ook vier nieuwsinteresses zonder Wereld (plafond EXTRA_MAX) heeft geen groot nieuws dat hier ontbreekt.
    const wide = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, ...reader, interests: ['cultuur', 'sport', 'binnenland', 'politiek', 'economie', 'tech'], now, builtAt: feed.edition.builtAt })
    const big = (ed2) => ed2.entries.filter((e) => /^Groot nieuws/.test(e.why?.text || '')).map((e) => e.id)
    const mine = new Set(ed.entries.map((e) => e.id))
    for (const id of big(wide)) assert.ok(mine.has(id), `groot nieuws ${id} blijft staan`)
    assert.ok(big(ed).length >= 2)
  })
}

test('wie meer nieuws dan sport en cultuur koos, houdt hooguit EXTRA_MAX van zulke plekken', () => {
  const feed = load('live-feed-2026-11-11-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, ...reader, interests: ['cultuur', 'sport', 'binnenland', 'politiek', 'wereld'], now, builtAt: feed.edition.builtAt })
  const extra = ed.entries.filter((e) => e.desk == null && ['cultuur', 'sport'].includes(catOf(feed).get(byId.get(e.leadId || e.id)?.source)))
  assert.ok(extra.length <= EXTRA_MAX, `${extra.length}`)
})
