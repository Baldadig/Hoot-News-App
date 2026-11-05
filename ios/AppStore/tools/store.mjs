// App Store-beelden in de stijl van een tijdschrift: merkrood, vage krantentekst op de achtergrond,
// een grote kop in papierwit en de echte app in een toestel. Het scherm is altijd een echte opname
// (richtlijn 2.3.3); alleen wat eromheen staat, is vormgeving.
// Gebruik (vanuit Hoot-News-App): node ios/AppStore/tools/store.mjs
// 1.1.0: leest ios/AppStore/screenshots/raw-110/ (zie capture-110.sh: iPhone 1320 x 2868, iPad 2064 x 2752)
// en schrijft de kale beelden naar iphone-6.9/ en ipad-13/ en de beelden met kop naar marketing/.
import sharp from 'sharp'
import fs from 'node:fs'

const RAW = 'ios/AppStore/screenshots/raw-110'
const OUT = 'ios/AppStore/screenshots'
const RED = '#9A3324'
const PAPER = '#F5F1E8'

// Volgorde en koppen: twee korte zinnen, elk op een eigen regel.
const SHOTS = [
  ['editie', 'Tien verhalen.', 'Dan ben je bij.'],
  ['verhaal', 'Eén verhaal.', 'Alle kranten erbij.'],
  ['stroom', 'Al je bronnen,', 'nieuwste eerst.'],
  ['selectie', 'Elke maandag', 'het beste uit je vak.'],
  ['lezer', 'Lezen zonder', 'afleiding.'],
  ['nacht', 'Nacht valt', 'rustig over Hoot.'],
]

// Eigen tekst voor de krantentextuur (geen tekst van uitgevers).
const FILLER =
  'Het nieuws van vandaag staat klaar. Lees het rustig, op je eigen tempo, zonder dat er iets verspringt. ' +
  'Drie keer per dag een Editie van tien verhalen, en dan ben je bij. Wie meer wil, opent de Stroom ' +
  'met alles van de eigen bronnen, het nieuwste bovenaan. Elke maandag je Selectie, het beste uit je vak, gekozen ' +
  'door vakmensen en geschreven door mensen. Geen meldingen die om aandacht vragen, geen eindeloze ' +
  'tijdlijn, geen reclame. Alleen de krant, zoals je hem op zaterdag leest: met koffie, aan tafel, en ' +
  'met een einde waarop je weet dat je bij bent. '

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Kolommen vage tekst over het hele vlak.
function texture(W, H, size) {
  const cols = 3
  const gap = Math.round(size * 1.6)
  const colW = (W - gap * (cols + 1)) / cols
  const perLine = Math.floor(colW / (size * 0.47))
  const words = (FILLER.repeat(60)).split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).length > perLine) { lines.push(line); line = w } else line = line ? line + ' ' + w : w
  }
  const lh = Math.round(size * 1.45)
  const rows = Math.ceil(H / lh) + 1
  let out = ''
  for (let c = 0; c < cols; c++) {
    const x = gap + c * (colW + gap)
    for (let r = 0; r < rows; r++) {
      out += `<text x="${x}" y="${(r + 1) * lh}" font-size="${size}">${esc(lines[(c * rows + r) % lines.length])}</text>`
    }
  }
  return `<g font-family="New York, Georgia, serif" fill="${PAPER}" fill-opacity="0.075">${out}</g>`
}

