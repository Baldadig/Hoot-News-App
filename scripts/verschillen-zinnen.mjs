// Meet hoeveel foute zinnen de codecontrole van "Waar media verschillen" zelf tegenhoudt, en of de goede zinnen
// erdoor komen (tests/fixtures/verschillen/zinnen-keuring.json: keuring 3 en 4 plus nieuwe varianten).
// gebruik: node scripts/verschillen-zinnen.mjs [pad/naar/netlify/lib/verschillen.mjs] [--alles]
// Zonder pad: de eigen codecontrole. Met een pad (bv. van main in een andere map): ter vergelijking.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { metBronIds } from './verschillen-nep.mjs'

const args = process.argv.slice(2)
const lib = args.find((a) => !a.startsWith('--'))
const V = await import(lib ? pathToFileURL(lib).href : '../netlify/lib/verschillen.mjs')
const src = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'))
const feed = src('tests/fixtures/verschillen/feed-fragment-2026-11-11.json')
const live = src('tests/fixtures/verschillen/live-belastingplan-2026-11-11.json').verhaal
const set = src('tests/fixtures/verschillen/zinnen-keuring.json')
const ctx = (s, opts) => {
  const items = metBronIds(s.items)
  const story = { id: s.id, itemIds: items.map((i) => i.id), sourceNames: s.sourceNames }
  const { rows, alle } = V.verschillenRows(story, new Map(items.map((i) => [i.id, i])), opts)
  return { rows, alle, storyNames: s.sourceNames }
}
const byId = (id) => feed.verhalen.find((v) => v.id === id)
export const VERHALEN = { LIVE: ctx(live), BEL: ctx(byId('sts2z5a')), BOM: ctx(byId('s11wahg9')), HEG_NL: ctx(byId('s1rwx2k0')), HEG: ctx(byId('s1rwx2k0'), { taal: null }) }

const fout = set.fout.map((x) => ({ ...x, reden: V.toetsZin(x.zin, VERHALEN[x.verhaal]) }))
const goed = set.goed.map((x) => ({ ...x, reden: V.toetsZin(x.zin, VERHALEN[x.verhaal]) }))
const per = {}
for (const x of fout) {
  const k = `${x.bron} · ${x.soort}`
  per[k] ??= { n: 0, code: 0 }
  per[k].n++
  if (x.reden.length) per[k].code++
}
for (const [k, v] of Object.entries(per)) console.log(`${k.padEnd(24)} ${v.code}/${v.n}`)
for (const bron of ['keuring-3', 'keuring-4', 'nieuw']) {
  const d = fout.filter((x) => x.bron === bron)
  console.log(`${bron}: ${d.filter((x) => x.reden.length).length} van ${d.length} in code gevangen`)
}
console.log(`totaal fout: ${fout.filter((x) => x.reden.length).length} van ${fout.length} in code gevangen`)
console.log(`goed: ${goed.filter((x) => !x.reden.length).length} van ${goed.length} komen erdoor`)
for (const x of fout) if (!x.reden.length || args.includes('--alles')) console.log(`${x.reden.length ? 'GEVANGEN' : 'DOOR    '} [${x.bron} · ${x.soort}] ${x.naam}${x.reden.length ? ' — ' + x.reden.slice(0, 2).join(' | ') : ''}`)
for (const x of goed) if (x.reden.length) console.log(`AFGEKEURD (goed!) ${x.naam} — ${x.reden.join(' | ')}`)
