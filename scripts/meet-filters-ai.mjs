#!/usr/bin/env node
// Redacteur · filters-ai / ruis: meting van deel B (de AI) met het echte model. Draai dit vóór je HOOT_EDITIE_AI=aan zet op
// de server. Leest de gelabelde sets (tests/fixtures/editie-filters-sets.json en tests/fixtures/ruis-labels.json, plus elk
// --labels-bestand) en, met --live, de kern van https://gethoot.app/api/feed?deel=kern (alleen GET). Legt elk stuk met een
// zwak signaal dat A laat staan in batches van MAX_BATCH voor aan het model, precies zoals de server: dezelfde `judge`
// (nummer + code per oordeel, een verdachte batch gecontroleerd met gewone stukken uit dezelfde set) en dezelfde time-outs.
//
// Het rapport (op het scherm, en met --rapport <pad.md> ook als bestand):
//   - de eis: nieuws onterecht geweerd = 0, met de koppen en de reden van het model als het misgaat;
//   - vangst: echte deals/aankondigingen door A, en door A+B;
//   - gedrag: aanroepen, verdachte batches, ontspoord, fouten en time-outs, looptijd per aanroep (p50 en max);
//   - kosten (Haiku 5.5: $0,10 / $0,50 per miljoen tokens), en voor de live kern per dagdeel;
//   - het oordeel: mag HOOT_EDITIE_AI=aan, ja of nee.
// Zonder ANTHROPIC_API_KEY: een droge telling (kandidaten, aanroepen, geschatte kosten). Vult nooit zelf een sleutel in.
// Gebruik:
//   ANTHROPIC_API_KEY=… node scripts/meet-filters-ai.mjs [--labels pad.json]... [--live] [--set naam] [--rapport pad.md]
//   node scripts/meet-filters-ai.mjs --proef   (rookproef van het script zelf, met een nep-model; geen sleutel, geen netwerk)
// Afsluitcode 1 als er met een sleutel nieuws onterecht wegvalt, of als aanroepen mislukken.
import { readFileSync, writeFileSync } from 'node:fs'
import { hardMark } from '../shared/editie-filter.mjs'
import { judge, weakSignal, excludes, MAX_BATCH, MODEL, TIMEOUT_MS, CONTROLS } from '../netlify/lib/editie-ai.mjs'

const args = process.argv.slice(2)
const labelFiles = args.flatMap((a, k) => (a === '--labels' ? [args[k + 1]] : []))
const live = args.includes('--live')
const only = args.includes('--set') ? args[args.indexOf('--set') + 1] : null
const reportPath = args.includes('--rapport') ? args[args.indexOf('--rapport') + 1] : null
const IN = 0.1 / 1e6
const OUT = 0.5 / 1e6

const fixture = (f) => JSON.parse(readFileSync(new URL(`../tests/fixtures/${f}`, import.meta.url), 'utf8')).items
const items = [...fixture('editie-filters-sets.json'), ...fixture('ruis-labels.json')]
for (const f of labelFiles) {
  const d = JSON.parse(readFileSync(f, 'utf8'))
  // Twee vormen: { items: [{ set, label, title, url, summary }] } of { nieuws_moet_blijven: [[kop, link, intro]], weg_hoort_eruit, grens_telt_niet_mee }.
  if (Array.isArray(d.items)) items.push(...d.items, ...(d.rand || []).map((x) => ({ ...x, set: x.set || `${f}-rand` })))
  for (const [key, label] of [['nieuws_moet_blijven', 'N'], ['weg_hoort_eruit', 'W'], ['grens_telt_niet_mee', 'G']]) for (const [title, url, summary] of d[key] || []) items.push({ set: f.split('/').pop(), label, title, url, summary })
}
// Dubbele stukken (dezelfde set, kop en link) één keer.
const seenItem = new Set()
const sets = new Map()
items.forEach((x, k) => {
  if (only && x.set !== only) return
  const sig = `${x.set}|${x.title}|${x.url}`
  if (seenItem.has(sig)) return
  seenItem.add(sig)
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
  const xs = [...(kern.items || []), ...(kern.related || []), ...(kern.edition?.items || [])].filter((i) => i?.kind === 'article' && !seen.has(i.id) && seen.add(i.id) && t0 - (Date.parse(i.publishedAt || '') || 0) < 24 * 3600e3).map((i) => ({ ...i, label: '?' }))
  sets.set('live-kern', xs)
}

const key = process.env.ANTHROPIC_API_KEY
let client = null
if (args.includes('--proef')) {
  // Rookproef van dit script zonder sleutel en zonder netwerk: een nep-model dat elk stuk "nieuws, niet zeker" noemt, met de
  // juiste nummers en codes. Meet niets over het echte model.
  client = { messages: { create: async (params) => {
    const codes = [...params.messages[0].content.matchAll(/^ {3}code: (.*)$/gm)].map((m) => m[1])
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ oordelen: codes.map((code, k) => ({ nr: k + 1, code, soort: 'nieuws', zeker: false, reden: 'proef' })) }) }], usage: { input_tokens: 100 * codes.length, output_tokens: 30 * codes.length } }
  } } }
} else if (key) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  client = new Anthropic({ apiKey: key })
}
const lines = []
const say = (s = '') => {
  console.log(s)
  lines.push(s)
}
say(`# Meting deel B (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`)
say()
say(args.includes('--proef') ? 'ROOKPROEF met een nep-model (--proef): dit meet het echte model NIET.' : client ? `Echt gemeten met ${MODEL}, time-out ${TIMEOUT_MS} ms per aanroep, batches van ${MAX_BATCH}.` : 'Geen sleutel (ANTHROPIC_API_KEY staat niet in de omgeving): droge telling, het model is niet gevraagd.')
say()

