// Voorvertoning voor bronnen waarvan de feed alleen koppen levert (de Volkskrant).
// De eigen inleiding van het artikel staat wél in de zoekindex van Bing Nieuws (openbare
// RSS). We koppelen op het artikel-id uit de URL en bewaren wat we vinden, zodat de dekking
// groeit. Pure functies; getest in tests/snippets.test.mjs.

// "…/titel-van-het-stuk~b3767a6a/" → "3767a6a"
export function articleId(url) {
  const m = String(url || '').match(/~b([0-9a-f]{5,})/i)
  return m ? m[1].toLowerCase() : null
}

const decode = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Bing-RSS → [{ id, text }] voor artikelen van het gevraagde domein.
export function parseSnippets(xml, domain = 'volkskrant.nl') {
  const out = []
  for (const m of String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1]
    const link = decode((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1])
    let url = link
    try {
      url = new URL(link).searchParams.get('url') || link // Bing verpakt de echte URL
    } catch {
      /* geen geldige URL: laat staan */
    }
    if (!url.includes(domain)) continue
    const id = articleId(url)
    const text = decode((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1]).replace(/\s*\.\.\.$/, '…')
    if (id && text.length >= 40) out.push({ id, text })
  }
  return out
}

// Een liveblog houdt zijn URL terwijl de kop en de inhoud blijven wisselen: de inleiding uit
// de zoekindex hoort dan bij een eerder moment. Daar tonen we liever niets.
export const isLiveblog = (url) => /\/liveblog[-/]|[-/]liveblog-/i.test(String(url || ''))

// Nieuwe vondsten bij de bewaarde zetten; wat ouder is dan `maxAge` vervalt.
export function mergeSnippets(store = {}, found = [], now = Date.now(), maxAge = 5 * 864e5) {
  const out = {}
  for (const [id, v] of Object.entries(store)) if (v && v.s && now - (v.at || 0) < maxAge) out[id] = v
  for (const f of found) if (!out[f.id]) out[f.id] = { s: f.text, at: now }
  return out
}
