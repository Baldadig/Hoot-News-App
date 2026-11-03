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
