// Rood-meting: hoeveel van elk scherm is rood? Zo wordt 90/9/1 (papier, inkt, rood) een getal in
// plaats van een gevoel. Na capture-all.sh: npm run rood -- <map>
//
//   npm run rood -- <map> [--uit <bestand>]
//
// <map> is een uitvoermap van het opnameharnas (Hoot-design/harnas/capture.mjs, met
// <map>/<breedte>-<thema>/<job>/viewport.png) of een map met losse PNG's (iOS-opnamen). Per beeld
// telt het script de pixels binnen een RGB-afstand van 48 tot het rood: #a3201b (accent en
// merkrood licht, en het merkrode vlak in donker) en #ec7a70 (accent donker).
//
// De soort komt uit de jobnaam, en bij losse PNG's uit de bestandsnaam (zet de jobnaam erin, zoals
// 'ios-licht-04-editie-einde.png'):
//   merkmoment  editie-einde, welkom-1, welkom-snel, opstart*                  vrij
//   bediening   bronnen-*, instellingen-*, welkom-2..5, stroom-filters,
//               stroom-bronnen-open, account-*, join-blad, focus-*, hover-*    ≤ 1,5 procent
//   leesscherm  al het andere                                                  ≤ 1,0 procent
//
// Uitvoer: INDEX.md in <map> (of --uit), een tabel met scherm, breedte, thema, rood, soort en
// grens; de overschrijdingen bovenaan. Exitcode 1 bij een overschrijding, 2 bij een fout.
import sharp from 'sharp'
import { readdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { pathToFileURL } from 'node:url'

const RED = [
  [0xa3, 0x20, 0x1b], // --accent en --brand-red (licht), het merkrode vlak ook in donker
  [0xec, 0x7a, 0x70], // --accent (donker)
]
const NEAR = 48 * 48 // RGB-afstand ≤ 48, in het kwadraat

// Soort per naam. Elk patroon staat los in de naam (begin, eind of tussen - en _), zodat
// 'groot-instellingen-boven', 'palet-blad-bronnen' en 'b1-instellingen-licht' ook bediening zijn.
// 'bronnen-*' is het woord bronnen met of zonder vervolg; 'opstart*' is een voorvoegsel.
const KINDS = [
  { kind: 'merkmoment', max: null, names: ['editie-einde', 'welkom-1', 'welkom-snel', 'opstart*'] },
  {
    kind: 'bediening',
    max: 1.5,
    names: ['bronnen-*', 'instellingen-*', 'welkom-2', 'welkom-3', 'welkom-4', 'welkom-5', 'stroom-filters', 'stroom-bronnen-open', 'account-*', 'join-blad', 'focus-*', 'hover-*'],
  },
]
const READ = { kind: 'leesscherm', max: 1.0 }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const pattern = (p) => {
  if (p.endsWith('-*')) return new RegExp(`(^|[-_])${esc(p.slice(0, -2))}($|[-_])`)
  if (p.endsWith('*')) return new RegExp(`(^|[-_])${esc(p.slice(0, -1))}`)
  return new RegExp(`(^|[-_])${esc(p)}($|[-_])`)
}
const RULES = KINDS.map((k) => ({ ...k, re: k.names.map(pattern) }))
export const kindOf = (name) => RULES.find((k) => k.re.some((re) => re.test(name))) || READ

// Aandeel rood in procent, over alle pixels van het beeld.
export async function redShare(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let hit = 0
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    for (const [R, G, B] of RED) {
      const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2
      if (d <= NEAR) {
        hit++
        break
      }
    }
  }
  return { pct: (hit / (info.width * info.height)) * 100, width: info.width }
}

const THEMES = { light: 'licht', dark: 'donker', licht: 'licht', donker: 'donker' }
const isDir = (p) => statSync(p).isDirectory()

// Welke beelden: de harnasmappen <breedte>-<thema>/<job>/viewport.png, anders de losse PNG's.
function shots(dir) {
  const runs = readdirSync(dir).filter((d) => /^\d+-(light|dark)$/.test(d) && isDir(join(dir, d)))
  if (runs.length) {
    return runs.flatMap((run) => {
      const [w, t] = run.split('-')
      return readdirSync(join(dir, run))
        .filter((job) => existsSync(join(dir, run, job, 'viewport.png')))
        .map((job) => ({ name: job, width: Number(w), theme: THEMES[t], file: join(dir, run, job, 'viewport.png') }))
    })
  }
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => {
      const name = basename(f, '.png')
      const w = name.match(/--(\d+)(--|$)/) // 'web-editie-boven--390--licht'
      const t = name.match(/(^|[-_])(licht|donker|light|dark)($|[-_])/)
      return { name, width: w ? Number(w[1]) : null, theme: t ? THEMES[t[2]] : '–', file: join(dir, f) }
    })
}

const nl = (n) => n.toFixed(1).replace('.', ',')

async function main() {
  const args = process.argv.slice(2)
  const at = args.indexOf('--uit')
  const out = at >= 0 ? args.splice(at, 2)[1] : null
  const dir = args[0] ? resolve(args[0]) : null
  if (!dir || !existsSync(dir) || !isDir(dir) || (at >= 0 && !out)) {
    console.error('Gebruik: npm run rood -- <map> [--uit <bestand>]')
    process.exit(2)
  }
  const list = shots(dir)
  if (!list.length) {
    console.error(`Geen beelden in ${dir}`)
    process.exit(2)
  }

  const rows = []
  for (const s of list) {
    const { pct, width } = await redShare(s.file)
    const k = kindOf(s.name)
    // Afronden zoals het in de tabel staat: 1,04 is 1,0 en valt binnen de grens.
    const shown = Math.round(pct * 10) / 10
    rows.push({ ...s, width: s.width ?? `${width} px`, pct, kind: k.kind, max: k.max, over: k.max != null && shown > k.max })
  }
  const order = ['merkmoment', 'bediening', 'leesscherm']
  rows.sort((a, b) => b.over - a.over || (a.over ? b.pct - a.pct : 0) || order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name) || String(a.width).localeCompare(String(b.width), 'nl', { numeric: true }) || a.theme.localeCompare(b.theme))

  const over = rows.filter((r) => r.over)
  const md = [
    '# Rood-meting',
    '',
    `${rows.length} schermen uit \`${dir}\`. Rood is elke pixel binnen een RGB-afstand van 48 tot #a3201b of #ec7a70. Grenzen: leesscherm ≤ 1,0 procent, bediening ≤ 1,5 procent, merkmoment vrij.`,
    '',
    over.length ? `**${over.length} over de grens**, bovenaan in de tabel.` : 'Alles binnen de grens.',
    '',
    '| Scherm | Breedte | Thema | Rood | Soort | Grens |',
    '| --- | ---: | --- | ---: | --- | ---: |',
    ...rows.map((r) => {
      const pct = `${nl(r.pct)} %`
      return `| ${r.over ? `**${r.name}**` : r.name} | ${r.width} | ${r.theme} | ${r.over ? `**${pct}**` : pct} | ${r.kind} | ${r.max == null ? 'vrij' : `≤ ${nl(r.max)}`} |`
    }),
    '',
  ].join('\n')
  const file = out ? resolve(out) : join(dir, 'INDEX.md')
  writeFileSync(file, md)
  console.log(`${rows.length} schermen gemeten, ${over.length} over de grens → ${file}`)
  for (const r of over) console.log(`  ${r.name} ${r.width} ${r.theme}: ${nl(r.pct)} % (grens ${nl(r.max)})`)
  process.exit(over.length ? 1 : 0)
}

// Alleen draaien als script; zo kan een test kindOf en redShare los gebruiken.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
