import { shareRecord, publisherFallback } from '../lib/share-records.mjs'
import { hootOgImage } from '../lib/og.mjs'
import { safeHttpUrl } from '../../shared/util.mjs'
const esc = text => String(text || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
export async function handleSharePage(req, { find = shareRecord } = {}) {
  if (!['GET', 'HEAD'].includes(req.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  const url = new URL(req.url)
  let id
  try { id = decodeURIComponent(url.pathname.split('/').pop()) } catch { return new Response('Ongeldig adres.', { status: 400 }) }
  const item = await find(id)
  if (!item || !safeHttpUrl(item.url)) {
    // Niet meer bewaard: dan naar het artikel bij de uitgever, als de link dat meedraagt.
    const fallback = publisherFallback(url.searchParams.get('bron'))
    if (fallback) return new Response(null, { status: 302, headers: { Location: fallback, 'Cache-Control': 'public, max-age=300', 'Referrer-Policy': 'no-referrer' } })
    return new Response('Verhaal niet gevonden.', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }
  const canonical = `${url.origin}/deel/${encodeURIComponent(id)}`
  const image = hootOgImage(url.origin, id)
  const title = esc(item.title)
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Hoot</title><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="Hoot"><meta property="og:title" content="${title}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${title}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(image)}"><style>body{margin:0;background:#f5f1e8;color:#1a1814;font:20px/1.5 system-ui}main{max-width:720px;margin:auto;padding:32px 24px}img{width:100%;height:auto}h1{font:800 36px/1.15 Georgia,serif}a{color:inherit;text-underline-offset:4px}p{margin:24px 0}.hoot{border-top:1px solid #ded5c4;padding-top:16px;font-size:17px;color:#4b453b}</style></head><body><main><a href="/?via=deel"><b>hoot.</b></a><h1>${title}</h1><p>${esc(item.section)} · ${esc(item.sourceName || item.source)}</p><img src="${esc(image)}" width="1200" height="630" alt="${title}"><p><a href="${esc(item.url)}" rel="noopener noreferrer">Lees bij ${esc(item.sourceName || item.source)}</a></p><p class="hoot"><a href="/?via=deel">Gedeeld vanuit Hoot.</a> Tien verhalen, drie keer per dag. Dan ben je bij.</p></main></body></html>`
  return new Response(req.method === 'HEAD' ? null : html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Netlify-CDN-Cache-Control': 'public, s-maxage=3600', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' } })
}
export default handleSharePage
export const config = { path: '/deel/:id' }
