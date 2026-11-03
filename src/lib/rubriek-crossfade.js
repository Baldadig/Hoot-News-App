// CSS-tijden kunnen in seconden of milliseconden staan.
export function timeMs(raw, fallback = 200) {
  const text = String(raw || '').trim(), value = parseFloat(text)
  if (!Number.isFinite(value) || value < 0) return fallback
  if (text.endsWith('ms')) return value
  if (text.endsWith('s')) return value * 1000
  return fallback
}
// Alleen de eerste zichtbare beelden; geen downloads bij Beeld uit of Verminder beweging.
export function firstImages(items, enabled = true) {
  return enabled ? [...new Set(items.slice(0, 3).map(i => i.image).filter(Boolean))] : []
}
// De laatste keuze wint, ook als een eerder beeld later klaar is.
export function latestChoice() {
  let generation = 0
  return { begin() { const mine = ++generation; return () => mine === generation }, cancel() { ++generation } }
}
export async function warmImages(urls, props, { timeout = 600, ImageType = globalThis.Image } = {}) {
  if (!urls.length || !ImageType) return
  let timer
  await Promise.race([
    Promise.all(urls.map(url => new Promise(resolve => {
      const p = props(url)
      if (!p?.src) return resolve()
      const image = new ImageType()
      let triedFallback = false
      image.referrerPolicy = 'no-referrer'
      image.onload = () => image.decode?.().catch(() => {}).then(resolve) ?? resolve()
      image.onerror = () => {
        if (p.fallback && !triedFallback) { triedFallback = true; image.srcset = ''; image.src = p.fallback }
        else resolve()
      }
      if (p.sizes) image.sizes = p.sizes
      if (p.srcSet) image.srcset = p.srcSet
      image.src = p.src
    }))),
    new Promise(resolve => { timer = setTimeout(resolve, timeout) }),
  ])
  clearTimeout(timer)
}
