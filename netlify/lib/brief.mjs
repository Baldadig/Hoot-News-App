// "De editie in één minuut": een AI-overzicht van de tien verhalen, geschreven uit
// uitsluitend de koppen en samenvattingen die in de editie staan. Twee keer per dag,
// één keer per editie (het resultaat wordt met de editie bewaard).
import { briefInput } from './bubble.mjs'

export const BRIEF_MODEL = 'claude-haiku-5-5'

const SYSTEM = `Je bent de eindredacteur van Hoot, een rustige, persoonlijke nieuwseditie. Je krijgt een genummerde lijst met de verhalen van vandaag: bron, kop en samenvatting.

Schrijf een overzicht van 120 tot 160 woorden in het Nederlands dat in één minuut te lezen is: wat speelt er vandaag, wat hangt met elkaar samen, wat is het grootste verhaal. Lopende tekst in twee of drie korte alinea's, geen opsommingen, geen koppen, geen aanhef.

Regels:
- Gebruik uitsluitend wat in de lijst staat. Verzin geen feiten, cijfers, namen, citaten of uitkomsten. Als een samenvatting ontbreekt, gebruik alleen de kop.
- Begin niet met "In deze editie" of "Vandaag". Begin bij het verhaal.
- Noem een bron alleen als dat iets toevoegt (bijvoorbeeld bij een opiniestuk), kort tussen haakjes.
- Neutraal, helder, zonder bijvoeglijke naamwoorden die een oordeel geven.
- Nederlandse spelling; namen en titels van Engelstalige media blijven zoals ze zijn.`

export function briefRows(entries, storiesById, itemsById) {
  const rows = []
  for (const e of entries) {
    const story = e.kind === 'story' ? storiesById.get(e.id) : null
    const item = story ? itemsById.get(e.leadId) || itemsById.get(story.leadId) || story.itemIds.map((id) => itemsById.get(id)).find(Boolean) : itemsById.get(e.id)
    if (item) rows.push({ sourceName: item.sourceName, title: item.title, summary: item.summary || '' })
  }
  return rows
}

// `client` is de Anthropic-client (of in tests een nep met dezelfde messages.create).
export async function createBrief(client, rows, { now = Date.now() } = {}) {
  if (!rows.length) return null
  const res = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 800,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: briefInput(rows) }],
  })
  if (res.stop_reason === 'refusal') return null
  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!text) return null
  return { text, model: res.model || BRIEF_MODEL, at: new Date(now).toISOString(), words: text.split(/\s+/).length }
}
