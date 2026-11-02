// Alleen zichtbaarheid in de Stroom; geen invoer- of rangschikregel voor De Redacteur.
export const SOCIAL_HOURS = 36
export function socialInStream(item, prefs = {}, now = Date.now()) {
  const time = Date.parse(item?.publishedAt)
  return prefs.bluesky === true && (prefs.bskyInStream || []).includes(item?.source)
    && item?.editionOnly !== true && Number.isFinite(time)
    && time >= now - SOCIAL_HOURS * 36e5 && time <= now + 5 * 6e4
}
