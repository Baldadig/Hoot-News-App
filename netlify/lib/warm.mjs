// /api/edition warm maken (feed-refresh bij een nieuw dagdeel, deploy-succeeded na elke deploy).
// POST /api/edition { v: 2, warm: true }: de kern en alle delen in het geheugen, één keer rekenen. Mislukt het,
// dan niets: het is alleen een voorsprong.
export async function warmEdition(base, { fetchImpl = fetch, timeout = 15000 } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeout)
  try {
    const r = await fetchImpl(`${base}/api/edition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v: 2, warm: true }), signal: ctl.signal })
    return r.status
  } catch {
    return 0
  } finally {
    clearTimeout(timer)
  }
}
