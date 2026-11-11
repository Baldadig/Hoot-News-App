// Ieder uur: oude persoonlijke Edities en tellers weg (netlify/lib/opruimen.mjs). Een eigen functie, los van
// feed-refresh: de feedverversing loopt elke tien minuten en mag nooit wachten op, of falen door, het opruimen.
import { opruimen } from '../lib/opruimen.mjs'

export default async () => {
  try {
    const r = await opruimen()
    return new Response(`ok ${r.verwijderd}/${r.bewaard}/${r.overgeslagen}/${r.fouten}`)
  } catch (e) {
    console.error(`[opruimen] mislukt: ${e?.message || e}`)
    return new Response('mislukt', { status: 500 })
  }
}

export const config = { schedule: '17 * * * *' }
