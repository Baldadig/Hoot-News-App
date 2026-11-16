// "Altijd server" (besluit Alex 16 november 2026): het label "Je volgt" in de Editie ligt per dagdeel vast op de server, in
// de Editie in je account (`volgt: { slug, naam }` op de plek). Web en iPhone lezen het uit de Editie. Harde eisen:
// (a) niets in de afdruk: volgen of ontvolgen geeft nooit een nieuwe Editie binnen het dagdeel; (b) de server legt het vast bij
// het samenstellen, uit de volglijst in je account op dat moment; (c) ontvolgen haalt het label meteen weg op het toestel,
// nieuw volgen geeft het label pas in het volgende dagdeel; (d) web en app lezen met dezelfde regels (volgtVanPlek);
// (e) vlag uit: de Editie is byte voor byte gelijk; (f) geen label onder Buiten je bubbel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handle, zonderVolgt, prefsMarkOf, accountBasesOf, composeFor, profileOf } from '../netlify/functions/edition.mjs'
import { metVolgtOpPlekken, volgtVanPlek, verhaalVanPlek } from '../shared/volgzaak-weergave.mjs'
import { editionBasis } from '../src/lib/personal.js'
import { currentChoice, RUBRIEKEN, ONDERWERPEN } from '../src/lib/topics.js'
import { fakePostgrest } from './helpers/pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor } from './helpers/snapshot.mjs'

const snap = loadSnapshot()
const setup = setupFor(PERSONAS.find((p) => p.id === 'klimaat'), snap.sources)
const UID = '00000000-0000-4000-8000-000000000003'
const base = { followed: [...setup.followed], favorites: setup.favorites, taste: setup.taste }
const OLD = { interests: ['wetenschap', 'cultuur', 'tech'], topics: [...setup.topics, 'muziek', 'film', 'boeken', 'kunst', 'media', 'ai'] }
const NEW = currentChoice(OLD.interests, OLD.topics)
const web = () => ({ v: 2, ...base, ...NEW, rubrieken: RUBRIEKEN, onderwerpen: ONDERWERPEN, readIds: [] })
const news = snap.sources.filter((s) => s.kind !== 'sociaal')
const prefsFor = (volgzaken) => {
  const on = new Set(base.followed)
  return {
    muted: news.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id),
    enabled: news.filter((s) => s.optional && on.has(s.id)).map((s) => s.id),
    interests: OLD.interests,
    topics: OLD.topics,
    favorites: base.favorites,
    ...(volgzaken ? { volgzaken } : {}),
  }
}
const zaak = (slug, label, status = 'actief') => ({ slug, label, opdracht: '', at: '2026-11-16T07:00:00.000Z', gezien: null, status })
const memKv = () => {
  const m = new Map()
  return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), take: async () => 1 }
}

// De kern met `volgzaak` op de verhalen van de eerste plekken van de Editie (zoals de feed met HOOT_VOLGZAKEN=aan), met of
// zonder de vlag in `meta`.
let eerstePlekken = null // de plekken van jouw Editie voor deze lezer (zonder vlag samengesteld), voor de verhalen
async function kern({ vlag, plekken = 3 }) {
  if (!eerstePlekken) {
    const kaal = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
    const r = await ask(deps(fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }]), kaal), web())
    eerstePlekken = r.edition.entries.filter((e) => e.desk !== 'bubbel')
  }
  const slugs = ['gta-6', 'kabinetsformatie', 'tata-steel', 'starship']
  const ids = new Map()
  eerstePlekken.forEach((e) => {
    const st = verhaalVanPlek(e, snap.stories)
    if (st && !ids.has(st.id) && ids.size < plekken) ids.set(st.id, { slug: slugs[ids.size], label: slugs[ids.size] })
  })
  const stories = snap.stories.map((st) => (ids.has(st.id) ? { ...st, volgzaak: ids.get(st.id) } : st))
  return { start: { edition: snap.edition, stories, sources: snap.sources, meta: vlag ? { volgzaken: true } : {} }, ids }
}
function deps(pg, start) {
  return { kv: memKv(), start: async () => start, items: async (s, followed) => snap.items.filter((i) => new Set(followed).has(i.source)), verify: async (t) => (t === 'goed' ? UID : null), clientFor: () => pg.client }
}
const ask = async (d, body, token = 'goed') => {
  const res = await handle(new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }), d)
  return { status: res.status, ...(await res.json()) }
}
const gelabeld = (e) => e.entries.filter((x) => x.volgt).map((x) => x.volgt.slug)

test('vlag uit: de Editie is byte voor byte gelijk, ook met een volglijst in je account (e)', async () => {
  const { start } = await kern({ vlag: false })
  const met = await ask(deps(fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor([zaak('gta-6', 'GTA 6'), zaak('kabinetsformatie', 'Kabinetsformatie')]) }]), start), web())
  const zonder = await ask(deps(fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }]), start), web())
  assert.equal(met.source, 'claimed')
  assert.equal(JSON.stringify(met.edition), JSON.stringify(zonder.edition))
  assert.deepEqual(gelabeld(met.edition), [])
})

