// Bewaart een echte Editie als terugval voor de landing (landing/bewaard.json). Alleen lezen (GET), niets naar de server.
// Gebruik: node landing/bewaar.mjs                    haalt https://gethoot.app/api/feed en /api/vak op
//          node landing/bewaar.mjs feed.json vak.json  werkt met bewaarde bestanden
// Wat erin gaat: alleen kop, naam van de uitgever, aantal bronnen en een rubriek als die zeker is (zelfde regel als
// /api/voorpagina). Geen intro, geen beeld van uitgevers, geen kloktijden: alleen de datum van de Editie.
// Ververs dit vóór een deploy, zodat de terugval niet veroudert.
import fs from 'node:fs'
import path from 'node:path'
import { extract, rubriek, isHeavy, isDutch } from '../netlify/functions/voorpagina.mjs'
import { desksOf, primaryDesk } from '../netlify/lib/desks.mjs'
import { signatures, sameSubject } from '../netlify/lib/stories.mjs'
import { redenen } from './bewaard.mjs'

const HIER = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname))
const lees = async (arg, url) => (arg ? JSON.parse(fs.readFileSync(arg, 'utf8')) : (await fetch(url, { headers: { accept: 'application/json' } })).json())

// vorige: het bestaande bewaard.json. Geeft /api/vak niets bruikbaars, dan blijft de Selectie van de vorige keer staan
// (echte onderwerpen met hun eigen week). Is er ook geen vorige, dan weigert bewaar() en wordt er niets geschreven.
export function bewaar(feed, vak, vorige = null) {
  const ed = feed?.edition
  if (!ed?.entries?.length) throw new Error('Geen Editie in de feed.')
  const vp = extract(feed)
  if (!vp) throw new Error('De voorpagina gaf niets voor deze Editie; kies een andere.')
  const ns = [vp.entries[0], vp.entries[1], vp.bubble || vp.entries[2]].map((x) => x?.sourceCount || 1)
  if (!redenen(ns, !!vp.bubble)) throw new Error('Hoot kiest krijgt geen drie verschillende redenen uit deze Editie; het oude bestand blijft staan.')
  const srcs = new Map((feed.sources || []).map((s) => [s.id, s]))
  const stories = new Map((feed.stories || []).map((s) => [s.id, s]))
  const byId = new Map([...(ed.items || []), ...(feed.items || [])].map((i) => [i.id, i]))
  const sig = signatures([...byId.values()].filter((i) => i?.title))
  const used = new Set(), verhalen = new Set(), gekozen = []
  const plek = (it, n = 1, editieDesk = null) => {
    const src = srcs.get(it.source)
    const desk = 'desk' in it ? it.desk : primaryDesk([desksOf(it)])
    used.add(it.id)
    if (it.storyId) verhalen.add(it.storyId)
    gekozen.push(it.id)
    return { title: it.title, source: it.sourceName || it.source, sourceCount: n, desk: rubriek(it, desk, src?.cat, editieDesk) }
  }
  const rustig = (it) => it?.title && it.kind !== 'post' && isDutch(it, srcs.get(it.source)?.lang) && !isHeavy(it) && !used.has(it.id) && !(it.storyId && verhalen.has(it.storyId)) && !gekozen.some((id) => sameSubject(sig.get(id), sig.get(it.id)))

  // De Editie zoals ze was, zonder zwaar nieuws en zonder anderstalige stukken, aangevuld met rustige berichten van die dag.
  const editie = []
  let bubbel = null
  for (const e of ed.entries) {
    const it = byId.get(e.kind === 'story' ? e.leadId || stories.get(e.id)?.leadId : e.id)
    if (!rustig(it)) continue
    const n = e.kind === 'story' ? e.sourceCount || stories.get(e.id)?.sourceCount || 1 : 1
    if (e.desk === 'bubbel') bubbel = plek(it, n)
    else if (editie.length < 10) editie.push(plek(it, n, e.desk || null))
  }
  const nieuwste = [...(feed.items || [])].filter((i) => Number.isFinite(Date.parse(i.publishedAt))).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  for (const it of nieuwste) if (editie.length < 10 && rustig(it)) editie.push(plek(it))
  if (editie.length < 10) throw new Error('Te weinig rustige Nederlandse koppen voor de Editie.')

  // De Stroom: per tab de nieuwste rustige berichten met een zekere rubriek.
  const stroom = { alles: [], binnenland: [], wereld: [], cultuur: [] }
  const tab = { binnenland: 'binnenland', buitenland: 'wereld', cultuur: 'cultuur' }
  for (const it of nieuwste) {
    if (!rustig(it)) continue
    const p = plek(it)
    const t = tab[p.desk]
    if (stroom.alles.length < 3) stroom.alles.push(p)
    else if (t && stroom[t].length < 2) stroom[t].push(p)
    else { used.delete(it.id); if (it.storyId) verhalen.delete(it.storyId); gekozen.pop() }
    if (Object.entries(stroom).every(([k, v]) => v.length >= (k === 'alles' ? 3 : 2))) break
  }
  for (const [k, v] of Object.entries(stroom)) if (v.length < (k === 'alles' ? 3 : 2)) throw new Error(`Te weinig berichten voor de Stroom-tab ${k}.`)

  // De Selectie: twee echte onderwerpen van die week, met het eerste Nederlandse stuk van het eerste onderwerp.
  let selectie = null
  if (vak?.fields?.length) {
    const nl = (t) => t?.title && !/\b(the|and|of|is|to|for|with)\b/i.test(t.title) && !isHeavy(t)
    const voorkeur = ['wetenschap', 'boeken', 'economie', 'klimaat', 'onderwijs']
    const velden = voorkeur.map((id) => vak.fields.find((f) => f.id === id)).filter((f) => f && (f.top || []).filter(nl).length).slice(0, 2)
    if (velden.length === 2) {
      const stuk = velden[0].top.find(nl)
      selectie = { week: vak.week, velden: velden.map((f) => ({ label: f.label, count: f.top.length })), kaart: { title: stuk.title, source: stuk.sourceName || stuk.source } }
    }
  }
  if (!selectie) selectie = vorige?.selectie?.velden?.length ? vorige.selectie : null
  if (!selectie) throw new Error('Geen Selectie: /api/vak gaf geen twee bruikbare onderwerpen en er is geen vorige; het oude bestand blijft staan.')
  return { slot: ed.slot, date: ed.date, voorpagina: { entries: vp.entries, bubble: vp.bubble || null, breed: vp.breed || [] }, editie, bubbel, stroom, selectie }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(HIER, 'bewaar.mjs')) {
  const feed = await lees(process.argv[2], 'https://gethoot.app/api/feed')
  const vak = await lees(process.argv[3], 'https://gethoot.app/api/vak').catch(() => null)
  let vorige = null
  try { vorige = JSON.parse(fs.readFileSync(path.join(HIER, 'bewaard.json'), 'utf8')) } catch {}
  const uit = bewaar(feed, vak, vorige)
  fs.writeFileSync(path.join(HIER, 'bewaard.json'), JSON.stringify(uit, null, 1) + '\n')
  console.log(`bewaard: ${uit.slot} ${uit.date}, ${uit.editie.length} koppen in de Editie`)
}
