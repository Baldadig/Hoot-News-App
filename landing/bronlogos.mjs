// Ververst de logo's van de bronnen voor het bronnenblok van de landing (landing/bronnen/<id>.webp, 128 px).
// Het zijn dezelfde avatars die de app bij elke bron toont (feed.sources[].avatar). Alleen GET, niets naar de server.
// Gebruik: node landing/bronlogos.mjs            haalt https://gethoot.app/api/feed op
//          node landing/bronlogos.mjs feed.json  werkt met een bewaarde feed
// Draai dit als er een bron bij komt of een uitgever zijn logo wijzigt; build.mjs zet de bestanden in dist/img/bronnen.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { SOURCES } from '../netlify/lib/sources.mjs'

const HIER = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname))
const UIT = path.join(HIER, 'bronnen')
const feed = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : await (await fetch('https://gethoot.app/api/feed', { headers: { accept: 'application/json' } })).json()
const bekend = new Set(SOURCES.map((s) => s.id))
const lijst = (feed.sources || []).filter((s) => bekend.has(s.id) && /^https:\/\//.test(s.avatar || ''))
fs.mkdirSync(UIT, { recursive: true })
const mis = []
for (let i = 0; i < lijst.length; i += 8) {
  await Promise.all(lijst.slice(i, i + 8).map(async (s) => {
    try {
      const r = await fetch(s.avatar, { signal: AbortSignal.timeout(12000) })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const b = Buffer.from(await r.arrayBuffer())
      if (b.length > 2e6) throw new Error('groter dan 2 MB')
      await sharp(b, { limitInputPixels: 16e6 }).resize(128, 128, { fit: s.avatarContain ? 'contain' : 'cover', background: '#ffffff' }).flatten({ background: '#ffffff' }).webp({ quality: 86 }).toFile(path.join(UIT, s.id + '.webp'))
    } catch (e) {
      mis.push(`${s.id}: ${e.message}`) // het oude bestand blijft staan
    }
  }))
}
console.log(`logo's: ${lijst.length - mis.length} van ${lijst.length} ververst${mis.length ? '; niet gelukt: ' + mis.join(', ') : ''}`)
