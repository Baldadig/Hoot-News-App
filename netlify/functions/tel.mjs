// /api/tel — meten zonder volgen. Alleen totalen per dag, geen personen (Privacy: "Hoot telt alleen totalen").
//   POST  { e, d, p, v?, n? }   één gebeurtenis uit een klein vast vocabulaire (shared/tel.mjs). Altijd 204: ook als
//         het onbekend of ongeldig is (dan wordt het genegeerd), zodat de client niets te weten komt en nooit wacht.
//   GET   ?dag=jjjj-mm-dd       de tellers van één dag; ?dagen=14 (&dag=laatste dag) een reeks, oudste eerst.
//         Met TEL_SLEUTEL gezet in Netlify: alleen met de header x-tel-sleutel (nooit in de URL: die belandt in logs).
// We slaan niets op over wie: geen IP, geen user-id, geen cookie, geen toestel, geen user-agent, geen tijdstempel
// per gebeurtenis, en we loggen geen body, kop of adres. Rate limiting per IP doet Netlify (config.rateLimit).
import { createHash, timingSafeEqual } from 'node:crypto'
import { parseTel, BODY_MAX, today, dayNumber } from '../../shared/tel.mjs'
import { record, readDay, readRange } from '../lib/tel.mjs'

const quiet = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
const sha = (s) => createHash('sha256').update(String(s)).digest()

export function allowed(req, env = process.env) {
  const want = env.TEL_SLEUTEL?.trim()
  if (!want) return true // geen sleutel gezet: alleen totalen, zoals de scorekaart
  const got = req.headers.get('x-tel-sleutel') || ''
  return timingSafeEqual(sha(want), sha(got))
}

export async function handle(req, { env = process.env, now = new Date(), write = record, day = readDay, range = readRange } = {}) {
  if (req.method === 'POST') {
    try {
      const len = Number(req.headers.get('content-length'))
      if (Number.isFinite(len) && len > BODY_MAX) return quiet()
      const text = await req.text()
      if (text.length > BODY_MAX) return quiet()
      const parsed = parseTel(JSON.parse(text), now)
      if (parsed) await write(parsed)
    } catch {
      // onleesbaar of een storing: negeren, en niets loggen (geen body, geen adres)
    }
    return quiet()
  }
  if (req.method !== 'GET') return Response.json({ error: 'Alleen GET en POST.' }, { status: 405, headers: { Allow: 'GET, POST', 'Cache-Control': 'no-store' } })
  if (!allowed(req, env)) return Response.json({ error: 'Sleutel ontbreekt.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const url = new URL(req.url)
  const asked = url.searchParams.get('dag')
  const dag = asked && dayNumber(asked) != null ? asked : today(now)
  const dagen = Number(url.searchParams.get('dagen'))
  const body = dagen >= 1 ? await range(dag, dagen) : await day(dag)
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
}

export default (req) => handle(req)

// 60 aanvragen per minuut per IP (Netlify), zonder dat wij iets opslaan; daarboven 429 en negeert de client het.
export const config = { path: '/api/tel', rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
