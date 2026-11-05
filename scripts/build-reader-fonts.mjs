// De letters van de lezer (iOS): kleine WOFF-bestanden, alleen latin, alleen de standen die de lezer
// gebruikt. WKWebView ziet de letters van de app niet, dus ze gaan als data-URL mee in elke pagina
// (ReaderFonts in ios/Hoot/Reader/ArticleReaderView.swift). Met de volle TTF's was dat ± 1 MB per
// artikel; zo is het een fractie daarvan.
//
//   node scripts/build-reader-fonts.mjs
//
// Bron: de app-standen in ios/Hoot/Resources/Fonts (scripts/build-fonts.py). Subset met harfbuzz
// (hb-subset.wasm uit harfbuzzjs, al aanwezig via satori), zonder hinting (WebKit op iOS hint niet),
// verpakt als WOFF 1.0 (zlib per tabel). Deterministisch: dezelfde invoer geeft dezelfde bytes.
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url)
const FONTS = new URL('ios/Hoot/Resources/Fonts/', ROOT)

// Latin: dezelfde reeks als de latin-woff2's van het web (Fontsource), plus pijlen.
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD'
export const READER_FONTS = [
  ['NewsreaderKop-800', 'Lezer-NewsreaderKop-800'],
  ['NewsreaderTekst-450', 'Lezer-NewsreaderTekst-450'], // variant 4: opsz 12, wght 450 (terugval variant 3: -400 / -430, zie build-fonts.py)
  ['NewsreaderTekst-480', 'Lezer-NewsreaderTekst-480'], // Nacht
  ['NewsreaderTekst-700', 'Lezer-NewsreaderTekst-700'],
  ['NewsreaderTekst-400-cursief', 'Lezer-NewsreaderTekst-400-cursief'],
  ['SchibstedGrotesk-400', 'Lezer-SchibstedGrotesk-400'],
  ['SchibstedGrotesk-800', 'Lezer-SchibstedGrotesk-800'],
]

const codepoints = () => LATIN.split(',').flatMap(part => {
  const [a, b] = part.replace('U+', '').split('-').map(h => parseInt(h, 16))
  return Array.from({ length: (b ?? a) - a + 1 }, (_, i) => a + i)
})

async function subsetter() {
  const wasm = readFileSync(require.resolve('harfbuzzjs/hb-subset.wasm'))
  const { instance: { exports: hb } } = await WebAssembly.instantiate(wasm)
  return (font) => {
    const heap = () => new Uint8Array(hb.memory.buffer)
    const ptr = hb.malloc(font.byteLength)
    heap().set(font, ptr)
    const blob = hb.hb_blob_create(ptr, font.byteLength, 2, 0, 0)
    const face = hb.hb_face_create(blob, 0)
    hb.hb_blob_destroy(blob)
    const input = hb.hb_subset_input_create_or_fail()
    const set = hb.hb_subset_input_unicode_set(input)
    for (const cp of codepoints()) hb.hb_set_add(set, cp)
    hb.hb_subset_input_set_flags(input, 0x1 /* HB_SUBSET_FLAGS_NO_HINTING */)
    const sub = hb.hb_subset_or_fail(face, input)
    hb.hb_subset_input_destroy(input)
    if (!sub) throw new Error('subset mislukt')
    const out = hb.hb_face_reference_blob(sub)
    const at = hb.hb_blob_get_data(out, 0), len = hb.hb_blob_get_length(out)
    const bytes = Buffer.from(heap().slice(at, at + len))
    hb.hb_blob_destroy(out); hb.hb_face_destroy(sub); hb.hb_face_destroy(face); hb.free(ptr)
    return bytes
  }
}

// WOFF 1.0: kop van 44 bytes, tabelmap van 20 bytes per tabel, tabellen op 4 bytes uitgelijnd.
export function woff(sfnt) {
  const num = sfnt.readUInt16BE(4)
  const tables = []
  for (let i = 0; i < num; i++) {
    const o = 12 + i * 16
    const tag = sfnt.toString('latin1', o, o + 4), checksum = sfnt.readUInt32BE(o + 4), offset = sfnt.readUInt32BE(o + 8), length = sfnt.readUInt32BE(o + 12)
    const raw = sfnt.subarray(offset, offset + length)
    const z = deflateSync(raw, { level: 9 })
    tables.push({ tag, checksum, length, data: z.length < length ? z : raw })
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1))
  const pad = n => (n + 3) & ~3
  let offset = 44 + 20 * num
  const dir = Buffer.alloc(20 * num)
  tables.forEach((t, i) => {
    dir.write(t.tag, i * 20, 'latin1'); dir.writeUInt32BE(offset, i * 20 + 4); dir.writeUInt32BE(t.data.length, i * 20 + 8); dir.writeUInt32BE(t.length, i * 20 + 12); dir.writeUInt32BE(t.checksum, i * 20 + 16)
    t.offset = offset; offset += pad(t.data.length)
  })
  const total = offset
  const head = Buffer.alloc(44)
  head.write('wOFF', 0, 'latin1'); head.writeUInt32BE(sfnt.readUInt32BE(0), 4); head.writeUInt32BE(total, 8); head.writeUInt16BE(num, 12)
  head.writeUInt32BE(12 + 16 * num + tables.reduce((s, t) => s + pad(t.length), 0), 16) // totalSfntSize
  head.writeUInt16BE(1, 20) // majorVersion
  const out = Buffer.alloc(total)
  head.copy(out, 0); dir.copy(out, 44)
  for (const t of tables) t.data.copy(out, t.offset)
  return out
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const subset = await subsetter()
  let before = 0, after = 0
  for (const [src, dst] of READER_FONTS) {
    const ttf = readFileSync(new URL(`${src}.ttf`, FONTS))
    const out = woff(subset(ttf))
    writeFileSync(new URL(`${dst}.woff`, FONTS), out)
    before += ttf.length; after += out.length
    console.log(`${dst}.woff  ${(ttf.length / 1024).toFixed(0)} kB → ${(out.length / 1024).toFixed(0)} kB`)
  }
  console.log(`samen ${(before / 1024).toFixed(0)} kB → ${(after / 1024).toFixed(0)} kB (base64 in de pagina: ${(after * 4 / 3 / 1024).toFixed(0)} kB)`)
}
