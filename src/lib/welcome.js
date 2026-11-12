// Wat het welkom met je instellingen doet — pure functies (tests/welcome.test.mjs).
import { RUBRIEKEN } from './topics.js'

// Opnieuw kiezen (vanuit Bronnen of Instellingen): je bronnen beginnen met wat nu aan staat,
// niet met een nieuw voorstel.
export const sourcesOn = (pickable = [], muted = new Set()) => pickable.filter((s) => !muted.has(s.id)).map((s) => s.id)

// Je bronnen in één regel: 'NOS', 'NOS en NU.nl', 'NOS, NU.nl en RTL Nieuws' of 'NOS, NU.nl en 3 meer'.
export function sourceLine(names = []) {
  if (!names.length) return 'Geen bronnen'
  if (names.length <= 2) return names.join(' en ')
  if (names.length === 3) return `${names[0]}, ${names[1]} en ${names[2]}`
  return `${names[0]}, ${names[1]} en ${names.length - 2} meer`
}

// Het bewijs op de rode intro (Week · 1): de eerste kop van de huidige algemene Editie, met bron. Geen
// Editie of geen kop (offline, feed nog niet binnen): null, en de intro toont zijn gewone ondertitel.
export function proofHeadline(edition) {
  const byId = new Map((edition?.items || []).map((i) => [i.id, i]))
  for (const e of edition?.entries || []) {
    if (e.desk === 'bubbel') continue
    const item = byId.get(e.leadId || e.id)
    const title = (item?.title || '').trim()
    if (title) return { title, source: item.sourceName || '' }
  }
  return null
}

// Wat je per interesse aantikte, uit de lijst onderwerpen die je volgt (resolveTopics): volg je
// alle onderwerpen van een interesse, dan koos je er niet een paar maar 'Alles'.
export function pickedFrom(topics = [], interests = [], all = []) {
  return all
    .filter((i) => interests.includes(i.id))
    .flatMap((i) => {
      const mine = i.topics.filter((t) => topics.includes(t))
      return mine.length === i.topics.length ? [] : mine
    })
}

// Welkom klaar: interesses, onderwerpen en bronnen worden je instellingen. Alleen de bronnen die
// in het welkom te kiezen waren (`all`) veranderen; de rest blijft zoals hij was.
// Koos je opnieuw (je was al eens door het welkom), dan blijven je vaste onderwerpen staan voor
// zover je ze nog volgt; bij de eerste start worden het de eerste drie van je onderwerpen.
// Alleen bij de eerste start komt er één keer de uitleg bij "Jouw Editie" onder de kop van de
// Editie (`editieHint`, Edition.jsx).
export function applyWelcome(p, choice) {
  const on = new Set(choice.sources)
  const shown = new Set(choice.all.map((s) => s.id))
  const kept = p.onboarded ? (p.pinned || []).filter((t) => choice.topics.includes(t)) : []
  return {
    ...p,
    onboarded: true,
    ...(p.onboarded ? {} : { editieHint: true }),
    // "Liever meteen lezen": later één keer "Maak Hoot van jou" (components/MaakVanJou.jsx). Elke andere
    // afronding (ook opnieuw kiezen via die uitnodiging) zet hem uit, zoals de app (HootStore.applyWelcome).
    browsing: !!choice.quick,
    interests: choice.interests,
    topics: choice.topics,
    rubrieken: RUBRIEKEN, // gekozen in de indeling van nu (topics.js)
    pinned: kept.length ? kept : choice.topics.slice(0, 3),
    ...(choice.vak ? { vak: choice.vak } : {}),
    muted: [...(p.muted || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id)],
    enabled: [...(p.enabled || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => s.optional && on.has(s.id)).map((s) => s.id)],
  }
}
