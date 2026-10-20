// GET /api/feed — de kant-en-klare feed, in milliseconden.
// Het samenstellen (alle bronnen ophalen, bundelen, de editie) gebeurt elke 10 minuten in
// feed-refresh.mjs; hier lezen we alleen het laatste resultaat. De CDN van Netlify bewaart het
// antwoord bovendien voor iedereen (durable) en ververst het op de achtergrond.
import { readSnapshot } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'

const STALE = 20 * 6e4 // ritme gemist (of lokaal zonder ritme): op de achtergrond bijwerken

export default async (req, context) => {
  let snap = await readSnapshot()
  if (!snap) snap = await refresh() // allereerste keer: nu samenstellen
  else if (Date.now() - Date.parse(snap.builtAt) > STALE) context?.waitUntil?.(refresh().catch((e) => console.error('refresh', e)))

  const etag = `"${snap.etag}"`
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ETag: etag,
    // Browser: telkens kort navragen; niets veranderd = '304' zonder inhoud.
    'Cache-Control': 'public, max-age=0, must-revalidate',
    // CDN: een minuut vers, daarna nog tien minuten meteen serveren terwijl hij op de achtergrond ververst.
    'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=600',
  }
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  return new Response(snap.body, { headers })
}

export const config = { path: '/api/feed' }
