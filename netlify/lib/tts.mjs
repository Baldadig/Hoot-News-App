// Voorlezen met een natuurlijke stem (Azure AI Speech, neurale Nederlandse stemmen).
// Pure functies; getest in tests/tts.test.mjs. De functie zelf staat in netlify/functions/tts.mjs.
import { bulletinText } from '../../src/lib/speech.js'
import { briefSections } from '../../shared/brief.mjs'

export const VOICES = {
  fenna: { id: 'nl-NL-FennaNeural', label: 'Fenna' },
  maarten: { id: 'nl-NL-MaartenNeural', label: 'Maarten' },
  colette: { id: 'nl-NL-ColetteNeural', label: 'Colette' },
}
export const DEFAULT_VOICE = 'fenna'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

// Eén SSML-document: rustig tempo, een korte pauze tussen de verhalen.
export function ssml(parts, voice = DEFAULT_VOICE) {
  const v = (VOICES[voice] || VOICES[DEFAULT_VOICE]).id
  const body = parts.map((p) => `<s>${esc(p)}</s>`).join('<break time="700ms"/>')
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="nl-NL"><voice name="${v}"><prosody rate="-4%">${body}</prosody></voice></speak>`
}

const LONG = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })

// De tekst van een bewaarde editie: kop, eventueel het AI-overzicht, dan per verhaal kop,
// kern en bron (zelfde opbouw als het voorlezen op het toestel).
export function editionParts(stored, slot) {
  const items = new Map((stored.items || []).map((i) => [i.id, i]))
  const stories = new Map((stored.stories || []).map((s) => [s.id, s]))
  const rows = []
  for (const e of stored.entries || []) {
    const st = e.kind === 'story' ? stories.get(e.id) : null
    const it = st ? items.get(e.leadId) || items.get(st.leadId) || st.itemIds.map((id) => items.get(id)).find(Boolean) : items.get(e.id)
    if (it) rows.push({ title: it.title, summary: it.summary, sourceName: it.sourceName })
  }
  const date = LONG.format(new Date(`${stored.id.slice(0, 10)}T12:00:00Z`))
  const parts = bulletinText({ slot, date, rows })
  const brief = briefSections(stored.brief)
  if (brief.length) parts.splice(1, 0, 'Eerst het overzicht.', ...brief.flatMap((s) => (s.head ? [`${s.head}.`, s.text] : [s.text])), 'En dan de verhalen.')
  return parts
}
