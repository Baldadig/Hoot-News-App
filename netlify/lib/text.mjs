// Tekst uit feeds schoonmaken en op maat maken — pure functies.
export { hostname, safeIso } from '../../shared/util.mjs'

export function favicon(domain) {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null
}
export function toText(html) {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10))
      } catch {
        return ''
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16))
      } catch {
        return ''
      }
    })
    .replace(/\s+/g, ' ')
    .trim()
}
export function clip(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}
// Past tekst netjes binnen n tekens: afronden op zin- of woordgrens, geen "…".
// Alleen als er geen zinseinde te vinden is kappen we af op een woordgrens, mét "…".
const SENTENCE_END = /(?<![A-Z])(?<!\b(?:Mr|Mrs|Ms|Dr|St|vs|dr|mr|drs|prof|bijv|ca|nr|o\.a|d\.w\.z))[.!?]["'’”)]?(?=\s|$)/g
export function preview(s, soft = 170, hard = 260) {
  if (!s) return ''
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length <= soft) return s
  const ends = []
  for (const m of s.matchAll(SENTENCE_END)) {
    const end = m.index + m[0].length
    if (end > hard) break
    ends.push(end)
  }
  const within = ends.filter((e) => e <= soft).pop()
  if (within >= 60) return s.slice(0, within)
  if (ends[0] >= 40) return s.slice(0, ends[0])
  const cut = s.slice(0, soft)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, '') + '…'
}
export function cleanUrl(u) {
  try {
    const url = new URL(u)
    // Alleen http(s) toestaan — weert javascript:/data: links uit vijandige feeds.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    url.hash = ''
    for (const k of [...url.searchParams.keys()]) if (/^utm_|^cmp$|^ref$|^icid$|^cid$/i.test(k)) url.searchParams.delete(k)
    return url.toString()
  } catch {
    return ''
  }
}
export function normTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, ' ').trim()
}
