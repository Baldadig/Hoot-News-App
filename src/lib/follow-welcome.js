export const NEW_ONBOARDING = true
export const toggleFollow = (ids, id) => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
export function discoverSources(sources, interests, followed, filter = 'Ontdekken', query = '') {
  const q = query.trim().toLocaleLowerCase('nl')
  const relevant = s => interests.some(i => (s.for || []).includes(i) || s.cat === i)
  return sources.filter(s => (s.cat !== 'sport' || interests.includes('sport')) && (filter !== 'Volgend' || followed.includes(s.id)) && (!q || `${s.name} ${s.about || ''}`.toLocaleLowerCase('nl').includes(q)))
    .sort((a,b) => (filter === 'Ontdekken' ? Number(relevant(b)) - Number(relevant(a)) : 0) || a.name.localeCompare(b.name, 'nl'))
}
