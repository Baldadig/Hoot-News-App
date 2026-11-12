// Proef "Waar media verschillen": per verhaal de alinea, het bewijs per zin en de weggevallen zinnen met reden.
//   node scripts/verschillen-proef.mjs <PROEF.md> [--json <blokken.json>] [--kern <kern.json>]
//   node scripts/verschillen-proef.mjs <PROEF.md> --live [--json <blokken.json>]
//     De echte meting vóór het aanzetten: haalt de Editie van nu op (GET https://gethoot.app/api/feed?deel=kern,
//     bewaard naast PROEF.md als kern-<tijd>.json) en laat de echte modellen elk verhaal schrijven en keuren.
//     Weigert zonder ANTHROPIC_API_KEY (dan is er niets te meten). Schrijft niets naar KV en raakt de feed niet aan.
// Met ANTHROPIC_API_KEY in de omgeving schrijven en controleren de echte modellen (Sonnet 5.5, Haiku 5.5);
// zonder sleutel de nagebootste antwoorden uit tests/fixtures/verschillen/nagebootst.json. De verhalen: de drie
// van 11 november (bewaard feedfragment), en met --kern (een opgeslagen GET /api/feed?deel=kern) welke verhalen
// van de Editie van nu een blok kunnen krijgen.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { maakVerschillen, verschillenRows, kandidaten, rowsInput, VERSCHILLEN_SCHRIJVER, VERSCHILLEN_CONTROLE } from '../netlify/lib/verschillen.mjs'
import { nepClient, metBronIds } from './verschillen-nep.mjs'

