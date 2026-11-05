// Het voorstel bovenaan de bronnenstap van het welkom (1.1.1, wens van Alex): geen vaste Basis meer, maar
// opgebouwd uit je interesses (en je onderwerpen, als je die al koos). Eén plek voor web en app: het web
// importeert dit direct (src/views/Welcome.jsx), de app rekent het in de rekenkern (src/lib/editionCore.js
// → ios/Hoot/Resources/edition-core.js, HootCore.voorstelJSON). Getoetst in tests/voorstel.test.mjs.
//
// De regels, kort:
// 1. Altijd één gratis Nederlandse nieuwsbron voorop (NOS): het nieuws van de dag, en buiten je eigen
//    bronnen altijd een gratis bron (huisregel).
// 2. Wijzen meerdere gekozen interesses naar dezelfde bron (de catalogus raadt hem aan voor twee of meer
//    ervan: NYT bij Wereld en Economie), dan komt die erbij, ook als hij betaald of anderstalig is. Eén
//    zo'n bron, de eerste in de catalogus. Het label Abonnement staat er gewoon bij (SourceRow).
// 3. Per gekozen interesse de best passende bron: gratis en Nederlands als die er is, anders gratis (ook
//    anderstalig). Is er geen gratis bron, dan een betaalde, behalve als de bron uit regel 2 de interesse
//    al dekt.
// 4. Kort maar niet kaal: minstens drie (aangevuld met de volgende gratis bron per interesse), hooguit vijf. Met nul interesses en nul onderwerpen: null (dan de vaste Basis).
// Per bron een korte reden in de stijl van de waarom-regels, vanuit wat de lezer eraan heeft. Nooit
// "Omdat je X volgt" (huisregel).
import { INTERESTS } from '../src/lib/topics.js'

export const VOORSTEL_MAX = 5
const ALGEMEEN = ['nos', 'nu', 'rtl'] // het gratis Nederlandse nieuws: past bij Politiek en Binnenland
const NL_NIEUWS = new Set(['politiek', 'binnenland'])
const EXTRA_CATS = { wereld: ['int'] } // gelijk aan fitsInterest in src/lib/follow-welcome.js

const free = (s) => !s.paid
const dutch = (s) => s.lang === 'nl'

// Hoe sterk past bron s bij interesse i? 0 is niet. De catalogus die hem aanraadt (`for`) telt het zwaarst,
// dan een onderwerp dat je koos (`forTopic`), dan zijn rubriek, dan een onderwerp dat bij de interesse hoort.
export function fit(s, i, topics = []) {
  if (!s || !i) return 0
  if (NL_NIEUWS.has(i.id) && ALGEMEEN.includes(s.id)) return 2
  if (s.cat === 'nl' || s.cat === 'vl') return 0 // de kranten staan als eigen groep; Vlaams alleen via zoeken of Meer
  let n = 0
  if ((s.for || []).includes(i.id)) n += 4
  if (s.forTopic && topics.includes(s.forTopic) && i.topics.includes(s.forTopic)) n += 3
  if ([...i.cats, ...(EXTRA_CATS[i.id] || [])].includes(s.cat)) n += 2
  if (s.forTopic && !topics.length && i.topics.includes(s.forTopic)) n += 1
  return n
}

const label = (ids) => {
  const names = INTERESTS.filter((i) => ids.includes(i.id)).map((i) => i.label)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}` : names[0] || ''
}

// sources: de catalogus (id, name, cat, lang, paid, for, forTopic, pick); interests: ids; topics: de
// onderwerpen die je zelf aantikte (mag leeg). Uitkomst: [{ id, why }] of null.
export function voorstel(sources = [], interests = [], topics = []) {
  const chosen = INTERESTS.filter((i) => interests.includes(i.id) || i.topics.some((t) => topics.includes(t)))
  if (!chosen.length) return null
  const news = sources.filter((s) => s.kind !== 'sociaal') // nieuws en muziek, geen Bluesky-accounts
  const out = []
  const has = (id) => out.some((o) => o.id === id)
  const add = (s, why) => s && !has(s.id) && out.length < VOORSTEL_MAX && out.push({ id: s.id, why })

  // 1. Het nieuws van de dag, gratis.
  const start = ALGEMEEN.map((id) => news.find((s) => s.id === id)).find((s) => s && free(s))
  add(start, 'Het nieuws van de dag')

  // 2. Een bron waar meerdere interesses naar wijzen (de catalogus raadt hem aan voor twee of meer).
  const covers = (s) => chosen.filter((i) => (s.for || []).includes(i.id)).map((i) => i.id)
  const dominant = news.filter((s) => !has(s.id) && covers(s).length >= 2).sort((a, b) => covers(b).length - covers(a).length)[0] || null

  // 3. Per interesse de best passende: gratis en Nederlands, anders gratis, anders betaald (als regel 2 de
  //    interesse niet al dekt). Binnen een soort: hoe goed hij past, dan of de catalogus hem aanraadt (pick).
  const picks = []
  for (const i of chosen) {
    const fits = news.filter((s) => fit(s, i, topics) > 0 && !has(s.id) && !picks.some((p) => p.s.id === s.id))
    const best = (list) => list.sort((a, b) => fit(b, i, topics) - fit(a, i, topics) || (b.pick ? 1 : 0) - (a.pick ? 1 : 0))[0] || null
    const pick = best(fits.filter((s) => free(s) && dutch(s))) || best(fits.filter(free))
    if (pick) { picks.push({ s: pick, i }); continue }
    if (dominant && covers(dominant).includes(i.id)) continue // betaald, maar dat wijst al naar de bron van regel 2
    const paid = best(fits)
    if (paid) picks.push({ s: paid, i })
  }
  if (dominant) add(dominant, `Past bij ${label(covers(dominant))}`)
  const why = (s, i) => (ALGEMEEN.includes(s.id) ? `Snel het ${i.id === 'politiek' ? 'politieke' : 'binnenlandse'} nieuws` : `Past bij ${i.label}`)
  for (const { s, i } of picks) add(s, why(s, i))

  // 4. Minstens drie: vul aan met de volgende gratis bron per interesse (Nederlands eerst).
  for (const i of chosen) {
    if (out.length >= 3) break
    const fits = news.filter((s) => fit(s, i, topics) > 0 && free(s) && !has(s.id))
    const next = fits.sort((a, b) => (dutch(b) ? 1 : 0) - (dutch(a) ? 1 : 0) || fit(b, i, topics) - fit(a, i, topics) || (b.pick ? 1 : 0) - (a.pick ? 1 : 0))[0]
    if (next) add(next, why(next, i))
  }
  return out
}

// Voor de app (HootCore): JSON erin ({ sources, interests, topics }), JSON eruit ([{ id, why }] of null).
export function voorstelJSON(jsonIn) {
  const { sources = [], interests = [], topics = [] } = JSON.parse(jsonIn || '{}')
  return JSON.stringify(voorstel(sources, interests, topics))
}
