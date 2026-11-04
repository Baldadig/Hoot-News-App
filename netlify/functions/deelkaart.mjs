import { renderCard } from '../lib/deelkaart.mjs'
import { shareRecord } from '../lib/share-records.mjs'
import { cardFormat } from '../../shared/deelkaart.mjs'
import { hash } from '../../shared/util.mjs'

const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
export async function handleCard(req, { find = shareRecord, render = renderCard } = {}) {
  if (!['GET', 'HEAD'].includes(req.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  const q = new URL(req.url).searchParams, format = q.get('f') || 'link'
  if (!cardFormat(format)) return fail(400, 'Onbekend formaat.')
  const item = await find(q.get('id'))
  if (!item) return fail(404, 'Verhaal niet gevonden.')
  const etag = `"${hash(JSON.stringify([item.id, item.title, item.section, item.sourceName, item.source]) + format + 'kaart-v3-schijf')}"`
  const headers = { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=86400, stale-while-revalidate=604800', ETag: etag }
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  if (req.method === 'HEAD') return new Response(null, { headers })
  try { return new Response(await render(item, format), { headers }) }
  catch { return fail(503, 'Deelkaart tijdelijk niet beschikbaar.') }
}
export default handleCard
export const config = { path: '/api/deelkaart' }