const rows = []
const wrong = []
const liveWeg = []
const ms = []
const total = { N: 0, Nweg: 0, NwegA: 0, W: 0, Wa: 0, Wb: 0, naarModel: 0, calls: 0, tin: 0, tout: 0, verdacht: 0, ontspoord: 0, fout: 0, timeout: 0 }
for (const [name, xs] of sets) {
  const ask = xs.filter((i) => !hardMark(i) && weakSignal(i))
  // Controlestukken zoals op de server: gewone stukken uit dezelfde set zonder zwak signaal (de labels kijken we niet in).
  const controls = xs.filter((i) => !hardMark(i) && !weakSignal(i)).slice(0, CONTROLS)
  const aWeg = new Set(xs.filter((i) => hardMark(i)).map((i) => i.id))
  const weg = new Map([...aWeg].map((id) => [id, { soort: 'A', reden: 'harde aanwijzing' }]))
  let calls = 0, tin = 0, tout = 0, verdacht = 0, ontspoord = 0, fout = 0, timeout = 0
  for (let k = 0; k < ask.length; k += MAX_BATCH) {
    const batch = ask.slice(k, k + MAX_BATCH)
    calls++
    if (!client) {
      tin += 700 + 95 * batch.length // schatting: systeemprompt + per stuk bron/kop/intro/link/code
      tout += 30 * batch.length
      continue
    }
    try {
      const r = await judge(client, batch, { controls, deadline: Date.now() + 10000 })
      tin += r.usage?.input_tokens || 0
      tout += r.usage?.output_tokens || 0
      ms.push(...(r.ms || []))
      if (r.verdacht) verdacht++
      if (r.ontspoord) ontspoord++
      for (const [id, v] of r.verdicts) if (excludes(v)) weg.set(id, v)
    } catch (e) {
      fout++
      if (/timeout|abort/i.test(`${e?.name} ${e?.message} ${e?.constructor?.name}`)) timeout++
      say(`- ${name}: fout ${e?.constructor?.name || 'fout'}${e?.status ? ` (${e.status})` : ''}`)
    }
  }
  const N = xs.filter((i) => i.label === 'N')
  const W = xs.filter((i) => i.label === 'W')
  // Nieuws dat A weert (de bekende randgevallen, vastgelegd in AI-VERSLAG.md) apart van nieuws dat B weert: de eis voor B is 0.
  const nWegA = N.filter((i) => aWeg.has(i.id))
  const nWeg = N.filter((i) => weg.has(i.id) && !aWeg.has(i.id))
  for (const i of [...nWegA, ...nWeg]) wrong.push({ set: name, title: i.title, url: i.url, door: aWeg.has(i.id) ? 'A' : 'B', ...weg.get(i.id) })
  if (name === 'live-kern') for (const i of xs.filter((i) => weg.has(i.id))) liveWeg.push({ title: i.title, source: i.source, ...weg.get(i.id) })
  const row = { set: name, stukken: xs.length, naarModel: ask.length, aanroepen: calls, nieuws: N.length, nieuwsWeg: nWeg.length, nieuwsWegA: nWegA.length, deals: W.length, A: W.filter((i) => aWeg.has(i.id)).length, AB: W.filter((i) => weg.has(i.id)).length, kosten: tin * IN + tout * OUT, verdacht, ontspoord, fout }
  rows.push(row)
  Object.assign(total, { N: total.N + N.length, Nweg: total.Nweg + nWeg.length, NwegA: total.NwegA + nWegA.length, W: total.W + W.length, Wa: total.Wa + row.A, Wb: total.Wb + row.AB, naarModel: total.naarModel + ask.length, calls: total.calls + calls, tin: total.tin + tin, tout: total.tout + tout, verdacht: total.verdacht + verdacht, ontspoord: total.ontspoord + ontspoord, fout: total.fout + fout, timeout: total.timeout + timeout })
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-')
const usd = (x) => `$${x.toFixed(4)}`
say('| Set | Stukken | Naar model | Aanroepen | Nieuws | Nieuws weg door B | door A | Deals/aank. | A | A+B | Verdacht | Ontspoord | Fout | Kosten |')
say('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const r of rows) say(`| ${r.set} | ${r.stukken} | ${r.naarModel} | ${r.aanroepen} | ${r.nieuws} | ${client ? (r.nieuwsWeg ? `**${r.nieuwsWeg}**` : 0) : '-'} | ${r.nieuwsWegA} | ${r.deals} | ${r.A} | ${client ? r.AB : '-'} | ${r.verdacht} | ${r.ontspoord} | ${r.fout} | ${usd(r.kosten)}${client ? '' : '*'} |`)
say()
const cost = total.tin * IN + total.tout * OUT
say(`**Samen:** nieuws onterecht weg door B **${client ? total.Nweg : '-'} van ${total.N}** (eis 0); door A ${total.NwegA} (alleen de bekende randgevallen van A, sets *-rand); deals/aankondigingen door A ${total.Wa} van ${total.W} (${pct(total.Wa, total.W)})${client ? `, door A+B ${total.Wb} (${pct(total.Wb, total.W)})` : ''}; ${total.naarModel} stukken naar het model in ${total.calls} aanroepen; tokens ${total.tin}/${total.tout}; kosten ${usd(cost)}${client ? '' : ' (geschat)'}; verdacht ${total.verdacht}, ontspoord ${total.ontspoord}, fout ${total.fout} (waarvan time-out ${total.timeout}).`)
if (ms.length) {
  const s = [...ms].sort((a, b) => a - b)
  say(`**Looptijd per aanroep:** p50 ${s[Math.floor(s.length / 2)]} ms, max ${s.at(-1)} ms (grens ${TIMEOUT_MS} ms).`)
}
const liveRow = rows.find((r) => r.set === 'live-kern')
if (liveRow) say(`**Live kern** (stukken jonger dan 24 uur): ${liveRow.naarModel} naar het model, ${liveRow.aanroepen} aanroepen, ${usd(liveRow.kosten)}${client ? '' : ' (geschat)'} voor een koude start; daarna per dagdeel alleen de nieuwe stukken (de cache onthoudt elk oordeel).`)
say()
if (wrong.length) {
  say('## Nieuws onterecht weg')
  for (const w of wrong) say(`- door ${w.door} [${w.set}] ${w.title} (${w.url}) · ${w.soort}${w.reden ? `: ${w.reden}` : ''}`)
  say()
}
if (liveWeg.length) {
  say('## Live: wat B zou weren (zelf nalezen: is het nieuws?)')
  for (const w of liveWeg) say(`- ${w.source}: ${w.title} · ${w.soort}${w.reden ? `: ${w.reden}` : ''}`)
  say()
}
const ok = client && total.Nweg === 0 && total.fout === 0 && total.ontspoord === 0
say('## Oordeel')
if (args.includes('--proef')) say('Rookproef: het script werkt; over het echte model zegt dit niets. HOOT_EDITIE_AI blijft uit.')
else if (!client) say('Niet gemeten (geen sleutel). HOOT_EDITIE_AI blijft uit.')
else if (ok) say(`Eis gehaald: B weert 0 van ${total.N} nieuwskoppen, geen fouten, niets ontspoord. HOOT_EDITIE_AI=aan mag${liveWeg.length ? ', nadat de live lijst hierboven is nagelezen' : ''}.`)
else say(`Eis NIET gehaald: ${total.Nweg} nieuws weg, ${total.fout} fouten (${total.timeout} time-outs), ${total.ontspoord} ontspoord. HOOT_EDITIE_AI blijft uit.`)
if (reportPath) writeFileSync(reportPath, lines.join('\n') + '\n')
if (client && !ok) process.exitCode = 1
