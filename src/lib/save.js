export async function saveToInstapaper(item) {
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url, title: item.nl_title || item.title || item.sourceName }),
    })
    if (res.ok) return { ok: true }
    let error = 'error'
    try {
      error = (await res.json()).error || 'error'
    } catch {
      /* geen JSON */
    }
    return { ok: false, error, status: res.status }
  } catch {
    return { ok: false, error: 'network' }
  }
}