test('vlag aan: de server legt per plek vast welke volgzaak erbij hoort, uit je account op dat moment (b)', async () => {
  const { start } = await kern({ vlag: true })
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor([zaak('gta-6', 'GTA 6'), zaak('kabinetsformatie', 'Kabinetsformatie'), zaak('starship', 'Starship', 'gestopt')]) }])
  const r = await ask(deps(pg, start), web())
  assert.equal(r.source, 'claimed')
  assert.deepEqual(gelabeld(r.edition).sort(), ['gta-6', 'kabinetsformatie'], 'gestopt telt niet; een zaak zonder plek ook niet')
  const plek = r.edition.entries.find((e) => e.volgt?.slug === 'gta-6')
  assert.deepEqual(plek.volgt, { slug: 'gta-6', naam: 'GTA 6' })
  assert.deepEqual(pg.table[0].edition.entries.map((e) => e.volgt || null), r.edition.entries.map((e) => e.volgt || null), 'zo staat het in je account')
})

test('niets in de afdruk: basis, bases en prefsMark zijn gelijk met en zonder volglijst (a)', async () => {
  const { start } = await kern({ vlag: true })
  const lijst = [zaak('gta-6', 'GTA 6')]
  assert.equal(prefsMarkOf(prefsFor(lijst), start.sources), prefsMarkOf(prefsFor(), start.sources))
  assert.deepEqual(accountBasesOf(start, prefsFor(lijst)), accountBasesOf(start, prefsFor()))
  const a = await ask(deps(fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor(lijst) }]), start), web())
  const b = await ask(deps(fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }]), start), web())
  assert.equal(a.edition.basis, b.edition.basis)
  assert.equal(a.edition.prefsMark, b.edition.prefsMark)
  assert.deepEqual(a.edition.bases, b.edition.bases)
  assert.equal(editionBasis(base.followed, NEW.interests, NEW.topics, base.favorites), editionBasis(base.followed, NEW.interests, NEW.topics, base.favorites))
  // Zonder de velden `volgt` is het dezelfde Editie.
  const kaal = (e) => JSON.stringify({ ...e, entries: e.entries.map(({ volgt, ...rest }) => rest) })
  assert.equal(kaal(a.edition), kaal(b.edition))
})

test('volgen en ontvolgen binnen het dagdeel geeft geen nieuwe Editie en schrijft niets; de rij blijft byte voor byte (a, c)', async () => {
  const { start } = await kern({ vlag: true })
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor([zaak('gta-6', 'GTA 6')]) }])
  const d = deps(pg, start)
  let composes = 0
  const items = d.items
  d.items = async (...a) => (composes++, items(...a))
  const eerste = await ask(d, web())
  assert.deepEqual(gelabeld(eerste.edition), ['gta-6'])
  const vast = JSON.stringify(pg.table[0].edition)
  // Nieuw volgen: de lijst in je account groeit, de Editie en haar label blijven staan (pas het volgende dagdeel).
  pg.table[0].prefs = prefsFor([zaak('gta-6', 'GTA 6'), zaak('kabinetsformatie', 'Kabinetsformatie')])
  const na = await ask(d, web())
  assert.equal(na.source, 'account')
  assert.deepEqual(gelabeld(na.edition), ['gta-6'], 'nieuw volgen: nog geen label in dit dagdeel')
  // Ontvolgen: de rij blijft; het toestel toont het label niet meer (volgtVanPlek).
  pg.table[0].prefs = prefsFor([zaak('kabinetsformatie', 'Kabinetsformatie')])
  const weg = await ask(d, web())
  assert.equal(weg.source, 'account')
  assert.equal(JSON.stringify(weg.edition), JSON.stringify(na.edition))
  assert.equal(JSON.stringify(pg.table[0].edition), vast, 'de rij in je account is niet aangeraakt')
  assert.equal(composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('het volgende dagdeel: de lijst van dan bepaalt het label (hooguit drie, in je volgorde)', async () => {
  const { start } = await kern({ vlag: true, plekken: 4 })
  const lijst = [zaak('gta-6', 'GTA 6'), zaak('kabinetsformatie', 'Kabinetsformatie'), zaak('tata-steel', 'Tata Steel'), zaak('starship', 'Starship')]
  const r = await ask(deps(fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor(lijst) }]), start), web())
  assert.deepEqual(gelabeld(r.edition).sort(), ['gta-6', 'kabinetsformatie', 'tata-steel'], 'hooguit drie actieve volgzaken')
})

test('zonder account: geen label, de cache per profiel blijft gedeeld (a)', async () => {
  const { start } = await kern({ vlag: true })
  const r = await ask(deps(fakePostgrest([]), start), web(), null)
  assert.ok(['composed', 'cache'].includes(r.source))
  assert.deepEqual(gelabeld(r.edition), [])
})

