// De keuzeregel van de Selectie (Selectie-review 14 november, punt 1; besluit 15 november): drie plekken met elk een
// eigen grond, voor alle onderwerpen gelijk. Plus "Vooral Engelstalig" in de omschrijving (punt 5) en de taal per stuk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composeVak, isPeopleNews, mostlyEnglish, MOSTLY_EN_LABEL, topSources, VAK_FIELDS, STORY_SOURCES } from '../netlify/lib/vak.mjs'

const NOW = Date.parse('2026-11-12T10:00:00Z') // donderdag; de volle week is die van 2 t/m 9 november
const IN_WEEK = '2026-11-05T09:00:00Z'
const S = (id, kind, lang = 'nl', more = {}) => ({ id: 'vak:' + id, name: id, kind, fields: ['merk'], urls: ['https://' + id + '.example/feed'], cat: 'vak', lang, ...more })
const it = (id, source, title, more = {}) => ({ id, source, sourceName: source.slice(4), title, summary: 'Een eigen intro van de schrijver over dit stuk, in hele zinnen.', url: `https://example.nl/${id}`, publishedAt: IN_WEEK, ...more })
const top = (out) => out.fields.find((f) => f.id === 'merk').top
const ids = (out) => top(out).map((e) => e.id)

test('het verhaal van de week: alleen met minstens drie echte bronnen', () => {
  assert.equal(STORY_SOURCES, 3)
  const sources = [S('a', 'vakblad'), S('b', 'vakblad'), S('c', 'vakblad'), S('d', 'vakblad'), S('k', 'expert')]
  const twee = [it('t1', 'vak:a', 'Heineken kiest nieuw reclamebureau voor Europese campagne'), it('t2', 'vak:b', 'Heineken kiest nieuw reclamebureau voor Europese campagne'), it('k1', 'vak:k', 'Waarom merken vergeten wat een slogan doet')]
  // Twee bronnen: geen verhaal van de week, dus eerst de kenner.
  assert.equal(ids(composeVak(twee, { now: NOW, sources }))[0], 'k1')
  const drie = [...twee, it('t3', 'vak:c', 'Heineken kiest nieuw reclamebureau voor Europese campagne')]
  assert.deepEqual(ids(composeVak(drie, { now: NOW, sources })).slice(0, 2), ['t1', 'k1'])
})

test('een personeelsbericht is nooit het verhaal van de week, ook met drie bronnen', () => {
  for (const t of ['Annechien Steenhuizen terug bij NOS Journaal', 'Account-update: Conscious Group checkt in bij Gardeners', 'Directeur van Jumbo België vertrekt na vier jaar', 'Omnicom names Jane Doe as new CEO', 'WPP appoints new chief creative officer', 'Hoofdredacteur stapt op bij Adformatie', 'Maarten Kroeze aan de slag als nieuwe president van de Hoge Raad']) assert.equal(isPeopleNews(t), true, t)
  for (const t of ['Waarom merken vergeten wat een slogan doet', 'Heineken kiest nieuw reclamebureau voor Europese campagne', 'Meta names its new ad format Reels Trials', 'De terugkeer van de jingle']) assert.equal(isPeopleNews(t), false, t)
  const sources = [S('a', 'vakblad'), S('b', 'vakblad'), S('c', 'vakblad'), S('k', 'expert'), S('d', 'vakblad')]
  const kop = 'Annechien Steenhuizen terug bij NOS Journaal als presentator'
  const pool = [it('p1', 'vak:a', kop), it('p2', 'vak:b', kop), it('p3', 'vak:c', kop), it('k1', 'vak:k', 'Waarom merken vergeten wat een slogan doet'), it('d1', 'vak:d', 'Een lange analyse van het nieuwe mediabeleid')]
  const out = ids(composeVak(pool, { now: NOW, sources }))
  assert.equal(out[0], 'k1', 'de kenner gaat voor; het personeelsbericht krijgt geen eigen plek')
  assert.ok(out.includes('p1'), 'op de stand mag het nog wel in de top')
})

test('de plek van de kenner: het langste stuk, niet het nieuwste', () => {
  const sources = [S('k', 'expert'), S('j', 'expert'), S('a', 'vakblad')]
  const pool = [
    it('kort', 'vak:k', 'Een korte notitie over merkarchitectuur', { readMin: 2, publishedAt: '2026-11-08T09:00:00Z' }),
    it('lang', 'vak:j', 'Het grote verhaal over merkarchitectuur in de zorg', { readMin: 14, publishedAt: '2026-11-03T09:00:00Z' }),
    it('a1', 'vak:a', 'Een gewoon vakbladstuk over campagnes'),
  ]
  assert.equal(ids(composeVak(pool, { now: NOW, sources }))[0], 'lang')
})

