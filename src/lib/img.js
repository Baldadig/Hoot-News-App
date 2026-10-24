// Beeld op maat — pure functies (getest in tests/img.test.mjs).
// De feeds leveren vaak één (te) groot beeld. Waar de uitgever zelf kleinere varianten
// aanbiedt vragen we die op (alleen patronen die op de echte CDN's zijn nagelopen, okt. 2026).
// Andere bekende bronnen gaan via de beeld-CDN van Netlify: op maat en als AVIF/WebP.
// Mislukt dat, dan valt het <img> terug op het origineel (components/Img.jsx).

// Moet gelijk lopen met [images] remote_images in netlify.toml (de test controleert dat).
export const CDN_HOSTS = ['images.nrc.nl', 'i.guim.co.uk', 'cdn.theatlantic.com', 'images.vpro.nl', 'thequietus.com', 'lede-admin.stereogum.com', 'ichef.bbci.co.uk', 'npr.brightspotcdn.com', 'images.ft.com', 'oor.nl', 'oor-prod.slashsmart.com']
const viaCdn = (url, w) => `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}`

const WIDTHS = { thumb: [176, 320], lead: [480, 720, 1080, 1360] }
const SIZES = {
  thumb: '88px',
  lead: '(min-width: 960px) 720px, (min-width: 720px) 680px, calc(100vw - 32px)',
}

const isBingThumb = (u) => u.hostname === 'www.bing.com' && u.pathname === '/th'

// Hoe breed een beeld hooguit is, als het adres dat verraadt (en we het niet groter kunnen
// opvragen); anders null. The Guardian tekent zijn adressen: de breedte staat vast.
export function knownWidth(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (isBingThumb(u)) return 320
  if (u.hostname === 'i.guim.co.uk') return Number(u.searchParams.get('width')) || null
  return null
}

// Mag dit beeld groot (tijdlijn)? Niet als we weten dat het alleen klein bestaat.
export function fitsLarge(url) {
  const w = knownWidth(url)
  return w == null || w >= 400
}

// Goed genoeg voor het hoofdverhaal van de editie (tot 720 px breed, scherp op een retinascherm)?
export function fitsHero(url) {
  const w = knownWidth(url)
  return !!url && (w == null || w >= 700)
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
  if (host === 'images.nu.nl') {
    // NU.nl levert in de feed een vierkant van 256 px ("_sqr256/x/y/b/h/"). Liggend bestaan vaste
    // breedtes (640, 854, 1280); met uitsnede 0/0/0/0 snijdt NU.nl zelf netjes 16:9 bij (met de
    // vierkante uitsnede uit de feed zou het beeld worden uitgerekt).
    const m = url.match(/^(https:\/\/images\.nu\.nl\/m\/[a-z0-9]+)_sqr256\/\d+\/\d+\/\d+\/\d+\/(.+)$/)
    if (!m) return null
    return kind === 'thumb' ? [[url, 256]] : [640, 854, 1280].map((w) => [`${m[1]}_wd${w}/0/0/0/0/${m[2]}`, w])
  }
  if (isBingThumb(u)) {
    // Beeld uit de zoekindex: Bing snijdt zelf bij op de gevraagde maat, maar het bronbeeld is
    // klein (groot gevraagd komt het met witte randen). Alleen als thumbnail.
    const id = u.searchParams.get('id')
    const sized = (w, h) => `https://www.bing.com/th?id=${id}&pid=News&w=${w}&h=${h}&c=7`
    return [[sized(176, 176), 176], [sized(320, 320), 320]]
  }
  if (host === 'i.ytimg.com' && kind === 'thumb') {
    return [[url.replace('/hqdefault.', '/mqdefault.'), 320]]
  }
  if (CDN_HOSTS.includes(host)) return widths.map((w) => [viaCdn(url, w), w])
  return null
}

// Attributen voor <img>: { src, srcSet?, sizes? }, plus `fallback` (het origineel) als we
// via de beeld-CDN gaan.
// Null als het beeld niet groot kan (zie fitsLarge): dan geen groot beeldvak.
export function imgProps(url, kind = 'thumb') {
  if (!url) return { src: url }
  if (kind === 'lead' && !fitsLarge(url)) return null
  const list = candidates(url, kind)
  if (!list || !list.length) return { src: url }
  const fallback = list[0][0].startsWith('/.netlify/images') ? { fallback: url } : {}
  if (list.length === 1) return { src: list[0][0], ...fallback }
  return { src: list[0][0], srcSet: list.map(([u, w]) => `${u} ${w}w`).join(', '), sizes: SIZES[kind], ...fallback }
}

// Profielfoto's: Bluesky heeft een kleine variant (± 1 kB in plaats van 7 kB).
export function avatarUrl(url) {
  if (!url) return url
  return url.replace('//cdn.bsky.app/img/avatar/plain/', '//cdn.bsky.app/img/avatar_thumbnail/plain/')
}
