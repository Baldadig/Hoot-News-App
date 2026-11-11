// De scorekaart over bewaarde feeds (frisse ogen · 2): de vijf KPI's van de algemene Editie per dagdeel, als meetlat
// voor elke volgende ronde. Dezelfde rekenregels als de server bij het vastleggen (netlify/lib/scorekaart.mjs).
//
//   node scripts/scorekaart.mjs                     de Edities zoals lezers ze zagen (de `edition` in elke feed)
//   node scripts/scorekaart.mjs --herbouw           de algemene Editie opnieuw samengesteld met de code van deze map
//   node scripts/scorekaart.mjs --herbouw --root <map>          … met de code van een andere map (bijv. main)
//   node scripts/scorekaart.mjs --herbouw --naast <map>         … en elk verschil per dagdeel tegenover die map
//   node scripts/scorekaart.mjs --json              ruwe rijen
//   node scripts/scorekaart.mjs <feed.json(.gz)|map> …           andere feeds dan de standaardset
//
// Standaardset: de feeds in tests/fixtures (met een Editie) en, als ze er zijn, de ijkset van 4 november en de feed
// van 11 november uit het onderzoek. Eén feed per dagdeel: de eerste die na het vastleggen is opgehaald.
//
// Herbouw: de berichten die er bij het vastleggen al waren (publishedAt ≤ builtAt), gebundeld zoals op de server; de
// vorige Editie is die uit de feed van het vorige dagdeel als die in de set zit (wat lezers toen zagen). De trends voor
// Buiten je bubbel staan niet in een feed: we nemen de signalen die de server toen bij de bubbel bewaarde (`terms`).
// De feed bevat alleen de basisbronnen plus de stukken van verhalen: de herbouw is dus indicatief, net als de nabouw in
// het onderzoek, maar voor twee mappen gelijk, zodat elk verschil uit de code komt.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DESIGN = resolve(HERE, '..', 'Hoot-design')
export const DEFAULT_INPUTS = [
  join(HERE, 'tests/fixtures'),
  join(DESIGN, 'woensdag-2026-11-04/ijkset/feeds'),
  join(DESIGN, 'editie-doel-onderzoek/_data/feed-2026-11-11-ochtend-0658Z.json.gz'),
]

const args = process.argv.slice(2)
const flag = (f) => args.includes(f)
const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null)
const positional = args.filter((a, k) => !a.startsWith('--') && !['--root', '--naast'].includes(args[k - 1]))

export const loadFeed = (f) => JSON.parse((f.endsWith('.gz') ? gunzipSync(readFileSync(f)) : readFileSync(f)).toString('utf8'))
function feedFiles(inputs) {
  const out = []
  for (const p of inputs) {
    if (!existsSync(p)) continue
    if (statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) { if (/\.json(\.gz)?$/.test(f)) out.push(join(p, f)) }
    else out.push(p)
  }
  return out
}
// Eén feed per dagdeel: met een Editie en berichten, de eerste die na het vastleggen is opgehaald.
export function loadSet(inputs = DEFAULT_INPUTS) {
  const best = new Map()
  for (const f of feedFiles(inputs)) {
    let d
    try {
      d = loadFeed(f)
    } catch {
      continue
    }
    const e = d?.edition
    if (!e?.id || !Array.isArray(e.entries) || !Array.isArray(d.items) || !Array.isArray(d.stories) || !Array.isArray(d.sources)) continue
    const fetched = Date.parse(d.meta?.updatedAt || d.fetchedAt || e.builtAt)
    const key = `${e.id}@${e.builtAt}`
    const cur = best.get(key)
    if (!cur || fetched < cur.fetched) best.set(key, { file: f, feed: d, fetched })
  }
  return [...best.values()].sort((a, b) => Date.parse(a.feed.edition.builtAt) - Date.parse(b.feed.edition.builtAt))
}

async function codeOf(root) {
  const u = (p) => pathToFileURL(resolve(root, p)).href
  const [stories, build, sources, bubble, topics] = await Promise.all([import(u('netlify/lib/stories.mjs')), import(u('netlify/lib/build.mjs')), import(u('netlify/lib/sources.mjs')), import(u('netlify/lib/bubble.mjs')), import(u('netlify/lib/topics.mjs'))])
  return { ...stories, ...build, ...sources, bubble, keywordTopics: topics.keywordTopics }
}

const dateOf = (id) => id.slice(0, 10)
const SLOTS = ['ochtend', 'middag', 'avond']
const slotOf = (id) => id.slice(11)
// De vorige dagdeel-id (zoals previousSlotId).
function previousId(id) {
  const s = slotOf(id)
  if (s === 'avond') return `${dateOf(id)}-middag`
  if (s === 'middag') return `${dateOf(id)}-ochtend`
  const [y, m, d] = dateOf(id).split('-').map(Number)
  return `${new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)}-avond`
}
const earlierIds = (id) => SLOTS.slice(0, SLOTS.indexOf(slotOf(id))).map((s) => `${dateOf(id)}-${s}`)
// Al eerder getoond (KPI 4, Buiten je bubbel): vandaag en de vorige Editie (shownSlotIds op de server).
const shownIds = (id) => [...new Set([...earlierIds(id), previousId(id)])]

