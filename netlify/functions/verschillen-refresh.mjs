// "Waar media verschillen" schrijven en keuren, los van de feed (netlify/lib/verschillen.mjs). Een paar minuten na
// elke feed-ronde: de Editie uit de laatst weggeschreven feed, en voor wat nog geen gekeurd blok heeft één ronde
// schrijven (Sonnet 5.5), toetsen (code) en controleren (Haiku 5.5). De feed wacht hier nooit op: de volgende
// feed-build leest het gekeurde blok uit KV. Met de vlag uit (HOOT_VERSCHILLEN) of zonder sleutel: niets.
import Anthropic from '@anthropic-ai/sdk'
import { readDoc, KEYS } from '../lib/kv.mjs'
import { verschillenAan, verschillenRonde } from '../lib/verschillen.mjs'

export default async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!verschillenAan() || !apiKey) return new Response('uit')
  const client = new Anthropic({ apiKey, timeout: 20000, maxRetries: 1 })
  // Binnen de grens van een geplande functie (± 30 s): 20 s budget, daarna afgebroken en een volgende ronde.
  const blokken = await verschillenRonde({ client, readCore: () => readDoc(KEYS.core), budget: 20000 })
  return new Response(`ok ${blokken.size}`)
}

// Drie minuten na de feed (die draait op */10).
export const config = { schedule: '3,13,23,33,43,53 * * * *' }
