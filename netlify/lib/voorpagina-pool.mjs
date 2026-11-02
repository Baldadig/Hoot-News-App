// Eigen kleine kandidatenpool voor /api/voorpagina. KEYS.start wordt bewust zonder berichten
// bewaard (items: [], de app haalt per bron een deel); de voorpagina kreeg daardoor in productie
// nooit genoeg kandidaten en gaf altijd 503. refresh.mjs schrijft daarom naast de kern deze pool:
// de nieuwste Nederlandstalige berichten (geen posts) van de laatste anderhalve dag, met alleen de
// velden die de voorpagina leest. De rubriek wordt hier al uitgerekend, want daarvoor zijn URL en
// rubriek van de bron nodig, die niet in de pool staan.
import { desksOf, primaryDesk } from './desks.mjs'

export const VOORPAGINA_HOURS = 36
export const VOORPAGINA_MAX = 200

// Nederlandstalig? Het bericht zelf weet het (offLang = bewust anderstalig, lang = taal), anders de bron.
export function isDutch(item, sourceLang) {
  if (!item || item.offLang) return false
  return (item.lang || sourceLang) === 'nl'
}

export function voorpaginaPool(items = [], sources = [], now = Date.now()) {
  const lang = new Map(sources.map((s) => [s.id, s.lang]))
  const pool = items
    .filter((i) => i && i.kind !== 'post' && i.title && Number.isFinite(Date.parse(i.publishedAt)))
    .filter((i) => {
      const age = now - Date.parse(i.publishedAt)
      return age >= -36e5 && age <= VOORPAGINA_HOURS * 36e5 && isDutch(i, lang.get(i.source))
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || String(a.id).localeCompare(String(b.id)))
    .slice(0, VOORPAGINA_MAX)
    .map((i) => {
      const out = {
        id: i.id,
        title: i.title,
        summary: i.summary || '',
        source: i.source,
        sourceName: i.sourceName || i.source,
        topics: i.topics || [],
        desk: primaryDesk([desksOf(i)]),
        publishedAt: i.publishedAt,
        storyId: i.storyId || null,
      }
      if (i.mainTopics?.length) out.mainTopics = i.mainTopics
      // Alleen de rubrieknaam uit het pad bewaren, geen uitgevers-URL. Nodig om sport en
      // cultuur ook zonder onderwerp-tags te herkennen, net als bij de volledige feed.
      const section = i.section || /\/(sport[\w-]*|voetbal|cultuur[\w-]*|entertainment|showbizz|boulevard|film|muziek|boeken|media)\//i.exec(i.url || '')?.[1]
      if (section) out.section = section
      if (i.lang) out.lang = i.lang
      if (/^https:\/\//.test(i.image || '')) out.image = i.image
      return out
    })
  return { builtAt: new Date(now).toISOString(), hours: VOORPAGINA_HOURS, items: pool }
}
