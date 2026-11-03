import { inStream, isPost } from './sourcesel.js'

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