async function frame({ raw, out, W, H, phoneW, top, island, l1, l2 }) {
  const meta = await sharp(raw).metadata()
  const bezel = Math.round(phoneW * 0.028)
  const screenW = phoneW - bezel * 2
  const screenH = Math.round(meta.height * screenW / meta.width)
  const phoneH = screenH + bezel * 2
  const rOut = Math.round(phoneW * (island ? 0.135 : 0.05))
  const rIn = rOut - bezel
  const x = Math.round((W - phoneW) / 2)

  // Kop: op alle beelden even groot, zo groot als de langste regel van de hele reeks toelaat
  // (krantenletter ≈ 0,5 em per teken). Past een kop niet, dan moet hij korter.
  const longest = Math.max(...SHOTS.flatMap(([, a, b]) => [a.length, b.length]))
  const fs = Math.min(Math.round(W * 0.085), Math.floor(W * 0.86 / (longest * 0.5)))
  const y1 = Math.round(top * 0.42)
  const head = `<g font-family="New York, Georgia, serif" font-weight="800" fill="${PAPER}" text-anchor="middle" letter-spacing="-1">
    <text x="${W / 2}" y="${y1}" font-size="${fs}">${esc(l1)}</text>
    <text x="${W / 2}" y="${y1 + Math.round(fs * 1.08)}" font-size="${fs}">${esc(l2)}</text></g>`

  const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${RED}"/>${texture(W, H, Math.round(W * 0.024))}
    <rect x="0" y="0" width="${W}" height="${top}" fill="${RED}" fill-opacity="0.82"/>${head}</svg>`)

  const mask = Buffer.from(`<svg width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="${rIn}"/></svg>`)
  const screen = await sharp(raw).resize(screenW, screenH).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const body = Buffer.from(`<svg width="${phoneW}" height="${phoneH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${phoneW}" height="${phoneH}" rx="${rOut}" fill="#111"/>
    <rect x="1.5" y="1.5" width="${phoneW - 3}" height="${phoneH - 3}" rx="${rOut - 1.5}" fill="none" stroke="#3a3a3a" stroke-width="3"/></svg>`)
  const islandSvg = island
    ? Buffer.from(`<svg width="${phoneW}" height="${phoneH}"><rect x="${(phoneW - screenW * 0.3) / 2}" y="${bezel + screenW * 0.03}" width="${screenW * 0.3}" height="${screenW * 0.085}" rx="${screenW * 0.0425}" fill="#000"/></svg>`)
    : null
  const pad = 90
  const shadow = await sharp({ create: { width: phoneW + pad * 2, height: phoneH + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="${phoneW + pad * 2}" height="${phoneH + pad * 2}"><rect x="${pad}" y="${pad + 30}" width="${phoneW}" height="${phoneH}" rx="${rOut}" fill="#2a0806" fill-opacity="0.45"/></svg>`) }])
    .blur(36).png().toBuffer()

  const layers = [
    { input: shadow, left: x - pad, top: top - pad },
    { input: body, left: x, top },
    { input: screen, left: x + bezel, top: top + bezel },
  ]
  if (islandSvg) layers.push({ input: islandSvg, left: x, top })
  await sharp(bg).composite(layers).png().toFile(out)
}

for (const d of ['iphone-6.9', 'ipad-13', 'marketing/iphone-6.9', 'marketing/ipad-13']) {
  fs.rmSync(`${OUT}/${d}`, { recursive: true, force: true }) // geen oude beelden laten staan
  fs.mkdirSync(`${OUT}/${d}`, { recursive: true })
}
let n = 1
for (const [id, l1, l2] of SHOTS) {
  const nn = String(n).padStart(2, '0')
  // Kaal: de echte opname, in het formaat dat App Store Connect vraagt (iPhone 6,9": 1320 x 2868; iPad 13": 2064 x 2752).
  fs.copyFileSync(`${RAW}/iphone-${id}.png`, `${OUT}/iphone-6.9/${nn}-${id}.png`)
  fs.copyFileSync(`${RAW}/ipad-${id}.png`, `${OUT}/ipad-13/${nn}-${id}.png`)
  await frame({ raw: `${RAW}/iphone-${id}.png`, out: `${OUT}/marketing/iphone-6.9/${nn}-${id}.png`, W: 1320, H: 2868, phoneW: 1000, top: 660, island: true, l1, l2 })
  await frame({ raw: `${RAW}/ipad-${id}.png`, out: `${OUT}/marketing/ipad-13/${nn}-${id}.png`, W: 2064, H: 2752, phoneW: 1420, top: 600, island: false, l1, l2 })
  n++
}
console.log('Klaar:', OUT)
