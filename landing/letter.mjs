// Het deelbestand van de lopende Newsreader voor de landing: alleen de tekens van de tabrij in het Stroom-toestel.
// Zelfde werkwijze als de lezer (scripts/build-reader-fonts.mjs): hb-subset uit harfbuzzjs, WOFF 1.0, deterministisch.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { woff } from '../scripts/build-reader-fonts.mjs'

const require = createRequire(import.meta.url)
// De tabs zoals ze in landing/index.src.html staan (Alles, Binnenland, Wereld, Cultuur, Opinie), plus spatie.
export const TAB_TEKENS = 'Alles Binnenland Wereld Cultuur Opinie'

export async function tabLetter(ttfPad, tekens = TAB_TEKENS) {
  const wasm = readFileSync(require.resolve('harfbuzzjs/hb-subset.wasm'))
  const { instance: { exports: hb } } = await WebAssembly.instantiate(wasm)
  const font = readFileSync(ttfPad)
  const heap = () => new Uint8Array(hb.memory.buffer)
  const ptr = hb.malloc(font.byteLength)
  heap().set(font, ptr)
  const blob = hb.hb_blob_create(ptr, font.byteLength, 2, 0, 0)
  const face = hb.hb_face_create(blob, 0)
  hb.hb_blob_destroy(blob)
  const input = hb.hb_subset_input_create_or_fail()
  const set = hb.hb_subset_input_unicode_set(input)
  for (const cp of new Set([...tekens].map((c) => c.codePointAt(0)))) hb.hb_set_add(set, cp)
  hb.hb_subset_input_set_flags(input, 0x1 /* HB_SUBSET_FLAGS_NO_HINTING */)
  const sub = hb.hb_subset_or_fail(face, input)
  hb.hb_subset_input_destroy(input)
  if (!sub) throw new Error('landing: deelbestand van de letter mislukt')
  const out = hb.hb_face_reference_blob(sub)
  const at = hb.hb_blob_get_data(out, 0), len = hb.hb_blob_get_length(out)
  const bytes = Buffer.from(heap().slice(at, at + len))
  hb.hb_blob_destroy(out); hb.hb_face_destroy(sub); hb.hb_face_destroy(face); hb.free(ptr)
  return woff(bytes)
}
