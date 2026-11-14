// Luister verder, de proef (stap 2): welke verhalen kregen welke aflevering, en welke kandidaten vielen af, met reden.
// Draait op de live feeds: de verhalen van gethoot.app (/api/feed?deel=kern) en de officiële podcastfeeds uit
// netlify/lib/luister.mjs (SHOWS), met de eerlijke User-Agent van Hoot. Schrijft Markdown (of JSON met --json).
//
//   node scripts/luister-proef.mjs                       de koppelingen van vandaag, als Markdown op stdout
//   node scripts/luister-proef.mjs --uit <bestand.md>    … naar een bestand
//   node scripts/luister-proef.mjs --json                ruwe rijen
//   node scripts/luister-proef.mjs --kern <kern.json>    een bewaarde kern in plaats van de live feed
//   node scripts/luister-proef.mjs --opslag <x.json>     de afleveringen bewaren en hergebruiken (hooguit eens per half uur)
//   node scripts/luister-proef.mjs --naam PROEF-2         de titel van het verslag (standaard PROEF-2)
//
// Per dagdeel: het huidige dagdeel met de verhalen zoals de server ze nu heeft; een eerder dagdeel van vandaag als nabouw
// (de stukken die er toen al waren, opnieuw gebundeld zoals op de server, en de afleveringen die toen al verschenen).
// Geen persoonsgegevens: alleen verhalen, shows en afleveringen.
import { readFileSync, writeFileSync } from 'node:fs'
import { UA, MAIN_IDS } from '../netlify/lib/sources.mjs'
import { loadEpisodes, koppel, SHOWS, FETCHED, FRESH_H, BEFORE_H, DEEP_H } from '../netlify/lib/luister.mjs'
import { buildStories, editionSlot } from '../netlify/lib/stories.mjs'
import { SLOT_START } from '../shared/slot-times.mjs'

const args = process.argv.slice(2)
const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null)

