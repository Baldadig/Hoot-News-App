// Legt de uitvoer van dossierNames en haagsDossier vast op de live feeds in tests/fixtures (volgen 1.5, blok 1): de
// naamherkenning werd een gedeelde functie voor volgzaken, en de algemene Editie mocht daardoor niet veranderen. Eén keer
// gedraaid vóór de verbouwing; tests/volgzaak-naamherkenning.test.mjs vergelijkt daarna met dit bestand.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dossierNames, haagsDossier, haagsPiece } from '../netlify/lib/dossiers.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'

export const FEEDS = ['live-feed-2026-11-11-ochtend', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-07', 'live-feed-2026-11-04', 'feed-2026-11-05-ochtend']
export function laad(f) {
  return JSON.parse(gunzipSync(readFileSync(new URL(`../tests/fixtures/${f}.json.gz`, import.meta.url))))
}
export function uitvoer(feed) {
  const items = [...(feed.items || []), ...(feed.related || [])]
  const uniek = [...new Map(items.map((i) => [i.id, i])).values()].filter((i) => i.kind === 'article' && i.title)
  const now = Date.parse(feed.meta?.updatedAt || feed.edition?.builtAt)
  const alle = Object.fromEntries([...dossierNames(uniek)].map(([id, s]) => [id, [...s].sort()]).filter(([, s]) => s.length))
  const haags = uniek.filter(haagsPiece)
  const haagsNamen = Object.fromEntries([...dossierNames(haags)].map(([id, s]) => [id, [...s].sort()]))
  const entries = feed.edition?.entries || []
  const r = haagsDossier(entries, { newsPool: uniek, stories: feed.stories || [], now, mainIds: MAIN_IDS })
  return { alle, haagsNamen, dossier: r.dossier, entries: r.entries.map((e) => `${e.kind}:${e.id}`) }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = Object.fromEntries(FEEDS.map((f) => [f, uitvoer(laad(f))]))
  writeFileSync(new URL('../tests/fixtures/dossier-namen-vooraf.json', import.meta.url), JSON.stringify(out) + '\n')
  for (const [f, o] of Object.entries(out)) console.log(f, Object.keys(o.alle).length, Object.keys(o.haagsNamen).length, o.dossier?.naam || null, o.dossier?.plek ?? null)
}
