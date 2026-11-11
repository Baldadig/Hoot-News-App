// GET /api/scorekaart — de dagelijkse scorekaart van de algemene Editie (frisse ogen · 2): per dagdeel de vijf KPI's
// uit het rapport van 11 november, en die van de dag ervoor ernaast. Alleen lezen; de server schrijft hem bij het
// vastleggen (netlify/lib/build.mjs, archiveEdition). Geen lezersgegevens: alleen de algemene Editie.
//   ?dag=2026-11-12   een andere dag (standaard: de dag van de Editie van nu)
//   ?tekst=1          als tabel in markdown in plaats van JSON
import { kvGet } from '../lib/kv.mjs'
import { editionSlot } from '../lib/stories.mjs'
import { summarize, scoreLine, summaryLine, SCORE_HEAD, SCORECARD_KEY } from '../lib/scorekaart.mjs'

const SLOTS = ['ochtend', 'middag', 'avond']
const dayBefore = (date) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}
const rowsOf = (doc) => SLOTS.map((s) => doc?.rijen?.[s]).filter(Boolean)

export async function scorecard(dag, get = kvGet) {
  const [doc, prev] = await Promise.all([get(SCORECARD_KEY(dag)).catch(() => null), get(SCORECARD_KEY(dayBefore(dag))).catch(() => null)])
  const rijen = rowsOf(doc)
  const vorige = rowsOf(prev)
  return { dag, rijen, samenvatting: summarize(rijen), vorige: { dag: dayBefore(dag), rijen: vorige, samenvatting: summarize(vorige) } }
}

export function asText(card) {
  const part = (title, rows, s) => [`## ${title}`, '', SCORE_HEAD, ...rows.map(scoreLine), '', summaryLine(s)].join('\n')
  return `${part(`Scorekaart ${card.dag}`, card.rijen, card.samenvatting)}\n\n${part(`De dag ervoor, ${card.vorige.dag}`, card.vorige.rijen, card.vorige.samenvatting)}\n`
}

export default async (req) => {
  if (req.method !== 'GET') return Response.json({ error: 'Alleen GET.' }, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } })
  const url = new URL(req.url)
  const asked = url.searchParams.get('dag')
  const dag = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : editionSlot(new Date()).date
  const card = await scorecard(dag)
  const headers = { 'Cache-Control': 'no-store' }
  if (url.searchParams.get('tekst')) return new Response(asText(card), { headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' } })
  return Response.json(card, { headers })
}

export const config = { path: '/api/scorekaart' }
