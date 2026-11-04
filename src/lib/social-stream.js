import { inStream, isPost } from './sourcesel.js'
import { canonHandle } from '../../shared/bluesky.mjs'

// Eén chronologische Stroom; sociale bronnen moeten nog gevolgd én expliciet gekozen zijn.
export function webStream(items, { prefs, muted = new Set(), sources = [], now = Date.now() }) {
  const known = new Set(sources.map(s => s.id)), seen = new Set(), perSource = new Map()
  return [...items].filter(i => i?.id && i.url).sort((a,b) => {
    const at=Date.parse(a.publishedAt)||0,bt=Date.parse(b.publishedAt)||0
    return bt-at || a.id.localeCompare(b.id)
  }).filter(i => {
    if (seen.has(i.id) || muted.has(i.source) || !inStream(i,prefs,now)) return false
    if (isPost(i)) {
      if (!known.has(i.source)) return false
      const count=perSource.get(i.source)||0
      if (count>=60) return false
      perSource.set(i.source,count+1)
    }
    seen.add(i.id)
    return true
  })
}

export function addSocialProfile(prefs, profile) {
  if (!profile?.handle) return prefs
  const id='bsky:'+profile.handle
  return {...prefs,bluesky:true,social:[...(prefs.social||[]).filter(p=>p.handle!==profile.handle),profile],
    bskyInStream:[...new Set([...(prefs.bskyInStream||[]),id])],muted:(prefs.muted||[]).filter(s=>s!==id)}
}
export function removeSocialProfile(prefs, handle) {
  const id='bsky:'+handle
  return {...prefs,social:(prefs.social||[]).filter(p=>p.handle!==handle),bskyInStream:(prefs.bskyInStream||[]).filter(s=>s!==id)}
}

// Oude server-accounts (tot oktober 2026 volgde Hoot zelf Aaron Rupar en de groep Oekraïne): wie ze
// volgde, heeft ze nog als `bsky:<handle>` in zijn Stroom-keuze of aangezette bronnen, maar de server
// levert ze niet meer en ze staan niet in `social`. Zonder eigen account komt er geen post binnen.
// Dit zijn de id's die je nog volgt (niet uitgezet) en die nergens meer vandaan komen.
export function orphanBlueskyIds(prefs, knownIds = []) {
  const known = new Set(knownIds), own = new Set((prefs?.social || []).map(p => 'bsky:' + canonHandle(p.handle)))
  const muted = new Set(prefs?.muted || [])
  return [...new Set([...(prefs?.bskyInStream || []), ...(prefs?.enabled || [])])]
    .filter(id => typeof id === 'string' && id.startsWith('bsky:') && !muted.has(id) && !known.has(id) && !own.has('bsky:' + canonHandle(id.slice(5))))
}

// Zet die oude id's om in eigen accounts. `found`: { [oudId]: profiel } (de huidige handle via
// getProfile); `gone`: id's die niet meer bestaan (komen uit je keuze, geen post is mogelijk).
export function adoptLegacySocial(prefs, { found = {}, gone = [] } = {}) {
  let next = { ...prefs }
  for (const [oldId, profile] of Object.entries(found)) {
    if (!profile?.handle) continue
    next = addSocialProfile(next, { ...profile, handle: canonHandle(profile.handle) })
    const id = 'bsky:' + canonHandle(profile.handle)
    if (id !== oldId) {
      next.bskyInStream = (next.bskyInStream || []).filter(x => x !== oldId)
      next.enabled = (next.enabled || []).filter(x => x !== oldId)
    }
  }
  if (gone.length) {
    const dead = new Set(gone)
    next.bskyInStream = (next.bskyInStream || []).filter(x => !dead.has(x))
    next.enabled = (next.enabled || []).filter(x => !dead.has(x))
  }
  return next
}