test('een Nederlands stuk krijgt de laatste plek als de andere twee Engels zijn', () => {
  const sources = [S('en1', 'expert', 'en'), S('en2', 'expert', 'en'), S('en3', 'expert', 'en'), S('nl1', 'vakblad', 'nl')]
  const pool = [
    it('e1', 'vak:en1', 'Why brands forget what a slogan does', { lang: 'en', readMin: 9 }),
    it('e2', 'vak:en2', 'The quiet return of the jingle in advertising', { lang: 'en' }),
    it('e3', 'vak:en3', 'Positioning lessons from a decade of campaigns', { lang: 'en' }),
    it('n1', 'vak:nl1', 'Hoe een Nederlands bureau de pitch won', { lang: 'nl' }),
  ]
  const out = top(composeVak(pool, { now: NOW, sources }))
  assert.equal(out.length, 3)
  assert.equal(out[2].id, 'n1')
  assert.deepEqual(out.map((e) => e.lang), ['en', 'en', 'nl'], 'elk stuk draagt zijn taal mee (de schakelaar op web en in de app)')
  // Is er al een Nederlands stuk, dan beslist de stand.
  const metNl = top(composeVak([...pool.slice(0, 2), it('n0', 'vak:nl1', 'Een Nederlandse analyse van de jingle', { lang: 'nl' }), pool[2]], { now: NOW, sources }))
  assert.equal(metNl.filter((e) => e.lang === 'nl').length, 1)
})

test('rouleren: bij gelijke stand wijkt een bron die vorige week in de top stond', () => {
  const sources = [S('a', 'vakblad'), S('b', 'vakblad'), S('c', 'vakblad'), S('d', 'vakblad')]
  const pool = [it('a1', 'vak:a', 'Een stuk over campagnes'), it('b1', 'vak:b', 'Een stuk over merken'), it('c1', 'vak:c', 'Een stuk over bureaus'), it('d1', 'vak:d', 'Een stuk over reclame')]
  const eerst = composeVak(pool, { now: NOW, sources })
  const was = topSources(eerst)
  assert.deepEqual(was.merk, top(eerst).map((e) => e.source))
  const daarna = composeVak(pool, { now: NOW, sources, previous: was })
  assert.ok(ids(daarna).includes('d1'), 'de bron die er vorige week niet bij was, komt erin')
  // Een hogere stand blijft winnen: rouleren is alleen voor gelijke stand.
  const kop = 'Heineken kiest nieuw reclamebureau voor Europese campagne'
  const sterk = [...pool.slice(1), it('a1', 'vak:a', kop), it('a2', 'vak:b', kop), it('a3', 'vak:c', kop)]
  assert.equal(top(composeVak(sterk, { now: NOW, sources, previous: { merk: ['vak:a', 'vak:b', 'vak:c'] } }))[0].also.length, 2)
})

test('Vooral Engelstalig: precies de onderwerpen met te weinig Nederlandse bronnen', () => {
  const en = VAK_FIELDS.filter((f) => mostlyEnglish(f.id)).map((f) => f.id)
  assert.deepEqual(en.sort(), ['design', 'dev', 'product', 'seo', 'ux'])
  // In de bundel: achter de omschrijving, en als kenmerk.
  const sources = [S('x', 'vakblad', 'en', { fields: ['ux'] }), S('y', 'vakblad', 'en', { fields: ['ux'] })]
  const ux = composeVak([], { now: NOW, sources }).fields.find((f) => f.id === 'ux')
  assert.equal(ux.about, `${VAK_FIELDS.find((f) => f.id === 'ux').about} · ${MOSTLY_EN_LABEL}`)
  assert.equal(ux.en, true)
  // Alleen Nederlandse bronnen (ook als het er weinig zijn): geen label.
  const nl = composeVak([], { now: NOW, sources: [S('z', 'vakblad', 'nl', { fields: ['geschiedenis'] })] }).fields.find((f) => f.id === 'geschiedenis')
  assert.equal(nl.about, VAK_FIELDS.find((f) => f.id === 'geschiedenis').about)
  assert.equal(nl.en, undefined)
})
