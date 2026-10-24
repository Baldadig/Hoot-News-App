// App Store-beelden met een kop erboven (papier, krantenletter, rode streep).
// Gebruik: node ios/AppStore/tools/frames.mjs <map met opnamen> ios/AppStore
// De opnamen heten <Apparaat>-<nr>-<tabblad>.png (zie screenshots.sh).
import sharp from 'sharp'
import fs from 'node:fs'
const [S, A] = process.argv.slice(2)
const caps = { editie: ['Drie keer per dag', 'tien verhalen. Met een einde.'], stroom: ['Al je bronnen,', 'nieuwste eerst.'], digest: ['Elke maandag', 'het beste uit je vak.'] }
async function frame(src, out, W, H, shotW, fontSize, tab) {
  const meta = await sharp(src).metadata()
  const shotH = Math.round(meta.height * shotW / meta.width)
  const r = Math.round(shotW * 0.06)
  const mask = Buffer.from(`<svg width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${r}"/></svg>`)
  const border = Buffer.from(`<svg width="${shotW}" height="${shotH}"><rect x="2" y="2" width="${shotW - 4}" height="${shotH - 4}" rx="${r - 2}" fill="none" stroke="#CFC5B2" stroke-width="4"/></svg>`)
  const shot = await sharp(src).resize(shotW, shotH).composite([{ input: mask, blend: 'dest-in' }, { input: border }]).png().toBuffer()
  const top = Math.round(H * 0.17)
  const [l1, l2] = caps[tab]
  const t = (y, s) => `<text x="50%" y="${y}" text-anchor="middle" font-family="New York, Georgia, serif" font-weight="800" font-size="${fontSize}" fill="#1A1814">${s}</text>`
  const text = Buffer.from(`<svg width="${W}" height="${top}" xmlns="http://www.w3.org/2000/svg"><rect x="${W / 2 - 60}" y="${top * 0.16}" width="120" height="${Math.round(fontSize * 0.12)}" fill="#A3201B"/>${t(top * 0.52, l1)}${t(top * 0.52 + fontSize * 1.12, l2)}</svg>`)
  const pad = 80
  const shadow = await sharp({ create: { width: shotW + pad, height: shotH + pad, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from(`<svg width="${shotW + pad}" height="${shotH + pad}"><rect x="40" y="52" width="${shotW}" height="${shotH}" rx="${r}" fill="#1A1814" fill-opacity="0.22"/></svg>`) }]).blur(22).png().toBuffer()
  const y = top + Math.round(H * 0.035)
  const x = Math.round((W - shotW) / 2)
  await sharp({ create: { width: W, height: H, channels: 3, background: '#F5F1E8' } }).composite([{ input: text, top: 0, left: 0 }, { input: shadow, top: y - 40, left: x - 40 }, { input: shot, top: y, left: x }]).png().toFile(out)
}
const order = { editie: 1, stroom: 2, digest: 3 }
for (const tab of Object.keys(order)) {
  const n = order[tab], nn = '0' + n
  fs.copyFileSync(`${S}/Hoot-mini-${n}-${tab}.png`, `${A}/screenshots/test-iphone-mini/${nn}-${tab}.png`)
  await frame(`${S}/Hoot-Pro-Max-${n}-${tab}.png`, `${A}/screenshots/marketing/iphone-6.9/${nn}-${tab}.png`, 1320, 2868, 1060, 104, tab)
  await frame(`${S}/Hoot-iPad-13-${n}-${tab}.png`, `${A}/screenshots/marketing/ipad-13/${nn}-${tab}.png`, 2064, 2752, 1640, 120, tab)
}
console.log('ok')
