import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle, validRows, memberOf, PER_DAY, ALL_PER_DAY, FULL_TODAY } from '../netlify/functions/brief.mjs'
import { kvGet, kvSet } from '../netlify/lib/kv.mjs'

const rows = [{ entry: 0, sourceName: 'NOS', title: 'Kop', summary: 'Intro.' }]
const req = (body, { token = 'tok', method = 'POST' } = {}) => new Request('http://x/api/brief', { method, headers: { 'content-type': 'application/json', authorization: token ? `Bearer ${token}` : '' }, body: method === 'POST' ? JSON.stringify(body) : undefined })
// Nep-Claude: overzicht + controle (alle zinnen gedekt).
const claude = () => {
  const s = { calls: 0 }
  s.messages = { create: async () => (s.calls++ % 2 === 0 ? { stop_reason: 'end_turn', content: [{ type: 'text', text: '## Kop\nIntro.' }] } : { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ zinnen: [{ zin: 1, bronnen: [1] }] }) }] }) }
  return s
}

test('alleen leden; geen of fout token geeft 401', async () => {
  assert.equal((await handle(req({ rows }, { token: '' }), { anthropic: claude(), member: async () => null })).status, 401)
  assert.equal((await handle(req({ rows }), { anthropic: claude(), member: async () => null })).status, 401)
  assert.equal((await handle(req(null, { method: 'GET' }), { anthropic: claude(), member: async () => 'u' })).status, 405)
})

test('lid: een samenvatting met verwijzingen; dezelfde editie daarna uit de cache', async () => {
  const c = claude()
  const r = await handle(req({ rows: [{ ...rows[0], title: 'Unieke kop 1' }] }), { anthropic: c, member: async () => 'u1' })
  assert.equal(r.status, 200)
  const { brief } = await r.json()
  assert.deepEqual(brief.sections[0].refs, [0])
  const again = await handle(req({ rows: [{ ...rows[0], title: 'Unieke kop 1' }] }), { anthropic: c, member: async () => 'u2' })
  assert.equal(again.status, 200)
  assert.equal(c.calls, 2) // tweede keer geen nieuwe aanroep
})

test('invoer wordt streng gecontroleerd', () => {
  assert.equal(validRows([]), null)
  assert.equal(validRows([{ entry: 0, sourceName: 'NOS', title: '' }]), null)
  assert.equal(validRows([{ entry: 99, sourceName: 'NOS', title: 'x' }]), null)
  assert.equal(validRows(Array(13).fill(rows[0])), null)
  assert.equal(validRows([{ ...rows[0], title: 'x'.repeat(301) }]), null)
  assert.deepEqual(validRows(rows), rows)
})

test('hooguit een paar nieuwe samenvattingen per persoon per dag', async () => {
  const c = claude()
  let last
  for (let i = 0; i <= PER_DAY; i++) last = await handle(req({ rows: [{ ...rows[0], title: `Kop quota ${i}` }] }), { anthropic: c, member: async () => 'quota-user', now: Date.parse('2026-10-22T12:00:00Z') })
  assert.equal(last.status, 429)
})

test('lidmaatschap: token bij Supabase, en precies één eigen profiel', async () => {
  const fake = (user, profiles) => async (url) => ({ ok: true, json: async () => (url.includes('/auth/v1/user') ? user : profiles) })
  assert.equal(await memberOf('t', fake({ id: 'u1' }, [{ id: 'u1' }])), 'u1')
  assert.equal(await memberOf('t', fake({ id: 'u1' }, [])), null) // ingelogd maar geen lid
  assert.equal(await memberOf('', fake({ id: 'u1' }, [{ id: 'u1' }])), null)
})

test('plafond voor iedereen samen: 300 nieuwe samenvattingen per dag', () => {
  assert.equal(ALL_PER_DAY, 300)
  assert.equal(PER_DAY, 8) // per persoon blijft het 8
})

test('plafond voor iedereen samen: daarna een nette 429, ook voor wie zelf nog ruimte heeft', async () => {
  const now = Date.parse('2026-11-04T09:00:00Z')
  const c = claude()
  // Tot vlak onder het plafond: nog één nieuwe samenvatting mag.
  await kvSet('brief-quota-all-2026-11-04', ALL_PER_DAY - 1)
  const last = await handle(req({ rows: [{ ...rows[0], title: 'Kop plafond laatste' }] }), { anthropic: c, member: async () => 'plafond-a', now })
  assert.equal(last.status, 200)
  assert.equal(await kvGet('brief-quota-all-2026-11-04'), ALL_PER_DAY)
  // Vol: een ander lid, eigen quotum nog leeg, krijgt de melding in Hoots stem.
  const full = await handle(req({ rows: [{ ...rows[0], title: 'Kop plafond vol' }] }), { anthropic: c, member: async () => 'plafond-b', now })
  assert.equal(full.status, 429)
  assert.equal(full.headers.get('cache-control'), 'no-store')
  const { error } = await full.json()
  assert.equal(error, FULL_TODAY)
  assert.doesNotMatch(error, /\d{1,2}[:.]\d{2}|\buur\b|houdt op/) // geen kloktijd, nooit "houdt op"
  assert.equal(c.calls, 2) // geen nieuwe aanroep van Claude na het plafond
  // Een geweigerde vraag kost je eigen quotum niets.
  assert.ok(!(await kvGet('brief-quota-plafond-b-2026-11-04'))) // null of 0: teruggegeven
})