const args = process.argv.slice(2)
const uit = args[0]
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
const root = new URL('..', import.meta.url)
const feed = JSON.parse(readFileSync(new URL('tests/fixtures/verschillen/feed-fragment-2026-11-11.json', root)))
const nagebootst = JSON.parse(readFileSync(new URL('tests/fixtures/verschillen/nagebootst.json', root))).verhalen
const echt = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60000, maxRetries: 1 }) : null
if (args.includes('--live')) {
  if (!echt) {
    console.error('--live meet de echte modellen en vraagt ANTHROPIC_API_KEY in de omgeving; zonder sleutel is er niets te meten.')
    process.exit(2)
  }
  const res = await fetch('https://gethoot.app/api/feed?deel=kern', { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`feed: ${res.status}`)
  const kern = await res.json()
  const pad = join(dirname(resolve(uit)), `kern-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`)
  writeFileSync(pad, JSON.stringify(kern))
  args.push('--kern', pad)
  console.log(`live feed bewaard: ${pad}`)
}
const woorden = (t) => t.split(/\s+/).filter(Boolean).length

const md = []
const blokken = {}
md.push('# Proef · Waar media verschillen', '')
md.push(`Gemaakt met \`node scripts/verschillen-proef.mjs\` op branch \`verschillen-2\`. Schrijver \`${VERSCHILLEN_SCHRIJVER}\`, controle \`${VERSCHILLEN_CONTROLE}\`, daarna de codecontrole (citeerplicht).`, '')
md.push(
  echt
    ? '**Modellen: echt** (ANTHROPIC_API_KEY stond in de omgeving).'
    : '**Modellen: nagebootst. Er was geen sleutel.** Er stond geen ANTHROPIC_API_KEY in de omgeving, dus er is geen enkel echt model aangeroepen. De antwoorden van schrijver en controle komen uit `tests/fixtures/verschillen/nagebootst.json` en `nagebootst-live.json`: met de hand opgesteld in de vorm van het structured-output-antwoord, met opzet met zwakke zinnen (vals contrast, een verschil met één kant, "ook" naar een andere zin, twee telwoorden, "zeker" dat de bron niet zegt) om de keuringen te laten zien. **De codecontrole, het samenstellen en het weigeren zijn echt**: dat is de code die op de server draait. **De oordelen van de controle (Haiku) zijn met de hand ingevuld**: ze laten zien wat er gebeurt als de controle een zin afkeurt, niet óf Haiku 5.5 dat echt doet. Hoe goed Sonnet 5.5 schrijft en of Haiku 5.5 eenzijdige contrasten weigert, laat dit níet zien. Dat vraagt de meting met sleutel: `node scripts/verschillen-proef.mjs PROEF-LIVE.md --live` (zie "Klaar voor aanzetten" in VERSLAG.md).',
  '',
)

md.push('## De drie verhalen van 11 november (bewaard feedfragment)', '')
for (const v of feed.verhalen) {
  const itemsById = new Map(metBronIds(v.items).map((i) => [i.id, i]))
  const story = { id: v.id, itemIds: v.items.map((i) => i.id), sourceNames: v.sourceNames }
  const { rows, alle } = verschillenRows(story, itemsById) // alleen Nederlandstalige regels (taal volgt bronkeuze)
  const client = echt || nepClient(nagebootst[v.id])
  const { resultaat, verslag } = await maakVerschillen(client, { rows, alle, storyNames: v.sourceNames }, { now: Date.parse('2026-11-11T16:30:00Z') })
  const naam = nagebootst[v.id]?.naam || v.id
  md.push(`### ${naam} (\`${v.id}\`, ${v.sourceNames.length} bronnen, ${rows.length} Nederlandstalige stukken in de invoer)`, '')
  if (resultaat) {
    blokken[v.id] = resultaat
    md.push(`**Blok** (${resultaat.woorden} woorden):`, '')
    for (const d of resultaat.delen) md.push(`> ${d.tekst}`, '>')
    md.pop()
    md.push('', '**Bewijs per zin** (elk fragment staat letterlijk in kop of intro van dat stuk; de codecontrole heeft het nagezocht):', '')
    for (const z of verslag.zinnen) {
      md.push(`- *${z.soort}* · ${z.tekst}`)
      for (const b of z.bewijs) md.push(`  - ${b.bron}: "${b.fragment}"`)
    }
  } else {
    md.push(`**Geen blok.** Reden: ${verslag.waarom}.`)
  }
  md.push('', `**Weggevallen zinnen** (${verslag.weg.length}):`, '')
  if (!verslag.weg.length) md.push('- geen')
  for (const w of verslag.weg) md.push(`- [${w.stap}] ${w.tekst}`, `  - reden: ${w.reden.join('; ')}`)
  md.push('')
}

const kernPad = opt('--kern')
// Zonder sleutel: voor een paar verhalen van de live Editie een nagebootste schrijver (tests/fixtures/verschillen/
// nagebootst-live.json), zodat de echte codecontrole ook op de feed van nu draait.
const live = kernPad ? JSON.parse(readFileSync(new URL('tests/fixtures/verschillen/nagebootst-live.json', root))).verhalen : {}
const liveVerslag = []
if (kernPad) {
  const kern = JSON.parse(readFileSync(kernPad))
  const items = new Map((kern.related || []).map((i) => [i.id, i]))
  const storyById = new Map((kern.stories || []).map((s) => [s.id, s]))
  const lijst = kandidaten(kern.edition.entries, storyById, items)
  md.push(`## De Editie van nu (${kern.edition.id}, live feed, opgehaald ${kern.meta?.updatedAt || '?'})`, '')
  md.push(`${kern.edition.entries.length} plekken; ${lijst.length} verhalen met drie of meer Nederlandstalige uitgevers kunnen een blok krijgen (taal volgt bronkeuze).`, '')
  md.push('| Verhaal | Kop (hoofdbericht) | Uitgevers | Stukken in de invoer | Blok |', '|---|---|---|---|---|')
  for (const st of lijst) {
    const { rows, alle } = verschillenRows(st, items)
    let blok = 'niet geschreven: geen sleutel'
    const nep = !echt && live[st.id]
    if (nep) {
      const r = await maakVerschillen(nepClient(nep), { rows, alle, storyNames: st.sourceNames || [] }, { now: Date.parse(kern.meta?.updatedAt || 0) || Date.now() })
      if (r.resultaat) blokken[st.id] = r.resultaat
      blok = `nagebootst: ${r.resultaat ? r.resultaat.delen.map((d) => d.tekst).join(' / ') : `geen blok (${r.verslag.waarom})`}`
      liveVerslag.push({ st, naam: nep.naam, rows, ...r })
    }
    if (echt) {
      try {
        const r = await maakVerschillen(echt, { rows, alle, storyNames: st.sourceNames || [] })
        if (r.resultaat) blokken[st.id] = r.resultaat
        blok = r.resultaat ? r.resultaat.delen.map((d) => d.tekst).join(' / ') : `geen: ${r.verslag.waarom}`
        liveVerslag.push({ st, naam: (items.get(st.leadId) || items.get(st.itemIds[0]))?.title || st.id, rows, ...r })
      } catch (e) {
        blok = `fout: ${String(e?.message || e).slice(0, 80)}`
      }
    }
    const kop = (items.get(st.leadId) || items.get(st.itemIds[0]))?.title || '?'
    md.push(`| \`${st.id}\` | ${kop.replace(/\|/g, '/')} | ${st.publisherCount ?? '?'} | ${rows.length} | ${blok} |`)
  }
  const zonder = kern.edition.entries.filter((e) => !lijst.some((s) => s.id === e.id))
  md.push('', `Zonder blok (los stuk, vastgehouden of minder dan drie Nederlandstalige uitgevers): ${zonder.map((e) => `\`${e.id}\``).join(', ') || 'geen'}.`, '')
  if (!echt && lijst[0]) {
    const { rows } = verschillenRows(lijst[0], items)
    md.push(`Zo ziet de invoer voor de schrijver eruit (eerste verhaal, \`${lijst[0].id}\`, ingekort tot vijf regels):`, '', '```', ...rowsInput(rows).split('\n').slice(0, 5), '```', '')
  }
}

