// Luister verder, de proef (stap 2): welke verhalen kregen welke aflevering, en welke kandidaten vielen af, met reden.
// Draait op de live feeds: de verhalen van gethoot.app (/api/feed?deel=kern) en de officiële podcastfeeds uit
// netlify/lib/luister.mjs (SHOWS), met de eerlijke User-Agent van Hoot. Schrijft Markdown (of JSON met --json).
//
//   node scripts/luister-proef.mjs                       de koppelingen van vandaag, als Markdown op stdout
//   node scripts/luister-proef.mjs --uit <bestand.md>    … naar een bestand
//   node scripts/luister-proef.mjs --json                ruwe rijen
//   node scripts/luister-proef.mjs --kern <kern.json>    een bewaarde kern in plaats van de live feed
//   node scripts/luister-proef.mjs --opslag <x.json>     de afleveringen bewaren en hergebruiken (hooguit eens per half uur)
//   node scripts/luister-proef.mjs --naam PROEF-2         de titel van het verslag (standaard PROEF)
//   node scripts/luister-proef.mjs --nep                  een nep-oordeel (ja waar de woordregels koppelen), zonder AI
//   node scripts/luister-proef.mjs --oordelen <x.json>    de oordelen bewaren en hergebruiken (elk paar één keer gevraagd)
//   node scripts/luister-proef.mjs --fixture <f.json>     een bewaarde fixture (tests/fixtures/luister-*.json: stories,
//                                                         items, now en episodes en/of rauw) in plaats van de live feeds;
//                                                         geen netwerk. Meer keren --fixture: de verhalen van de eerste,
//                                                         de afleveringen van allemaal.
//
// Per dagdeel: het huidige dagdeel met de verhalen zoals de server ze nu heeft; een eerder dagdeel van vandaag als nabouw
// (de stukken die er toen al waren, opnieuw gebundeld zoals op de server, en de afleveringen die toen al verschenen).
// Geen persoonsgegevens: alleen verhalen, shows en afleveringen.
//
// Het oordeel (besluit Alex 14 november): elke kandidaat gaat langs De Redacteur, zoals in de ronde (koppelMetOordeel).
// Met ANTHROPIC_API_KEY in de omgeving het echte model (hetzelfde als de server); met --nep een nep-oordeel; anders geen
// oordeel (dan alleen een artikellink van de eigen uitgever, zoals de server zonder sleutel). Vult nooit zelf een sleutel in.
import { readFileSync, writeFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { UA, MAIN_IDS } from '../netlify/lib/sources.mjs'
import { loadEpisodes, koppel, koppelMetOordeel, leesVraag, vastVan, episodeOf, editiePlekken, SHOW, SHOWS, FETCHED, FRESH_H, BEFORE_H, DEEP_H, OORDEEL_MODEL } from '../netlify/lib/luister.mjs'
import { buildStories, editionSlot } from '../netlify/lib/stories.mjs'
import { SLOT_START } from '../shared/slot-times.mjs'

const args = process.argv.slice(2)
const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null)

// Een fixture: `episodes` zoals ze in de opslag staan, en/of `rauw` (de feed-items per show, zoals de feed ze gaf), die
// hier net als op de server worden gelezen (vastVan, episodeOf).
const fixtures = args.flatMap((a, k) => (a === '--fixture' ? [JSON.parse(readFileSync(args[k + 1], 'utf8'))] : []))
const fixtureEpisodes = (fx) => [
  ...(fx.episodes || []),
  ...Object.entries(fx.rauw || {}).flatMap(([id, f]) => {
    if (!SHOW.has(id)) return []
    const vast = vastVan(f.items)
    return f.items.map((it) => episodeOf(SHOW.get(id), it, f.link, vast)).filter(Boolean).map((e) => ({ ...e, ...(vast.namen.length ? { vast: vast.namen } : {}) }))
  }),
]

