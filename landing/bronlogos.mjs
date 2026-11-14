// Ververst de logo's van de bronnen voor het bronnenblok van de landing (landing/bronnen/<id>.webp, 192 px: scherp tot 64 px op een scherm met drie beeldpunten per punt).
// Het zijn dezelfde avatars die de app bij elke bron toont (feed.sources[].avatar). Alleen GET, niets naar de server.
// Gebruik: node landing/bronlogos.mjs            haalt https://gethoot.app/api/feed op
//          node landing/bronlogos.mjs feed.json  werkt met een bewaarde feed
//          node landing/bronlogos.mjs --nieuw    alleen de bronnen van de catalogus die nog geen logo-bestand hebben
//          node landing/bronlogos.mjs --id=groene alleen deze bron (ook --id=a,b)
// Een bron die (nog) niet in de feed staat (net toegevoegd), krijgt het beeld zoals de server het kiest (rss.mjs):
// `logo`, dan het Bluesky-profielbeeld (`bsky`), dan X (`x`, via unavatar.io).
// Draai dit als er een bron bij komt of een uitgever zijn logo wijzigt; build.mjs zet de bestanden in dist/img/bronnen.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { SOURCES } from '../netlify/lib/sources.mjs'

const HIER = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname))
const UIT = path.join(HIER, 'bronnen')
const NIEUW = process.argv.includes('--nieuw')
const ALLEEN = (process.argv.find((a) => a.startsWith('--id=')) || '').slice(5).split(',').filter(Boolean)
const bestand = process.argv.slice(2).find((a) => !a.startsWith('--'))
const feed = NIEUW ? { sources: [] } : bestand ? JSON.parse(fs.readFileSync(bestand, 'utf8')) : await (await fetch('https://gethoot.app/api/feed', { headers: { accept: 'application/json' } })).json()
const bekend = new Set(SOURCES.map((s) => s.id))
const lijst = (feed.sources || []).filter((s) => bekend.has(s.id) && /^https:\/\//.test(s.avatar || ''))
const inFeed = new Set(lijst.map((s) => s.id))
const heeftBestand = (id) => fs.existsSync(path.join(UIT, id + '.webp'))
async function bskyBeeld(handle) {
  try {
    const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`, { signal: AbortSignal.timeout(8000) })
    return r.ok ? (await r.json()).avatar || null : null
  } catch {
    return null
  }
}
for (const s of SOURCES) {
  if (inFeed.has(s.id) || (NIEUW && heeftBestand(s.id))) continue
  const avatar = s.logo || (s.bsky && (await bskyBeeld(s.bsky))) || (s.x ? `https://unavatar.io/x/${s.x}?fallback=false` : null)
  if (avatar) lijst.push({ id: s.id, avatar })
}
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
  rd: 'https://www.rd.nl/RDnl-Apple-iPhone-Retina-180x180.png', // het Bluesky-beeld heeft een grijze lijn langs de linkerrand
}
// 13 november 2026: bij 'rd', 'rtvutrecht', 'mediacourant', 'humo' en 'bruzz' raakt het woordmerk de rand.
// 14 november 2026: ook bij 'fox', 'euronews' en 'thefp' (bronnen-internationaal, nagekeken op een vel met ronde uitsneden).
const LUCHT = new Set(['tubantia', 'bd', 'ed', 'bndestem', 'pzc', 'nieuwsblad', 'rd', 'rtvutrecht', 'mediacourant', 'humo', 'bruzz', 'fox', 'euronews', 'thefp'])
// Waar elk vierkant beeld van de uitgever een afgesneden woordmerk is, het volledige woordmerk uit het eigen SVG-bestand van
// de site, met de viewBox om het hele woordmerk en zonder uitsnede, liggend en gecentreerd op wit (past in de ronde uitsnede).
// 14 november 2026: De Groene toont op site, Bluesky, X, Facebook en Threads "DE GR / AMST"; icon.svg bevat het hele woordmerk.
const WOORDMERK = {
  groene: { url: 'https://www.groene.nl/icon.svg', viewBox: '-40 -10 2460 800' },
}
async function woordmerk({ url, viewBox }) {
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const svg = (await r.text()).replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`).replace(/clip-path:url\([^)]*\);?/g, '').replace(/\sclip-path="[^"]*"/g, '')
  const merk = await sharp(Buffer.from(svg), { density: 200 }).flatten({ background: '#ffffff' }).trim().resize(164, 164, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = merk.info
  const top = Math.floor((192 - h) / 2), left = Math.floor((192 - w) / 2)
  return sharp(merk.data).extend({ top, bottom: 192 - h - top, left, right: 192 - w - left, background: '#ffffff' }).webp({ quality: 90 })
}
for (const s of lijst) if (WOORDMERK[s.id]) s.woordmerk = WOORDMERK[s.id]
if (ALLEEN.length) lijst.splice(0, lijst.length, ...lijst.filter((s) => ALLEEN.includes(s.id)))
const mis = []
for (let i = 0; i < lijst.length; i += 8) {
  await Promise.all(lijst.slice(i, i + 8).map(async (s) => {
    try {
      if (s.woordmerk) return void (await (await woordmerk(s.woordmerk)).toFile(path.join(UIT, s.id + '.webp')))
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
