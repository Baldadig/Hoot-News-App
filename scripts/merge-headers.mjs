// Voegt de _headers van de landing (dist/_headers) en van de app (dist/lees/_headers) samen tot één
// bestand met per pad één blok. Twee losse /*-blokken gaven dubbele HSTS en X-Frame-Options, en de
// Cross-Origin-Opener-Policy van de landing kwam zo ook op /lees/ terecht.
export function parseHeaders(text) {
  const blocks = []
  let cur = null
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    if (!/^\s/.test(line)) { cur = { path: line.trim(), headers: [] }; blocks.push(cur); continue }
    const m = line.trim().match(/^([^:]+):\s*(.*)$/)
    if (m && cur) cur.headers.push([m[1], m[2]])
  }
  return blocks
}

// Alleen voor de landingspagina's, niet voor de app onder /lees/.
const LANDING_ONLY = ['Cross-Origin-Opener-Policy']
const LANDING_PAGES = ['/', '/index.html', '/404.html']

export function mergeHeaders(...texts) {
  const paths = new Map() // pad -> Map(naam in kleine letters -> [naam, waarde]); een latere waarde wint
  for (const text of texts) {
    for (const { path, headers } of parseHeaders(text)) {
      if (!paths.has(path)) paths.set(path, new Map())
      for (const [name, value] of headers) paths.get(path).set(name.toLowerCase(), [name, value])
    }
  }
  const all = paths.get('/*')
  for (const name of LANDING_ONLY) {
    const hit = all?.get(name.toLowerCase())
    if (!hit) continue
    all.delete(name.toLowerCase())
    for (const p of LANDING_PAGES) {
      if (!paths.has(p)) paths.set(p, new Map())
      paths.get(p).set(name.toLowerCase(), hit)
    }
  }
  return [...paths].map(([path, h]) => `${path}\n${[...h.values()].map(([n, v]) => `  ${n}: ${v}`).join('\n')}\n`).join('\n')
}
