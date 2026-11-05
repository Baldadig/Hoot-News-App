// Herkleurt een rasterbeeld (een schermopname zonder bron, zoals landing/og.png) naar een ander merkrood:
// elke pixel die een menging is van het oude rood met papier of inkt, wordt dezelfde menging met het
// nieuwe rood. Foto's, grijs en andere kleuren blijven gelijk.
//   node scripts/herkleur-rood.mjs <in.png> <uit.png> <oud rood> <nieuw rood>
import sharp from 'sharp'
const [inp, out, from, to] = process.argv.slice(2)
if (!to) { console.error('Gebruik: node scripts/herkleur-rood.mjs <in.png> <uit.png> <#oud> <#nieuw>'); process.exit(2) }
const hex = h => h.replace('#', '').match(/\w\w/g).map(x => parseInt(x, 16))
const OLD = hex(from), NEW = hex(to)
const FG = ['f7f5f0', 'f5f1e8', 'ffffff', 'fcfaf5', '1a1814', '000000'].map(hex)
const { data, info } = await sharp(inp).raw().toBuffer({ resolveWithObject: true })
let changed = 0, kept = 0
for (let i = 0; i < data.length; i += info.channels) {
  const p = [data[i], data[i + 1], data[i + 2]]
  let best = null
  for (const F of FG) {
    const d = OLD.map((v, k) => v - F[k]), q = p.map((v, k) => v - F[k])
    let a = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2)
    a = Math.max(0, Math.min(1, a))
    const r = Math.hypot(...p.map((v, k) => v - (a * OLD[k] + (1 - a) * F[k])))
    if (!best || r < best.r) best = { a, F, r }
  }
  if (best.r <= 8 && best.a > 0.01) {
    for (let k = 0; k < 3; k++) data[i + k] = Math.round(p[k] + best.a * (NEW[k] - OLD[k]))
    changed++
  } else if (best.a > 0.3) kept++
}
await sharp(data, { raw: info }).png().toFile(out)
console.log({ changed, reddishKept: kept })
