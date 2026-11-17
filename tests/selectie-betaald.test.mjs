// Selectie-review 14 november, punt 9: betaalde stukken hebben een teken. Het kenmerk `paid` staat op alle betaalde
// vakbronnen, het stuk draagt het mee, de kaart toont "Abonnement" in de bronregel (het woord dat Hoot overal gebruikt),
// en in de top staat hooguit één betaald stuk per onderwerp.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { composeVak, VAK_SOURCES } from '../netlify/lib/vak.mjs'
import { PAID_SOURCES } from '../netlify/lib/vakBronnen.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

const src = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id)
const host = (u) => new URL(u).hostname.replace(/^(www|rss|feeds)\./, '')

test('het kenmerk staat op elke betaalde vakbron, en alleen op bestaande bronnen', () => {
  for (const id of PAID_SOURCES) assert.ok(VAK_SOURCES.some((s) => s.id === id), id + ' bestaat')
  for (const id of ['vk-films', 'trouw-wetenschap', 'ad-geld', 'tijd-mijngeld', 'ftm', 'groene', 'economist-fe', 'zorgvisie', 'pragmatic', 'hpdetijd', 'historischnieuwsblad']) assert.equal(src(id).paid, true, id)
  for (const id of ['tweakers', 'guardian-books', 'lenny', 'noahpinion', 'filmkrant', 'nu-wetenschap']) assert.ok(!src(id).paid, id + ' is gratis')
})

test('elke vakbron van een uitgever die in de hoofdcatalogus betaald is, is ook betaald', () => {
  const paidHosts = new Set(SOURCES.filter((s) => s.paid).map((s) => host([s.urls].flat()[0])))
  const missed = VAK_SOURCES.filter((s) => paidHosts.has(host(s.urls[0])) && !s.paid).map((s) => s.id)
  assert.deepEqual(missed, [])
})

test('het stuk draagt het kenmerk mee, en in de top staat hooguit één betaald stuk', () => {
  const now = Date.parse('2026-11-12T10:00:00Z')
  const at = '2026-11-05T09:00:00.000Z'
  let n = 0
  const it = (source, title) => ({ id: 'b' + n++, source: 'vak:' + source, sourceName: src(source).name, title, summary: 'Een eigen intro van de schrijver.', url: 'https://example.org/b' + n, publishedAt: at, author: 'Iemand' })
  const pool = [
    it('vk-films', 'Een lange recensie van de nieuwe film van Paolo Sorrentino'),
    it('parool-kunst', 'Waarom de nieuwe film van Lanthimos het jaar zal domineren'),
    it('tijd-cultuur', 'Een gesprek met de regisseur van het beste debuut van het festival'),
    it('filmkrant', 'Een essay over stilte in de Europese cinema'),
    it('rogerebert', 'Why slow cinema matters now more than ever'),
  ]
  const film = composeVak(pool, { now }).fields.find((f) => f.id === 'film')
  assert.equal(film.top.length, 3)
  assert.equal(film.top.filter((e) => e.paid).length, 1, 'hooguit één betaald stuk in de top')
  assert.ok(film.more.some((e) => e.paid), 'de andere betaalde staan onder "Ook deze week"')
  assert.ok(film.top.every((e) => typeof e.paid === 'boolean'))
  assert.equal(film.top.find((e) => e.source === 'vak:filmkrant').paid, false)
})

test('web en app tonen "Abonnement" in de bronregel van de kaart en onder "Ook deze week"', () => {
  const web = readFileSync(new URL('../src/views/Vak.jsx', import.meta.url), 'utf8')
  assert.match(web, /item\.paid \? <span className="srcbtn__read"> · Abonnement<\/span>/)
  assert.match(web, /it\.paid \? ' · Abonnement'/)
  assert.ok(!/Betaald/.test(web), 'Hoot zegt overal "Abonnement", niet "Betaald"')
  const app = readFileSync(new URL('../ios/Hoot/Views/DigestView.swift', import.meta.url), 'utf8')
  assert.match(app, /SourceLine\(item: item\.asItem, linkSource: false, paid: item\.paid == true\)/)
  assert.match(app, /item\.paid == true \? "Abonnement" : nil/)
  const models = readFileSync(new URL('../ios/Hoot/Models.swift', import.meta.url), 'utf8')
  assert.match(models, /struct DigestItem[\s\S]*?var paid: Bool\?/)
  const comp = readFileSync(new URL('../ios/Hoot/Views/Components.swift', import.meta.url), 'utf8')
  assert.match(comp, /paid \?\? \(store\.source\(item\.source\)\?\.paid == true\)/)
})

test('De Telegraaf staat in de Selectie bij Politiek, breed gefilterd en met het teken Abonnement', () => {
  const tg = src('telegraaf')
  assert.ok(tg, 'vak:telegraaf bestaat')
  assert.deepEqual(tg.fields, ['politiek'])
  assert.equal(tg.filter, true)
  assert.equal(tg.paid, true)
  assert.equal(tg.urls[0], 'https://www.telegraaf.nl/rss')
  assert.ok(PAID_SOURCES.has('vak:telegraaf') || PAID_SOURCES.has('telegraaf'))
})
