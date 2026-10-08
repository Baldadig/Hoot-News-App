// Tijd-copy. Let op het onderscheid: "3 min geleden" (hoe oud) vs "3 min lezen" (hoe lang).
export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.floor(Math.max(0, Date.now() - then) / 1000)
  if (s < 60) return 'zojuist'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} uur geleden`
  const d = Math.floor(h / 24)
  if (d === 1) return 'gisteren'
  if (d < 7) return `${d} dagen geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function clock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function readTime(min) {
  return min ? `${min} min lezen` : ''
}

// "donderdag 8 oktober" uit "2026-10-08"
export function longDate(ymd) {
  if (!ymd) return ''
  const d = new Date(ymd + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}