test('plafond voor iedereen samen: een samenvatting uit de cache kan nog wel, en morgen weer nieuw', async () => {
  const now = Date.parse('2026-11-05T09:00:00Z')
  const c = claude()
  const mine = [{ ...rows[0], title: 'Kop gedeeld' }]
  assert.equal((await handle(req({ rows: mine }), { anthropic: c, member: async () => 'cache-a', now })).status, 200)
  await kvSet('brief-quota-all-2026-11-05', ALL_PER_DAY)
  assert.equal((await handle(req({ rows: mine }), { anthropic: c, member: async () => 'cache-b', now })).status, 200) // uit de cache
  assert.equal((await handle(req({ rows: [{ ...rows[0], title: 'Kop nieuw' }] }), { anthropic: c, member: async () => 'cache-b', now })).status, 429)
  const tomorrow = Date.parse('2026-11-06T09:00:00Z')
  assert.equal((await handle(req({ rows: [{ ...rows[0], title: 'Kop nieuw' }] }), { anthropic: c, member: async () => 'cache-b', now: tomorrow })).status, 200)
})

test('een mislukte samenvatting (5xx) telt niet mee voor het quotum of het plafond', async () => {
  const now = Date.parse('2026-11-06T12:00:00Z')
  const broken = { messages: { create: async () => { throw new Error('overloaded') } } }
  await kvSet('brief-quota-all-2026-11-06', 10)
  const r = await handle(req({ rows: [{ ...rows[0], title: 'Kop storing' }] }), { anthropic: broken, member: async () => 'storing-user', now })
  assert.equal(r.status, 502)
  assert.equal(await kvGet('brief-quota-storing-user-2026-11-06'), 0)
  assert.equal(await kvGet('brief-quota-all-2026-11-06'), 10)
  // Daarna gewoon een geslaagde: die telt wel.
  const ok = await handle(req({ rows: [{ ...rows[0], title: 'Kop na storing' }] }), { anthropic: claude(), member: async () => 'storing-user', now })
  assert.equal(ok.status, 200)
  assert.equal(await kvGet('brief-quota-storing-user-2026-11-06'), 1)
  assert.equal(await kvGet('brief-quota-all-2026-11-06'), 11)
})

test('de quotumtellers: atomair (voorwaardelijk schrijven) en met sterke consistentie', async () => {
  const { readFileSync } = await import('node:fs')
  const kv = readFileSync(new URL('../netlify/lib/kv.mjs', import.meta.url), 'utf8')
  const brief = readFileSync(new URL('../netlify/functions/brief.mjs', import.meta.url), 'utf8')
  assert.match(kv, /consistency: 'strong'/)
  const take = kv.slice(kv.indexOf('export async function kvTake'), kv.indexOf('export async function kvGive'))
  assert.match(take, /s = strongStore\(\)/)
  assert.match(take, /onlyIfMatch: cur\.etag/)
  assert.match(take, /onlyIfNew: true/)
  // Geen lezen-vergelijken-schrijven meer op de tellers in brief.mjs (review B1).
  assert.doesNotMatch(brief, /kv(Get|Set)\((quotaKey|allKey|key)/)
  assert.match(brief, /kvTake\(quotaKey, PER_DAY\)/)
  assert.match(brief, /kvTake\(allKey, ALL_PER_DAY\)/)
})

// Review B1 (5 november): 20 gelijktijdige verzoeken van één lid kwamen allemaal langs een plafond van 8.
test('gelijktijdig: nooit meer dan het quotum, ook met 20 verzoeken tegelijk', async () => {
  const now = Date.parse('2026-11-07T08:00:00Z')
  // Een nep-Claude die ook gelijktijdig klopt: het antwoord hangt af van de vraag (overzicht of controle).
  const c = { calls: 0 }
  c.messages = { create: async (p) => (c.calls++, String(p.system).startsWith('Je controleert') ? { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ zinnen: [{ zin: 1, bronnen: [1] }] }) }] } : { stop_reason: 'end_turn', content: [{ type: 'text', text: '## Kop\nIntro.' }] }) }
  const all = await Promise.all(Array.from({ length: 20 }, (_, i) => handle(req({ rows: [{ ...rows[0], title: `Kop race ${i}` }] }), { anthropic: c, member: async () => 'race-user', now })))
  const ok = all.filter((r) => r.status === 200).length
  assert.equal(ok, PER_DAY)
  assert.equal(all.filter((r) => r.status === 429).length, 20 - PER_DAY)
  assert.equal(c.calls, PER_DAY * 2) // overzicht + controle per samenvatting
  assert.equal(await kvGet('brief-quota-race-user-2026-11-07'), PER_DAY)
})
