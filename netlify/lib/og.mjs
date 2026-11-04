// De deelafbeelding (og:image) van een artikel: het beeld dat de redactie zelf koos voor als het
// artikel wordt gedeeld. Voor feeds die geen beeld meesturen (Rolling Stone, DW, Al Jazeera …) en
// voor de Digest. Alleen de <head> lezen; automatisch gemaakte titelkaartjes ("/api/og?title=…")
// slaan we over: daar staat alleen de kop op. Ook voor betaalde bronnen (build 46): het deelbeeld staat
// openbaar in de <head>, net als bij het delen op sociale media. Geen cookiemuur of loginpagina omzeilen:
// stuurt de site ons door naar een toestemmings- of loginpagina (DPG: myprivacy), dan is er geen beeld.
import { UA } from './sources.mjs'

// Het eigen deelbeeld hoort bij een servermatig leesbare Hoot-deelpagina.
export function hootOgImage(origin, id, format = 'link') {
  return `${origin}/api/deelkaart?id=${encodeURIComponent(id)}&f=${format === 'staand' ? 'staand' : 'link'}`
}

// FD schrijft "?w&#x3D;640", WordPress "&#038;": entiteiten in een attribuut terug naar tekens.
const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

// Een doorverwijzing naar een toestemmings-, cookie- of loginpagina is niet het artikel: dan geen
// beeld (het beeld van zo'n pagina hoort er niet bij). Een gewone doorverwijzing (vrtnws.be/p.… →
// www.vrt.be/vrtnws/…, tijd.be/r/… → het artikel) volgen we wel.
const GATE_HOST = /(^|\.)(myprivacy|privacy|consent|cmp|login|auth|accounts?|signin|subscribe|paywall)\./i
const GATE_PATH = /\/(login|log-in|inloggen|signin|sign-in|auth|consent|cookie\w*|privacy-?gate|privacywall|toestemming|subscribe)(\/|\b)/i
export function isGate(url) {
  try {
    const u = new URL(url)
    return GATE_HOST.test(u.hostname) || GATE_PATH.test(u.pathname)
  } catch {
    return true
  }
}

const GENERATED = /\/api\/og\b|\/og\?|\/og\/v\d|opengraph\.githubassets/i
export function ogImageFrom(html) {
  const head = html.split(/<\/head>/i)[0]
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    if (!/(property|name)=["'](og:image|twitter:image)(:url)?["']/i.test(tag)) continue
    const m = tag.match(/content=["']([^"']+)["']/i)
    if (!m) continue
    const url = decodeEntities(m[1]).trim()
    if (/^https?:\/\//i.test(url) && !GENERATED.test(url)) return url
  }
  return null
}
// `signal`: de ronde kan alles tegelijk afbreken (build.mjs); per pagina hooguit `timeout` ms.
export async function loadOgImage(url, { signal, timeout = 6000, fetcher = fetch } = {}) {
  try {
    const stop = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout)
    const res = await fetcher(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: stop })
    if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return null
    if (res.url && res.url !== url && isGate(res.url)) {
      res.body?.cancel?.().catch(() => {})
      return null
    }
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
