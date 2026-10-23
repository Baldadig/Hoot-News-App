// GET /api/vak — de Vakweek: per vakgebied de drie belangrijkste stukken van vorige week.
// Samengesteld in vak-refresh.mjs; is er nog niets (eerste keer, of net een nieuwe week en de
// ronde van dat uur was er nog niet), dan nu.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { refreshVak } from '../lib/vakRefresh.mjs'
import { vakWeek } from '../lib/vak.mjs'

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=3600' }

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return Response.json({ error: 'Alleen GET.' }, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } })
  let doc = await readDoc(KEYS.vak)
  // Een voorproefje (nog geen volle week verzameld) groeit elk uur; ouder dan een uur: bijwerken.
  if (!doc || doc.week !== vakWeek().id || (doc.preview && Date.now() - Date.parse(doc.builtAt) > 36e5)) doc = await refreshVak()
  const etag = `"${doc.etag}"`
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ...HEADERS, ETag: etag } })
  return new Response(req.method === 'HEAD' ? null : doc.body, { headers: { ...HEADERS, ETag: etag } })
}

export const config = { path: '/api/vak' }
