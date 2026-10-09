export async function fetchFeed({ signal } = {}) {
  // Zonder extra headers: zo gebruikt de browser de <link rel="preload"> uit index.html.
  const res = await fetch('/api/feed', { signal })
  if (!res.ok) throw new Error(`Feed-fout ${res.status}`)
  return res.json()
}
