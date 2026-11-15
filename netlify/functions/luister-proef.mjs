// GET /api/luister-proef — Luister verder, de stille proef (stap 2): per dagdeel welke verhalen welke aflevering kregen,
// met soort (hetzelfde of verdiepend), het oordeel van De Redacteur en de reden, en welke kandidaten afvielen, met reden
// (bij een oordeel de reden van het model). Alleen lezen; de ronde schrijft het
// (netlify/lib/luister.mjs, luisterRonde). Geen persoonsgegevens: alleen verhalen, shows en afleveringen, en geen
// beschrijvingen van afleveringen.
//   ?dagdeel=2026-11-14-middag   alleen dat dagdeel
//   ?tekst=1                      als Markdown in plaats van JSON
import { kvGet } from '../lib/kv.mjs'
import { PROEF_KEY } from '../lib/luister.mjs'

const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
// Het oordeel zoals luister.mjs het bewaart (kortOordeel): soort, vooruitblikOpVoorbij, opgenomenVoorDitNieuws,
// eenOnderwerp, zeker. (Tot 15 november stond hier nog het veld `zaak` van een oude vorm van het oordeel: dan "undefined".)
// Een ontbrekend veld heet "onbekend", nooit "undefined".
const veld = (x) => (x === undefined || x === null || x === '' ? 'onbekend' : esc(x))
export const oordeelTekst = (o) => (o ? `soort ${veld(o.soort)}, vooruitblik op voorbij ${veld(o.vooruitblikOpVoorbij)}, opgenomen vóór dit nieuws ${veld(o.opgenomenVoorDitNieuws)}, één onderwerp ${veld(o.eenOnderwerp)}, zeker ${veld(o.zeker)}` : 'geen')
export function asText(doc) {
  const out = ['# Luister verder · proef', '']
  for (const d of doc.dagdelen || []) {
    const o = d.oordeel
    const oordeel = o ? (o.uit ? ` Oordeel: uit (${o.uit}).` : ` Oordeel (${o.model}): ${o.kandidaten || 0} kandidaten, ${o.uitOpslag || 0} uit de opslag, ${o.gevraagd || 0} gevraagd in ${o.aanroepen || 0} aanroepen, ${o.invoerTokens || 0} en ${o.uitvoerTokens || 0} tokens${o.timeouts ? `, ${o.timeouts} niet op tijd` : ''}${o.fouten ? `, ${o.fouten} fouten` : ''}.`) : ''
    out.push(`## ${d.dagdeel}`, '', `Laatste ronde ${d.at.slice(0, 10)}, ${d.afleveringen} afleveringen, ${d.koppelingen.length} koppelingen.${d.overTijd ? ' Over de tijd van de ronde.' : ''}${oordeel}`, '')
    if (d.koppelingen.length) {
      out.push('| Verhaal | Aflevering | Soort | Oordeel | Editie | Reden |', '|---|---|---|---|---|---|')
      for (const k of d.koppelingen) out.push(`| ${esc(k.kop)} | ${esc(k.show)}: ${esc(k.aflevering)} | ${k.soort} | ${oordeelTekst(k.oordeel)} | ${esc(k.editie || '')} | ${esc(k.reden)} |`)
      out.push('')
    }
    if (d.afgevallen.length) {
      out.push('Afgevallen:', '', '| Verhaal | Aflevering | Oordeel | Reden |', '|---|---|---|---|')
      for (const a of d.afgevallen) out.push(`| ${esc(a.kop)} | ${esc(a.show)}: ${esc(a.aflevering)} | ${oordeelTekst(a.oordeel)} | ${esc(a.reden)} |`)
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
