// Nachttest 14 november (A9, R3): Achterklap & showbizz komt alleen bij wie het aantikte (besluit 13 november), en een
// stuk onder /achterklap/ is geen Binnenland.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBinnenland, desksOf } from '../netlify/lib/desks.mjs'
import { loadSnapshot, editionsNu, composeFor } from './helpers/snapshot.mjs'

const ACHTERKLAP = { source: 'nu', title: 'Bekende Nederlander uit Amsterdam gaat scheiden', summary: 'De presentator uit Utrecht maakte het bekend.', url: 'https://www.nu.nl/achterklap/6380000/x.html', topics: [] }

test('desks: een stuk onder /achterklap/ is geen Binnenland, zoals /boulevard/ en /showbizz/', () => {
  assert.equal(isBinnenland(ACHTERKLAP), false)
  assert.equal(desksOf({ ...ACHTERKLAP }).has('binnenland'), false)
  assert.equal(isBinnenland({ ...ACHTERKLAP, url: 'https://www.nu.nl/binnenland/6380000/x.html' }), true)
})

test('persoonlijke Editie: een stuk met showbizz alleen voor wie het aantikte', () => {
  const snap = loadSnapshot()
  const { setup, edition } = editionsNu(snap)[0]
  const e = edition.entries.find((x) => x.kind === 'item' && !['bubbel', 'breed'].includes(x.desk))
  assert.ok(e, 'een losse plek om mee te toetsen')
  const items = snap.items.map((i) => (i.id === e.id ? { ...i, topics: [...(i.topics || []), 'showbizz'] } : i))
  const ids = (ed) => new Set(ed.entries.flatMap((x) => [x.id, x.leadId]).filter(Boolean))
  const zonder = composeFor({ ...snap, items }, { ...setup, readIds: new Set() })
  assert.ok(!ids(zonder).has(e.id), 'niet aangetikt: geen plek')
  const met = composeFor({ ...snap, items }, { ...setup, topics: [...(setup.topics || []), 'showbizz'], readIds: new Set() })
  assert.ok(ids(met).has(e.id), 'aangetikt: de plek blijft')
})
