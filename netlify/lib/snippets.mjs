// Ontbrekende intro's en beelden aanvullen. De Volkskrant levert in haar feed alleen koppen;
// de NYT zet het beeld er vaak pas later bij; The Economist geeft nooit een beeld. In de
// zoekindex van Bing Nieuws (openbare RSS) staan wél de eigen inleiding en een beeld van het
// artikel. Oorspronkelijk alleen voor de Volkskrant:
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

// Sleutel om een artikel terug te vinden: het artikel-id (Volkskrant) of de URL zonder query.
export function articleKey(url) {
  const id = articleId(url)
  if (id) return id
  try {
    const u = new URL(url)
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase()
  } catch {
    return null
  }
}

// Het beeld van Bing in 16:9 (1200 × 675); img.js vraagt op maat kleinere varianten op.
export function bingImage(src) {
  const m = String(src || '').match(/[?&]id=([^&]+)/)
  return m ? `https://www.bing.com/th?id=${m[1]}&pid=News&w=1200&h=675&c=7` : null
}

// Bing-RSS → [{ id, text, image }] voor artikelen van het gevraagde domein.
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
    const id = articleKey(url)
    const text = decode((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1]).replace(/\s*\.\.\.$/, '…')
    const image = bingImage(decode((item.match(/<News:Image>([\s\S]*?)<\/News:Image>/) || [])[1]))
    if (id && (text.length >= 40 || image)) out.push({ id, text: text.length >= 40 ? text : '', image })
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
  for (const f of found) {
    const had = out[f.id]
    if (!had) out[f.id] = { s: f.text, img: f.image || null, at: now }
    else if (!had.img && f.image) out[f.id] = { ...had, img: f.image } // beeld later alsnog
  }
  return out
}