async function loadKern() {
  if (fixtures.length) return { stories: fixtures[0].stories, related: fixtures[0].items, meta: { updatedAt: fixtures[0].now } }
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
const { episodes, status } = fixtures.length
  ? { episodes: fixtures.flatMap(fixtureEpisodes), status: Object.fromEntries(FETCHED.map((s) => [s.id, 'uit de fixture'])) }
  : await loadEpisodes({ now: Date.now(), deadline: Date.now() + 20000, get: () => mem.get('store'), set: (k, v) => (mem.set('store', v), opslag && writeFileSync(opslag, JSON.stringify(v))) })
const byId = new Map((kern.related || []).map((i) => [i.id, i]))
const cur = editionSlot(new Date(now))
const runs = []
// Het oordeel: de opslag in het geheugen (met --oordelen ook in een bestand), en de client.
const oordeelBestand = opt('--oordelen')
const kv = new Map()
if (oordeelBestand) try { for (const [k, v] of Object.entries(JSON.parse(readFileSync(oordeelBestand, 'utf8')))) kv.set(k, v) } catch {}
const get = (k) => kv.get(k)
const update = (k, fn) => {
  kv.set(k, fn(kv.get(k) ?? null))
  if (oordeelBestand) writeFileSync(oordeelBestand, JSON.stringify(Object.fromEntries(kv)))
}
const stand = args.includes('--nep') ? 'nep' : process.env.ANTHROPIC_API_KEY ? 'model' : 'geen'
// Het nep-oordeel: ja precies waar de woordregels (koppel zonder oordeel) koppelen.
const nep = (opts) => {
  const ja = new Set(koppel(opts).rows.koppelingen.map((k) => `${k.kop}|${k.aflevering}`))
  return { messages: { create: async (req) => {
    const vragen = leesVraag(req.messages[0].content)
    const oordelen = vragen.map((v) => ({ nr: v.nr, code: v.code, ...(ja.has(`${v.kop}|${v.titel}`) ? { soort: 'zelfde', vooruitblikOpVoorbij: 'nee', opgenomenVoorDitNieuws: 'nee', eenOnderwerp: 'ja', zeker: 'ja', reden: 'nep: de woordregels koppelen hier' } : { soort: 'anders', vooruitblikOpVoorbij: 'nee', opgenomenVoorDitNieuws: 'nee', eenOnderwerp: 'ja', zeker: 'ja', reden: 'nep: de woordregels koppelen hier niet' }) }))
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ oordelen }) }], usage: { input_tokens: Math.round(req.messages[0].content.length / 3.5), output_tokens: 45 * vragen.length } }
  } } }
}
const clientVoor = (opts) => (stand === 'nep' ? nep(opts) : stand === 'model' ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25000, maxRetries: 1 }) : null)
const draai = async (opts) => ({ woord: koppel(opts).byStory.size, ...(await koppelMetOordeel({ ...opts, client: clientVoor(opts), get, update })) })
// Eerdere dagdelen van vandaag als nabouw, dan het huidige.
for (const slot of ['ochtend', 'middag']) {
  if (slot === cur.slot) break
  const at = slotEnd(cur.date, slot)
  const items = [...byId.values()].filter((i) => Date.parse(i.publishedAt) <= at)
  const stories = buildStories(items, {}, { mainIds: MAIN_IDS, keys: false, extended: true })
  const r = await draai({ stories, byId: new Map(items.map((i) => [i.id, i])), episodes: episodes.filter((e) => e.t <= at), now: at, mainIds: MAIN_IDS })
  runs.push({ dagdeel: `${cur.date}-${slot}`, nabouw: true, at, stories: stories.length, ...r })
}
// De Editieplekken van het huidige dagdeel: de verhalen van de algemene Editie zoals de server ze nu heeft (de kern; de
// Editiepool staat daar niet in). Een nabouw heeft geen Editieplekken.
// --pool <id,id>: verhalen die in de Editiepool staan (de persoonlijke Edities; die staan niet in de kern).
const editieIds = editiePlekken(kern.edition?.entries || [], kern.stories || [])
const poolIds = new Set((opt('--pool') || '').split(',').filter(Boolean))
const editie = editieIds.size || poolIds.size ? { algemeen: editieIds, pool: poolIds } : null
const r = await draai({ stories: kern.stories || [], byId, episodes: episodes.filter((e) => e.t <= now), now, mainIds: MAIN_IDS, editie })
runs.push({ dagdeel: cur.id, nabouw: false, at: now, stories: (kern.stories || []).length, ...r })

if (args.includes('--json')) {
  console.log(JSON.stringify({ status, oordeel: stand, afleveringen: episodes.length, dagdelen: runs.map(({ byStory, ...x }) => ({ ...x, luister: Object.fromEntries(byStory) })) }, null, 1))
  process.exit(0)
}

