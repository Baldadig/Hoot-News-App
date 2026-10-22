import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle, validRows, memberOf, PER_DAY } from '../netlify/functions/brief.mjs'

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
