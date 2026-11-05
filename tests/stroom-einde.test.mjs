import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { grensVoor, grensIndex, bezoekGrens, gezien, nieuweGrens, DAG, BIJ_KEY, GRENS_KEY } from '../src/lib/stroom-einde.js'

// Keuze r5-stroom-einde (5 november): de web-Stroom laadt niet eindeloos bij, maar eindigt bij je
// vorige bezoek met "Je bent bij." en een stille knop "Ouder nieuws tonen".
const opslag = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }
}
const NU = Date.parse('2026-11-05T17:00:00Z')
const item = (min) => ({ id: 'i' + min, publishedAt: new Date(NU - min * 60000).toISOString() })

test('grens: vorig bezoek binnen een dag; anders de laatste 24 uur', () => {
  assert.deepEqual(grensVoor({ bij: { at: NU - 3600e3 }, now: NU }), { at: NU - 3600e3, eerder: true })
  assert.deepEqual(grensVoor({ bij: { at: NU - 2 * DAG }, now: NU }), { at: NU - DAG, eerder: false })
  assert.deepEqual(grensVoor({ now: NU }), { at: NU - DAG, eerder: false })
  // In hetzelfde tabblad (terug van een artikel) blijft de grens van dit bezoek staan.
  assert.deepEqual(grensVoor({ sessie: { at: 5, eerder: true }, bij: { at: NU }, now: NU }), { at: 5, eerder: true })
})

test('de lijst houdt op bij het eerste bericht dat niet nieuwer is dan de grens', () => {
  const list = [item(1), item(10), item(60), item(120)]
  assert.equal(grensIndex(list, NU - 30 * 60000), 2)
  assert.equal(grensIndex(list, NU), 0)
  assert.equal(grensIndex(list, 0), 4)
})

test('bezoek: grens één keer per tabblad, het nieuwste geldt meteen als gezien', () => {
  const local = opslag(), session = opslag()
  local.setItem(BIJ_KEY, JSON.stringify({ at: NU - 3600e3 }))
  const g = bezoekGrens({ local, session, newest: NU - 60e3, now: NU })
  assert.deepEqual(g, { at: NU - 3600e3, eerder: true })
  assert.equal(JSON.parse(local.getItem(BIJ_KEY)).at, NU - 60e3)
  // Herladen in hetzelfde tabblad: dezelfde grens, niet het net gezien-gemarkeerde nieuwste.
  assert.deepEqual(bezoekGrens({ local, session, newest: NU, now: NU }), g)
  gezien(NU - 3 * DAG, { local })
  assert.equal(JSON.parse(local.getItem(BIJ_KEY)).at, NU, 'gezien gaat alleen vooruit')
  assert.deepEqual(nieuweGrens(NU, { session }), { at: NU, eerder: true })
  assert.deepEqual(JSON.parse(session.getItem(GRENS_KEY)), { at: NU, eerder: true })
})

test('Stream.jsx: geen automatisch bijladen voorbij de grens; einde met knop', () => {
  const s = readFileSync(new URL('../src/views/Stream.jsx', import.meta.url), 'utf8')
  assert.match(s, /Ouder nieuws tonen/)
  assert.match(s, /Hier was je gebleven/)
  assert.match(s, /className="listend stroomeinde__zin">Je bent bij\./)
  assert.match(s, /const cap = Math\.min\(list\.length, bIdx \+ older\)/)
  assert.match(s, /list\.slice\(0, Math\.min\(limit, cap\)\)/)
  assert.match(s, /\[shown\.length < cap\]\)/)
  assert.match(readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8'), /import '\.\/styles\/stroom-einde\.css'/)
})
