// Eén contract voor web, server en de native spiegel (EditionDisplay.swift).
// Kopmaat verandert de opmaak; nooit het nieuwsbelang of de volgorde van verhalen.
import policy from './edition-display.json' with { type: 'json' }
const rules = policy.intro.rules.map(r => new RegExp(r.source, r.flags))
const escaped = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function cleanIntro(text, author = null) {
  if (typeof text !== 'string') return ''
  let value = text.replace(/\r\n?/g, '\n').trim()
  const knownAuthor = typeof author === 'string' && author.trim().length > 1 && author.length <= 120
    ? new RegExp(policy.intro.knownAuthor.replace('{author}', escaped(author.trim())), 'iu') : null
  const strip = v => {
    for (const re of rules) v = v.replace(re, '').trim()
    return knownAuthor ? v.replace(knownAuthor, '').trim() : v
  }
  for (let n = 0; n < policy.intro.maxPrefixes; n++) {
    const next = strip(value)
    if (next === value) break
    value = next
  }
  // Een uitzonderlijk lange stapel met bronruis levert geen halve header als intro op.
  if (strip(value) !== value) return ''
  return value.replace(/\s+/g, ' ').trim()
}

export function withCleanIntro(item) {
  if (!item || item.kind === 'post') return item
  const summary = typeof item.summary === 'string' ? cleanIntro(item.summary, item.author) : item.summary
  const text = typeof item.text === 'string' ? cleanIntro(item.text, item.author) : item.text
  return summary === item.summary && text === item.text ? item : { ...item, summary, ...(item.text === undefined ? {} : { text }) }
}

// UTF-16, gelijk aan NSString.length en de bestaande hele-zinnenmaat.
export function headlineTier(title = '') {
  const n = String(title).length
  return n <= policy.headline.largeMax ? 'large' : n <= policy.headline.mediumMax ? 'medium' : 'compact'
}
export const HALF_HEADLINE_LINES = policy.headline.halfLines
export const headlineFit = title => ({ large: 0.25, medium: 0.125, compact: 0 })[headlineTier(title)]