if (liveVerslag.length) {
  md.push(
    echt ? '### Live verhalen, per zin (echte modellen)' : '### Live verhalen met een nagebootste schrijver',
    '',
    echt
      ? 'Lees elk blok tegen de bronregels hieronder: draagt elk fragment de zin, noemt een verschil beide kanten, en ontbreekt er geen bron die hetzelfde zegt?'
      : 'De codecontrole en het samenstellen zijn echt; schrijver en controle zijn met de hand nagebootst (`nagebootst-live.json`). De controle keurt het randgeval uit keuring 2 (NU.nl tegenover ND en RTL Nieuws) af als eenzijdig; het reserveverschil komt erdoor.',
    '',
  )
  for (const v of liveVerslag) {
    md.push(`#### ${v.naam} (\`${v.st.id}\`, ${v.st.sourceNames?.length} bronnen, ${v.rows.length} stukken in de invoer)`, '')
    if (v.resultaat) {
      md.push(`**Blok** (${v.resultaat.woorden} woorden):`, '')
      for (const d of v.resultaat.delen) md.push(`> ${d.tekst}`, '>')
      md.pop()
      md.push('', '**Bewijs per zin:**', '')
      for (const z of v.verslag.zinnen) {
        md.push(`- *${z.soort}* · ${z.tekst}`)
        for (const b of z.bewijs) md.push(`  - ${b.bron}: "${b.fragment}"`)
      }
    } else md.push(`**Geen blok.** Reden: ${v.verslag.waarom}. `)
    md.push('', `**Weggevallen zinnen** (${v.verslag.weg.length}):`, '')
    if (!v.verslag.weg.length) md.push('- geen')
    for (const w of v.verslag.weg) md.push(`- [${w.stap}] ${w.tekst}`, `  - reden: ${w.reden.join('; ')}`)
    md.push('')
  }
}

writeFileSync(uit, md.join('\n') + '\n')
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify(blokken, null, 2))
console.log(`proef: ${Object.keys(blokken).length} blok(ken), ${echt ? 'echte modellen' : 'nagebootst'} → ${uit}`)
console.log('woorden:', Object.values(blokken).map((b) => b.woorden ?? woorden(b.delen.map((d) => d.tekst).join(' '))).join(', '))
