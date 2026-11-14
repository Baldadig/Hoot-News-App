// GET /api/luister-proef — Luister verder, de stille proef (stap 2): per dagdeel welke verhalen welke aflevering kregen,
// met soort (hetzelfde of verdiepend) en reden, en welke kandidaten afvielen, met reden. Alleen lezen; de ronde schrijft het
// (netlify/lib/luister.mjs, luisterRonde). Geen persoonsgegevens: alleen verhalen, shows en afleveringen, en geen
// beschrijvingen van afleveringen.
//   ?dagdeel=2026-11-14-middag   alleen dat dagdeel
//   ?tekst=1                      als Markdown in plaats van JSON
import { kvGet } from '../lib/kv.mjs'
import { PROEF_KEY } from '../lib/luister.mjs'

const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
export function asText(doc) {
  const out = ['# Luister verder · proef', '']
  for (const d of doc.dagdelen || []) {
    out.push(`## ${d.dagdeel}`, '', `Laatste ronde ${d.at.slice(0, 10)}, ${d.afleveringen} afleveringen, ${d.koppelingen.length} koppelingen.`, '')
    if (d.koppelingen.length) {
      out.push('| Verhaal | Aflevering | Soort | Reden |', '|---|---|---|---|')
      for (const k of d.koppelingen) out.push(`| ${esc(k.kop)} | ${esc(k.show)}: ${esc(k.aflevering)} | ${k.soort} | ${esc(k.reden)} |`)
      out.push('')
    }
    if (d.afgevallen.length) {
      out.push('Afgevallen:', '', '| Verhaal | Aflevering | Reden |', '|---|---|---|')
      for (const a of d.afgevallen) out.push(`| ${esc(a.kop)} | ${esc(a.show)}: ${esc(a.aflevering)} | ${esc(a.reden)} |`)
      out.push('')
    }
  }
  return out.join('\n') + '\n'
}

export async function proef(dagdeel = null, get = kvGet) {
  const doc = (await Promise.resolve().then(() => get(PROEF_KEY)).catch(() => null)) || { dagdelen: [] }
  const dagdelen = (doc.dagdelen || []).filter((d) => !dagdeel || d.dagdeel === dagdeel)
  return { dagdelen }
}

export default async (req) => {
  if (req.method !== 'GET') return Response.json({ error: 'Alleen GET.' }, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } })
  const url = new URL(req.url)
  const asked = url.searchParams.get('dagdeel')
  const doc = await proef(asked && /^\d{4}-\d{2}-\d{2}-(ochtend|middag|avond)$/.test(asked) ? asked : null)
  const headers = { 'Cache-Control': 'no-store' }
  if (url.searchParams.get('tekst')) return new Response(asText(doc), { headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' } })
  return Response.json(doc, { headers })
}

export const config = { path: '/api/luister-proef' }
