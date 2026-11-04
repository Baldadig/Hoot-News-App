// Een antwoord uit de cache (netwerk faalde of was te traag) krijgt een kenmerk, zodat de pagina
// het niet als vers telt. Workbox roept cachedResponseWillBeUsed bij NetworkFirst alleen dan aan.
export const CACHE_HEADER = 'X-Hoot-Cache'
export function markCached(response) {
  if (!response) return response
  const headers = new Headers(response.headers)
  headers.set(CACHE_HEADER, '1')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
export const isFromCache = (response) => response?.headers?.get(CACHE_HEADER) === '1'

// Alleen publieke shellbestanden opruimen als één huidige appclient zijn bundel bevestigt.
// Een open oudere tab moet zijn nog niet geopende schermen offline kunnen blijven laden.
export function canCleanShell({ scope, senderId, clientUrl, bundleUrl, currentAssets, clients }) {
  try {
    const root = new URL(scope), client = new URL(clientUrl), bundle = new URL(bundleUrl)
    const inside = u => u.origin === root.origin && u.pathname.startsWith(root.pathname)
    if (!senderId || !inside(client) || !inside(bundle) || !currentAssets.includes(bundle.href)) return false
    const open = clients.filter(c => { try { return inside(new URL(c.url)) } catch { return true } })
    return open.length === 1 && open[0].id === senderId
  } catch { return false }
}
