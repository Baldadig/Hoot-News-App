// Bewaakt de verzegelde holdout. Importeert of draait geen classifier.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const path = name => new URL('../' + name, import.meta.url)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const urlKey = raw => { const u = new URL(raw); return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') }
const day = raw => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(raw))
export function validateV2b(bytes, frozen, baseline) {
  assert.equal(sha(bytes), frozen.fixtureSHA256, 'Blinde labels zijn gewijzigd; controle niet achteraf aanpassen')
  const fixture = JSON.parse(bytes)
  assert.equal(fixture.controlOnly, true); assert.equal(fixture.notForTuning, true)
  assert(fixture.cases.length >= 50 && fixture.cases.length <= 100)
  const oldIds = new Set(baseline.map(x => x.id)), oldURLs = new Set(baseline.filter(x=>x.url).map(x=>urlKey(x.url)))
  const oldEvents = new Set(baseline.map(x=>x.eventId).filter(Boolean))
  const ids = new Set(), urls = new Set(), events = new Set()
  for (const x of fixture.cases) {
    assert.equal(x.split,'control'); assert.equal(x.cohort,'v2b')
    assert(!oldIds.has(x.id) && !ids.has(x.id),'Id-overlap'); ids.add(x.id)
    const url=urlKey(x.article.url); assert(!oldURLs.has(url) && !urls.has(url),'URL-overlap'); urls.add(url)
    assert(day(x.article.publishedAt)>='2026-11-02','Oude publicatiedag')
    assert(x.article.firstSeenAt && day(x.article.firstSeenAt)>='2026-11-02','Eerder waargenomen artikel')
    if (x.label.eventId) { assert(!oldEvents.has(x.label.eventId) && !events.has(x.label.eventId),'Gebeurtenissleutel-overlap'); events.add(x.label.eventId) }
    assert(x.label.mainTopic && x.label.reason && x.label.uncertain)
    for (const key of ['desk','country','topic','event']) assert.equal(typeof x.label.uncertain[key], 'boolean')
    for (const key of ['desk','deskLabel','topics','mainTopics','storyId','editor','score']) assert(!(key in x.article),'Voorspelling in blinde artikelinvoer: '+key)
  }
  return {count:ids.size,controlOnly:true,languages:[...new Set(fixture.cases.map(x=>x.article.lang))],sources:new Set(fixture.cases.map(x=>x.article.source)).size,uncertainDesk:fixture.cases.filter(x=>x.label.uncertain.desk).length}
}
export function inputs() {
  return [readFileSync(path('tests/fixtures/categorie-set-v2b.json')),JSON.parse(readFileSync(path('docs/codex-blokken/categorie-v2b/bevriezing.json'))),JSON.parse(readFileSync(path('docs/codex-blokken/categorie-v2b/baseline-overlap.json')))]
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(JSON.stringify(validateV2b(...inputs()),null,2))
