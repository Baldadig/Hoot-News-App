export async function fetchFeed({ signal } = {}) {
  const res = await fetch('/api/feed', { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Feed-fout ${res.status}`)
  return res.json()
}
