// Overzicht van "meten zonder volgen": GET /api/tel?dagen=14 en print per dag de lezers per dagdeel (editie-open),
// het aandeel dat het einde haalde, en de overige gebeurtenissen. Alleen totalen.
//   node scripts/tel.mjs                 de laatste 14 dagen van https://gethoot.app
//   node scripts/tel.mjs 30              de laatste 30 dagen
//   node scripts/tel.mjs --base http://localhost:8888
// Staat TEL_SLEUTEL in Netlify, dan zet je dezelfde waarde in je omgeving; hij gaat als header mee (nooit in de URL).
import { fileURLToPath } from 'node:url'

const pad = (s, n) => String(s).padStart(n)
const cel = (o) => (o.open ? `${pad(o.open, 3)} (${pad(o.einde_procent ?? 0, 3)} %)` : pad('-', 10))

export function overzicht(r) {
  const kop = ['dag       ', ' ochtend   ', ' middag    ', ' avond     ', ' dag totaal ', ' artikel', ' Stroom', ' Selectie', ' vergelijk', ' delen']
  const regels = [`Lezers per dagdeel: Editie geopend (en het aandeel dat het einde haalde), ${r.van} t/m ${r.tot}`, '', kop.join(' |')]
  for (const d of r.dagen) {
    const t = d.totaal
    regels.push([d.dag, cel(d.lezers.ochtend), cel(d.lezers.middag), cel(d.lezers.avond), cel(d.lezers.dag), pad(t['artikel-open'], 7), pad(t['stroom-open'], 6), pad(t['selectie-open'], 8), pad(t['vergelijk-open'], 9), pad(t.delen, 5)].join(' | '))
  }
  const open = r.dagen.reduce((s, d) => s + d.lezers.dag.open, 0)
  const einde = r.dagen.reduce((s, d) => s + d.lezers.dag.einde, 0)
  regels.push('', `Samen: ${open} keer een Editie geopend, ${einde} keer uitgelezen${open ? ` (${Math.round((einde / open) * 100)} %)` : ''}.`)
  return regels.join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const i = args.indexOf('--base')
  const base = i >= 0 ? args[i + 1] : 'https://gethoot.app'
  const dagen = Number(args.find((a) => /^\d+$/.test(a))) || 14
  const headers = process.env.TEL_SLEUTEL ? { 'x-tel-sleutel': process.env.TEL_SLEUTEL } : {}
  const res = await fetch(`${base}/api/tel?dagen=${dagen}`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  console.log(overzicht(await res.json()))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => (console.error(`Mislukt: ${e.message}`), process.exit(1)))
