// Redacteur · filters-ai: de Editie van deze branch naast die van main, op dezelfde opgeslagen invoer (alle bewaarde feeds in
// tests/fixtures, plus desgewenst een live kern met --live-dir), × 5 profielen; de Stroom moet gelijk blijven. Geen netwerk,
// geen writes naar Hoot. Zonder AI-oordelen (die hangen van het model af): dit meet A en de herbouw van de selectie.
//   node scripts/keur-filters-ai.mjs --ref main [--live-dir <map met live-kern.json en bron-<id>.json>] [--output <map>] [--rounds 0]
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
const json = path => JSON.parse(readFileSync(path, 'utf8'))

export async function engines(ref = 'main') {
  const cache = join(ROOT, 'node_modules/.cache')
  mkdirSync(cache, { recursive: true })
  const dir = mkdtempSync(join(cache, 'filters-ai-keuring-'))
  const revision = git('rev-parse', ref)
  const changed = new Set(['src/lib/personal.js', 'netlify/lib/build.mjs', 'netlify/lib/stories.mjs', 'shared/editor-version.mjs', 'shared/article-signals.mjs', 'netlify/lib/bubble.mjs', 'netlify/lib/rss.mjs', 'netlify/functions/edition.mjs'])
  const text = `export { composePersonal, languageRule } from './src/lib/personal.js';
    export { composeFor } from './netlify/functions/edition.mjs';
    export { generalEdition, streamItems } from './netlify/lib/build.mjs';
    export { MAIN_IDS, MUSIC_IDS, OPINIE_IDS, SOURCES, EDITION_CATS } from './netlify/lib/sources.mjs';
    export { keywordTopics } from './netlify/lib/topics.mjs';
    export { inStroom, forEdition } from './shared/stroom.mjs';`
  try {
    const out = []
    for (const name of ['main', 'branch', 'sameRevision']) {
      const bundled = await build({ stdin: { contents: text, resolveDir: ROOT }, bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false, logLevel: 'silent', plugins: name !== 'branch' ? [{ name: 'vastgelegde-main', setup(b) {
        b.onLoad({ filter: /\.(js|mjs)$/ }, args => {
          const path = relative(ROOT, args.path)
          if (changed.has(path) && (name === 'main' || path === 'shared/editor-version.mjs')) return { contents: git('show', `${revision}:${path}`), resolveDir: resolve(args.path, '..'), loader: 'js' }
        })
      } }] : [] })
      const file = join(dir, name + '.mjs')
      writeFileSync(file, bundled.outputFiles[0].text)
      out.push(await import(pathToFileURL(file)))
    }
    return { main: out[0], branch: out[1], sameRevision: out[2], revision, close: () => rmSync(dir, { recursive: true, force: true }) }
  } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e }
}

