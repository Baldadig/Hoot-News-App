// Rood-meting: hoeveel van elk scherm is rood? Zo wordt 90/9/1 (papier, inkt, rood) een getal in
// plaats van een gevoel. Na capture-all.sh: npm run rood -- <map>
//
//   npm run rood -- <map> [--uit <bestand>] [--met-beeld]
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
// Foto's tellen niet mee: het rood van het nieuws (een vlag, zwaailichten) zegt niets over het
// ontwerp. Per scherm, in deze volgorde:
//   opname zonder beeld  ligt er een tweelingopname met img, picture, video en .media verborgen
//                        (<job>/viewport-zonder-beeld.png, of bij losse PNG's
//                        <naam>--zonder-beeld.png), dan meet het script die. Exact.
//   masker               anders zoekt het script de foto's zelf: tegels van 16 px met veel
//                        verschillende kleuren, samengevoegd tot rechthoeken van minstens 3 × 3
//                        tegels. Wat daarbinnen valt telt niet. Een schatting: donkere of vlakke
//                        delen van een foto kunnen erbuiten vallen.
// --met-beeld zet dat uit en telt elke pixel (de oude meting).
//
// Uitvoer: INDEX.md in <map> (of --uit), een tabel met scherm, breedte, thema, rood, beeld, basis,
// soort en grens; de overschrijdingen bovenaan. Exitcode 1 bij een overschrijding, 2 bij een fout.
// Een overschrijding op een masker met foto's erin is 'na te kijken' en geeft op zichzelf geen
// exitcode 1: dan beslist de opname zonder beeld (of het oog), niet het nieuws van de dag.
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

// Fotomasker. Een tegel van 16 × 16 met minstens 32 verschillende kleuren (4 bit per kanaal) is
// beeld: tekst en vlakken op papier halen dat niet, want hun randen lopen langs één kleurlijn
// (papier naar inkt, papier naar rood). Aangrenzende beeldtegels worden een rechthoek; rechthoeken
// die elkaar raken worden één, zodat ook het vlakke rood van een vlag binnen de foto valt. Wat
// kleiner is dan 3 × 3 tegels (een bronlogo, een stuk kop) blijft buiten het masker.
const TILE = 16
const VARIED = 32
const MIN_TILES = 3
export function photoMask(data, W, H) {
  const tw = Math.ceil(W / TILE)
  const th = Math.ceil(H / TILE)
  const busy = new Uint8Array(tw * th)
  const seen = new Set()
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      seen.clear()
      for (let y = ty * TILE; y < Math.min(H, ty * TILE + TILE); y++) {
        for (let x = tx * TILE; x < Math.min(W, tx * TILE + TILE); x++) {
          const i = (y * W + x) * 3
          seen.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4))
        }
      }
      if (seen.size >= VARIED) busy[ty * tw + tx] = 1
    }
  }
  // Samenhangende beeldtegels (ook schuin) als rechthoek [x0, y0, x1, y1] in tegels.
  const done = new Uint8Array(tw * th)
  let boxes = []
  for (let s = 0; s < busy.length; s++) {
    if (!busy[s] || done[s]) continue
    const stack = [s]
    done[s] = 1
    const box = [tw, th, -1, -1]
    while (stack.length) {
      const p = stack.pop()
      const x = p % tw
      const y = (p / tw) | 0
      box[0] = Math.min(box[0], x)
      box[1] = Math.min(box[1], y)
      box[2] = Math.max(box[2], x)
      box[3] = Math.max(box[3], y)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx
          const Y = y + dy
          if (X < 0 || Y < 0 || X >= tw || Y >= th) continue
          const q = Y * tw + X
          if (busy[q] && !done[q]) {
            done[q] = 1
            stack.push(q)
          }
        }
      }
    }
    boxes.push(box)
  }
  boxes = boxes.filter((b) => b[2] - b[0] + 1 >= MIN_TILES && b[3] - b[1] + 1 >= MIN_TILES)
  // Rechthoeken die elkaar raken of overlappen samenvoegen, tot er niets meer te voegen is.
  for (let merged = true; merged; ) {
    merged = false
    for (let a = 0; a < boxes.length && !merged; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a]
        const B = boxes[b]
        if (A[0] - 1 <= B[2] && B[0] - 1 <= A[2] && A[1] - 1 <= B[3] && B[1] - 1 <= A[3]) {
          boxes[a] = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])]
          boxes.splice(b, 1)
          merged = true
          break
        }
      }
    }
  }
  const mask = new Uint8Array(W * H)
  for (const [x0, y0, x1, y1] of boxes) {
    for (let y = y0 * TILE; y < Math.min(H, (y1 + 1) * TILE); y++) mask.fill(1, y * W + x0 * TILE, y * W + Math.min(W, (x1 + 1) * TILE))
  }
  return mask
}

