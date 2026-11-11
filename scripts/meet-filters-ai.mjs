#!/usr/bin/env node
// Redacteur · filters-ai · meting van deel B met het echte model (herstel AI-keuring 1). Draai dit vóór je HOOT_EDITIE_AI=aan
// zet op de server. Leest de gelabelde sets (tests/fixtures/editie-filters-sets.json, plus elk --labels-bestand) en, met
// --live, de kern van https://gethoot.app/api/feed?deel=kern (alleen GET). Legt elk zwak-signaalstuk dat A laat staan in
// batches van MAX_BATCH voor aan het model, precies zoals de server (judge: kop-echo, plausibiliteitsgrens), en meldt:
//   - nieuws onterecht geweerd (eis: 0), met de koppen;
//   - echte deals/aankondigingen gevangen (%);
//   - tokens en kosten (Haiku 5.5: $0,10 / $0,50 per miljoen tokens), en voor de live kern per dagdeel.
// Zonder ANTHROPIC_API_KEY: een droge telling (kandidaten, aanroepen, geschatte kosten) en "geen sleutel". Vult nooit zelf
// een sleutel in. Gebruik: node scripts/meet-filters-ai.mjs [--labels pad.json]... [--live] [--set naam]
import { readFileSync } from 'node:fs'
import { hardMark } from '../shared/editie-filter.mjs'
import { judge, weakSignal, excludes, MAX_BATCH, MODEL } from '../netlify/lib/editie-ai.mjs'

const args = process.argv.slice(2)
const labelFiles = args.flatMap((a, k) => (a === '--labels' ? [args[k + 1]] : []))
const live = args.includes('--live')
const only = args.includes('--set') ? args[args.indexOf('--set') + 1] : null
const IN = 0.1 / 1e6
const OUT = 0.5 / 1e6

const items = JSON.parse(readFileSync(new URL('../tests/fixtures/editie-filters-sets.json', import.meta.url), 'utf8')).items
for (const f of labelFiles) items.push(...JSON.parse(readFileSync(f, 'utf8')).items)
const sets = new Map()
items.forEach((x, k) => {
  if (only && x.set !== only) return
  const it = { kind: 'article', id: `m${k}`, sourceName: x.source, ...x }
  if (!sets.has(x.set)) sets.set(x.set, [])
  sets.get(x.set).push(it)
})
if (live) {
  const res = await fetch('https://gethoot.app/api/feed?deel=kern')
  const kern = await res.json()
  // De kern draagt de stukken in `items` en `related`; zoals candidates() alleen wat jonger is dan 24 uur.
  const seen = new Set()
  const t0 = Date.now()
  const xs = [...(kern.items || []), ...(kern.related || [])].filter((i) => i?.kind === 'article' && !seen.has(i.id) && seen.add(i.id) && t0 - (Date.parse(i.publishedAt || '') || 0) < 24 * 3600e3).map((i) => ({ ...i, label: '?' }))
  sets.set('live-kern', xs)
}

const key = process.env.ANTHROPIC_API_KEY
let client = null
if (key) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  client = new Anthropic({ apiKey: key })
}
console.log(client ? `Echt gemeten met ${MODEL}.` : 'Geen sleutel (ANTHROPIC_API_KEY staat niet in de omgeving): droge telling, het model is niet gevraagd.')

const total = { N: 0, Nweg: 0, W: 0, Wa: 0, Wb: 0, calls: 0, tin: 0, tout: 0, ontspoord: 0, fout: 0 }
for (const [name, xs] of sets) {
  const ask = xs.filter((i) => !hardMark(i) && weakSignal(i))
  const weg = new Set(xs.filter((i) => hardMark(i)).map((i) => i.id))
  const aWeg = new Set(weg)
  let calls = 0, tin = 0, tout = 0, ontspoord = 0, fout = 0
  for (let k = 0; k < ask.length; k += MAX_BATCH) {
    const batch = ask.slice(k, k + MAX_BATCH)
    calls++
    if (!client) {
      tin += 700 + 95 * batch.length // schatting: systeemprompt + per stuk bron/kop/intro/link
      tout += 35 * batch.length
      continue
    }
    try {
      const r = await judge(client, batch)
      tin += r.usage?.input_tokens || 0
      tout += r.usage?.output_tokens || 0
      if (r.ontspoord) ontspoord++
      for (const [id, v] of r.verdicts) if (excludes(v)) weg.add(id)
    } catch (e) {
      fout++
      console.log(`  ${name}: fout ${e?.constructor?.name || 'fout'}`)
    }
  }
  const N = xs.filter((i) => i.label === 'N')
  const W = xs.filter((i) => i.label === 'W')
  const nWeg = N.filter((i) => weg.has(i.id))
  const row = { set: name, stukken: xs.length, naarModel: ask.length, aanroepen: calls, nieuws: N.length, nieuwsWeg: nWeg.length, deals: W.length, A: W.filter((i) => aWeg.has(i.id)).length, AplusB: W.filter((i) => weg.has(i.id)).length, kosten: `$${(tin * IN + tout * OUT).toFixed(4)}`, ontspoord, fout }
  if (name === 'live-kern') row.geweerd = weg.size
  console.log(JSON.stringify(row))
  for (const i of nWeg) console.log(`  NIEUWS ONTERECHT WEG: ${i.title}`)
  if (name === 'live-kern' && client) for (const i of xs.filter((i) => weg.has(i.id))) console.log(`  live weg: ${i.title}`)
  Object.assign(total, { N: total.N + N.length, Nweg: total.Nweg + nWeg.length, W: total.W + W.length, Wa: total.Wa + row.A, Wb: total.Wb + row.AplusB, calls: total.calls + calls, tin: total.tin + tin, tout: total.tout + tout, ontspoord: total.ontspoord + ontspoord, fout: total.fout + fout })
}
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-')
console.log(`Samen: nieuws onterecht weg ${total.Nweg} van ${total.N}; deals/aankondigingen A ${total.Wa} van ${total.W} (${pct(total.Wa, total.W)}), A+B ${total.Wb} (${pct(total.Wb, total.W)}); ${total.calls} aanroepen, tokens ${total.tin}/${total.tout}, kosten $${(total.tin * IN + total.tout * OUT).toFixed(4)}${client ? '' : ' (geschat)'}; ontspoord ${total.ontspoord}, fout ${total.fout}`)
if (client && total.Nweg > 0) process.exitCode = 1
