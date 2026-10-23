// De deelafbeelding (og:image) van een artikel: het beeld dat de redactie zelf koos voor als het
// artikel wordt gedeeld. Voor feeds die geen beeld meesturen (Rolling Stone, DW, Al Jazeera …) en
// voor de Digest. Alleen de <head> lezen; automatisch gemaakte titelkaartjes ("/api/og?title=…")
// slaan we over: daar staat alleen de kop op. Nooit voor betaalde bronnen.
import { UA } from './sources.mjs'

const GENERATED = /\/api\/og\b|\/og\?|\/og\/v\d|opengraph\.githubassets/i
export function ogImageFrom(html) {
  const head = html.split(/<\/head>/i)[0]
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    if (!/(property|name)=["'](og:image|twitter:image)(:url)?["']/i.test(tag)) continue
    const m = tag.match(/content=["']([^"']+)["']/i)
    if (!m) continue
    const url = m[1].replace(/&amp;|&#0?38;/g, '&').trim()
    if (/^https?:\/\//i.test(url) && !GENERATED.test(url)) return url
  }
  return null
}
export async function loadOgImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(6000) })
    if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return null
    // Alleen het begin: de <head> zit in de eerste paar honderd kilobyte.
    const reader = res.body.getReader()
    let html = ''
    const dec = new TextDecoder()
    while (html.length < 300000) {
      const { done, value } = await reader.read()
      if (done) break
      html += dec.decode(value, { stream: true })
      if (/<\/head>/i.test(html)) break
    }
    reader.cancel().catch(() => {})
    return ogImageFrom(html)
  } catch {
    return null
  }
}
