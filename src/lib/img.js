// Beeld op maat — pure functies (getest in tests/img.test.mjs).
import { imageMeta } from './image-meta.js'
// De feeds leveren vaak één (te) groot beeld. Waar de uitgever zelf kleinere varianten
// aanbiedt vragen we die op (alleen patronen die op de echte CDN's zijn nagelopen, okt. 2026).
// Andere bekende bronnen gaan via de beeld-CDN van Netlify: op maat en als AVIF/WebP.
// Mislukt dat, dan valt het <img> terug op het origineel (components/Img.jsx).

// Moet gelijk lopen met [images] remote_images in netlify.toml (de test controleert dat).
export const CDN_HOSTS = ['images.nrc.nl', 'i.guim.co.uk', 'cdn.theatlantic.com', 'images.vpro.nl', 'thequietus.com', 'lede-admin.stereogum.com', 'ichef.bbci.co.uk', 'npr.brightspotcdn.com', 'images.ft.com']
// De beeldserver van DPG Media (image.<titel>/<id>/feature-crop/<b>/<h>/… of /roi/<b>/<h>/<x>/<y>/…): elke maat
// is op te vragen, de feed geeft er 320 × 320. Nagelopen met GET op 12 november 2026 (HTTP 200, echte maten):
// feature-crop op 176/176, 480/320, 720/480, 1080/720, 1360/907, 1280/853 en 640/427 voor de Volkskrant,
// De Morgen, Het Parool, Trouw en Humo; roi op 176/176, 1280/853 en 1360/907 voor de eerste vier. Niet: AD,
// de regionale titels (images.ad.nl, images.bd.nl, …) en HLN: die adressen zijn ondertekend, een andere maat
// geeft 403. Moet gelijk lopen met ImageURL.dpgHosts in de app
// (de test controleert dat).
export const DPG_HOSTS = ['image.volkskrant.nl', 'image.demorgen.be', 'image.parool.nl', 'image.trouw.nl', 'image.humo.be']
const DPG_PATH = /^(.*)\/(feature-crop|roi)\/\d+\/\d+\/(.*)$/
const viaCdn = (url, w) => `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}`

const WIDTHS = { thumb: [176, 320], lead: [480, 720, 1080, 1360] }
// De miniatuur volgt --thumb-w in styles.css: 96 (3:2), smaller op een smalle telefoon; bij grote
// tekst 108, maar dan kiest de browser bij 2× toch al de 320-variant.
const SIZES = {
  thumb: '(max-width: 359px) 72px, (max-width: 479px) 84px, 96px',
  lead: '(min-width: 960px) 720px, (min-width: 720px) 680px, calc(100vw - 32px)',
}

const isBingThumb = (u) => u.hostname === 'www.bing.com' && u.pathname === '/th'
// Gemeten door de server (build.mjs, sizeBingImages): het bronbeeld op zijn eigen maat, zonder
// bijsnijden (c). Dan staat de echte breedte in w; ongemeten (met c=7) rekenen we klein (320).
const bingWidth = (u) => (u.searchParams.has('c') ? 320 : Number(u.searchParams.get('w')) || 320)

