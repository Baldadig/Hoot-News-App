// Volgen 1.5, bouwplanstap 1.4: een volgzaak die vandaag vol zit, of verhalen waarvan de pogingen op zijn, houden de
// wachtrij niet bezet. De kleinere volgzaak krijgt dan wel haar oordelen, zolang er budget is.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kiesWachtrij, legOordelenOver, MAX_VRAGEN } from '../netlify/lib/volgzaak-ronde.mjs'
import { volgzaakOordeelRonde, MAX_OORDELEN_PER_DAG } from '../netlify/lib/volgzaak-oordeel.mjs'
import { MAX_POGINGEN } from '../netlify/lib/luister.mjs'
import { VK, dagNL } from '../netlify/lib/volgzaak-basis.mjs'
import { memIo, nepModel } from './helpers/volgzaak-io.mjs'

const NOW = Date.parse('2026-11-20T10:00:00Z')
const DAG = dagNL(NOW)
const vraag = (slug, key, volgers) => ({ slug, key, volgers, pubs: 2, laatst: NOW, prompt: `Gevolgd: ${slug}\n\nKoppen van het verhaal:\n- nos: kop ${key}` })
const twijfel = (slug, n, volgers) => Array.from({ length: n }, (_, i) => vraag(slug, `${slug}${i}`, volgers))

test('twee volgzaken, de grootste zit vandaag vol: de kleinere krijgt de rij en haar oordelen', async () => {
  const vragen = [...twijfel('aa', 30, 10), ...twijfel('bb', 5, 1)]
  const vandaag = { aa: MAX_OORDELEN_PER_DAG }
  const rij = kiesWachtrij(vragen, { vandaag })
  assert.deepEqual([...new Set(rij.map((v) => v.slug))], ['bb'])
  assert.equal(rij.length, 5)
  // En de oordeelronde vraagt ze ook echt, met budget over.
  const io = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen: rij }, [VK.dagUsd(DAG)]: { dag: DAG, usd: 1, per: vandaag } })
  const model = nepModel(() => ({ reden: 'nep', gaatOver: 'ja', zeker: 'ja' }))
  const { stats } = await volgzaakOordeelRonde({ client: model, get: io.get, update: io.update, now: NOW, start: Date.now(), env: { HOOT_VOLGZAKEN: 'aan' } })
  assert.equal(stats.gevraagd, 5)
  assert.equal(model.calls.length, 5)
  assert.equal(io.kv.get(VK.dagUsd(DAG)).per.bb, 5)
})

test('per volgzaak hooguit de oordelen die er vandaag nog over zijn; meeste volgers blijven eerst', () => {
  const rij = kiesWachtrij([...twijfel('aa', 30, 10), ...twijfel('bb', 30, 1)], { vandaag: { aa: 9 } })
  assert.equal(rij.length, 3 + MAX_OORDELEN_PER_DAG)
  assert.deepEqual(rij.slice(0, 3).map((v) => v.slug), ['aa', 'aa', 'aa'])
  assert.ok(rij.slice(3).every((v) => v.slug === 'bb'))
  assert.ok(kiesWachtrij(Array.from({ length: 5 }, (_, s) => twijfel(`v${s}`, 20, 1)).flat()).length <= MAX_VRAGEN)
})

test('verhalen met een oordeel of zonder pogingen meer vallen weg, de rest schuift door', () => {
  const vragen = [...twijfel('aa', 3, 10), ...twijfel('bb', 2, 1)]
  const oordelen = { aa: { v: 1, o: { aa0: ['j', NOW, ''] }, p: { aa1: [MAX_POGINGEN, NOW], aa2: [MAX_POGINGEN - 1, NOW] } } }
  assert.deepEqual(kiesWachtrij(vragen, { oordelen }).map((v) => v.key), ['aa2', 'bb0', 'bb1'])
})

test('een bewaard oordeel komt over twijfel heen in de treffers, zeker blijft zeker', () => {
  const doc = { s: { a: ['t', 1, NOW, NOW], b: ['z', 2, NOW, NOW], c: ['t', 1, NOW, NOW] } }
  assert.equal(legOordelenOver(doc, { o: { a: ['n', NOW, ''], b: ['n', NOW, ''] } }), 1)
  assert.deepEqual([doc.s.a[0], doc.s.b[0], doc.s.c[0]], ['n', 'z', 't'])
})
