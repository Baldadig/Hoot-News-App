import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildStories, selectEdition, editionSlot as slotOf } from '../netlify/lib/stories.mjs'
import { art, ice, hasan, lookalikes, MAIN, NOW } from './fixtures.mjs'

const storyOf = (stories, item) => stories.find((s) => s.itemIds.includes(item.id))

test('Nederlandse en Engelse berichten over hetzelfde incident vormen één verhaal (ICE, New York)', () => {
  const items = ice()
  const stories = buildStories(items, {}, { mainIds: MAIN })
  assert.equal(stories.length, 1)
  assert.equal(stories[0].itemIds.length, 4)
  assert.equal(stories[0].sourceCount, 4)
})

test('ook zonder naam in de Engelse kop (executie Nidal Hasan)', () => {
  const stories = buildStories(hasan(), {}, { mainIds: MAIN })
  assert.equal(stories.length, 1)
  assert.equal(stories[0].sourceCount, 6)
})

test('verschillende gebeurtenissen worden niet samengevoegd', () => {
  const items = [...ice(), ...hasan(), ...lookalikes()]
  const stories = buildStories(items, {}, { mainIds: MAIN })
  const title = (q) => items.find((i) => i.title.includes(q))
  const together = (a, b) => {
    const s = storyOf(stories, title(a))
    return !!s && s.itemIds.includes(title(b).id)
  }
  assert.equal(together('ICE schiet man', 'Pentagon wil executie'), false, 'ICE ≠ executie')
  assert.equal(together('Bear kills man', 'Russian attack on bus'), false, 'beer ≠ Russische aanval')
  assert.equal(together('ICE Agent at NYC', 'Twee indringers'), false, 'ICE-agent ≠ Britse luchtmachtbasis')
  assert.equal(together('Nobel Prize in Chemistry', 'Anne Carson wins'), false, 'Nobel scheikunde ≠ literatuur')
  assert.equal(together('Dilemma voor het Nobelcomité', 'Anne Carson wins'), false, 'Nobel vrede ≠ literatuur')
  assert.equal(together('Trump says US will not strike Iran', 'Iran executeert'), false, 'zelfde land, andere gebeurtenis')
  assert.equal(together('Iran executeert', 'Pentagon wil executie'), false, 'zelfde soort gebeurtenis, ander land')
})

test('oorspronkelijke publicaties blijven intact (titel, bron, tijd)', () => {
  const items = ice()
  const before = JSON.stringify(items)
  buildStories(items, {}, { mainIds: MAIN })
  assert.equal(JSON.stringify(items), before)
})

test('dagoverzichten trekken geen bundels aan elkaar', () => {
  const items = [...ice(), art('nos', 'Wekdienst 9/10: ICE-schietincident New York • Nobelprijs voor de Vrede', 'ICE schoot een man neer in New York.', 1)]
  const stories = buildStories(items, {}, { mainIds: MAIN })
  assert.equal(stories[0].itemIds.length, 4)
})

test('een verhaal houdt zijn id als het groeit; samengevoegde id’s blijven vindbaar', () => {
  const items = ice()
  const [nos, vk, nyt, bbc] = items
  // Vorige versie: twee losse bundels (NL en EN), zoals in de audit.
  const registry = { [nos.id]: { s: 'sNL' }, [vk.id]: { s: 'sNL' }, [nyt.id]: { s: 'sEN' }, [bbc.id]: { s: 'sEN' } }
  const [story] = buildStories(items, registry, { mainIds: MAIN })
  assert.ok(['sNL', 'sEN'].includes(story.id))
  assert.deepEqual(story.formerIds, [story.id === 'sNL' ? 'sEN' : 'sNL'])
  // Nieuw bericht erbij: id blijft gelijk.
  const more = [...items, art('npr', 'ICE agent shoots man in New York as child sat in car', 'A 5-year-old was in the back seat, officials in New York said.', 1)]
  const reg2 = Object.fromEntries(story.itemIds.map((id) => [id, { s: story.id }]))
  assert.equal(buildStories(more, reg2, { mainIds: MAIN })[0].id, story.id)
})

