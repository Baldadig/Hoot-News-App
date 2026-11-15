// Het oordeel bij twijfel voor volgzaken (netlify/lib/volgzaak-oordeel.mjs), naar het patroon van luister-oordeel: de
// vragen uit de wachtrij van de laatste volgzaak-ronde, binnen het eigen plafond VOLGZAAK_DAG_USD. Met de vlag
// HOOT_VOLGZAKEN uit of zonder sleutel: niets, ook geen lezing. Het log krijgt alleen aantallen.
import Anthropic from '@anthropic-ai/sdk'
import { kvGet, kvUpdate } from '../lib/kv.mjs'
import { volgzaakOordeelRonde } from '../lib/volgzaak-oordeel.mjs'
import { volgzakenStand } from '../lib/volgzaak-basis.mjs'
import { OORDEEL_VRAAG_MS } from '../lib/luister.mjs'

export default async () => {
  const start = Date.now()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (volgzakenStand() === 'uit' || !apiKey) return new Response('uit')
  const client = new Anthropic({ apiKey, timeout: OORDEEL_VRAAG_MS, maxRetries: 0 })
  const { stats: s } = await volgzaakOordeelRonde({ client, get: kvGet, update: (k, fn) => kvUpdate(k, fn, { tries: 3 }), start })
  console.log(`[volgzaak-oordeel] in de wachtrij ${s.inWachtrij || 0}, gevraagd ${s.gevraagd || 0}, ja ${s.ja || 0}, nee ${s.nee || 0}, $${s.kostenUsd || 0} (vandaag $${s.dagKostenUsd || 0})${s.timeouts ? `, time-outs ${s.timeouts}` : ''}${s.fouten ? `, fouten ${s.fouten}` : ''}${s.plafond ? ', plafond' : ''}${s.geenTijd ? ', geen tijd' : ''}${s.uit ? `, ${s.uit}` : ''}`)
  return new Response(`ok ${s.gevraagd || 0}`)
}

// Twee minuten na de volgzaak-ronde (minuut 7, 17, ...).
export const config = { schedule: '9,19,29,39,49,59 * * * *' }
