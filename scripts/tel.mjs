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
  // Meten · 6: herkomst, App Store-tik en het welkom, opgeteld over de periode (nullen zolang NIEUWE_TELLERS uit staat).
  const som = (f) => r.dagen.reduce((t, d) => t + (Number(f(d)) || 0), 0)
  const labels = Object.keys(r.dagen[0]?.herkomst || {})
  regels.push('', `Herkomst (?via, één keer per dagdeel per browser): ${labels.length ? labels.map((l) => `${l} ${som((d) => d.herkomst?.[l])}`).join(', ') : 'geen'}`)
  regels.push(`App Store-tik op de landing: ${som((d) => d.appstore_tik)}`)
  const asPlek = Object.keys(r.dagen[0]?.appstore_plek || {})
  if (asPlek.length) regels.push(`  per plek: ${asPlek.map((p) => `${p} ${som((d) => d.appstore_plek?.[p])}`).join(', ')}`)
  const lopen = som((d) => d.landing_open)
  const web = Object.keys(r.dagen[0]?.web_tik || {})
  const webSom = som((d) => Object.values(d.web_tik || {}).reduce((a, b) => a + b, 0))
  regels.push(`Landing geopend (één keer per dagdeel per browser): ${lopen}; naar /lees/: ${webSom}${lopen ? ` (${Math.round((webSom / lopen) * 100)} %)` : ''}`)
  if (web.length) regels.push(`  per plek: ${web.map((p) => `${p} ${som((d) => d.web_tik?.[p])}`).join(', ')}`)
  regels.push(`Vraag opengeklapt (één keer per dagdeel per browser): ${som((d) => d.vraag_open)}`)
  const stappen = Object.keys(r.dagen[0]?.welkom || {})
  regels.push(`Welkom op het web: ${stappen.length ? stappen.map((s) => `${s} ${som((d) => d.welkom?.[s])}`).join(', ') : 'geen'}`)
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
