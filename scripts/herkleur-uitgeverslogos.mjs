// Kleurt de bestaande silhouetten in publisher-marks.json om naar layout.mark.ink (zelfde alpha), zonder
// de logo's opnieuw op te halen: gelijk aan wat build-publisher-marks.mjs met dat rood zou schrijven.
// Na een nieuw merkrood in shared/deelkaart/layout.json:  node scripts/herkleur-uitgeverslogos.mjs [--dry]
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, ''), dry = process.argv.includes('--dry')
const layout = JSON.parse(await readFile(root + '/shared/deelkaart/layout.json'))
const ink = layout.mark.ink.slice(1).match(/../g).map(h => parseInt(h, 16))
const marks = JSON.parse(await readFile(root + '/shared/deelkaart/publisher-marks.json'))
const seen = new Map(); let n = 0
for (const [id, uri] of Object.entries(marks)) {
  const buf = Buffer.from(uri.split(',')[1], 'base64')
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const colors = new Set()
  for (let p = 0; p < data.length; p += 4) { colors.add(data[p] + ',' + data[p+1] + ',' + data[p+2]); data[p] = ink[0]; data[p+1] = ink[1]; data[p+2] = ink[2] }
  if (dry) { console.log(id, [...colors].join(' | ')); continue }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
  marks[id] = 'data:image/png;base64,' + png.toString('base64'); n++
}
if (!dry) {
  const body = JSON.stringify(Object.fromEntries(Object.entries(marks).sort()), null, 2) + '\n'
  await writeFile(root + '/shared/deelkaart/publisher-marks.json', body)
  await writeFile(root + '/ios/Hoot/Resources/Deelkaart/publisher-marks.json', body)
  console.log('omgekleurd', n)
}
