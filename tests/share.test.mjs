import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shareTitle, shareLink, shareData, sharePlan, shareItem, shareNotice, SHARE_CUT } from '../src/lib/share.js'

// Delen zoals in de app (Item.shareTitle en ShareItemLink in Components.swift).

test('shareTitle: de kop, anders de titel van de gedeelde link, anders het begin van de post', () => {
  assert.equal(shareTitle({ title: 'Kabinet valt', summary: 'x' }), 'Kabinet valt')
  assert.equal(shareTitle({ title: '  ', linkTitle: 'Een stuk bij NRC', summary: 'x' }), 'Een stuk bij NRC')
  assert.equal(shareTitle({ title: '', summary: 'Korte post.' }), 'Korte post.')
  assert.equal(shareTitle({ summary: '' , sourceName: 'Pieter' }), 'Pieter')
  assert.equal(shareTitle({}), 'Hoot')
})

test('shareTitle: een lange post breekt op een spatie binnen 100 tekens, met een beletselteken', () => {
  const words = Array.from({ length: 40 }, (_, i) => `woord${i}`).join(' ')
  const t = shareTitle({ summary: words })
  assert.ok(t.endsWith('…'))
  assert.ok(t.length <= SHARE_CUT + 1)
  assert.ok(words.startsWith(t.slice(0, -1)))
  assert.ok(!t.slice(0, -1).endsWith(' '), 'geen spatie voor het beletselteken')
  // Precies 100: niets afbreken.
  const exact = 'a'.repeat(100)
  assert.equal(shareTitle({ summary: exact }), exact)
  // Zonder spatie in de eerste 100: hard afbreken.
  assert.equal(shareTitle({ summary: 'b'.repeat(130) }), 'b'.repeat(100) + '…')
})

test('shareLink en shareData: alleen de http(s)-link van de uitgever, nooit iets anders', () => {
  assert.equal(shareLink({ url: 'https://nos.nl/a' }), 'https://nos.nl/a')
  assert.equal(shareLink({ url: 'javascript:alert(1)' }), null)
  assert.equal(shareLink({}), null)
  assert.deepEqual(shareData({ title: 'Kop', url: 'https://nos.nl/a' }), { title: 'Kop', url: 'https://nos.nl/a' })
  assert.equal(shareData({ title: 'Kop' }), null)
  assert.ok(!('text' in (shareData({ title: 'Kop', url: 'https://nos.nl/a' }) || {})), 'geen apart bericht erbij')
})

test('sharePlan: deelblad als het er is en de gegevens aankan, anders klembord, anders niets', () => {
  const data = { title: 'Kop', url: 'https://nos.nl/a' }
  assert.equal(sharePlan({ share() {} }, data), 'blad')
  assert.equal(sharePlan({ share() {}, canShare: () => false, clipboard: { writeText() {} } }, data), 'klembord')
  assert.equal(sharePlan({ clipboard: { writeText() {} } }, data), 'klembord')
  assert.equal(sharePlan({}, data), 'geen')
})

test('shareItem: gedeeld, geannuleerd, gekopieerd (ook als het deelblad weigert) of mislukt', async () => {
  const item = { title: 'Kop', url: 'https://nos.nl/a' }
  const calls = []
  assert.equal(await shareItem(item, { share: async (d) => calls.push(d) }), 'gedeeld')
  assert.deepEqual(calls, [{ title: 'Kop', url: 'https://nos.nl/a' }])
  const abort = Object.assign(new Error('x'), { name: 'AbortError' })
  assert.equal(await shareItem(item, { share: async () => { throw abort } }), 'geannuleerd')
  const copied = []
  const refuse = Object.assign(new Error('x'), { name: 'NotAllowedError' })
  assert.equal(await shareItem(item, { share: async () => { throw refuse }, clipboard: { writeText: async (u) => copied.push(u) } }), 'gekopieerd')
  assert.deepEqual(copied, ['https://nos.nl/a'])
  assert.equal(await shareItem(item, { clipboard: { writeText: async (u) => copied.push(u) } }), 'gekopieerd')
  assert.equal(await shareItem(item, { clipboard: { writeText: async () => { throw new Error('nee') } } }), 'mislukt')
  assert.equal(await shareItem({ title: 'Zonder link' }, { share: async () => {} }), 'mislukt')
})

test('shareNotice: alleen bij het klembord en bij mislukken een melding', () => {
  assert.equal(shareNotice('gekopieerd'), 'Link gekopieerd')
  assert.equal(shareNotice('mislukt'), 'Delen lukte niet')
  assert.equal(shareNotice('gedeeld'), '')
  assert.equal(shareNotice('geannuleerd'), '')
})

test('A3: artikel deelt PNG met Hoot-link; zonder bestandsdeling of bij netwerkfout link kopiëren', async () => {
  const item = { id: 'abc', kind: 'article', title: 'Kop', url: 'https://nos.nl/a' }
  const calls = [], copied = []
  const nav = { share: async data => calls.push(data), canShare: () => true, clipboard: { writeText: async url => copied.push(url) } }
  const fetcher = async () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } })
  assert.equal(await shareItem(item, nav, { fetcher }), 'gedeeld')
  assert.equal(calls[0].url, 'https://gethoot.app/deel/abc?bron=https%3A%2F%2Fnos.nl%2Fa')
  assert.equal(calls[0].files[0].type, 'image/png')
  assert.equal(await shareItem(item, { ...nav, canShare: () => false }, { fetcher }), 'gekopieerd')
  assert.equal(await shareItem(item, nav, { fetcher: async () => { throw new Error('offline') } }), 'gekopieerd')
  assert.deepEqual(copied, ['https://gethoot.app/deel/abc?bron=https%3A%2F%2Fnos.nl%2Fa', 'https://gethoot.app/deel/abc?bron=https%3A%2F%2Fnos.nl%2Fa'])
  assert.equal(shareLink({ ...item, kind: 'post' }), item.url)
})