function allItems(feed) {
  return new Map([...(feed.related || []), ...feed.items, ...(feed.edition.items || [])].map((i) => [i.id, i]))
}

// De Editie zoals lezers ze zagen.
function liveRows(set, score) {
  const byEdition = new Map(set.map((x) => [x.feed.edition.id, x.feed]))
  return set.map(({ feed }) => {
    const byId = allItems(feed)
    const storyById = new Map(feed.stories.map((st) => [st.id, st]))
    const earlier = shownIds(feed.edition.id).flatMap((id) => (byEdition.has(id) ? score.shownItems(byEdition.get(id).edition, allItems(byEdition.get(id))) : []))
    const pf = byEdition.get(previousId(feed.edition.id))
    const previousIds = pf ? score.editionItemIds(pf.edition, new Map(pf.stories.map((st) => [st.id, st]))) : new Set()
    return score.scoreEdition({ edition: feed.edition, byId, storyById, stories: feed.stories, earlier, previousIds, sources: feed.sources })
  })
}

// De trends bij een bewaarde Editie: de signalen die de server bij de bubbelplek en haar kandidaten bewaarde.
const trendsOf = (edition) => {
  const seen = new Set()
  const out = []
  for (const t of [...(edition.entries || []).flatMap((e) => e.terms || []), ...(edition.bubble || []).flatMap((b) => b.terms || [])]) {
    const k = `${t.via}:${t.term}`
    if (!seen.has(k)) seen.add(k), out.push({ term: t.term, via: t.via, rank: out.length })
  }
  return out
}

// De algemene Editie opnieuw samengesteld met de code van `root`.
export async function rebuild(set, root) {
  const c = await codeOf(root)
  const byEdition = new Map(set.map((x) => [x.feed.edition.id, x.feed]))
  const rebuilt = new Map()
  const out = []
  for (const { feed } of set) {
    const ed = feed.edition
    const now = Date.parse(ed.builtAt)
    const all = allItems(feed)
    const articles = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now).map((i) => ({ ...i }))
    const stories = c.buildStories(articles, {}, { mainIds: c.MAIN_IDS, keys: true, extended: true })
    const byId = new Map(articles.map((i) => [i.id, i]))
    for (const st of stories) for (const id of st.itemIds) if (byId.has(id)) byId.get(id).storyId = st.id
    const SRC = new Map(c.SOURCES.map((s) => [s.id, s]))
    const SPORT = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
    const inEdition = (it) => c.EDITION_CATS.has(SRC.get(it.source)?.cat) && !c.MUSIC_IDS.has(it.source) && !c.keywordTopics(`${it.title} ${it.text || it.summary || ''}`).some((t) => SPORT.has(t))
    const newsPool = articles.filter(inEdition)
    const newsIds = new Set(newsPool.map((a) => a.id))
    const newsStories = stories.filter((st) => st.itemIds.some((id) => newsIds.has(id)))
    const pf = byEdition.get(previousId(ed.id))
    const previous = pf ? c.previousOf({ ...pf.edition, at: Date.parse(pf.edition.builtAt), stories: pf.stories }) : null
    const audit = []
    const entries = c.generalEdition({ stories, newsStories, pool: articles, newsPool, now, mainIds: c.MAIN_IDS, sources: c.SOURCES, previous, audit })
    const storyById = new Map(stories.map((st) => [st.id, st]))
    const heads = entries.map((e) => byId.get(e.leadId || e.id)?.title).filter(Boolean)
    const trends = trendsOf(ed)
    const earlier = shownIds(ed.id).flatMap((id) => rebuilt.get(id)?.shown || [])
    let final = entries
    let bubble = []
    let keuze = 'leeg'
    if (trends.length) {
      if (typeof c.pickBubble === 'function') {
        const b = c.pickBubble({ entries, heads, storyById, pool: articles, byId, stories, trends, earlier, now })
        final = b.entries
        bubble = b.bubble
        keuze = b.keuze
      } else {
        // De code van vóór frisse ogen · 1 (composeEdition op main): eerst Nederlandstalig, dan de rest, zonder harde eisen.
        const excludeStoryIds = new Set(entries.filter((e) => e.kind === 'story').map((e) => e.id))
        const excludeItemIds = new Set([...entries.filter((e) => e.kind === 'item').map((e) => e.id), ...[...excludeStoryIds].flatMap((id) => storyById.get(id)?.itemIds || [])])
        const sig = c.signatures(articles)
        const shown = [...excludeItemIds].map((id) => sig.get(id)).filter(Boolean)
        const fresh = articles.filter((a) => !sig.has(a.id) || !shown.some((s) => c.sameEvent(sig.get(a.id), s)))
        const opts = { excludeItemIds, excludeStoryIds, coveredTitles: heads, max: Infinity, now }
        const dutch = (id) => SRC.get(id)?.lang === 'nl'
        const areaOf = (p) => c.bubble.areasOf(byId.get(p.id), SRC.get(byId.get(p.id)?.source)?.cat)
        const picks = c.bubble.bubbleCandidates([c.bubble.matchTrending(trends, fresh.filter((a) => dutch(a.source)), opts), c.bubble.matchTrending(trends, fresh, opts)], { areaOf })
        final = c.bubble.insertBubble(entries, picks[0])
        bubble = picks.slice(1)
        keuze = picks.length ? 'trend' : 'leeg'
      }
    }
    const edition = { id: ed.id, builtAt: ed.builtAt, revision: `herbouw`, entries: final, bubble }
    const score = await scoreModule()
    rebuilt.set(ed.id, { edition, shown: score.shownItems(edition, byId) })
    const previousIds = pf ? score.editionItemIds(pf.edition, new Map(pf.stories.map((st) => [st.id, st]))) : new Set()
    out.push({ edition, byId, storyById, stories, earlier, previousIds, keuze, audit, sources: feed.sources })
  }
  return out
}

