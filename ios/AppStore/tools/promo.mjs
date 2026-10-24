// Promotiebeelden: LinkedIn (1200 × 630) en Instagram (1080 × 1350), uit de schermafbeelding van de Editie.
// Gebruik: node ios/AppStore/tools/promo.mjs
import sharp from 'sharp'
const A = 'ios/AppStore'
const shotSrc = `${A}/screenshots/iphone-6.9/01-editie.png`
const serif = 'New York, Georgia, serif'
const sans = '-apple-system, Helvetica Neue, Arial, sans-serif'

async function phone(width) {
  const meta = await sharp(shotSrc).metadata()
  const h = Math.round(meta.height * width / meta.width)
  const r = Math.round(width * 0.11)
  const mask = Buffer.from(`<svg width="${width}" height="${h}"><rect width="${width}" height="${h}" rx="${r}"/></svg>`)
  const rim = Buffer.from(`<svg width="${width}" height="${h}"><rect x="3" y="3" width="${width - 6}" height="${h - 6}" rx="${r - 3}" fill="none" stroke="#1A1814" stroke-width="6"/></svg>`)
  return { buf: await sharp(shotSrc).resize(width, h).composite([{ input: mask, blend: 'dest-in' }, { input: rim }]).png().toBuffer(), h }
}

async function make(out, W, H, layout) {
  const p = await phone(layout.phoneW)
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${layout.tx}" y="${layout.ty}" width="${layout.logo * 2.2}" height="${layout.logo * 0.16}" fill="#A3201B"/>
    <text x="${layout.tx}" y="${layout.ty + layout.logo * 1.2}" font-family="${serif}" font-weight="800" font-size="${layout.logo}" fill="#1A1814">hoot<tspan fill="#A3201B">.</tspan></text>
    ${layout.lines.map((l, i) => `<text x="${layout.tx}" y="${layout.hy + i * layout.hs * 1.1}" font-family="${serif}" font-weight="800" font-size="${layout.hs}" fill="#1A1814">${l}</text>`).join('')}
    <text x="${layout.tx}" y="${layout.sy}" font-family="${sans}" font-size="${layout.ss}" fill="#6B6457">Nu voor iPhone en iPad · gratis</text>
  </svg>`
  await sharp({ create: { width: W, height: H, channels: 3, background: '#F5F1E8' } })
    // De telefoon loopt onderaan uit beeld: bijsnijden tot de rand.
    .composite([{ input: Buffer.from(svg) }, { input: await sharp(p.buf).extract({ left: 0, top: 0, width: layout.phoneW, height: Math.min(p.h, H - layout.py) }).toBuffer(), left: layout.px, top: layout.py }])
    .png().toFile(out)
}

await make(`${A}/promotie/linkedin-1200x630.png`, 1200, 630, { tx: 72, ty: 110, logo: 64, lines: ['Nieuws', 'met een einde.'], hy: 330, hs: 64, sy: 500, ss: 26, phoneW: 330, px: 800, py: 60 })
await make(`${A}/promotie/instagram-1080x1350.png`, 1080, 1350, { tx: 80, ty: 96, logo: 72, lines: ['Nieuws met', 'een einde.'], hy: 340, hs: 84, sy: 520, ss: 32, phoneW: 520, px: 280, py: 610 })
console.log('ok')
