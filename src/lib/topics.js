// Onderwerp-tabs (niet bronnen). De id's komen overeen met de aggregator
// (netlify/functions/feed.mjs) en met de AI-classificatie.
export const TOPICS = [
  { id: 'vs-politiek', label: 'VS-politiek', emoji: '🇺🇸' },
  { id: 'trump', label: 'Trump', emoji: '🎪' },
  { id: 'nederland', label: 'Nederland', emoji: '🇳🇱' },
  { id: 'oekraine', label: 'Oekraïne', emoji: '🇺🇦' },
  { id: 'geopolitiek', label: 'Geopolitiek', emoji: '🌍' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'ai', label: 'AI', emoji: '🤖' },
  { id: 'wetenschap', label: 'Wetenschap', emoji: '🔬' },
  { id: 'economie', label: 'Economie', emoji: '📈' },
  { id: 'muziek', label: 'Muziek', emoji: '🎵' },
]

// De rij onderwerpen in de Stroom: "Alles", dan wat je vooraan wilt (Bronnen), dan de rest.
export function orderedTopics(pinned = []) {
  const first = pinned.map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean)
  const rest = TOPICS.filter((t) => !pinned.includes(t.id))
  return [...first, ...rest]
}
