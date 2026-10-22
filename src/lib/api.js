// De feed in delen: een kern (bronnen, verhalen, editie) en per bron de berichten.
// Zonder extra headers: zo gebruikt de browser de <link rel="preload"> uit index.html.
export async function fetchCore({ signal } = {}) {
  const res = await fetch('/api/feed?deel=kern', { signal })
  if (!res.ok) throw new Error(`Feed-fout ${res.status}`)
  return res.json()
}

// Met de versie in het adres: een deel dat niet veranderde komt uit de cache van de browser.
export async function fetchPart(id, version, { signal } = {}) {
  const res = await fetch(`/api/feed?bron=${encodeURIComponent(id)}&v=${encodeURIComponent(version || '')}`, { signal })
  if (!res.ok) throw new Error(`Bron-fout ${res.status}`)
  return (await res.json()).items || []
}
