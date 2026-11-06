// Eén gebeurtenis, één plek (Redacteur ronde 3a, keuring 6 november 2026). De algemene Editie van vrijdagochtend
// had de midterms-nasleep op plek 1 (de bundel van 28 uitgevers) én op plek 10: het losse NRC-stuk "Het grote
// vingerwijzen naar de schuldigen van de Republikeinse nederlaag is begonnen". Oorzaak: sameSubject zag het niet,
// want het stuk noemt de verkiezing niet ("nederlaag"), en "Republikeinse" telde als eigen naam terwijl
// "Republicans" dat niet doet. Nu: de partij in beide talen als één naam (alleen voor sameSubject, en breed: nooit
// alleen genoeg), en de nederlaag of zege van een partij als verkiezingsbegrip.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signatures, sameSubject, sameEvent, centralItems } from '../netlify/lib/stories.mjs'

const art = (id, title, summary, publishedAt) => ({ id, kind: 'article', title, summary, publishedAt })
const nrc = art('11c19lh', 'Het grote vingerwijzen naar de schuldigen van de Republikeinse nederlaag is begonnen: van benzine- en voedselprijzen tot datacenters, Iran, Israël en Trump zelf', 'Het lijkt erop dat Republikeinse politici en rechtse commentatoren na de desastreuze nederlaag van hun partij kordater afstand durven nemen van Trump.', '2026-11-05T18:34:26.000Z')
const dw = art('u69jpg', 'Pete Hegseth under fire as Republicans trade blame for midterm debacle', 'Iran war hawk Pete Hegseth is facing the fallout from Republicans’ midterms losses as high energy prices turned voters toward Democrats.', '2026-11-05T19:08:00.000Z')
const ind = art('15jk7yl', 'Hegseth promises ‘not to back down’ in pushing out Trump’s agenda as his seat gets warmer after midterm losses', 'Hegseth has promised to continue his anti-DEI push at the Pentagon after Republicans’ crushing election defeat, warning, ‘We have only just begun to fight’', '2026-11-05T22:42:01.000Z')

test('één gebeurtenis: het NRC-stuk over de Republikeinse nederlaag is hetzelfde onderwerp als de nasleep', () => {
  const sig = signatures([nrc, dw, ind])
  assert.ok(sig.get(nrc.id).concepts.has('election'), 'nederlaag van een partij is een verkiezingsbegrip')
  assert.ok(!sig.get(nrc.id).strong.has('republikeinse'), 'de partij is geen eigen naam')
  assert.ok(sameSubject(sig.get(nrc.id), sig.get(dw.id)))
  assert.ok(sameSubject(sig.get(nrc.id), sig.get(ind.id)))
  // Bundelen (sameEvent) blijft strenger: een gedeelde partij en een begrip maken nog geen verhaal.
  assert.ok(!sameEvent(sig.get(nrc.id), sig.get(dw.id), true))
})

test('één gebeurtenis: een partij alleen is te breed', () => {
  const a = art('a', 'Republican governor signs election law in Ohio', 'The Republican governor signed the bill on Tuesday.', '2026-11-05T10:00:00.000Z')
  const b = art('b', 'Republikeinen in Texas vieren zege bij gouverneursverkiezing', 'De Republikeinen houden Texas.', '2026-11-05T11:00:00.000Z')
  const sig = signatures([a, b])
  assert.ok(!sameSubject(sig.get(a.id), sig.get(b.id)))
})

test('één gebeurtenis: de partij telt niet mee voor de samenvattende kop (centralItems)', () => {
  const items = Array.from({ length: 10 }, (_, k) => art(`x${k}`, k % 2 ? `Democrats win Senate seat in state ${k}` : `Democraten winnen zetel in staat ${k}`, '', '2026-11-05T10:00:00.000Z'))
  const sig = signatures(items)
  for (const i of items) assert.ok(!sig.get(i.id).known.has('democrats'))
  assert.ok(centralItems(items).length >= 1)
})
