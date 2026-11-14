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
  // Showbizz als soort (dubbelcheck A5): de rubriek in de link (SHOWBIZZ_PATH); alleen het onderwerp is niet genoeg.
  const roddel = (i) => ({ ...i, url: String(i.url).replace(/^(https?:\/\/[^/]+)\/[^/]+\//, '$1/achterklap/'), topics: [...(i.topics || []), 'showbizz'] })
  const items = snap.items.map((i) => (i.id === e.id ? roddel(i) : i))
  const ids = (ed) => new Set(ed.entries.flatMap((x) => [x.id, x.leadId]).filter(Boolean))
  const zonder = composeFor({ ...snap, items }, { ...setup, readIds: new Set() })
  assert.ok(!ids(zonder).has(e.id), 'niet aangetikt: geen plek')
  const met = composeFor({ ...snap, items }, { ...setup, topics: [...(setup.topics || []), 'showbizz'], readIds: new Set() })
  assert.ok(ids(met).has(e.id), 'aangetikt: de plek blijft')
})

test('persoonlijke Editie: alleen het onderwerp showbizz (een woord als influencer) weert het stuk niet (dubbelcheck A5)', () => {
  const snap = loadSnapshot()
  const { setup, edition } = editionsNu(snap)[0]
  const e = edition.entries.find((x) => x.kind === 'item' && !['bubbel', 'breed'].includes(x.desk))
  const items = snap.items.map((i) => (i.id === e.id ? { ...i, topics: [...(i.topics || []), 'showbizz'] } : i))
  const ids = (ed) => new Set(ed.entries.flatMap((x) => [x.id, x.leadId]).filter(Boolean))
  assert.ok(ids(composeFor({ ...snap, items }, { ...setup, readIds: new Set() })).has(e.id), 'gewoon nieuws met het onderwerp showbizz blijft')
})

test('showbizz als soort: de rubriek of een roddelwoord zonder ander onderwerp; influencer of celebrity alleen is nieuws (dubbelcheck A5)', async () => {
  const { showbizzKind, keywordTopics } = await import('../netlify/lib/topics.mjs')
  const { optInRejected } = await import('../src/lib/personal.js')
  const { newsRejection } = await import('../shared/edition-policy.mjs')
  const { profileOf } = await import('../shared/editor.mjs')
  const art = (title, url = 'https://nos.nl/artikel/2590100-x', summary = '') => ({ id: title.slice(0, 8), kind: 'article', source: 'nos', title, summary, url, topics: keywordTopics(`${title} ${summary}`) })
  // Gewoon nieuws waarin het woord voorkomt: het onderwerp showbizz staat erop, de soort is het niet.
  for (const it of [
    art('Bijna 30 influencers krijgen tik op de vingers voor illegale gezondheidsclaims'),
    art('Kabinet wil influencers verplichten reclame duidelijk te melden'),
    art('ACM beboet influencers voor misleidende cryptoreclame'),
    art('Celebrities steunen Harris in laatste week campagne'),
  ]) {
    assert.ok(it.topics.includes('showbizz'), it.title)
    assert.equal(showbizzKind(it), false, it.title)
    assert.equal(optInRejected(it, []), false, it.title)
  }
  // Echte showbizz: de rubriek in de link, of een roddelwoord met hooguit cultuur of sport erbij.
  for (const it of [
    art('Presentator en zangeres gaan uit elkaar', 'https://www.nu.nl/achterklap/6380000/x.html'),
    art('Realityster en voetballer gaan uit elkaar'),
    art('Roddels over breuk bij bekende zanger'),
    art('Rode loper bij première nieuwe Bond-film'),
  ]) {
    it.topics = [...new Set([...it.topics, 'showbizz'])]
    assert.equal(showbizzKind(it), true, it.title)
    assert.equal(optInRejected(it, []), true, it.title)
    assert.equal(optInRejected(it, ['showbizz']), false, `${it.title}: aangetikt`)
  }
  // Groot nieuws gaat altijd door, ook als het showbizz is.
  const groot = art('Roddels over breuk bij bekende zanger')
  groot.topics.push('showbizz')
  const pubs = ['nos', 'nu', 'rtl', 'nrc', 'volkskrant', 'trouw', 'ad', 'telegraaf', 'parool'].map((s, k) => ({ ...groot, id: `g${k}`, source: s }))
  assert.equal(optInRejected(groot, [], { sourceCount: pubs.length, publisherCount: pubs.length }, pubs), false)
  // Persoonlijk en algemeen gelijk: wat de persoonlijke Editie niet meer weigert, beoordeelt zij met dezelfde norm als de
  // algemene Editie (newsRejection); voor het NOS-stuk geeft die geen weigering op het onderwerp.
  const nos = art('Bijna 30 influencers krijgen tik op de vingers voor illegale gezondheidsclaims')
  const algemeen = newsRejection(profileOf({}), {}, [nos], 'binnenland')
  const persoonlijk = optInRejected(nos, []) ? 'niet-aangetikt' : newsRejection(profileOf({ interests: ['binnenland'] }), {}, [nos], 'binnenland')
  assert.equal(algemeen, null)
  assert.equal(persoonlijk, null)
})
