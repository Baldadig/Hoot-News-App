// Alleen servercode: sharp hoort niet in de gedeelde editiekern voor JavaScriptCore.
import { kvGet, kvSet } from './kv.mjs'

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_PIXELS = 20_000_000
const DELTA = 12
// Een ontbrekende native binary mag het laden van feed/refresh niet blokkeren.
// Alleen de optionele beeldmeting wacht op Sharp; de bestaande weergave blijft de terugval.
let sharpReady
const loadSharp = () => sharpReady ||= import('sharp').then(module => module.default)

export async function measureImage(bytes) {
  try {
    if (!bytes?.length || bytes.length > MAX_IMAGE_BYTES) return null
    const sharp = await loadSharp()
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, animated: false, failOn: 'error' })
    const meta = await image.metadata()
    if (!['jpeg', 'png', 'webp', 'avif', 'gif'].includes(meta.format) || meta.pages > 1) return null
    const { data, info: { width: w, height: h } } = await image.rotate().flatten({ background: '#ffffff' }).removeAlpha().toColourspace('srgb').raw().timeout({ seconds: 2 }).toBuffer({ resolveWithObject: true })
    if (w < 24 || h < 24) return null
    const pixel = (x, y, c) => data[(y * w + x) * 3 + c]
    // Acht volledige randkolommen/-rijen. Geen enkele losse hoekpixel beslist over een balk.
    function edge(vertical, reverse) {
      const across = vertical ? w : h, along = vertical ? h : w
      const lo = [255, 255, 255], hi = [0, 0, 0]
      let count = 0
      for (let n = 0; n < Math.floor(across * .4); n++) {
        const pos = reverse ? across - 1 - n : n
        for (let k = 0; k < along; k++) for (let c = 0; c < 3; c++) {
          const v = vertical ? pixel(pos, k, c) : pixel(k, pos, c)
          lo[c] = Math.min(lo[c], v); hi[c] = Math.max(hi[c], v)
        }
        if (hi.some((v, c) => v - lo[c] >= DELTA)) break
        count++
      }
      // Een geheel egaal beeld heeft geen aantoonbare inhoudsgrens.
      return count >= 8 && count < Math.floor(across * .4) ? count : 0
    }
    const crop = { l: edge(true, false), r: edge(true, true), t: edge(false, false), b: edge(false, true) }
    return { w, h, crop, ratio: (w - crop.l - crop.r) / (h - crop.t - crop.b) }
  } catch { return null }
}

export async function loadImageMeasure(url, { fetcher = fetch, signal = AbortSignal.timeout(3000) } = {}) {
  let reader
  try {
    const u = new URL(url)
    if (!['https:', 'http:'].includes(u.protocol)) return null
    const res = await fetcher(url, { signal, headers: { Accept: 'image/*' } })
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '') || Number(res.headers.get('content-length')) > MAX_IMAGE_BYTES) return null
    reader = res.body.getReader()
    let size = 0
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_IMAGE_BYTES) return null
      chunks.push(Buffer.from(value))
    }
    return await measureImage(Buffer.concat(chunks))
  } catch { return null }
  finally { await reader?.cancel().catch(() => {}) }
}

// Alle beeldbronnen zijn al gevonden vóór deze stap. Cache ook mislukte metingen kort;
// de begrensde wachtrij mag de periodieke feedopbouw nooit minuten ophouden.
export async function measureFeedImages(items, now, { load = loadImageMeasure, get = kvGet, set = kvSet } = {}) {
  try {
    const cache = await get('image-measure-v1') || {}
    const urls = [...new Set(items.filter(i => i.kind === 'article' && i.image).map(i => i.image))]
    const missing = urls.filter(url => !cache[url] || now - cache[url].at > (cache[url].value ? 7 * 864e5 : 36e5)).slice(0, 48)
    const signal = AbortSignal.timeout(8000)
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (missing.length && !signal.aborted) {
        const url = missing.shift()
        let value = null
        try { value = await load(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) }) } catch {}
        cache[url] = { at: now, value }
      }
    }))
    for (const it of items) if (cache[it.image]?.value) it.imageMeta = cache[it.image].value
    await set('image-measure-v1', Object.fromEntries(Object.entries(cache).filter(([, v]) => now - v.at < 7 * 864e5)))
  } catch { /* De oude weergave blijft bij elke meet- of opslagfout beschikbaar. */ }
}

// Alleen de maat van een beeld (breedte en hoogte), voor het bronbeeld uit de zoekindex van Bing
// (build.mjs, sizeBingImages). Klein: hooguit 2 MB.
export async function loadImageSize(url, { fetcher = fetch, signal = AbortSignal.timeout(3000) } = {}) {
  try {
    const res = await fetcher(url, { signal, headers: { Accept: 'image/*' } })
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) return null
    const sharp = await loadSharp()
    const meta = await sharp(bytes, { limitInputPixels: MAX_PIXELS }).metadata()
    return meta.width > 0 && meta.height > 0 ? { w: meta.width, h: meta.height } : null
  } catch {
    return null
  }
}