let scoreMod = null
const scoreModule = async () => (scoreMod ||= await import(pathToFileURL(resolve(HERE, 'netlify/lib/scorekaart.mjs')).href))

function titleOf(x, e) {
  const it = x.byId.get(e.leadId || e.id)
  return `${it?.sourceName || it?.source || '?'}: ${(it?.title || '?').slice(0, 100)}`
}
// Elk verschil tussen twee herbouwde Edities van hetzelfde dagdeel, plek voor plek.
export function differences(a, b) {
  const out = []
  for (let k = 0; k < a.length; k++) {
    const x = a[k]
    const y = b[k]
    const ka = x.edition.entries.map((e) => `${e.desk === 'bubbel' ? 'B' : ''}${e.leadId || e.id}`)
    const kb = y.edition.entries.map((e) => `${e.desk === 'bubbel' ? 'B' : ''}${e.leadId || e.id}`)
    if (ka.join() === kb.join()) continue
    const lines = []
    const len = Math.max(ka.length, kb.length)
    for (let i = 0; i < len; i++) {
      const ea = x.edition.entries[i]
      const eb = y.edition.entries[i]
      if (ka[i] === kb[i]) continue
      const lab = (ctx, e, j) => (!e ? '—' : `${e.desk === 'bubbel' ? (e.near ? 'Naast je bubbel' : 'Buiten je bubbel') : String(j + 1).padStart(2, '0')} ${titleOf(ctx, e)}`)
      lines.push(`  - was ${lab(x, ea, i)}\n    nu  ${lab(y, eb, i)}`)
    }
    out.push({ id: x.edition.id, lines })
  }
  return out
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const set = loadSet(positional.length ? positional : DEFAULT_INPUTS)
  const score = await scoreModule()
  let rows
  let built = null
  if (flag('--herbouw')) {
    built = await rebuild(set, resolve(opt('--root') || HERE))
    rows = built.map((x) => score.scoreEdition({ edition: x.edition, byId: x.byId, storyById: x.storyById, stories: x.stories, earlier: x.earlier, previousIds: x.previousIds, sources: x.sources }))
  } else rows = liveRows(set, score)
  if (flag('--json')) {
    console.log(JSON.stringify(rows, null, 1))
  } else {
    console.log(`## Scorekaart ${flag('--herbouw') ? `herbouw (${opt('--root') || 'deze map'})` : 'live (zoals lezers ze zagen)'}\n`)
    console.log(score.SCORE_HEAD)
    for (const r of rows) console.log(score.scoreLine(r))
    console.log(`\n${score.summaryLine(score.summarize(rows))}`)
    for (const r of rows) {
      const extra = [...r.bovenaan.zwak.map((z) => `  2 · ${z.plek} ${z.reden}: ${z.kop}`), ...r.gratis.alternatief.map((g) => `  3 · ${g.plek} ${g.betaald} → ${g.gratis}: ${g.kop}`), ...(r.einde.kop ? [`  4 · ${r.einde.keuze} ${r.einde.ok ? '✓' : '✗ ' + r.einde.reden}: ${r.einde.bron}: ${r.einde.kop}`] : []), ...r.nl.top5.filter((x) => !x.inEditie).map((x) => `  5 · gemist (${x.uitgevers}): ${x.kop}`)]
      if (extra.length && flag('--uitleg')) console.log(`\n${r.id}\n${extra.join('\n')}`)
    }
  }
  if (flag('--herbouw') && opt('--naast')) {
    const other = await rebuild(set, resolve(opt('--naast')))
    const diffs = differences(other, built)
    console.log(`\n## Verschillen in de algemene Editie: ${opt('--naast')} (was) → ${opt('--root') || 'deze map'} (nu)\n`)
    if (!diffs.length) console.log('Geen verschillen.')
    for (const d of diffs) console.log(`- ${d.id}\n${d.lines.join('\n')}`)
    const before = other.map((x) => score.scoreEdition({ edition: x.edition, byId: x.byId, storyById: x.storyById, stories: x.stories, earlier: x.earlier, previousIds: x.previousIds, sources: x.sources }))
    console.log(`\nVoor: ${score.summaryLine(score.summarize(before))}\nNa:   ${score.summaryLine(score.summarize(rows))}`)
  }
}