test('composeFor: zonder lijst of zonder vlag dezelfde Editie, onaangeroerd', async () => {
  const { start } = await kern({ vlag: true })
  const p = profileOf(start, web())
  const items = snap.items.filter((i) => new Set(p.followed).has(i.source))
  const kaal = composeFor(start, items, p, { owner: UID, earlier: [] })
  assert.equal(JSON.stringify(composeFor(start, items, p, { owner: UID, earlier: [], volgzaken: [] })), JSON.stringify(kaal))
  assert.equal(JSON.stringify(composeFor({ ...start, meta: {} }, items, p, { owner: UID, earlier: [], volgzaken: [zaak('gta-6', 'GTA 6')] })), JSON.stringify(kaal))
  assert.deepEqual(gelabeld(composeFor(start, items, p, { owner: UID, earlier: [], volgzaken: [zaak('gta-6', 'GTA 6')] })), ['gta-6'])
})

test('Buiten je bubbel krijgt nooit een label, ook niet in de Editie op de server (f)', () => {
  const stories = [{ id: 's1', itemIds: ['i1'], volgzaak: { slug: 'gta-6', label: 'GTA 6' } }]
  const e = { entries: [{ kind: 'story', id: 's1', leadId: 'i1', desk: 'bubbel' }, { kind: 'story', id: 's1', leadId: 'i1', desk: 'games' }] }
  const uit = metVolgtOpPlekken(e, { stories, volgzaken: [zaak('gta-6', 'GTA 6')] })
  assert.equal(uit.entries[0].volgt, undefined)
  assert.deepEqual(uit.entries[1].volgt, { slug: 'gta-6', naam: 'GTA 6' })
  assert.equal(volgtVanPlek({ ...uit.entries[1], desk: 'bubbel' }, [zaak('gta-6', 'GTA 6')]), null, 'ook leeskant')
  assert.equal(metVolgtOpPlekken(e, { stories, volgzaken: [] }), e, 'zonder lijst: hetzelfde object')
})

test('de leeskant: label alleen als de slug nog in je lijst staat, met je eigen naam (c, d)', () => {
  const plek = { kind: 'story', id: 's1', desk: 'games', volgt: { slug: 'gta-6', naam: 'GTA VI' } }
  assert.deepEqual(volgtVanPlek(plek, [zaak('gta-6', 'GTA 6')]), { slug: 'gta-6', label: 'GTA 6' })
  assert.equal(volgtVanPlek(plek, []), null, 'ontvolgd: meteen weg')
  assert.equal(volgtVanPlek(plek, [zaak('gta-6', 'GTA 6', 'gestopt')]), null)
  assert.deepEqual(volgtVanPlek(plek, [zaak('x', 'X'), zaak('gta-6', 'GTA 6')]), { slug: 'gta-6', label: 'GTA 6' }, 'opnieuw volgen: het label is er weer')
  for (const vreemd of [{ ...plek, volgt: 'gta-6' }, { ...plek, volgt: null }, { ...plek, volgt: {} }, { ...plek, volgt: { slug: 3 } }, { kind: 'story', id: 's1' }, null]) assert.equal(volgtVanPlek(vreemd, [zaak('gta-6', 'GTA 6')]), null)
})

test('web en app lezen het label uit de plek, niet meer uit het verhaal (d)', () => {
  const editie = readFileSync(new URL('../src/views/Edition.jsx', import.meta.url), 'utf8')
  assert.match(editie, /volgtVanPlek\(r\.entry, volgzaken\)/)
  assert.ok(!/volgtVan\(r\.story/.test(editie), 'niet meer live uit story.volgzaak')
  const swift = readFileSync(new URL('../ios/Hoot/Views/EditionView.swift', import.meta.url), 'utf8')
  assert.ok(!/store\.volgtVan\(/.test(swift), 'de Editie op iOS leest row.volgt')
  assert.match(readFileSync(new URL('../ios/Hoot/Models.swift', import.meta.url), 'utf8'), /var volgt: EditionVolgt\?/)
})

test('privacy: de kopie in de server-opslag (pe-member) bevat nooit een slug, ook al staat het label in je account', async () => {
  const { start } = await kern({ vlag: true })
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor([zaak('gta-6', 'GTA 6'), zaak('kabinetsformatie', 'Kabinetsformatie'), zaak('tata-steel', 'Tata Steel')]) }])
  const d = deps(pg, start)
  const r = await ask(d, web())
  assert.ok(gelabeld(r.edition).length > 0, 'het label staat wel in je account')
  await new Promise((res) => setTimeout(res, 20))
  const kopieen = [...d.kv.m].filter(([k]) => k.startsWith('pe-member:'))
  assert.ok(kopieen.length > 0, 'er is een kopie bewaard')
  for (const [k, v] of kopieen) {
    const tekst = JSON.stringify(v)
    assert.ok(v.entries.every((x) => !('volgt' in x)), k)
    for (const slug of ['gta-6', 'kabinetsformatie', 'tata-steel']) assert.ok(!tekst.includes(slug), `${k} bevat ${slug}`)
  }
  assert.equal(zonderVolgt(r.edition).entries.length, r.edition.entries.length)
  assert.ok(!JSON.stringify(zonderVolgt(r.edition)).includes('"volgt"'))
})
