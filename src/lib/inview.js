// Zichtbaarheid volgen met één gedeelde IntersectionObserver per instelling, in plaats van
// één per element (honderd video's = twee observers, niet tweehonderd).
const observers = new Map()

export function watch(el, options, onChange) {
  if (!el || typeof IntersectionObserver === 'undefined') return () => {}
  const key = JSON.stringify(options)
  let o = observers.get(key)
  if (!o) {
    const handlers = new WeakMap()
    o = { handlers, io: new IntersectionObserver((entries) => entries.forEach((e) => handlers.get(e.target)?.(e)), options) }
    observers.set(key, o)
  }
  o.handlers.set(el, onChange)
  o.io.observe(el)
  return () => {
    o.io.unobserve(el)
    o.handlers.delete(el)
  }
}
