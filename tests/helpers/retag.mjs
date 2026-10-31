// De hertagde momentopname: een live feed van de oude productieserver, opnieuw getagd zoals de server van
// deze checkout hem zou leveren. De volledige artikeltekst zit niet in de feed; de onderwerpen die de oude
// server daaruit haalde, blijven, behalve wat alleen een teruggetrokken trefwoord verklaart (trustedTopics).
// Daarbij wat keywordTopics nu in kop, intro en rubriek van de bron vindt, en de vaste onderwerpen van een
// vakbron (toClient in netlify/lib/build.mjs). Per verhaal de rubriek uit al zijn berichten (st.desk,
// deskOfStory in buildStories). Zo draait de lezerstoets op beide: wat het toestel nu van de oude server
// krijgt (raw, met trustedTopics) en wat het straks van de nieuwe krijgt (hertagd).
import { keywordTopics, trustedTopics } from '../../netlify/lib/topics.mjs'
import { deskOfStory } from '../../netlify/lib/desks.mjs'
import { SOURCES } from '../../netlify/lib/sources.mjs'

const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
function retagItem(it) {
  if (!it || typeof it !== 'object' || it.kind === 'post') return it
  const topics = [...trustedTopics(it)]
  for (const t of keywordTopics(`${it.title || ''} ${it.summary || ''} ${it.cats || ''}`)) if (!topics.includes(t)) topics.push(t)
  const src = SOURCE.get(it.source)
  for (const t of [...(src?.topics || []), ...(src?.music ? ['muziek'] : [])]) if (!topics.includes(t)) topics.push(t)
  return { ...it, topics }
}

export function retag(data) {
  const items = data.items.map(retagItem)
  const editionItems = (data.edition?.items || []).map(retagItem)
  const byId = new Map([...editionItems, ...items].map((i) => [i.id, i]))
  const stories = data.stories.map((st) => ({ ...st, desk: deskOfStory(st.itemIds.map((id) => byId.get(id)).filter(Boolean)) }))
  const edition = { ...data.edition, items: editionItems, wide: (data.edition?.wide || []).map((w) => (w?.item ? { ...w, item: retagItem(w.item) } : w)) }
  return { ...data, items, stories, edition }
}

// Hoeveel berichten een ander onderwerp krijgen en hoeveel verhalen een rubriek (ter inzage in de test).
export function retagDiff(raw, tagged) {
  const key = (ts) => [...(ts || [])].sort().join(',')
  const rawById = new Map(raw.items.map((i) => [i.id, i]))
  const topics = tagged.items.filter((i) => i.kind === 'article' && key(i.topics) !== key(rawById.get(i.id)?.topics)).length
  const desks = tagged.stories.filter((s) => s.desk).length
  return { topics, desks, items: tagged.items.length, stories: tagged.stories.length }
}