const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
const oordeelTekst = (o) => (o ? `${o.soort}, vooruitblik op voorbij ${o.vooruitblikOpVoorbij}, opgenomen vóór dit nieuws ${o.opgenomenVoorDitNieuws}, één onderwerp ${o.eenOnderwerp}, zeker ${o.zeker}` : 'geen')
const out = []
out.push(`# Luister verder · ${opt('--naam') || 'PROEF'}`)
out.push('')
out.push(`Gedraaid op ${new Date().toISOString().slice(0, 10)} ${fixtures.length ? `op ${fixtures.length === 1 ? 'een fixture' : `${fixtures.length} fixtures`} (verhalen van ${kern.meta?.updatedAt?.slice(0, 16).replace('T', ' ')} UTC, ${episodes.length} afleveringen)` : `op de live feeds: de verhalen van gethoot.app (feed van ${kern.meta?.updatedAt?.slice(0, 16).replace('T', ' ')} UTC) en ${FETCHED.length} officiële podcastfeeds (${episodes.length} afleveringen van de afgelopen drie dagen)`}. Code: \`netlify/lib/luister.mjs\` (de koppeling) en \`scripts/luister-proef.mjs\` (dit verslag). Lezers zien nog niets.`)
out.push('')
out.push('## Regels')
out.push('')
out.push(`- **Het oordeel** (besluit 14 november): de woordregels zoeken de kandidaten (een artikellink, een centrale naam van het verhaal in de titel, of twee centrale namen; bij BNR twee) en sluiten hard uit (na de opname, een mengverhaal (de kop deelt de gebeurtenis niet en de aflevering noemt niet waar de kop over gaat), meer onderwerpen, een meeronderwerpenshow zonder artikellink en zonder naam van het verhaal in de titel, een weekshow zonder artikellink met een weekoverzicht, ouder dan ${DEEP_H / 24} dagen). Het laatste woord ligt bij De Redacteur (${stand === 'model' ? `het echte model, ${OORDEEL_MODEL}` : stand === 'nep' ? 'hier een nep-oordeel' : 'hier geen oordeel: zonder sleutel'}): alleen soort zelfde (na het begin van het nieuws; ruim ervoor telt als verdieping) of verdieping (tot ${DEEP_H / 24} dagen ouder dan de kop), geen vooruitblik waarvan de vraag inmiddels beantwoord is, niet opgenomen vóór dit nieuws en één onderwerp ja koppelt (breder sinds 18 november: zeker ja alleen nog bij BNR en een weekshow zonder artikellink). Eén verhaal per vraag, één keer gevraagd, met het hele verhaal en de hele beschrijving; elk paar wordt één keer beoordeeld, met een dagplafond voor de kosten.`)
out.push(`- **Hetzelfde** alleen vers (hooguit ${FRESH_H} uur oud, zonder artikellink niet van vóór het eerste stuk, met een link niet meer dan ${BEFORE_H} uur ervoor); anders verdiepend.`)
out.push('- Zonder sleutel of bij een fout van het model: alleen een artikellink van de eigen uitgever. Niet op tijd: geen koppeling, de volgende ronde opnieuw.')
out.push('- Eén aflevering per verhaal; past een aflevering bij twee verhalen, dan krijgt het verhaal met een Editieplek haar (de algemene Editie, dan de Editiepool), bij dezelfde plek geen van beide. Een aflevering van de eigen bron van het verhaal gaat voor BNR. Voorrang: dezelfde uitgever als de kop, dan een bron die de lezer volgt, dan een Nederlandstalige show. Taal volgt de bronkeuze.')
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
  const o = run.ai || {}
  out.push(`${run.stories} verhalen, ${run.rows.koppelingen.length} koppelingen (${run.rows.koppelingen.filter((k) => k.soort === 'hetzelfde').length} hetzelfde, ${run.rows.koppelingen.filter((k) => k.soort === 'verdiepend').length} verdiepend); de woordregels alleen: ${run.woord}. Oordeel (${o.model}): ${o.uit ? `uit, ${o.uit}` : `${o.kandidaten || 0} kandidaten, ${o.uitOpslag || 0} uit de opslag, ${o.gevraagd || 0} gevraagd in ${o.aanroepen || 0} aanroepen, ${o.invoerTokens || 0} en ${o.uitvoerTokens || 0} tokens (ongeveer $${o.kostenUsd ?? 0})${o.timeouts ? `, ${o.timeouts} niet op tijd` : ''}${o.fouten ? `, ${o.fouten} fouten` : ''}`}.`)
  out.push('')
  if (run.rows.koppelingen.length) {
    out.push('### Koppelingen')
    out.push('')
    out.push('| Verhaal (kop) | Aflevering | Soort | Oordeel | Grond | Editie | Zelfde uitgever | Algemene lezer | Reden |')
    out.push('|---|---|---|---|---|---|---|---|---|')
    for (const k of run.rows.koppelingen) out.push(`| ${esc(k.kop)} | ${esc(k.show)}: ${esc(k.aflevering)} (${k.verschenen}) | ${k.soort} | ${oordeelTekst(k.oordeel)} | ${k.grond === 'link' ? 'artikellink' : 'tekst'} | ${esc(k.editie || '')} | ${k.dezelfdeUitgever ? 'ja' : 'nee'} | ${k.algemeen ? 'ja' : 'alleen wie de bron volgt'} | ${esc(k.reden)}${k.andere?.length ? `; ook: ${esc(k.andere.join('; '))}` : ''} |`)
    out.push('')
  }
  if (run.rows.afgevallen.length) {
    out.push('### Afgevallen kandidaten')
    out.push('')
    out.push('Een kandidaat deelt minstens één centrale naam met het verhaal. Bij een oordeel staat de reden van het model erbij.')
    out.push('')
    out.push('| Verhaal (kop) | Aflevering | Oordeel | Reden |')
    out.push('|---|---|---|---|')
    for (const a of run.rows.afgevallen) out.push(`| ${esc(a.kop)} | ${esc(a.show)}: ${esc(a.aflevering)} (${a.verschenen}) | ${oordeelTekst(a.oordeel)} | ${esc(a.reden)} |`)
    out.push('')
  }
}
const md = out.join('\n')
const uit = opt('--uit')
if (uit) writeFileSync(uit, md + '\n')
else console.log(md)
