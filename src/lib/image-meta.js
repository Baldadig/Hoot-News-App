// Meetgegevens horen altijd bij het originele beeld, nooit bij een anders bijgesneden CDN-variant.
export function imageMeta(item) {
  const m = item?.imageMeta, c = m?.crop
  if (!m || !c || ![m.w, m.h, c.l, c.r, c.t, c.b].every(Number.isFinite) || m.w <= 0 || m.h <= 0 || Math.min(c.l, c.r, c.t, c.b) < 0) return null
  const w = m.w - c.l - c.r, h = m.h - c.t - c.b
  return w > 0 && h > 0 ? { ...m, ratio: w / h } : null
}
export const portraitImage = item => (imageMeta(item)?.ratio ?? 1) < 4 / 5
export function cropStyle(item) {
  const m = imageMeta(item)
  if (!m) return undefined
  const { w, h, crop: { l, r, t, b } } = m
  const cw = w - l - r, ch = h - t - b
  return {
    '--crop-inset': `${t / h * 100}% ${r / w * 100}% ${b / h * 100}% ${l / w * 100}%`,
    '--crop-width': `max(${100 * w / cw}cqw, ${100 * w / ch}cqh)`,
    '--crop-height': `max(${100 * h / cw}cqw, ${100 * h / ch}cqh)`,
    '--crop-x': `${(r - l) / w * 50}%`, '--crop-y': `${(b - t) / h * 50}%`,
  }
}
