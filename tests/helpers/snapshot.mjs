// De meetlat in de repo: de vaste momentopname (avondeditie van 30 oktober 2026), de twaalf
// persona's en dezelfde maten als meting/algoritme (Hoot-design). Alleen voor tests: zo draait de
// nulmeting (en straks De Redacteur) mee in `npm test`, zonder de map meting/ ernaast.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { buildStories, selectEdition } from '../../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../../netlify/lib/sources.mjs'
import { composePersonal } from '../../src/lib/personal.js'
import { currentTopic } from '../../src/lib/topics.js'
import { PERSONAS, setupFor, rng } from '../fixtures/personas.mjs'

export { PERSONAS, setupFor }
export const SNAPSHOT_FILE = new URL('../fixtures/snapshot-2026-10-30-avond.json.gz', import.meta.url)
export const NULMETING_FILE = new URL('../fixtures/nulmeting.json', import.meta.url)

let cached = null
export function loadSnapshot() {
  if (!cached) cached = JSON.parse(gunzipSync(readFileSync(SNAPSHOT_FILE)).toString('utf8'))
  return cached
}
export const loadNulmeting = () => JSON.parse(readFileSync(NULMETING_FILE, 'utf8'))
// Actuele expliciete algoritme-golden; de oorspronkelijke nulmeting wordt niet herschreven.
export const loadGeneralGolden = () => JSON.parse(readFileSync(new URL('../fixtures/edition-general-golden.json', import.meta.url), 'utf8'))
export const nowOf = (snap) => Date.parse(snap.meta.updatedAt)

// Dezelfde invoer als de app (zie meting/algoritme/lib/run.mjs): vast tijdstip, geen vorige Editie.
export function composeFor(snap, setup, compose = composePersonal) {
  return compose({
    global: snap.edition,
    stories: snap.stories,
    items: snap.items,
    sources: snap.sources,
    now: nowOf(snap),
    builtAt: snap.meta.updatedAt,
    previous: null,
    ...setup,
  })
}

// Leesgeschiedenis als read_ids (zoals meting/acceptatie.mjs): 5–72 uur oude berichten uit eigen
// bronnen, meestal passend bij de echte smaak.
export function readIdsOf(snap, p, followed) {
  if (!p.latent || !p.reads) return new Set()
  const now = nowOf(snap)
  const r = rng(`${p.id}-gelezen`)
  const lat = new Set(p.latent.topics)
  const age = (i) => (now - Date.parse(i.publishedAt)) / 36e5
  const pool = snap.items.filter((i) => i.kind === 'article' && followed.has(i.source) && age(i) >= 5 && age(i) <= 72)
  // De momentopname is van vóór 1.1.0 en kent nog het onderwerp trump: dat is nu Verenigde Staten (currentTopic).
  const fits = pool.filter((i) => (i.topics || []).some((t) => lat.has(currentTopic(t))))
  const out = new Set()
  for (let k = 0; k < Math.min(25, Math.round(p.reads / 3)); k++) {
    const from = r() >= p.noise && fits.length ? fits : pool
    if (from.length) out.add(from[Math.floor(r() * from.length)].id)
  }
  return out
}

// Scenario "nu": per persona de Editie met zijn echte instellingen, plus read_ids.
export function editionsNu(snap, compose = composePersonal) {
  return PERSONAS.map((p) => {
    const setup = setupFor(p, snap.sources, 'echt')
    const readIds = p.interests.length + p.topics.length ? readIdsOf(snap, p, setup.followed) : new Set()
    return { persona: p, setup, edition: composeFor(snap, { ...setup, readIds }, compose) }
  })
}

// ---- maten (zelfde als meting/algoritme/lib/metrics.mjs) ----
// Een plek is een verhaal: het verhaal-id, of voor een los bericht het verhaal waar het bij hoort.
export function contextOf(snap) {
  const itemById = new Map()
  for (const i of [...(snap.edition?.items || []), ...(snap.edition?.wide || []).map((w) => w.item).filter(Boolean), ...snap.items]) itemById.set(i.id, i)
  const storyById = new Map(snap.stories.map((s) => [s.id, s]))
  const storyOfItem = new Map()
  for (const s of snap.stories) for (const id of s.itemIds) storyOfItem.set(id, s.id)
  return { itemById, storyById, storyOfItem }
}
export const leadOf = (e) => e.leadId || e.id
export function keyOf(e, ctx) {
  if (e.kind === 'story') return e.id
  return ctx.storyOfItem.get(e.id) || ctx.itemById.get(e.id)?.storyId || e.id
}
export const keysOf = (edition, ctx) => new Set((edition?.entries || []).filter(e=>e.desk !== 'bubbel').map((e) => keyOf(e, ctx)))
export function membersOf(e, ctx) {
  const st = e.kind === 'story' ? ctx.storyById.get(e.id) : ctx.storyById.get(keyOf(e, ctx))
  return [...new Set([leadOf(e), ...(st?.itemIds || e.itemIds || [])])].map((id) => ctx.itemById.get(id)).filter(Boolean)
}
export function jaccard(a, b) {
  if (!a.size && !b.size) return 1
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}
// Gemiddelde Jaccard over alle paren (lager = unieker).
export function pairwise(sets) {
  const vals = []
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) vals.push(jaccard(sets[i], sets[j]))
  return vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
}
// Groot nieuws: de drie breedst gedekte verhalen van de laatste 12 uur (≥ 6 bronnen).
export function bigStories(snap, { n = 3, hours = 12, min = 6 } = {}) {
  const now = nowOf(snap)
  return snap.stories
    .filter((s) => s.sourceCount >= min && now - Date.parse(s.latestAt) < hours * 36e5)
    .sort((a, b) => b.sourceCount - a.sourceCount) // stabiel: zoals de meetlat
    .slice(0, n)
}

// ---- de algemene Editie op de server ----
// Opnieuw bundelen en selecteren uit de berichten van de momentopname, zoals build.mjs dat doet
// (basisbronnen als eigen bronnen, geen vorige Editie). Dient als vaste referentie: selectEdition
// en de bundeling worden bij bewuste wijzigingen opnieuw vastgelegd met make-golden.mjs.
export function generalEdition(snap) {
  const articles = snap.items.filter((i) => i.kind === 'article')
  const stories = buildStories(articles, {}, { mainIds: MAIN_IDS })
  const entries = selectEdition(stories, articles, { mainIds: MAIN_IDS, now: nowOf(snap) })
  return { stories, entries }
}
// Afdruk van de bundels zonder `desk`, `sport` en `light` (die kwamen er later bij, `sport` met de noodfix van
// 2 november, `light` met de lichte stukken van 4 november; de rest blijft gelijk).
export const storiesPrint = (stories) => createHash('sha256').update(JSON.stringify(stories.map(({ desk, sport, light, ...st }) => st))).digest('hex')