export function feeds(liveDir) {
  const list = readdirSync(join(ROOT, 'tests/fixtures'), { recursive: true }).filter(f => /\.json(?:\.gz)?$/.test(f)).sort().map(name => {
    const bytes = readFileSync(join(ROOT, 'tests/fixtures', name))
    return { name, feed: JSON.parse((name.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8')) }
  }).filter(({ feed }) => feed?.meta?.updatedAt && feed.edition && Array.isArray(feed.items) && Array.isArray(feed.stories) && Array.isArray(feed.sources)).map(row => {
    // Een bewaarde kernfeed heeft haar beschikbare artikelen in related en edition.items, net als de live kern.
    if (!row.feed.items.length) row.feed.items = [...new Map([...(row.feed.related || []), ...(row.feed.edition.items || [])].map(i => [i.id, i])).values()]
    return row
  })
  if (liveDir) {
    const core = json(join(liveDir, 'live-kern.json'))
    const items = core.sources.flatMap(s => existsSync(join(liveDir, `bron-${s.id}.json`)) ? json(join(liveDir, `bron-${s.id}.json`)).items || [] : [])
    core.items = [...new Map([...items, ...(core.related || []), ...(core.edition.items || [])].map(i => [i.id, i])).values()]
    list.push({ name: `live-kern-${core.meta?.updatedAt || 'onbekend'}`, feed: core })
  }
  return list
}

export function profiles(feed) {
  const nl = feed.sources.filter(s => s.lang === 'nl').map(s => s.id)
  return [
    { name: 'algemeen', general: true },
    { name: 'startset', followed: ['nos', 'nu', 'nrc', 'volkskrant'], interests: [], topics: [] },
    { name: 'alleen-nederlands', followed: nl, interests: ['binnenland', 'politiek', 'wereld', 'tech'], topics: [] },
    { name: 'nederlands-ign', followed: [...nl, 'ign'], interests: ['binnenland', 'tech'], topics: ['games'] },
    { name: 'breed', followed: [...nl, 'theverge', 'wired', 'nyt', 'atlantic', 'ign', 'tweakers'], interests: ['binnenland', 'politiek', 'wereld', 'tech'], topics: ['ai'] },
  ]
}

export function edition(engine, feed, profile, extra = {}) {
  const now = Date.parse(feed.meta.updatedAt)
  if (!profile.general) return engine.composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(profile.followed), interests: profile.interests, topics: profile.topics, now, builtAt: feed.meta.updatedAt, ...extra })
  const source = new Map(engine.SOURCES.map(s => [s.id, s]))
  const sport = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
  const pool = feed.items.filter(engine.forEdition)
  const newsPool = pool.filter(i => i.kind === 'article' && engine.EDITION_CATS.has(source.get(i.source)?.cat) && !engine.MUSIC_IDS.has(i.source) && !engine.OPINIE_IDS?.has(i.source) && !engine.keywordTopics(`${i.title} ${i.text || i.summary || ''}`).some(t => sport.has(t)))
  const ids = new Set(newsPool.map(i => i.id))
  return { entries: engine.generalEdition({ stories: feed.stories, newsStories: feed.stories.filter(st => st.itemIds.some(id => ids.has(id))), pool, newsPool, now, sources: feed.sources, mainIds: engine.MAIN_IDS, ...extra }) }
}

function serverEdition(engine, feed, profile) {
  if (profile.general) return edition(engine, feed, profile)
  return engine.composeFor({ edition: feed.edition, stories: feed.stories, sources: feed.sources }, feed.items, { followed: profile.followed, interests: profile.interests, topics: profile.topics, favorites: [], readIds: [], reading: null }, { owner: 'anon' })
}

function shown(result, feed) {
  const items = new Map([...feed.items, ...(feed.edition.items || []), ...(result?.items || []), ...(feed.edition.wide || []).map(w => w.item), ...(feed.edition.near || []).map(w => w.item)].filter(Boolean).map(i => [i.id, i]))
  return (result?.entries || []).map((e, index) => {
    const i = items.get(e.leadId || e.id)
    return { place: index + 1, kind: e.kind, id: e.id, leadId: e.leadId || e.id, desk: e.desk, source: i?.source, title: i?.title || e.title, url: i?.url }
  })
}

async function main() {
  const args = process.argv.slice(2), arg = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
  const outDir = resolve(arg('--output', 'docs/codex-blokken/filters-ai'))
  mkdirSync(outDir, { recursive: true })
  const engine = await engines(arg('--ref', 'main'))
  try {
    const input = feeds(arg('--live-dir'))
    const cases = input.flatMap(({ feed }) => profiles(feed).map(profile => ({ feed, profile })))
    const worker = arg('--cpu-worker')
    const sample = (side) => {
      const start = performance.now(), cpu = process.cpuUsage(), groups = { general: 0, personal: 0 }
      for (const { feed, profile } of cases) {
        const step = process.cpuUsage()
        serverEdition(engine[side], feed, profile)
        const used = process.cpuUsage(step)
        groups[profile.general ? 'general' : 'personal'] += (used.user + used.system) / 1000
      }
      const used = process.cpuUsage(cpu)
      return { wall: performance.now() - start, cpu: (used.user + used.system) / 1000, groups }
    }
    if (worker) {
      if (!['main', 'branch'].includes(worker)) throw new Error('Onbekende meetkant')
      for (let n = 0; n < Number(arg('--warmup', '2')); n++) for (const { feed, profile } of cases) serverEdition(engine[worker], feed, profile)
      console.log(JSON.stringify(sample(worker)))
      return
    }
    const rows = []
    const stream = input.map(({ name, feed }) => ({ feed: name, same: JSON.stringify(engine.main.streamItems(structuredClone(feed.items))) === JSON.stringify(engine.branch.streamItems(structuredClone(feed.items))) }))
    for (const { name, feed } of input) for (const profile of profiles(feed)) {
      const before = shown(serverEdition(engine.main, structuredClone(feed), profile), feed)
      const after = shown(serverEdition(engine.branch, structuredClone(feed), profile), feed)
      const key = e => `${e.kind}:${e.id}:${e.leadId}:${e.desk}`
      const same = JSON.stringify(before.map(key)) === JSON.stringify(after.map(key))
      const withoutRevision = same ? before : shown(serverEdition(engine.sameRevision, structuredClone(feed), profile), feed)
      const policyChanged = JSON.stringify(before.map(key)) !== JSON.stringify(withoutRevision.map(key))
      rows.push({ policyChanged, feed: name, profile, same, before, after, removed: before.filter(e => !after.some(x => key(x) === key(e))), added: after.filter(e => !before.some(x => key(x) === key(e))) })
    }
    // Beide implementaties zijn gelijk gebundeld; opwarmen en per ronde de volgorde omkeren.
    const splitCpu = { main: { general: [], personal: [] }, branch: { general: [], personal: [] } }
    const timings = { main: [], branch: [] }, cpuTimings = { main: [], branch: [] }, rounds = Number(arg('--rounds', '5'))
    const isolated = args.includes('--isolated')
    if (rounds && !isolated) for (const { feed, profile } of cases) { serverEdition(engine.main, feed, profile); serverEdition(engine.branch, feed, profile) }
    for (let n = 0; n < rounds; n++) for (const side of n % 2 ? ['branch', 'main'] : ['main', 'branch']) {
      // Een eigen proces per steekproef voorkomt dat JIT en geheugenopruiming van de andere kant meetellen.
      const measured = isolated ? JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--cpu-worker', side, '--ref', arg('--ref', 'main'), ...(arg('--live-dir') ? ['--live-dir', arg('--live-dir')] : []), '--output', outDir], { cwd: ROOT, encoding: 'utf8', timeout: 180000 })) : sample(side)
      for (const kind of ['general', 'personal']) splitCpu[side][kind].push(measured.groups[kind])
      timings[side].push(measured.wall)
      cpuTimings[side].push(measured.cpu)
      console.error(`meting ${n + 1}/${rounds} ${side}: ${timings[side].at(-1).toFixed(0)} ms, CPU ${cpuTimings[side].at(-1).toFixed(0)} ms`)
    }
    const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    const ratio = median(timings.branch) / median(timings.main)
    const cpuRatio = median(cpuTimings.branch) / median(cpuTimings.main)
    const result = { measurement: isolated ? 'fresh-process-two-warmups' : 'shared-process', base: engine.revision, branch: git('rev-parse', 'HEAD'), feeds: input.length, cases: rows.length, stream, differences: rows.filter(r => !r.same).length, timings, cpuTimings, splitCpu, splitRatios: Object.fromEntries(['general', 'personal'].map(kind => [kind, median(splitCpu.branch[kind]) / median(splitCpu.main[kind])])), ratio, cpuRatio, rows }
    writeFileSync(join(outDir, 'vergelijking.json'), JSON.stringify(result, null, 2) + '\n')
    console.log(JSON.stringify({ feeds: input.length, cases: rows.length, stream, differences: result.differences, ratio, cpuRatio, milliseconds: { main: median(timings.main), branch: median(timings.branch) } }))
  } finally { engine.close() }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
