// Luister verder: het oordeel van De Redacteur, los van de feed (netlify/lib/luister.mjs, oordeelRonde). Een paar minuten
// na elke feed-ronde: de vragen die de ronde in de wachtrij zette (paren zonder oordeel), aan het model, met de ruimte van
// een eigen functie. De feed wacht hier nooit op: de volgende feed-ronde leest de oordelen uit KV en koppelt dan.
// Derde keuring van branch weekshow (15 november): in de ronde zelf begon het oordeel pas na het ophalen en de Editie, en
// werden de aanroepen afgekapt op hun eigen grens van 8 s. Zonder sleutel: niets.
import Anthropic from '@anthropic-ai/sdk'
import { kvGet, kvUpdate } from '../lib/kv.mjs'
import { oordeelRonde, kostenVan, OORDEEL_VRAAG_MS } from '../lib/luister.mjs'

export default async () => {
  const start = Date.now()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('uit')
  const client = new Anthropic({ apiKey, timeout: OORDEEL_VRAAG_MS, maxRetries: 0 })
  const { stats: s } = await oordeelRonde({ client, get: kvGet, update: (k, fn) => kvUpdate(k, fn, { tries: 3 }), start })
  // Alleen aantallen in het log.
  console.log(`[luister-oordeel] in de wachtrij ${s.inWachtrij || 0}, gevraagd ${s.gevraagd || 0} in ${s.aanroepen || 0} aanroepen, ja ${s.ja || 0}, tokens ${s.invoerTokens || 0}/${s.uitvoerTokens || 0} ($${kostenVan(s.invoerTokens, s.uitvoerTokens)})${s.timeouts ? `, time-outs ${s.timeouts}` : ''}${s.fouten ? `, fouten ${s.fouten}` : ''}${s.begonNaMs != null ? `, begonnen na ${s.begonNaMs} ms` : ''}${s.timeoutMs ? `, ${s.timeoutMs} ms per aanroep` : ''}${s.ms ? `, ${s.ms} ms` : ''}${s.geenTijd ? ', geen tijd' : ''}${s.plafond ? ', plafond' : ''}${s.uit ? `, ${s.uit}` : ''}`)
  return new Response(`ok ${s.beoordeeld || 0}`)
}

// Vijf minuten na de feed (die draait op */10), na verschillen-refresh (drie minuten erna).
export const config = { schedule: '5,15,25,35,45,55 * * * *' }
