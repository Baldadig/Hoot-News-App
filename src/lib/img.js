// Beeld op maat — pure functies (getest in tests/img.test.mjs).
// De feeds leveren vaak één (te) groot beeld. Waar de uitgever zelf kleinere varianten
// aanbiedt vragen we die op; bij onbekende hosts blijft de oorspronkelijke URL staan.
// Alleen patronen die op de echte CDN's zijn nagelopen (okt. 2026).

const WIDTHS = { thumb: [176, 320], lead: [480, 720, 1080, 1360] }
const SIZES = {
  thumb: '88px',
  lead: '(min-width: 960px) 720px, (min-width: 720px) 680px, calc(100vw - 32px)',
}

// Geeft [[url, breedte], …] voor een beeld, of null als we geen varianten kennen.
function candidates(url, kind) {
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const widths = WIDTHS[kind]
  const host = u.hostname

  if (host === 'media.wired.com' && u.pathname.includes('/master/pass/')) {
    return widths.map((w) => [url.replace('/master/pass/', `/master/w_${w},c_limit/`), w])
  }
  if (host === 'static01.nyt.com') {
    const m = url.match(/^(.*)-mediumSquareAt3X(\.jpe?g)$/)
    if (!m) return null
    return kind === 'thumb'
      ? [[`${m[1]}-square320${m[2]}`, 320]]
      : [
          [`${m[1]}-threeByTwoSmallAt2X${m[2]}`, 600],
          [`${m[1]}-threeByTwoMediumAt2X${m[2]}`, 1500],
        ]
  }
  if (host === 'platform.theverge.com') {
    const base = u.origin + u.pathname
    return widths.map((w) => [`${base}?quality=80&strip=all&w=${w}`, w])
  }
  if (host === 'image.volkskrant.nl') {
    const m = url.match(/^(.*)\/feature-crop\/\d+\/\d+\/(.*)$/)
    if (!m) return null
    return widths.map((w) => [`${m[1]}/feature-crop/${w}/${kind === 'thumb' ? w : Math.round((w * 2) / 3)}/${m[2]}`, w])
  }
  if (host === 'images.cdn.nos.nl') {
    // NOS levert vaste formaten (16:9); alleen omrekenen als de feed het grote formaat gaf.
    const m = url.match(/^(.*)-1024x576(\.webp)$/)
    if (!m) return null
    const at = (w) => [`${m[1]}-${w}x${(w * 9) / 16}${m[2]}`, w]
    return kind === 'thumb' ? [at(256)] : [at(512), at(768), at(1024)]
  }
  if (host === 'www.bing.com' && u.pathname === '/th') {
    // Beeld uit de zoekindex: Bing snijdt zelf bij op de gevraagde maat.
    const id = u.searchParams.get('id')
    const sized = (w, h) => `https://www.bing.com/th?id=${id}&pid=News&w=${w}&h=${h}&c=7`
    return kind === 'thumb' ? [[sized(176, 176), 176], [sized(320, 320), 320]] : widths.map((w) => [sized(w, Math.round((w * 9) / 16)), w])
  }
  if (host === 'i.ytimg.com' && kind === 'thumb') {
    return [[url.replace('/hqdefault.', '/mqdefault.'), 320]]
  }
  return null
}

// Attributen voor <img>: { src, srcSet?, sizes? }
export function imgProps(url, kind = 'thumb') {
  if (!url) return { src: url }
  const list = candidates(url, kind)
  if (!list || !list.length) return { src: url }
  if (list.length === 1) return { src: list[0][0] }
  return { src: list[0][0], srcSet: list.map(([u, w]) => `${u} ${w}w`).join(', '), sizes: SIZES[kind] }
}

// Profielfoto's: Bluesky heeft een kleine variant (± 1 kB in plaats van 7 kB).
export function avatarUrl(url) {
  if (!url) return url
  return url.replace('//cdn.bsky.app/img/avatar/plain/', '//cdn.bsky.app/img/avatar_thumbnail/plain/')
}
