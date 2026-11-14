// Luister verder, Editie eerst (herstel keuring 3 van branch shows), getoetst op de echte avondkern van 14 november
// (tests/fixtures/luister-avondkern-2026-11-14.json: de verhalen met een kandidaat of een Editieplek, de kandidaat-afleveringen
// en de onderdelen van de algemene Editie). PROEF-4: een ja van het model (Today in Focus bij Nvidia) werd niet zichtbaar
// omdat de aflevering bij twee verhalen paste. De koppeling hoort bij het verhaal dat in de Editie staat. Geen echte AI.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, editiePlekken } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, JA, NEE, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-avondkern-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const OPTS = { stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS }
const ALGEMEEN = editiePlekken(FIX.edition.entries, FIX.stories)
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const kop = (st) => (byId.get(st.leadId) || byId.get(st.itemIds[0]))?.title || ''
const NVIDIA = FIX.stories.filter((st) => /Nvidia|Huang/.test(kop(st))).map((st) => st.id)
const TIF = FIX.episodes.find((e) => /Why the Nvidia scandal is far from over/.test(e.titel))
const draai = async (beslis, editie) => {
  const { get, update } = memKv()
  // Alle paren in één ronde (sinds keuring 4 halen er meer het oordeel dan MAX_AANROEPEN; dat is hier niet de vraag).
  return koppelMetOordeel({ ...OPTS, client: nepClient(beslis), get, update, editie, maxAanroepen: Infinity, maxVragen: Infinity })
}

test('editiePlekken op de echte Editie van de avond: een verhaal-onderdeel telt, het verhaal van toen (formerId) niet', () => {
  const meta = FIX.edition.entries.find((e) => e.id === 's5ll0q9')
  assert.equal(meta.formerId, 's3vohlb', 'het Meta-verhaal ging onder een andere id verder')
  const plek = editiePlekken(FIX.edition.entries, [...FIX.stories, { id: 's3vohlb', itemIds: [] }])
  assert.ok(plek.has('s5ll0q9'))
  assert.ok(!plek.has('s3vohlb'), 'het oude cluster is niet wat de lezer ziet')
  for (const e of FIX.edition.entries.filter((e) => e.kind === 'story')) assert.ok(ALGEMEEN.has(e.id), e.id)
  // Een verhaal dat sindsdien onder een andere id verder ging (de Editie staat nog op de oude id).
  const verder = FIX.stories.find((st) => st.id === 'sn51qk8')
  const plek2 = editiePlekken(FIX.edition.entries, FIX.stories.map((st) => (st === verder ? { ...st, id: 'nieuw-id', formerIds: ['sn51qk8'] } : st)))
  assert.ok(plek2.has('nieuw-id') && !plek2.has('sn51qk8'))
  // Een los stuk dat nu in een verhaal zit: dat verhaal.
  const st = FIX.stories.find((s) => s.itemIds.length >= 3 && !ALGEMEEN.has(s.id))
  assert.ok(editiePlekken([{ kind: 'item', id: st.itemIds[1] }], FIX.stories).has(st.id))
})

test('Editie eerst op de echte avondkern: Today in Focus past bij meer Nvidia-verhalen en komt bij het verhaal met een Editieplek', async () => {
  assert.ok(TIF)
  const p = paren(OPTS)
  const bij = p.paren.filter((c) => c.e.id === TIF.id && !vangnet(c, NOW)).map((c) => c.x.st.id)
  assert.ok(bij.length >= 2, `Today in Focus is een kandidaat bij meer Nvidia-verhalen (${bij.join(', ')})`)
  assert.ok(bij.every((id) => NVIDIA.includes(id)))
  const ja = (v) => (/far from over/.test(v.titel) ? VERDIEPING : NEE)
  const aan = (r) => [...r.byStory].filter(([, l]) => /far from over/.test(l.aflevering)).map(([id]) => id)
  // Zonder Editieplek: nergens zichtbaar, dus geen van beide (zoals in PROEF-4).
  assert.deepEqual(aan(await draai(ja, { algemeen: ALGEMEEN, pool: new Set() })), [])
  // In de Editiepool (de persoonlijke Edities): het grootste Nvidia-verhaal, het hoofdverhaal van de zaak.
  const groot = [...bij].sort((a, b) => FIX.stories.find((s) => s.id === b).itemIds.length - FIX.stories.find((s) => s.id === a).itemIds.length)[0]
  const pool = await draai(ja, { algemeen: ALGEMEEN, pool: new Set(NVIDIA) })
  assert.deepEqual(aan(pool), [groot])
  assert.equal(pool.rows.koppelingen.find((k) => k.verhaal === groot).editie, 'de Editiepool')
  assert.ok(pool.rows.afgevallen.some((a) => /far from over/.test(a.aflevering) && /groter verhaal in de Editiepool; dat krijgt haar/.test(a.reden)))
  // Een kleiner verhaal in de algemene Editie gaat voor de pool.
  const klein = bij.find((id) => id !== groot)
  assert.deepEqual(aan(await draai(ja, { algemeen: new Set([...ALGEMEEN, klein]), pool: new Set(NVIDIA) })), [klein])
})

test('de echte avondkern: de crisisverdieping van gisteren koppelt, The Daily ("recorded before the news") niet', async () => {
  const nrc = FIX.episodes.find((e) => /Waar gaat deze politieke crisis nou echt over/.test(e.titel))
  const daily = FIX.episodes.find((e) => /Huang’s Resignation Will Mean/.test(e.titel))
  const crisis = FIX.stories.find((st) => st.id === 'sts2z5a')
  const p = paren(OPTS)
  const c = p.paren.find((c) => c.e.id === nrc.id && c.x.st.id === crisis.id)
  assert.ok(c, 'NRC Vandaag is een kandidaat bij het crisisverhaal')
  assert.ok(nrc.t < Date.parse(byId.get(crisis.leadId).publishedAt), 'ouder dan de kop')
  assert.equal(vangnet(c, NOW), null)
  for (const d of p.paren.filter((c) => c.e.id === daily.id)) assert.match(vangnet(d, NOW), /na de opname/)
  // Het model zegt overal ja (verdieping): NRC Vandaag koppelt bij het crisisverhaal, The Daily nergens.
  const r = await draai(() => VERDIEPING, { algemeen: ALGEMEEN, pool: new Set(FIX.stories.map((s) => s.id)) })
  const k = r.rows.koppelingen.find((k) => k.verhaal === crisis.id)
  assert.ok(k && /Waar gaat deze politieke crisis/.test(k.aflevering + (k.andere || []).join(' ')), 'de crisisverdieping staat bij het crisisverhaal')
  assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === daily.titel || (k.andere || []).some((a) => a.includes(daily.titel))))
  // Ook als het model The Daily "zelfde" noemt: het vangnet gaat voor.
  const z = await draai((v) => (/Resignation Will Mean/.test(v.titel) ? JA : NEE), { algemeen: ALGEMEEN, pool: new Set(NVIDIA) })
  assert.ok(!z.rows.koppelingen.some((k) => k.aflevering === daily.titel))
})
