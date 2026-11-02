// Foutmeldingen zijn toestelnotities, geen smaak en geen serverbericht.
export const CORRECTION_REASONS = Object.freeze({desk:'Verkeerde rubriek',country:'Verkeerd land',event:'Andere gebeurtenis',duplicate:'Dubbel verhaal'})
export const CORRECTION_LIMIT = 200
const validOwner = o => typeof o === 'string' && o.length > 0 && o.length <= 200
const key = owner => 'hoot:corrections:' + encodeURIComponent(owner)
function cleanURL(value) {
  try { const u = new URL(value); if(!['http:','https:'].includes(u.protocol) || u.username || u.password)return null; u.search='';u.hash='';return u.href.slice(0,2048) } catch {return null}
}
function clean(row) {
  if(!row || typeof row !== 'object' || typeof row.articleId !== 'string' || !row.articleId || row.articleId.length > 200 || !Object.hasOwn(CORRECTION_REASONS,row.reason) || !Number.isFinite(Date.parse(row.at)))return null
  return {articleId:row.articleId,storyId:typeof row.storyId==='string'?row.storyId.slice(0,200):null,reason:row.reason,title:typeof row.title==='string'?row.title.slice(0,300):'',url:cleanURL(row.url),at:row.at}
}
export function readCorrections(storage, owner) {
  if(!validOwner(owner))return []
  try {const raw=storage.getItem(key(owner));if(!raw || raw.length>500000)return [];const rows=JSON.parse(raw);return Array.isArray(rows)?rows.map(clean).filter(Boolean).slice(0,CORRECTION_LIMIT):[]}catch{return []}
}
export function recordCorrection(storage,owner,{item,storyId=null,reason,now=new Date().toISOString()}={}) {
  if(!validOwner(owner))return false
  const row=clean({articleId:item?.id,storyId,reason,title:item?.title,url:item?.url,at:now})
  if(!row)return false
  const rows=[row,...readCorrections(storage,owner).filter(r=>r.articleId!==row.articleId || r.reason!==row.reason)].slice(0,CORRECTION_LIMIT)
  try {storage.setItem(key(owner),JSON.stringify(rows));return true}catch{return false}
}
