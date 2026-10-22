// GET /api/feed — de kant-en-klare feed, in milliseconden.
// - ?deel=kern       de bronnen, verhalen en editie (de app vanaf 1.22)
// - ?bron=<id>&v=<etag>  de berichten van één bron; met de juiste versie een jaar te bewaren
// - zonder parameters alles in één (apps tot en met 1.21; kan weg als die niet meer langskomen)
// Alleen GET/HEAD; een onbekend `deel` of een onbekende bron is een fout, geen volledige feed.
// Het samenstellen gebeurt elke 10 minuten in feed-refresh.mjs; hier lezen we alleen.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'

const STALE = 20 * 6e4 // ritme gemist (of lokaal zonder ritme): op de achtergrond bijwerken
const FRESH = { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=600' }
const FOREVER = { 'Cache-Control': 'public, max-age=31536000, immutable', 'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000, immutable' }

const DELEN = new Set(['kern'])
const fail = (status, error, extra = {}) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } })

export default async (req, context) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'Alleen GET.', { Allow: 'GET, HEAD' })
  const q = new URL(req.url).searchParams
  const deel = q.get('deel')
  if (deel !== null && !DELEN.has(deel)) return fail(400, `Onbekend deel: gebruik ${[...DELEN].join(', ')}.`)
  let core = await readDoc(KEYS.core)
  if (!core) core = await refresh() // allereerste keer: nu samenstellen
  else if (Date.now() - Date.parse(core.builtAt) > STALE) context?.waitUntil?.(refresh().catch((e) => console.error('refresh', e)))

  const bron = q.get('bron')
  // Een bron-id (ook bsky:naam.bsky.social); wat er niet op lijkt hoeven we niet op te zoeken.
  if (bron !== null && !/^[a-z0-9][a-z0-9:._-]{0,79}$/i.test(bron)) return fail(404, 'Onbekende bron.')
  const doc = bron ? await readDoc(KEYS.part(bron)) : deel === 'kern' ? core : await readDoc(KEYS.legacy)
  if (!doc) return bron ? fail(404, 'Onbekende bron.') : Response.json({ items: [] }, { status: 503, headers: FRESH })

  const etag = `"${doc.etag}"`
  const cache = bron && q.get('v') === doc.etag ? FOREVER : FRESH
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ETag: etag, ...cache }
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  return new Response(req.method === 'HEAD' ? null : doc.body, { headers })
}

export const config = { path: '/api/feed' }