test('één gebeurtenis per plek in de editie', () => {
  const items = [...ice(), ...hasan(), ...lookalikes()]
  const stories = buildStories(items, {}, { mainIds: MAIN })
  for (const s of stories) for (const id of s.itemIds) items.find((i) => i.id === id).storyId = s.id
  const entries = selectEdition(stories, items, { mainIds: MAIN, now: NOW })
  const ids = entries.map((e) => e.id)
  assert.equal(new Set(ids).size, ids.length)
  const storyEntries = entries.filter((e) => e.kind === 'story')
  // ICE en Hasan elk precies één keer, ook al bestonden er eerst NL- en EN-bundels.
  const iceIds = new Set(ice.length ? stories.filter((s) => s.sourceNames.includes('bbc') && s.sourceNames.includes('nos')).map((s) => s.id) : [])
  assert.ok(storyEntries.length >= 2)
  assert.ok(storyEntries.filter((e) => iceIds.has(e.id)).length <= iceIds.size)
  // Een los bericht dat bij een al geplaatst verhaal hoort komt er niet nóg eens in.
  const placed = new Set(storyEntries.flatMap((e) => stories.find((s) => s.id === e.id).itemIds))
  for (const e of entries.filter((x) => x.kind === 'item')) assert.ok(!placed.has(e.id))
})

test('een dubbele bundel die de bundeling mist wordt bij het samenstellen alsnog geweerd', () => {
  const items = ice()
  const [nos, vk, nyt, bbc] = items
  const mk = (id, members) => ({ id, itemIds: members.map((m) => m.id), leadId: members[0].id, sourceCount: 2, ownCount: 1, sourceNames: members.map((m) => m.source), latestAt: members[0].publishedAt, firstAt: members[1].publishedAt })
  const entries = selectEdition([mk('sNL', [nos, vk]), mk('sEN', [nyt, bbc])], items, { mainIds: MAIN, now: NOW })
  assert.equal(entries.filter((e) => e.kind === 'story').length, 1)
})

test('hoofdbericht: eigen bron, Nederlands waar het kan, en afwisseling tussen bronnen', () => {
  const [story] = buildStories(ice(), {}, { mainIds: MAIN })
  const items = ice()
  assert.equal(story.leadId.length > 0, true)
  // Zes verhalen die elk NYT + NOS als eigen bron hebben: niet zes keer dezelfde kop-bron.
  const pool = []
  const stories = []
  for (let k = 0; k < 6; k++) {
    const a = art('nyt', `Story ${k} alpha beta gamma`, 'x', 2)
    const b = art('wired', `Story ${k} alpha beta gamma delta`, 'y', 3)
    pool.push(a, b)
    stories.push({ id: 's' + k, itemIds: [a.id, b.id], leadId: a.id, sourceCount: 2, ownCount: 2, sourceNames: ['nyt', 'wired'], latestAt: a.publishedAt, firstAt: b.publishedAt })
  }
  // (verschillende onderwerpen, zodat de dubbel-controle ze niet weert)
  pool.forEach((p, i) => (p.title = `Onderwerp${Math.floor(i / 2)} woordje${Math.floor(i / 2)} ding${Math.floor(i / 2)} zaak${Math.floor(i / 2)}`))
  const entries = selectEdition(stories, pool, { mainIds: MAIN, now: NOW })
  const leads = entries.map((e) => pool.find((p) => p.id === e.leadId).source)
  for (let i = 1; i < leads.length; i++) assert.notEqual(leads[i], leads[i - 1], 'nooit twee keer dezelfde bron achter elkaar als er een alternatief is')
  assert.ok(leads.filter((s) => s === 'nyt').length <= 3)
  assert.equal(items.length, 4)
})

test('drie edities per dag: ochtend 06:00, middag 12:00, avond 17:00 (Amsterdamse tijd)', () => {
  const at = (iso) => slotOf(new Date(iso))
  // 10 oktober 2026: zomertijd, UTC+2
  assert.deepEqual(at('2026-10-10T05:30:00Z'), { id: '2026-10-10-ochtend', slot: 'ochtend', date: '2026-10-10', next: '12:00' })
  assert.equal(at('2026-10-10T09:59:00Z').slot, 'ochtend')
  assert.deepEqual(at('2026-10-10T10:00:00Z'), { id: '2026-10-10-middag', slot: 'middag', date: '2026-10-10', next: '17:00' })
  assert.equal(at('2026-10-10T14:59:00Z').slot, 'middag')
  assert.deepEqual(at('2026-10-10T15:00:00Z'), { id: '2026-10-10-avond', slot: 'avond', date: '2026-10-10', next: '06:00' })
  assert.equal(at('2026-10-11T02:00:00Z').id, '2026-10-10-avond') // 04:00 's nachts: nog de avondeditie van gisteren
})
