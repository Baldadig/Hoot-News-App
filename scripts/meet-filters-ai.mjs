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
//   - aanvallen op het vangnet (filters-b, uitgebreid na B-keuring 1): de ankers en tweelingen bij het echte model (moeten
//     allemaal nieuws zijn), en het echte model met een vervalst antwoord zoals een ontspoord model het zou geven: alles weg,
//     per onderwerp (Black Friday, koopdag, korting, prijs, podcast, deal, video, percentages), per bron en domein, zonder
//     intro, op de kopvorm (dubbele punt, vraag), op taal, op namen, op sport, op een woord in de link, het oordeel van de
//     buurman, willekeurig (vast per kop, en per aanroep) en tegenstrijdig; elk bij meerdere batchgroottes. Eis: overal 0
//     nieuws weg. Niet met --set;
//   - het oordeel: mag HOOT_EDITIE_AI=aan, ja of nee.
// Zonder ANTHROPIC_API_KEY: een droge telling (kandidaten, aanroepen, geschatte kosten). Vult nooit zelf een sleutel in.
// Gebruik:
//   ANTHROPIC_API_KEY=… node scripts/meet-filters-ai.mjs [--labels pad.json]... [--live] [--set naam] [--rapport pad.md]
//   node scripts/meet-filters-ai.mjs --proef   (rookproef van het script zelf, met een nep-model; geen sleutel, geen netwerk)
// Afsluitcode 1 als er met een sleutel nieuws onterecht wegvalt (ook in een aanval), of als aanroepen mislukken.
import { readFileSync, writeFileSync } from 'node:fs'
import { hardMark } from '../shared/editie-filter.mjs'
import { judge, askOnce, weakSignal, excludes, controlSet, langOf, namesOf, ANKERS, MAX_BATCH, MODEL, TIMEOUT_MS, CONTROLS_FIRST, CONTROLS_VERIFY, VERIFY_ITEMS } from '../netlify/lib/editie-ai.mjs'

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
  // Zonder `set`-veld heet de set naar het bestand (niet "undefined").
  const base = f.split('/').pop().replace(/\.json$/, '')
  if (Array.isArray(d.items)) items.push(...d.items.map((x) => ({ ...x, set: x.set || base })), ...(d.rand || []).map((x) => ({ ...x, set: x.set || `${base}-rand` })))
  for (const [key, label] of [['nieuws_moet_blijven', 'N'], ['weg_hoort_eruit', 'W'], ['grens_telt_niet_mee', 'G']]) for (const [title, url, summary] of d[key] || []) items.push({ set: base, label, title, url, summary })
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
  // Controlestukken zoals op de server: gewone stukken uit dezelfde set zonder zwak signaal (de labels kijken we niet in);
  // judge kiest daaruit per aanroep de best passende, naast de tweelingen.
  const controls = xs.filter((i) => !hardMark(i) && !weakSignal(i))
  const aWeg = new Set(xs.filter((i) => hardMark(i)).map((i) => i.id))
  const weg = new Map([...aWeg].map((id) => [id, { soort: 'A', reden: 'harde aanwijzing' }]))
  let calls = 0, tin = 0, tout = 0, verdacht = 0, ontspoord = 0, fout = 0, timeout = 0
  for (let k = 0; k < ask.length; k += MAX_BATCH) {
    const batch = ask.slice(k, k + MAX_BATCH)
    calls++
    if (!client) {
      tin += 700 + 95 * (batch.length + CONTROLS_FIRST) // schatting: systeemprompt + per stuk bron/kop/intro/link/code
      tout += 30 * (batch.length + CONTROLS_FIRST)
      // Elke batch waarin iets weg zou gaan, krijgt een controle: de zekere stukken twee keer plus CONTROLS_VERIFY
      // controlestukken (schatting: de gelabelde deals/aankondigingen in de batch, hooguit VERIFY_ITEMS).
      const zeker = Math.min(VERIFY_ITEMS, batch.filter((i) => i.label === 'W').length)
      if (zeker) {
        calls++
        tin += 700 + 95 * (2 * zeker + CONTROLS_VERIFY)
        tout += 30 * (2 * zeker + CONTROLS_VERIFY)
      }
      continue
    }
    try {
      const r = await judge(client, batch, { controls, deadline: Date.now() + 10000 })
      if (r.ms?.length > 1) calls++
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
say('| Set | Stukken | Naar model | Aanroepen | Nieuws | Nieuws weg door B | door A | Deals/aank. | A | A+B | Gecontroleerd | Ontspoord | Fout | Kosten |')
say('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const r of rows) say(`| ${r.set} | ${r.stukken} | ${r.naarModel} | ${r.aanroepen} | ${r.nieuws} | ${client ? (r.nieuwsWeg ? `**${r.nieuwsWeg}**` : 0) : '-'} | ${r.nieuwsWegA} | ${r.deals} | ${r.A} | ${client ? r.AB : '-'} | ${r.verdacht} | ${r.ontspoord} | ${r.fout} | ${usd(r.kosten)}${client ? '' : '*'} |`)
say()
const cost = total.tin * IN + total.tout * OUT
say(`**Samen:** nieuws onterecht weg door B **${client ? total.Nweg : '-'} van ${total.N}** (eis 0); door A ${total.NwegA} (alleen de bekende randgevallen van A, sets *-rand); deals/aankondigingen door A ${total.Wa} van ${total.W} (${pct(total.Wa, total.W)})${client ? `, door A+B ${total.Wb} (${pct(total.Wb, total.W)})` : ''}; ${total.naarModel} stukken naar het model in ${total.calls} aanroepen; tokens ${total.tin}/${total.tout}; kosten ${usd(cost)}${client ? '' : ' (geschat)'}; gecontroleerd ${total.verdacht}, ontspoord ${total.ontspoord}, fout ${total.fout} (waarvan time-out ${total.timeout}).`)
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
// Aanvallen (filters-b, uitgebreid in filters-b-2): het vangnet om het echte model heen. Met een sleutel krijgt het model de
// echte vragen, en een omhulsel vervalst daarna het antwoord zoals een ontspoord model zou doen: elk stuk in de aanroep (ook
// elk controlestuk) met het kenmerk wordt "aanbieding, zeker", de rest houdt het echte oordeel. Eis: in elke aanval 0 nieuws weg.
// De kenmerken komen uit de gegevens zelf (de meest voorkomende domeinen, bronnen en namen); in dit script staan geen bronnen.
const attacks = []
if (client && !only) {
  const newsPool = []
  for (const [name, xs] of sets) if (name !== 'live-kern') newsPool.push(...xs.filter((i) => i.label === 'N' && !hardMark(i) && weakSignal(i)))
  const plain = []
  for (const [name, xs] of sets) if (name !== 'live-kern') plain.push(...xs.filter((i) => !hardMark(i) && !weakSignal(i)))
  const controls = plain
  const rowsOf = (params) => params.messages[0].content.split('\n\n').filter((r) => /^\d+\. bron:/.test(r)).map((r) => ({ bron: (r.match(/bron: (.*)/) || [])[1] || '', kop: (r.match(/ {3}kop: (.*)/) || [])[1] || '', intro: (r.match(/ {3}intro: (.*)/) || [])[1] || '', link: (r.match(/ {3}link: (.*)/) || [])[1] || '', code: (r.match(/ {3}code: (.*)/) || [])[1] || '' }))
  const wrap = (rewrite) => {
    let n = 0
    return { messages: { create: async (params, opts) => {
      const res = await client.messages.create(params, opts)
      let data = { oordelen: [] }
      try { data = JSON.parse((res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')) } catch {}
      const oordelen = rewrite(Array.isArray(data?.oordelen) ? data.oordelen : [], rowsOf(params), ++n)
      return { ...res, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ oordelen }) }] }
    } } }
  }
  const zeker = (nr, code) => ({ nr, code, soort: 'aanbieding', zeker: true, reden: 'aanval' })
  const real = (os, r, j) => os.find((o) => o?.nr === j + 1) || { nr: j + 1, code: r.code, soort: 'nieuws', zeker: false, reden: 'aanval' }
  // Een ontsporing op een kenmerk van de rij (bron, kop, intro, link).
  const skewOf = (flag) => wrap((os, rows, call) => rows.map((r, j) => (flag(r, j, rows, call) ? zeker(j + 1, r.code) : real(os, r, j))))
  let tinA = 0, toutA = 0
  // Over `items` in batches van `size` (hooguit `maxBatches` batches): hoeveel nieuws weg, ontspoord gezien, fouten.
  const run = async (naam, items, c, { sizes = [MAX_BATCH, 3], maxBatches = 3 } = {}) => {
    for (const size of sizes) {
      const row = { naam: `${naam}, ${size}`, stukken: 0, weg: 0, ontspoord: false, fout: null }
      for (let k = 0, b = 0; k < items.length && b < maxBatches; k += size, b++) {
        const batch = items.slice(k, k + size)
        row.stukken += batch.length
        try {
          const r = await judge(typeof c === 'function' ? c() : c, batch, { controls, deadline: Date.now() + 10000 })
          row.weg += batch.filter((i) => excludes(r.verdicts.get(i.id))).length
          row.ontspoord ||= !!r.ontspoord
          tinA += r.usage?.input_tokens || 0
          toutA += r.usage?.output_tokens || 0
        } catch (e) {
          row.fout = e?.constructor?.name || 'fout'
        }
      }
      attacks.push(row)
    }
  }
  // Stukken met het kenmerk eerst (tot 20 per batch van 40), aangevuld met ander nieuws.
  const focus = (flag) => {
    const on = newsPool.filter(flag), off = newsPool.filter((i) => !flag(i))
    return on.length >= 3 ? [...on.slice(0, 20), ...off.slice(0, MAX_BATCH - Math.min(20, on.length)), ...on.slice(20)] : null
  }
  const asRow = (i) => ({ bron: String(i.sourceName || i.source || ''), kop: i.title || '', intro: i.borrowedFrom || !String(i.summary || '').trim() ? '(geen)' : String(i.summary), link: String(i.url || '') })
  const top = (xs, n) => [...xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].filter(([x]) => x).sort((a, b) => b[1] - a[1]).slice(0, n).map(([x]) => x)
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
  // 1. De ankers bij het echte model, los en als tweelingen van echte nieuwsstukken: ze moeten allemaal nieuws zijn.
  for (const [naam, list] of [['ankers', ANKERS], ['tweelingen', controlSet(newsPool.slice(0, 10), { max: 30 }).filter((c) => c.anker)]]) {
    try {
      const r = await askOnce(client, list)
      tinA += r.usage?.input_tokens || 0
      toutA += r.usage?.output_tokens || 0
      const weg = [...r.byNr.values()].filter(excludes).length
      attacks.push({ naam: `${naam} (echt model, eis: alle nieuws)`, stukken: list.length, weg, ontspoord: false, fout: r.byNr.size === list.length ? null : `${list.length - r.byNr.size} zonder oordeel` })
    } catch (e) {
      attacks.push({ naam: `${naam} (echt model, eis: alle nieuws)`, stukken: list.length, weg: 0, ontspoord: false, fout: e?.constructor?.name || 'fout' })
    }
  }
  // 2. Alles weg.
  await run('alles-weg', newsPool, skewOf(() => true), { sizes: [MAX_BATCH, 5, 1], maxBatches: 2 })
  // 3. Per onderwerp.
  const TOPICS = [/black friday|cyber monday|prime day/i, /koopdag|uitverkoop|koopje/i, /korting|discount|aanbieding/i, /prij[sz]|price/i, /podcast|aflevering|episode/i, /deal/i, /video|kijk|watch|stream/i, /\d\s?(%|procent|percent)/i]
  for (const topic of TOPICS) {
    const items = focus((i) => topic.test(i.title))
    if (items) await run(`onderwerp ${topic.source.replace(/\\d\\s\?/g, 'getal ').replace(/[()]/g, '').replace(/\|/g, ' / ')}`, items, skewOf((r) => topic.test(r.kop)))
  }
  // 4. Kenmerken buiten het onderwerp: domein en bron (de drie meest voorkomende), intro, kopvorm, taal, namen, sport, link.
  const feats = []
  for (const h of top(newsPool.map((i) => hostOf(i.url)), 3)) feats.push([`domein ${h}`, (r) => hostOf(r.link) === h])
  for (const b of top(newsPool.map((i) => String(i.sourceName || i.source || '')), 3)) feats.push([`bron ${b}`, (r) => r.bron === b])
  feats.push(['zonder intro', (r) => r.intro === '(geen)'], ['kopvorm dubbele punt', (r) => /:/.test(r.kop)], ['kopvorm vraag', (r) => /\?\s*$/.test(r.kop)])
  feats.push(['taal Engels', (r) => langOf({ title: r.kop, summary: r.intro === '(geen)' ? '' : r.intro, url: r.link }) === 'en'], ['taal Nederlands', (r) => langOf({ title: r.kop, summary: r.intro === '(geen)' ? '' : r.intro, url: r.link }) === 'nl'])
  feats.push(['een naam in de kop', (r) => namesOf(r.kop).length > 0])
  for (const n of top(newsPool.flatMap((i) => namesOf(i.title, i.summary)), 3)) feats.push([`naam ${n}`, (r) => r.kop.includes(n)])
  feats.push(['sport', (r) => /voetbal|wedstrijd|coach|trainer|kampioen|elftal|competitie|match|league|football|soccer|tennis|wielren|formule/i.test(r.kop)])
  for (const w of top(newsPool.flatMap((i) => (String(i.url || '').toLowerCase().match(/[a-z]{5,}/g) || []).filter((x) => !/https?|www/.test(x))), 2)) feats.push([`woord "${w}" in de link`, (r) => r.link.toLowerCase().includes(w)])
  for (const [naam, flag] of feats) {
    const items = focus((i) => flag(asRow(i)))
    if (items) await run(naam, items, skewOf(flag))
  }
  // 5. Het oordeel van de buurman (één plek opgeschoven), en willekeurig: vast per kop (20%) en per aanroep (10% en 30%).
  await run('oordeel van de buurman', newsPool, () => wrap((os, rows) => rows.map((r, j) => { const o = os.find((x) => x?.nr === ((j + rows.length - 1) % rows.length) + 1); return { ...(o || real(os, r, j)), nr: j + 1, code: r.code, ...(o ? {} : {}) } })), { sizes: [MAX_BATCH, 3] })
  const h = (t) => { let x = 0; for (const c of t) x = (x * 31 + c.charCodeAt(0)) | 0; return Math.abs(x) }
  await run('willekeurig vast per kop 20%', newsPool, skewOf((r) => h(r.kop) % 5 === 0), { sizes: [MAX_BATCH, 3, 1], maxBatches: 20 })
  for (const p of [0.1, 0.3]) {
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    await run(`willekeurig per aanroep ${Math.round(p * 100)}%`, newsPool, skewOf(() => rnd() < p), { sizes: [MAX_BATCH, 3], maxBatches: 20 })
  }
  // 6. Tegenstrijdig: na elk oordeel een tweede over hetzelfde nummer dat het tegendeel zegt.
  await run('tegenstrijdig', newsPool, wrap((os) => os.flatMap((o) => [o, excludes(o) ? { ...o, soort: 'nieuws' } : { ...o, soort: 'aanbieding', zeker: true }])), { sizes: [MAX_BATCH], maxBatches: 2 })
  total.tin += tinA
  total.tout += toutA
  say('## Aanvallen op het vangnet (eis: 0 nieuws weg)')
  say()
  say('| Aanval | Stukken | Nieuws weg | Ontspoord gezien | Fout |')
  say('| --- | ---: | ---: | --- | --- |')
  for (const a of attacks) say(`| ${a.naam} | ${a.stukken} | ${a.weg ? `**${a.weg}**` : 0} | ${a.ontspoord ? 'ja' : '-'} | ${a.fout || '-'} |`)
  say()
  say(`${attacks.length} aanvallen; kosten: ${usd(tinA * IN + toutA * OUT)}.`)
  say()
}
const attacksOk = attacks.every((a) => a.weg === 0 && !a.fout)
const ok = client && total.Nweg === 0 && total.fout === 0 && total.ontspoord === 0 && attacksOk
say('## Oordeel')
if (args.includes('--proef')) say('Rookproef: het script werkt; over het echte model zegt dit niets. HOOT_EDITIE_AI blijft uit.')
else if (!client) say('Niet gemeten (geen sleutel). HOOT_EDITIE_AI blijft uit.')
else if (ok) say(`Eis gehaald: B weert 0 van ${total.N} nieuwskoppen, geen fouten, niets ontspoord${attacks.length ? `, ${attacks.length} aanvallen zonder nieuws weg` : ''}. HOOT_EDITIE_AI=aan mag${liveWeg.length ? ', nadat de live lijst hierboven is nagelezen' : ''}.`)
else say(`Eis NIET gehaald: ${total.Nweg} nieuws weg, ${total.fout} fouten (${total.timeout} time-outs), ${total.ontspoord} ontspoord, ${attacks.filter((a) => a.weg || a.fout).length} aanvallen mislukt. HOOT_EDITIE_AI blijft uit.`)
if (reportPath) writeFileSync(reportPath, lines.join('\n') + '\n')
if (client && !ok) process.exitCode = 1
