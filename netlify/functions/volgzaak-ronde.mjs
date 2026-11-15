// De geplande ronde van volgzaken (netlify/lib/volgzaak-ronde.mjs): de voorraad bijwerken (altijd, zonder model, behalve
// met de noodrem HOOT_VOLGZAAK_VOORRAAD=uit), en alleen met de vlag HOOT_VOLGZAKEN op proef of aan de matching, de
// wachtrij voor het oordeel, de momentopname per dagdeel en (bij aan) het veld in de feed. Los van de feed-ronde, die
// hier nooit op wacht. Het log krijgt alleen aantallen.
import { volgzaakRonde } from '../lib/volgzaak-ronde.mjs'

export default async () => {
  const start = Date.now()
  const { stats: s } = await volgzaakRonde({ start })
  const v = s.voorraad || {}
  console.log(`[volgzaak-ronde] voorraad: delen ${v.gelezen || 0}, stukken ${v.stukken || 0}, nieuw ${v.nieuw || 0}, geschreven ${v.geschreven || 0}${v.nachtrust ? ', nachtrust' : ''}${v.uit ? `, ${v.uit}` : ''}${v.fout ? ', fout' : ''}; stand ${s.stand}${s.volgzaken != null ? `, volgzaken ${s.volgzaken}, twijfel ${s.twijfel || 0}, wachtrij ${s.wachtrij || 0}` : ''}${s.inFeed != null ? `, in de feed ${s.inFeed}` : ''}${s.fout ? ', fout' : ''}, ${Date.now() - start} ms`)
  return new Response('ok')
}

// Na de feed (*/10), verschillen-refresh (minuut 3) en luister-oordeel (minuut 5).
export const config = { schedule: '7,17,27,37,47,57 * * * *' }