const isRed = (r, g, b) => RED.some(([R, G, B]) => (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2 <= NEAR)

// Aandeel rood in procent, over alle pixels van het beeld. Met masker: rood binnen de foto's telt
// niet (de noemer blijft het hele scherm), en photo zegt hoeveel procent foto was.
export async function redShare(file, { mask: useMask = false } = {}) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const all = info.width * info.height
  const mask = useMask ? photoMask(data, info.width, info.height) : null
  let hit = 0
  let raw = 0
  let photo = 0
  for (let p = 0; p < all; p++) {
    const masked = mask && mask[p]
    if (masked) photo++
    const i = p * 3
    if (isRed(data[i], data[i + 1], data[i + 2])) {
      raw++
      if (!masked) hit++
    }
  }
  return { pct: (hit / all) * 100, raw: (raw / all) * 100, photo: (photo / all) * 100, width: info.width }
}

const THEMES = { light: 'licht', dark: 'donker', licht: 'licht', donker: 'donker' }
const isDir = (p) => statSync(p).isDirectory()

// Welke beelden: de harnasmappen <breedte>-<thema>/<job>/viewport.png, anders de losse PNG's.
// Een tweelingopname zonder beeld gaat mee als `bare` en telt niet als eigen scherm.
const BARE = '--zonder-beeld'
function shots(dir) {
  const runs = readdirSync(dir).filter((d) => /^\d+-(light|dark)$/.test(d) && isDir(join(dir, d)))
  if (runs.length) {
    return runs.flatMap((run) => {
      const [w, t] = run.split('-')
      return readdirSync(join(dir, run))
        .filter((job) => existsSync(join(dir, run, job, 'viewport.png')))
        .map((job) => {
          const bare = join(dir, run, job, 'viewport-zonder-beeld.png')
          return { name: job, width: Number(w), theme: THEMES[t], file: join(dir, run, job, 'viewport.png'), bare: existsSync(bare) ? bare : null }
        })
    })
  }
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png') && !basename(f, '.png').endsWith(BARE))
    .map((f) => {
      const name = basename(f, '.png')
      const bare = join(dir, `${name}${BARE}.png`)
      const w = name.match(/--(\d+)(--|$)/) // 'web-editie-boven--390--licht'
      const t = name.match(/(^|[-_])(licht|donker|light|dark)($|[-_])/)
      return { name, width: w ? Number(w[1]) : null, theme: t ? THEMES[t[2]] : '–', file: join(dir, f), bare: existsSync(bare) ? bare : null }
    })
}

const nl = (n) => n.toFixed(1).replace('.', ',')