async function loadKern() {
  const f = opt('--kern')
  if (f) return JSON.parse(readFileSync(f, 'utf8'))
  const res = await fetch('https://gethoot.app/api/feed?deel=kern', { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error('kern: HTTP ' + res.status)
  return res.json()
}

// Het moment van de laatste ronde van een dagdeel (tien minuten voor het volgende), in UTC, voor de datum van vandaag.
function slotEnd(date, slot) {
  const next = { ochtend: SLOT_START.middag, middag: SLOT_START.avond }[slot]
  const local = new Date(`${date}T00:00:00Z`).getTime() + (next - 10) * 6e4
  const offset = new Date(local).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam', timeZoneName: 'shortOffset' }).match(/GMT([+-]\d+)/)
  return local - (offset ? Number(offset[1]) : 1) * 36e5
}

const kern = await loadKern()
const now = Date.parse(kern.meta?.updatedAt) || Date.now()
// --opslag <bestand.json>: de afleveringen bewaren en hergebruiken (een feed hooguit eens per half uur, net als de server).
const opslag = opt('--opslag')
const mem = new Map()
if (opslag) try { mem.set('store', JSON.parse(readFileSync(opslag, 'utf8'))) } catch {}
const { episodes, status } = await loadEpisodes({ now: Date.now(), deadline: Date.now() + 20000, get: () => mem.get('store'), set: (k, v) => (mem.set('store', v), opslag && writeFileSync(opslag, JSON.stringify(v))) })
const byId = new Map((kern.related || []).map((i) => [i.id, i]))
const cur = editionSlot(new Date(now))
const runs = []
// Eerdere dagdelen van vandaag als nabouw, dan het huidige.
for (const slot of ['ochtend', 'middag']) {
  if (slot === cur.slot) break
  const at = slotEnd(cur.date, slot)
  const items = [...byId.values()].filter((i) => Date.parse(i.publishedAt) <= at)
  const stories = buildStories(items, {}, { mainIds: MAIN_IDS, keys: false, extended: true })
  const r = koppel({ stories, byId: new Map(items.map((i) => [i.id, i])), episodes: episodes.filter((e) => e.t <= at), now: at, mainIds: MAIN_IDS })
  runs.push({ dagdeel: `${cur.date}-${slot}`, nabouw: true, at, stories: stories.length, ...r })
}
const r = koppel({ stories: kern.stories || [], byId, episodes: episodes.filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
runs.push({ dagdeel: cur.id, nabouw: false, at: now, stories: (kern.stories || []).length, ...r })

if (args.includes('--json')) {
  console.log(JSON.stringify({ status, afleveringen: episodes.length, dagdelen: runs.map(({ byStory, ...x }) => ({ ...x, luister: Object.fromEntries(byStory) })) }, null, 1))
  process.exit(0)
}

const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
const out = []
out.push(`# Luister verder · ${opt('--naam') || 'PROEF-2'}`)
out.push('')
out.push(`Gedraaid op ${new Date().toISOString().slice(0, 10)} op de live feeds: de verhalen van gethoot.app (feed van ${kern.meta?.updatedAt?.slice(0, 16).replace('T', ' ')} UTC) en ${FETCHED.length} officiële podcastfeeds (${episodes.length} afleveringen van de afgelopen drie dagen). Code: branch \`luister\`, \`netlify/lib/luister.mjs\` (de koppeling) en \`scripts/luister-proef.mjs\` (dit verslag). Lezers zien nog niets.`)
out.push('')
out.push('## Regels')
out.push('')
out.push(`- **Hetzelfde**: de aflevering linkt naar een stuk in het verhaal (hooguit ${FRESH_H} uur oud, niet meer dan ${BEFORE_H} uur vóór het eerste stuk), of titel en beschrijving delen twee centrale namen (of één plus dezelfde handeling) én dezelfde gebeurtenis (sameEvent) en de aflevering verscheen ná het eerste stuk van het verhaal. Anders hooguit verdiepend.`)
out.push(`- **Verdiepend**: dezelfde hoofdnamen (twee centrale namen, één in de titel) en dezelfde kwestie, als achtergrond. Hooguit ${DEEP_H / 24} dagen oud. Nooit één gedeelde naam.`)
out.push('- Een artikellink telt alleen met een gedeelde naam in de titel van de aflevering; links naar de eigen uitgever tellen ook (alleen de pagina van de show valt weg). Overzichtsshows nooit; shows met meer onderwerpen en weekshows alleen via een artikellink.')
out.push('- Zonder artikellink ook (keuring 14 november): de aflevering gaat over één onderwerp (geen "Ook…", "Verder ook aandacht voor…", inhoudsopgave), het eerste onderwerp van de beschrijving is het verhaal, de rest van de beschrijving gaat niet over iets anders, en noemt de kop van het verhaal namen, dan staat er een in de aflevering. Een vooruitblik van vóór de kop koppelt nooit. Een samengestelde naam ("Jong Oranje") telt als één naam.')
out.push('- Eén aflevering per verhaal; past een aflevering bij twee verhalen, dan krijgt geen van beide haar. Voorrang: dezelfde uitgever als de kop, dan een bron die de lezer volgt (voor de algemene lezer de basisbronnen), dan een Nederlandstalige show. Taal volgt de bronkeuze: een Engelse show alleen voor wie die bron volgt.')
out.push('')
out.push('## Shows')
out.push('')
out.push('| Show | Uitgever | Soort | Taal | Feed |')
out.push('|---|---|---|---|---|')
for (const s of SHOWS) out.push(`| ${s.naam} | ${s.uitgever} | ${s.soort} | ${s.taal} | ${s.soort === 'overzicht' ? 'niet opgehaald (koppelt nooit)' : status[s.id] || '-'} |`)
out.push('')
for (const run of runs) {
  out.push(`## ${run.dagdeel}${run.nabouw ? ' (nabouw)' : ''}`)
  out.push('')
  out.push(`${run.stories} verhalen, ${run.rows.koppelingen.length} koppelingen (${run.rows.koppelingen.filter((k) => k.soort === 'hetzelfde').length} hetzelfde, ${run.rows.koppelingen.filter((k) => k.soort === 'verdiepend').length} verdiepend).`)
  out.push('')
  if (run.rows.koppelingen.length) {
    out.push('### Koppelingen')
    out.push('')
    out.push('| Verhaal (kop) | Aflevering | Soort | Grond | Zelfde uitgever | Algemene lezer | Reden |')
    out.push('|---|---|---|---|---|---|---|')
    for (const k of run.rows.koppelingen) out.push(`| ${esc(k.kop)} | ${esc(k.show)}: ${esc(k.aflevering)} (${k.verschenen}) | ${k.soort} | ${k.grond === 'link' ? 'artikellink' : 'tekst'} | ${k.dezelfdeUitgever ? 'ja' : 'nee'} | ${k.algemeen ? 'ja' : 'alleen wie de bron volgt'} | ${esc(k.reden)}${k.andere?.length ? `; ook: ${esc(k.andere.join('; '))}` : ''} |`)
    out.push('')
  }
  if (run.rows.afgevallen.length) {
    out.push('### Afgevallen kandidaten')
    out.push('')
    out.push('Een kandidaat deelt minstens één centrale naam met het verhaal.')
    out.push('')
    out.push('| Verhaal (kop) | Aflevering | Reden |')
    out.push('|---|---|---|')
    for (const a of run.rows.afgevallen) out.push(`| ${esc(a.kop)} | ${esc(a.show)}: ${esc(a.aflevering)} (${a.verschenen}) | ${esc(a.reden)} |`)
    out.push('')
  }
}
const md = out.join('\n')
const uit = opt('--uit')
if (uit) writeFileSync(uit, md + '\n')
else console.log(md)
