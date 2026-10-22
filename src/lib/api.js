// De feed in delen: een kern (bronnen, verhalen, editie), per bron de berichten, en pas als je
// een verhaal vergelijkt alle publicaties per verhaal.
// Zonder extra headers: zo gebruikt de browser de <link rel="preload"> uit index.html.
export async function fetchCore({ signal } = {}) {
  const res = await fetch('/api/feed?deel=start', { signal })
  if (!res.ok) throw new Error(`Feed-fout ${res.status}`)
  return res.json()
}

// Met de versie in het adres: een deel dat niet veranderde komt uit de cache van de browser.
export async function fetchPart(id, version, { signal } = {}) {
  const res = await fetch(`/api/feed?bron=${encodeURIComponent(id)}&v=${encodeURIComponent(version || '')}`, { signal })
  if (!res.ok) throw new Error(`Bron-fout ${res.status}`)
  return (await res.json()).items || []
}

// Alle publicaties per verhaal (voor vergelijken en zoeken in alle bronnen), met versie.
export async function fetchRelated(version, { signal } = {}) {
  const res = await fetch(`/api/feed?deel=verhalen&v=${encodeURIComponent(version || '')}`, { signal })
  if (!res.ok) throw new Error(`Verhalen-fout ${res.status}`)
  return (await res.json()).related || []
}