async function main() {
  const args = process.argv.slice(2)
  const at = args.indexOf('--uit')
  const out = at >= 0 ? args.splice(at, 2)[1] : null
  const raw = args.includes('--met-beeld')
  if (raw) args.splice(args.indexOf('--met-beeld'), 1)
  const dir = args[0] ? resolve(args[0]) : null
  if (!dir || !existsSync(dir) || !isDir(dir) || (at >= 0 && !out)) {
    console.error('Gebruik: npm run rood -- <map> [--uit <bestand>] [--met-beeld]')
    process.exit(2)
  }
  const list = shots(dir)
  if (!list.length) {
    console.error(`Geen beelden in ${dir}`)
    process.exit(2)
  }

  const rows = []
  for (const s of list) {
    // Basis: de opname zonder beeld als die er is, anders het masker, met --met-beeld alles.
    const basis = raw ? 'met beeld' : s.bare ? 'zonder beeld' : 'masker'
    const m = await redShare(s.bare && !raw ? s.bare : s.file, { mask: basis === 'masker' })
    const k = kindOf(s.name)
    // Afronden zoals het in de tabel staat: 1,04 is 1,0 en valt binnen de grens.
    const shown = Math.round(m.pct * 10) / 10
    const over = k.max != null && shown > k.max
    // Een masker met foto's is een schatting: over de grens is dan na te kijken, geen fout.
    const check = over && basis === 'masker' && m.photo >= 0.5
    rows.push({ ...s, width: s.width ?? `${m.width} px`, pct: m.pct, photo: basis === 'masker' ? m.photo : null, basis, kind: k.kind, max: k.max, over: over && !check, check })
  }
  const order = ['merkmoment', 'bediening', 'leesscherm']
  rows.sort((a, b) => b.over - a.over || b.check - a.check || (a.over || a.check ? b.pct - a.pct : 0) || order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name) || String(a.width).localeCompare(String(b.width), 'nl', { numeric: true }) || a.theme.localeCompare(b.theme))

  const over = rows.filter((r) => r.over)
  const check = rows.filter((r) => r.check)
  const counts = ['zonder beeld', 'masker', 'met beeld'].map((b) => [b, rows.filter((r) => r.basis === b).length]).filter(([, n]) => n)
  const md = [
    '# Rood-meting',
    '',
    `${rows.length} schermen uit \`${dir}\`. Rood is elke pixel binnen een RGB-afstand van 48 tot #a3201b of #ec7a70, als aandeel van het hele scherm. Grenzen: leesscherm ≤ 1,0 procent, bediening ≤ 1,5 procent, merkmoment vrij.`,
    '',
    raw
      ? "Gemeten **met beeld** (--met-beeld): het rood in foto's telt mee, dus een overschrijding op een leesscherm kan van het nieuws komen in plaats van van het ontwerp."
      : "Foto's tellen niet mee. Basis per scherm: *zonder beeld* is een tweelingopname met img, picture, video en .media verborgen (exact); *masker* betekent dat het script de foto's zelf heeft gezocht en weggelaten (een schatting; Beeld is het weggelaten deel). Over de grens op een masker met foto's is *na te kijken* en geeft geen exitcode 1.",
    '',
    `Basis: ${counts.map(([b, n]) => `${b} ${n}`).join(', ')}.`,
    '',
    [over.length ? `**${over.length} over de grens**` : 'Niets over de grens', check.length ? `${check.length} na te kijken` : ''].filter(Boolean).join(', ') + (over.length || check.length ? ', bovenaan in de tabel.' : '.'),
    '',
    '| Scherm | Breedte | Thema | Rood | Beeld | Basis | Soort | Grens |',
    '| --- | ---: | --- | ---: | ---: | --- | --- | ---: |',
    ...rows.map((r) => {
      const pct = `${nl(r.pct)} %`
      const mark = r.over ? (s) => `**${s}**` : r.check ? (s) => `*${s}*` : (s) => s
      const grens = r.max == null ? 'vrij' : `≤ ${nl(r.max)}${r.check ? ', na te kijken' : ''}`
      return `| ${mark(r.name)} | ${r.width} | ${r.theme} | ${mark(pct)} | ${r.photo == null ? '–' : `${nl(r.photo)} %`} | ${r.basis} | ${r.kind} | ${grens} |`
    }),
    '',
  ].join('\n')
  const file = out ? resolve(out) : join(dir, 'INDEX.md')
  writeFileSync(file, md)
  console.log(`${rows.length} schermen gemeten, ${over.length} over de grens, ${check.length} na te kijken → ${file}`)
  for (const r of over) console.log(`  ${r.name} ${r.width} ${r.theme}: ${nl(r.pct)} % (grens ${nl(r.max)}, ${r.basis})`)
  for (const r of check) console.log(`  na te kijken: ${r.name} ${r.width} ${r.theme}: ${nl(r.pct)} % buiten ${nl(r.photo)} % beeld (grens ${nl(r.max)})`)
  process.exit(over.length ? 1 : 0)
}

// Alleen draaien als script; zo kan een test kindOf en redShare los gebruiken.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
