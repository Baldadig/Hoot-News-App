// Eenmalig/expliciet vernieuwen met een opgeslagen /api/feed-respons; nooit tijdens delen.
// node scripts/build-publisher-marks.mjs /pad/naar/feed.json
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { SOURCES } from '../netlify/lib/sources.mjs'
import { layout } from '../shared/deelkaart.mjs'

const feed = JSON.parse(await readFile(process.argv[2], 'utf8'))
const known = new Set(SOURCES.map(s => s.id))
const paper = layout.paper.slice(1).match(/../g).map(h => parseInt(h, 16))
const marks = {}, failed = [], fetched = new Map()
async function mono(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw Error(`HTTP ${response.status}`)
  const reader = response.body.getReader(), chunks = []; let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      length += value.length
      if (length > 2e6) throw Error('Logo groter dan 2 MB')
      chunks.push(value)
    }
  } finally { await reader.cancel() }
  const { data, info } = await sharp(Buffer.concat(chunks), { limitInputPixels: 16e6 }).resize(84, 84, { fit: 'contain', background: '#ffffff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  // De achtergrondkleur uit de vier hoeken; op een transparant origineel blijft alpha leidend.
  const corners = [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1].map(n => n * 4)
  const bg = [0, 1, 2].map(c => corners.reduce((n, p) => n + data[p + c], 0) / 4)
  const transparent = corners.some(p => data[p + 3] < 32)
  for (let p = 0; p < data.length; p += 4) {
    const contrast = Math.max(...bg.map((v, c) => Math.abs(v - data[p + c])))
    const alpha = transparent ? data[p + 3] : Math.round(data[p + 3] * Math.min(1, contrast / 120))
    data[p] = paper[0]; data[p + 1] = paper[1]; data[p + 2] = paper[2]; data[p + 3] = alpha
  }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
  return 'data:image/png;base64,' + png.toString('base64')
}
const list = (feed.sources || []).filter(s => known.has(s.id) && /^https:\/\//.test(s.avatar || ''))
for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map(async s => {
  try {
    if (!fetched.has(s.avatar)) fetched.set(s.avatar, mono(s.avatar))
    marks[s.id] = await fetched.get(s.avatar)
  } catch (e) { failed.push({ source: s.id, reason: e.message }) }
}))
const body = JSON.stringify(Object.fromEntries(Object.entries(marks).sort()), null, 2) + '\n'
await writeFile(new URL('../shared/deelkaart/publisher-marks.json', import.meta.url), body)
await writeFile(new URL('../ios/Hoot/Resources/Deelkaart/publisher-marks.json', import.meta.url), body)
console.log(JSON.stringify({ included: Object.keys(marks).length, fallback: failed }, null, 2))
