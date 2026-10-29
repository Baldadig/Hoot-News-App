import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshCount, refreshPlan } from '../src/lib/fresh.js'
import { restoreSaved, toggleSaved } from '../src/lib/saved.js'

const it = (id, source = 'nos') => ({ id, source })

test('telt alleen wat echt nieuw is, zonder dubbelen', () => {
  assert.equal(freshCount([it('a'), it('b')], [it('c'), it('c'), it('a'), it('d')]), 2)
  assert.equal(freshCount([it('a')], [it('a')]), 0)
})

test('berichten van een uitgezette bron tellen niet als nieuw', () => {
  assert.equal(freshCount([it('a')], [it('b', 'nrc'), it('c', 'nos')], new Set(['nrc'])), 1)
})

test('automatisch verversen: nieuwe berichten wachten, de rest gaat door', () => {
  const prev = { edition: { id: 'ochtend' }, items: [it('a')] }
  const next = { edition: { id: 'ochtend' }, items: [it('b'), it('a')] }
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 1 }), 'wachten')
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 0 }), 'rest')
  // De eerste keer en de verversknop: alles meteen.
  assert.equal(refreshPlan({ defer: false, prev, next, fresh: 1 }), 'alles')
  assert.equal(refreshPlan({ defer: true, prev: null, next, fresh: 0 }), 'alles')
})

test('een nieuw dagdeel komt met de berichten van nu, ook als er berichten wachten', () => {
  // Om 09:00 open laten, om 13:00 terug: Jouw Editie van de middag mag niet uit de berichten van
  // 09:00 komen (die ligt daarna het hele dagdeel vast).
  const prev = { edition: { id: 'ochtend' }, items: [it('a')] }
  const next = { edition: { id: 'middag' }, items: [it('c'), it('b'), it('a')] }
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 2 }), 'alles')
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 0 }), 'alles')
  // Geen editie in het antwoord: dan geen reden om de Stroom te laten verspringen.
  assert.equal(refreshPlan({ defer: true, prev, next: { ...next, edition: null }, fresh: 2 }), 'wachten')
})

test('verwijderen uit Bewaard is ongedaan te maken, met dezelfde inhoud en bewaartijd', () => {
  const saved = toggleSaved({}, 'item', 'a', { id: 'a', title: 'Kop' }, new Map(), 111)
  const entry = saved.a
  const removed = toggleSaved(saved, 'item', 'a')
  assert.deepEqual(removed, {})
  assert.deepEqual(restoreSaved(removed, 'a', entry), saved)
  // Intussen opnieuw bewaard? Dan niet overschrijven.
  const again = toggleSaved(removed, 'item', 'a', { id: 'a', title: 'Kop' }, new Map(), 999)
  assert.equal(restoreSaved(again, 'a', entry).a.savedAt, 999)
})

test('publicatietijd in de toekomst: lokale tijd met UTC-label wordt teruggerekend, de rest afgekapt', async () => {
  const { plausibleTime, tzOffsetMs } = await import('../netlify/lib/text.mjs')
  const now = Date.parse('2026-10-22T10:12:47Z')
  // Nederlands Dagblad: "12:05:12 Z" is 12:05 Nederlandse tijd = 10:05 UTC (zomertijd).
  assert.equal(plausibleTime('2026-10-22T12:05:12.000Z', now), '2026-10-22T10:05:12.000Z')
  assert.equal(plausibleTime('2026-10-22T10:00:00.000Z', now), '2026-10-22T10:00:00.000Z') // gewoon
  assert.equal(plausibleTime('2026-10-23T09:00:00.000Z', now), new Date(now).toISOString()) // morgen: afkappen
  assert.equal(plausibleTime('onzin', now), null)
  // Wintertijd: één uur verschil.
  assert.equal(tzOffsetMs(Date.parse('2026-12-01T12:00:00Z')), 3600e3)
  assert.equal(tzOffsetMs(Date.parse('2026-07-01T12:00:00Z')), 7200e3)
})
