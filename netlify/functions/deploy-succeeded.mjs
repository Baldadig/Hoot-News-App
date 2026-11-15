// Na elke geslaagde deploy (een Netlify-event: een functie met de naam van het event) maken we /api/edition warm
// (Editie stabiel, 15 november 2026). Na de deploy van die ochtend waren de instanties koud: de eerste vragen lazen
// de kern en alle delen opnieuw uit Blobs, het toestel wachtte te lang en toonde eerst zijn eigen vangnet en daarna
// de Editie van de server. feed-refresh warmt alleen bij een nieuw dagdeel; dit warmt ook midden in een dagdeel.
// Zelfde aanroep als feed-refresh (POST { v: 2, warm: true }): geen profiel, niets bewaard. Mislukt het, dan niets.
import { warmEdition } from '../lib/warm.mjs'

export const warmAfterDeploy = async (base, warm = warmEdition) => (base ? warm(base) : 0)

export default async () => {
  const status = await warmAfterDeploy(process.env.URL || '')
  return new Response(`warm ${status}`)
}
