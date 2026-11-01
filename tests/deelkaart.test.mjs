import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { handleCard } from '../netlify/functions/deelkaart.mjs'
import { handleSharePage } from '../netlify/functions/deel.mjs'
import { renderCard } from '../netlify/lib/deelkaart.mjs'
import { rememberShareRecords, shareRecord } from '../netlify/lib/share-records.mjs'
import { titleLines, layout } from '../shared/deelkaart.mjs'
const cases = JSON.parse(await readFile(new URL('./fixtures/deelkaart-cases.json', import.meta.url)))
for (const format of ['link', 'staand']) {
  for (const item of [...cases, { id: 'extreem', title: ('Een extreem lange kop & <bijzonder> nieuws uit São Paulo ').repeat(100), section: 'Wereld', sourceName: 'Bron' }]) {
    test(`A3: geldige PNG ${format}, ${item.id}, maximaal vier regels`, async () => {
      const response = await handleCard(new Request(`https://hootnews.nl/api/deelkaart?id=${item.id}&f=${format}`), { find: async () => item })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'image/png')
      assert.match(response.headers.get('netlify-cdn-cache-control'), /durable/)
      const bytes = Buffer.from(await response.arrayBuffer())
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
      const meta = await sharp(bytes).metadata()
      assert.equal(meta.width, layout.formats[format].width)
      assert.equal(meta.height, layout.formats[format].height)
      assert.ok(titleLines(item.title, format).lines.length <= 4)
      if (item.expected) assert.deepEqual(titleLines(item.title, format), item.expected[format])
    })
  }
}
test('A3: beide platforms bundelen precies dezelfde maten, glyphmaten en lettertypes', async () => {
  for (const file of ['layout.json', 'advances.json', 'publisher-marks.json', 'Newsreader-800.ttf', 'SourceSans3-600.ttf', 'newsreader-OFL.txt', 'source-sans-3-OFL.txt']) {
    assert.deepEqual(await readFile(new URL(`../shared/deelkaart/${file}`, import.meta.url)), await readFile(new URL(`../ios/Hoot/Resources/Deelkaart/${file}`, import.meta.url)), file)
  }
})

test('uitgeverslogo’s zijn lokaal ingebedde PNG’s in uitsluitend papiertint', async () => {
  const marks = JSON.parse(await readFile(new URL('../shared/deelkaart/publisher-marks.json', import.meta.url)))
  for (const source of ['nos', 'nrc', 'nyt']) assert.ok(marks[source], source)
  for (const [source, uri] of Object.entries(marks)) {
    assert.match(uri, /^data:image\/png;base64,/, source)
    const { data, info } = await sharp(Buffer.from(uri.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.width, 84); assert.equal(info.height, 84)
    let ink = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]) {
      assert.deepEqual([...data.subarray(i, i + 3)], [245, 241, 232], source)
      ink++
    }
    assert.ok(ink > 10, source)
  }
})

test('deelkaart met logo, zonder logo, kapot logo en lange bronnaam blijft een geldige PNG', async () => {
  const item = { ...cases[0], sourceName: 'Een zeer lange naam van een onderzoeksredactie '.repeat(8) }
  for (const format of ['link', 'staand']) {
    const normal = await renderCard(item, format)
    const fallback = await renderCard(item, format, { marks: {} })
    const broken = await renderCard(item, format, { marks: { nos: 'data:image/png;base64,iVBORkapot' } })
    assert.notDeepEqual(normal, fallback)
    assert.deepEqual(broken, fallback)
    for (const png of [normal, fallback, broken]) {
      const metadata = await sharp(png).metadata()
      assert.equal(metadata.width, layout.formats[format].width)
      assert.equal(metadata.height, layout.formats[format].height)
    }
  }
})
test('A3: foutcodes, HEAD en ETag zonder opnieuw tekenen', async () => {
  assert.equal((await handleCard(new Request('https://hootnews.nl/api/deelkaart?f=anders'))).status, 400)
  assert.equal((await handleCard(new Request('https://hootnews.nl/api/deelkaart?id=mist'), { find: async () => null })).status, 404)
  assert.equal((await handleCard(new Request('https://hootnews.nl/api/deelkaart', { method: 'POST' }))).status, 405)
  const options = { find: async () => cases[0], render: async () => { throw new Error('mag niet tekenen') } }
  const head = await handleCard(new Request('https://hootnews.nl/api/deelkaart?id=kort', { method: 'HEAD' }), options)
  assert.equal(head.status, 200); assert.equal(await head.text(), '')
  const notModified = await handleCard(new Request('https://hootnews.nl/api/deelkaart?id=kort', { headers: { 'if-none-match': head.headers.get('etag') } }), options)
  assert.equal(notModified.status, 304)
  assert.equal((await handleCard(new Request('https://hootnews.nl/api/deelkaart?id=kort'), options)).status, 503)
})
test('A3: deelpagina levert servermatig eigen og:image en een veilige bronlink', async () => {
  const item = { ...cases[0], title: '<script>alert("x")</script> & nieuws' }
  const response = await handleSharePage(new Request('https://hootnews.nl/deel/kort'), { find: async () => item })
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.match(html, /property="og:image" content="https:\/\/hootnews.nl\/api\/deelkaart\?id=kort&amp;f=link"/)
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('href="https://nos.nl/a"'))
  assert.equal((await handleSharePage(new Request('https://hootnews.nl/deel/mist'), { find: async () => null })).status, 404)
})
test('A3: deelgegevens blijven vindbaar na het verdwijnen uit de feed, ook via verhaal-id', async () => {
  await rememberShareRecords([{ ...cases[0], kind: 'article' }], [{ id: 'verhaal', leadId: 'kort' }], [], Date.now())
  await rememberShareRecords([], [], [], Date.now() + 864e5)
  assert.equal((await shareRecord('kort')).title, cases[0].title)
  assert.equal((await shareRecord('verhaal')).title, cases[0].title)
  assert.equal(await shareRecord('../../secret'), null)
})

// Review 1.0.1, punt 7: na 90 dagen of buiten de 12000 bewaarde verhalen geen dode link.
test('deellink: onbekend verhaal met uitgeverslink gaat naar de uitgever, nooit naar een vreemd domein', async () => {
  const page = (q) => handleSharePage(new Request('https://gethoot.app/deel/oud' + q), { find: async () => null })
  const ok = await page('?bron=' + encodeURIComponent('https://nos.nl/artikel/123-kop'))
  assert.equal(ok.status, 302)
  assert.equal(ok.headers.get('location'), 'https://nos.nl/artikel/123-kop')
  assert.equal((await page('?bron=' + encodeURIComponent('https://www.theguardian.com/world/x'))).headers.get('location'), 'https://www.theguardian.com/world/x')
  for (const bad of ['https://evil.example/nos.nl', 'http://nos.nl/a', 'javascript:alert(1)', 'https://nos.nl.evil.example/a', 'https://user:pw@nos.nl/a', 'https://x.bsky.social/a']) {
    assert.equal((await page('?bron=' + encodeURIComponent(bad))).status, 404, bad)
  }
  assert.equal((await page('')).status, 404)
  // Bekend verhaal: gewoon de deelpagina, de meegegeven link telt niet.
  const known = await handleSharePage(new Request('https://gethoot.app/deel/kort?bron=' + encodeURIComponent('https://nos.nl/b')), { find: async () => ({ id: 'kort', title: 'Kop', url: 'https://nos.nl/a', section: 'Nieuws', source: 'nos' }) })
  assert.equal(known.status, 200)
})
