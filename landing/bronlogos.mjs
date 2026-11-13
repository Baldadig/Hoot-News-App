// Ververst de logo's van de bronnen voor het bronnenblok van de landing (landing/bronnen/<id>.webp, 192 px: scherp tot 64 px op een scherm met drie beeldpunten per punt).
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
// Waar de avatar van de app klein is (een favicon van 128 px), het officiele profielbeeld of app-icoon van de uitgever.
// Nagekeken op 13 november 2026; let op bij 'bd': x/bdnl is een ander account, het goede is x/brabantsdagblad.
const BETER = {
  tubantia: 'https://unavatar.io/x/tubantia?fallback=false',
  bd: 'https://unavatar.io/x/brabantsdagblad?fallback=false',
  limburger: 'https://unavatar.io/x/delimburger?fallback=false',
  ed: 'https://unavatar.io/x/ed_regio?fallback=false',
  bndestem: 'https://unavatar.io/x/bndestem?fallback=false',
  pzc: 'https://unavatar.io/x/pzcredactie?fallback=false',
  nieuwsblad: 'https://unavatar.io/x/nieuwsblad_be?fallback=false',
  guardian: 'https://assets.guim.co.uk/static/frontend/icons/homescreen/apple-touch-icon-512.png',
}
const LUCHT = new Set(['tubantia', 'bd', 'ed', 'bndestem', 'pzc', 'nieuwsblad'])
const mis = []
for (let i = 0; i < lijst.length; i += 8) {
  await Promise.all(lijst.slice(i, i + 8).map(async (s) => {
    try {
      const r = await fetch(BETER[s.id] || s.avatar, { signal: AbortSignal.timeout(12000) })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const b = Buffer.from(await r.arrayBuffer())
      if (b.length > 2e6) throw new Error('groter dan 2 MB')
      if (LUCHT.has(s.id)) {
        // een logo dat het hele vierkant vult zou in de ronde uitsnede zijn letters verliezen: kleiner, op zijn eigen randkleur
        const { data } = await sharp(b).resize(8, 8).raw().toBuffer({ resolveWithObject: true })
        const bg = { r: data[0], g: data[1], b: data[2] }
        const klein = await sharp(b, { limitInputPixels: 16e6 }).resize(150, 150).flatten({ background: bg }).extend({ top: 21, bottom: 21, left: 21, right: 21, background: bg }).png().toBuffer()
        await sharp(klein).webp({ quality: 90 }).toFile(path.join(UIT, s.id + '.webp'))
        return
      }
      await sharp(b, { limitInputPixels: 16e6 }).resize(192, 192, { fit: s.avatarContain && !BETER[s.id] ? 'contain' : 'cover', background: '#ffffff' }).flatten({ background: '#ffffff' }).webp({ quality: 90 }).toFile(path.join(UIT, s.id + '.webp'))
    } catch (e) {
      mis.push(`${s.id}: ${e.message}`) // het oude bestand blijft staan
    }
  }))
}
console.log(`logo's: ${lijst.length - mis.length} van ${lijst.length} ververst${mis.length ? '; niet gelukt: ' + mis.join(', ') : ''}`)
