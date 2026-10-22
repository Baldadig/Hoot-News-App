// Onderwerpen (smal) en interesses (breed) — pure gegevens en functies (tests/topics.test.mjs).
// De id's van de onderwerpen komen overeen met de trefwoorden op de server (netlify/lib/topics.mjs).
export const TOPICS = [
  { id: 'nederland', label: 'Nederland', emoji: '🇳🇱' },
  { id: 'europa', label: 'Europa', emoji: '🇪🇺' },
  { id: 'vs-politiek', label: 'VS-politiek', emoji: '🇺🇸' },
  { id: 'trump', label: 'Trump', emoji: '🎪' },
  { id: 'oekraine', label: 'Oekraïne', emoji: '🇺🇦' },
  { id: 'middenoosten', label: 'Midden-Oosten', emoji: '🕊️' },
  { id: 'geopolitiek', label: 'Geopolitiek', emoji: '🌐' },
  { id: 'economie', label: 'Economie', emoji: '📈' },
  { id: 'ai', label: 'AI', emoji: '🤖' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'wetenschap', label: 'Wetenschap', emoji: '🔬' },
  { id: 'klimaat', label: 'Klimaat', emoji: '🌱' },
  { id: 'gezondheid', label: 'Gezondheid', emoji: '🩺' },
  { id: 'muziek', label: 'Muziek', emoji: '🎵' },
  { id: 'film', label: 'Film & series', emoji: '🎬' },
  { id: 'kunst', label: 'Boeken & kunst', emoji: '📚' },
]

// Breed → smal: wat je in de onboarding eerst kiest, en wat daaronder valt.
export const INTERESTS = [
  { id: 'politiek', label: 'Politiek', emoji: '🏛️', topics: ['nederland', 'europa', 'vs-politiek', 'trump'] },
  { id: 'wereld', label: 'Wereld', emoji: '🌍', topics: ['oekraine', 'middenoosten', 'geopolitiek'] },
  { id: 'economie', label: 'Economie', emoji: '📈', topics: ['economie'] },
  { id: 'tech', label: 'Tech', emoji: '💻', topics: ['ai', 'tech'] },
  { id: 'wetenschap', label: 'Wetenschap', emoji: '🔬', topics: ['wetenschap', 'klimaat', 'gezondheid'] },
  { id: 'cultuur', label: 'Cultuur', emoji: '🎭', topics: ['muziek', 'film', 'kunst'] },
]

export const topicById = (id) => TOPICS.find((t) => t.id === id)

// Wat je volgt: per gekozen interesse de onderwerpen die je aantikte, of alle als je er geen koos.
export function resolveTopics(interests = [], picked = []) {
  return INTERESTS.filter((i) => interests.includes(i.id)).flatMap((i) => {
    const mine = i.topics.filter((t) => picked.includes(t))
    return mine.length ? mine : i.topics
  })
}

// Welke bronnen staan vooraf aan bij deze interesses: algemene bronnen altijd, specifieke
// (`for`) als een van je interesses erbij past. Muziek alleen als je muziek volgt.
export function suggestSources(sources = [], interests = [], topics = []) {
  return sources
    .filter((s) => {
      if (s.kind === 'muziek') return topics.includes('muziek') && (s.for || []).some((f) => interests.includes(f))
      return !s.for || s.for.some((f) => interests.includes(f))
    })
    .map((s) => s.id)
}

// De rij onderwerpen in de Stroom: "Alles", dan wat je vooraan wilt, dan de rest. Volg je
// bepaalde onderwerpen (onboarding), dan alleen die.
export function orderedTopics(pinned = [], mine = []) {
  const pool = mine.length ? mine.map(topicById).filter(Boolean) : TOPICS
  const first = pinned.map((id) => pool.find((t) => t.id === id)).filter(Boolean)
  return [...first, ...pool.filter((t) => !pinned.includes(t.id))]
}
