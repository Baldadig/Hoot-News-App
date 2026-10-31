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
  for (const file of ['layout.json', 'advances.json', 'Newsreader-800.ttf', 'SourceSans3-600.ttf', 'newsreader-OFL.txt', 'source-sans-3-OFL.txt']) {
    assert.deepEqual(await readFile(new URL(`../shared/deelkaart/${file}`, import.meta.url)), await readFile(new URL(`../ios/Hoot/Resources/Deelkaart/${file}`, import.meta.url)), file)
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
