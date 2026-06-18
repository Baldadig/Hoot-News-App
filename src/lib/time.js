export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'zojuist'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} u`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w} wk`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
