// Header voor de productpagina in de App Store (3840 × 1646): de beeldtaal van het welkom. De rode
// punt van "hoot." als zon boven één horizonlijn, op papier of in merkrood. Alles in het midden,
// want de App Store snijdt per toestel links en rechts af.
// Gebruik (vanuit Hoot-News-App): node ios/AppStore/tools/header.mjs
import sharp from 'sharp'
import fs from 'node:fs'

const W = 3840, H = 1646
const RED = '#A3201B', PAPER = '#F5F1E8', INK = '#1c1a17'
const OUT = 'ios/AppStore/screenshots/header'
const serif = 'New York, Georgia, serif'

// Zon die half boven de horizon staat (alles onder de lijn valt weg).
const sun = (cx, horizon, r, fill) => `<clipPath id="sky"><rect x="0" y="0" width="${W}" height="${horizon}"/></clipPath>
  <circle cx="${cx}" cy="${horizon - r * 0.45}" r="${r}" fill="${fill}" clip-path="url(#sky)"/>`

const variants = {
  // A: papier, de zon komt op, eronder de belofte.
  papier: `<rect width="100%" height="100%" fill="${PAPER}"/>
    ${sun(W / 2, 820, 150, RED)}
    <line x1="${W / 2 - 520}" y1="820" x2="${W / 2 + 520}" y2="820" stroke="${INK}" stroke-width="8"/>
    <text x="${W / 2}" y="1090" text-anchor="middle" font-family="${serif}" font-weight="800" font-size="150" fill="${INK}">Nieuws met een begin en een einde.</text>
    <text x="${W / 2}" y="1230" text-anchor="middle" font-family="${serif}" font-weight="800" font-size="92" fill="${INK}">hoot<tspan fill="${RED}">.</tspan></text>`,
  // B: merkrood zoals het opstartscherm; de zon als papieren schijf met een ademende ring.
  rood: `<rect width="100%" height="100%" fill="${RED}"/>
    <circle cx="${W / 2}" cy="640" r="250" fill="none" stroke="${PAPER}" stroke-opacity=".18" stroke-width="6"/>
    <circle cx="${W / 2}" cy="640" r="190" fill="none" stroke="${PAPER}" stroke-opacity=".35" stroke-width="6"/>
    <circle cx="${W / 2}" cy="640" r="110" fill="${PAPER}"/>
    <text x="${W / 2}" y="1120" text-anchor="middle" font-family="${serif}" font-weight="800" font-size="190" fill="${PAPER}">hoot.</text>
    <text x="${W / 2}" y="1270" text-anchor="middle" font-family="${serif}" font-weight="700" font-size="84" fill="${PAPER}" fill-opacity=".85">Nieuws met een begin en een einde.</text>`,
  // C: papier, groot woordmerk; de punt is de zon die boven de lijn uitkomt.
  woordmerk: `<rect width="100%" height="100%" fill="${PAPER}"/>
    <text x="${W / 2 - 60}" y="900" text-anchor="middle" font-family="${serif}" font-weight="800" font-size="420" fill="${INK}">hoot</text>
    <circle cx="${W / 2 + 470}" cy="855" r="46" fill="${RED}"/>
    <line x1="${W / 2 - 700}" y1="1010" x2="${W / 2 + 700}" y2="1010" stroke="${INK}" stroke-opacity=".25" stroke-width="5"/>
    <text x="${W / 2}" y="1170" text-anchor="middle" font-family="${serif}" font-weight="700" font-size="96" fill="${INK}">Nieuws met een begin en een einde.</text>`,
}

fs.mkdirSync(OUT, { recursive: true })
for (const [name, body] of Object.entries(variants)) {
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`)
  await sharp(svg).png().toFile(`${OUT}/header-${name}.png`)
  await sharp(svg).resize(1280).png().toFile(`${OUT}/voorbeeld-${name}.png`)
}
console.log('Klaar:', OUT)
