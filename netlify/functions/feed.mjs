// GET /api/feed — de kant-en-klare feed, in milliseconden.
// - ?deel=start      de bronnen, verhalen en editie, zonder vergelijkingsdata (de app vanaf 1.27)
// - ?deel=verhalen&v=<etag>  alle publicaties per verhaal; met de juiste versie een jaar te bewaren
// - ?deel=kern       start + vergelijkingsdata in één (de app 1.22–1.26)
// - ?bron=<id>&v=<etag>  de berichten van één bron; met de juiste versie een jaar te bewaren
// - zonder parameters alles in één (apps tot en met 1.21; kan weg als die niet meer langskomen)
// Alleen GET/HEAD; een onbekend `deel` of een onbekende bron is een fout, geen volledige feed.
// Het samenstellen gebeurt elke 10 minuten in feed-refresh.mjs; hier lezen we alleen.
// Rond een dagdeelwissel (netlify/lib/dagdeel-kern.mjs): vanaf de start van de ochtend de vooraf vastgelegde kern, en een
// kern (start, kern, alles in één) gaat nooit langer de CDN in dan tot het volgende dagdeel begint.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'
import { kernVanNu, kernCdn, volgendKey } from '../lib/dagdeel-kern.mjs'

const STALE = 20 * 6e4 // ritme gemist (of lokaal zonder ritme): op de achtergrond bijwerken
const BROWSER = 'public, max-age=0, must-revalidate'
const FRESH = { 'Cache-Control': BROWSER, 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=600' }
const FOREVER = { 'Cache-Control': 'public, max-age=31536000, immutable', 'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000, immutable' }

const DELEN = new Set(['start', 'verhalen', 'kern'])
const fail = (status, error, extra = {}) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } })

// `now`: alleen voor de tests (de klok rond een wissel).
export async function serveFeed(req, context, now = new Date()) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'Alleen GET.', { Allow: 'GET, HEAD' })
  const q = new URL(req.url).searchParams
  const deel = q.get('deel')
  if (deel !== null && !DELEN.has(deel)) return fail(400, `Onbekend deel: gebruik ${[...DELEN].join(', ')}.`)
  let core = await readDoc(KEYS.core)
  if (!core) core = await refresh() // allereerste keer: nu samenstellen
  else if (now.getTime() - Date.parse(core.builtAt) > STALE) context?.waitUntil?.(refresh().catch((e) => console.error('refresh', e)))

  const bron = q.get('bron')
  // Een bron-id (ook bsky:naam.bsky.social); wat er niet op lijkt hoeven we niet op te zoeken.
  if (bron !== null && !/^[a-z0-9][a-z0-9:._-]{0,79}$/i.test(bron)) return fail(404, 'Onbekende bron.')
  // De documenten met een Editie erin: de kern, start en alles in één.
  const kernKey = bron ? null : deel === 'kern' ? KEYS.core : deel === 'start' ? KEYS.start : deel === 'verhalen' ? null : KEYS.legacy
  const read = () => (bron ? readDoc(KEYS.part(bron)) : deel === 'kern' ? core : deel === 'start' ? readDoc(KEYS.start) : deel === 'verhalen' ? readDoc(KEYS.related) : readDoc(KEYS.legacy))
  let doc = await read()
  // Net na een update bestaan 'start' en 'verhalen' nog niet: dan nu samenstellen.
  if (!doc && (deel === 'start' || deel === 'verhalen')) {
    await refresh()
    doc = await read()
  }
  if (!doc) return bron ? fail(404, 'Onbekende bron.') : Response.json({ items: [] }, { status: 503, headers: FRESH })
  if (kernKey) doc = await kernVanNu(doc, () => readDoc(volgendKey(kernKey)), now)

  const etag = `"${doc.etag}"`
  const cache = (bron || deel === 'verhalen') && q.get('v') === doc.etag ? FOREVER : kernKey ? { 'Cache-Control': BROWSER, 'Netlify-CDN-Cache-Control': kernCdn(doc, now) } : FRESH
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ETag: etag, ...cache }
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  return new Response(req.method === 'HEAD' ? null : doc.body, { headers })
}

export default (req, context) => serveFeed(req, context)

export const config = { path: '/api/feed' }