// Hoe breed een beeld hooguit is, als het adres dat verraadt (en we het niet groter kunnen
// opvragen); anders null. The Guardian tekent zijn adressen: de breedte staat vast.
export function knownWidth(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (isBingThumb(u)) return bingWidth(u)
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
export function candidates(url, kind) {
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
  if (DPG_HOSTS.includes(host)) {
    // DPG (zie DPG_HOSTS): dezelfde uitsnede (feature-crop, of roi met het brandpunt), op maat.
    const m = url.match(DPG_PATH)
    if (!m) return null
    return widths.map((w) => [`${m[1]}/${m[2]}/${w}/${kind === 'thumb' ? w : Math.round((w * 2) / 3)}/${m[3]}`, w])
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
  if (host === 'images.fd.nl') {
    // Het FD (imgix) zet in de feed een vierkant van 140 px of een beeld van 640 breed. Op elke breedte
    // te vragen (nagelopen 5 november 2026): we laten de uitsnede van de feed weg (w, h, fit, crop) en
    // vragen de breedte zelf, in de verhouding van het beeld. Overige parameters (achtergrond) blijven.
    const keep = new URLSearchParams([...u.searchParams].filter(([k]) => !['w', 'h', 'fit', 'crop'].includes(k)))
    const at = (w) => { const q = new URLSearchParams(keep); q.set('w', String(w)); return [`${u.origin}${u.pathname}?${q}`, w] }
    return widths.map(at)
  }
  if (isBingThumb(u)) {
    // Beeld uit de zoekindex: Bing snijdt zelf bij op de gevraagde maat (c=7). Groter dan het
    // bronbeeld vragen we nooit (dan komen er witte randen); groot alleen als de server het bronbeeld
    // heeft gemeten en het groot genoeg is (fitsLarge), op zijn eigen verhouding.
    const id = encodeURIComponent(u.searchParams.get('id'))
    const sized = (w, h) => `https://www.bing.com/th?id=${id}&pid=News&w=${w}&h=${h}&c=7`
    if (kind === 'thumb') return [[sized(176, 176), 176], [sized(320, 320), 320]]
    const max = bingWidth(u)
    const h = Number(u.searchParams.get('h')) || Math.round((max * 9) / 16)
    const list = widths.filter((w) => w < max).map((w) => [`https://www.bing.com/th?id=${id}&pid=News&w=${w}&h=${Math.round((w * h) / max)}`, w])
    return [...list, [`https://www.bing.com/th?id=${id}&pid=News&w=${max}&h=${h}`, max]]
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

// ---- Scherp genoeg voor een groot beeld? (poetsbeurt 5 november: "Financieel Dagblad onscherpe foto") ----
// Hoe breed we een beeld hooguit kunnen tonen zonder op te rekken: de grootste variant die de uitgever
// levert (lib/img.js candidates), of anders de gemeten breedte (imageMeta, door de server) of wat het
// adres verraadt (knownWidth). Via de beeld-CDN van Netlify telt de gemeten breedte: die rekt niet op.
// Null: onbekend (dan nemen we aan dat het past, zoals altijd).
// Toont MeasuredImg (components/Img.jsx) het gemeten origineel uit de feed? Ja als er egale randen zijn
// gemeten: daar horen de meetgegevens bij. Zonder randen, of zonder meting, gaat het via de varianten
// van de uitgever of de beeld-CDN (als die er zijn), op maat.
export function measuredOriginal(item, kind = 'lead') {
  const m = imageMeta(item)
  if (!m) return false
  const plain = !m.crop.l && !m.crop.r && !m.crop.t && !m.crop.b
  return !(plain && candidates(item.image, kind))
}

export function sourceWidth(item) {
  const url = item?.image
  if (!url) return null
  const measured = Number(item.imageMeta?.w) > 0 ? Number(item.imageMeta.w) : null
  if (measuredOriginal(item)) return measured
  const list = candidates(url, 'lead')
  if (list?.length) {
    const max = Math.max(...list.map(([, w]) => w))
    return list[0][0].startsWith('/.netlify/images') ? (measured ? Math.min(measured, max) : max) : max
  }
  return measured ?? knownWidth(url)
}

// Een beeld is scherp genoeg als het minstens SHARP keer zo breed is als het vak waarin het staat, op een
// scherm met hoge pixeldichtheid (devicePixelRatio, hooguit SHARP). 1,4 en niet 1,5: de NOS levert
// hooguit 1024 breed, en dat moet op 720 nog groot mogen (1,42); een beeld van 700 of 840 op 720 niet.
export const SHARP = 1.4
export function sharpEnough(item, boxWidth, dpr = 1) {
  const w = sourceWidth(item)
  if (w == null) return true
  return w >= boxWidth * Math.max(1, Math.min(dpr, SHARP))
}

// De breedte van een groot beeldvak (tijdlijn, kaart, hoofdverhaal): de kolom, hooguit 720 (--measure).
export const largeBox = () => (typeof window === 'undefined' ? 720 : Math.min(720, Math.max(280, (window.innerWidth || 720) - 32)))
export const sharpHere = (item) => sharpEnough(item, largeBox(), typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
