// GET /api/vak-bronnen — het weekoverzicht van de bronnen van de Selectie: per onderwerp hoeveel
// bronnen gezond zijn, en welke op pauze staan (kapot of al twee maanden stil). Geen gegevens van
// gebruikers; alleen de stand van de bronnen.
import { kvGet, KEYS } from '../lib/kv.mjs'
import { healthReport } from '../lib/vak.mjs'

export default async () => {
  const report = healthReport((await kvGet(KEYS.vakHealth)) || {})
  return Response.json(report, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=600' } })
}

export const config = { path: '/api/vak-bronnen' }
