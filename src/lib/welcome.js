// Wat het welkom met je instellingen doet — pure functies (tests/welcome.test.mjs).
import { RUBRIEKEN, ONDERWERPEN, OPT_IN, INTERESTS } from './topics.js'

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

// Wat je per interesse aantikte, uit de lijst onderwerpen die je volgt (resolveTopics): volg je
// alle onderwerpen van een interesse, dan koos je er niet een paar maar 'Alles'.
export function pickedFrom(topics = [], interests = [], all = []) {
  return all
    .filter((i) => interests.includes(i.id))
    .flatMap((i) => {
      // "Alles" is de lijst zonder wat je zelf aantikt (OPT_IN in topics.js): precies die lijst is 'Alles'.
      const mine = i.topics.filter((t) => topics.includes(t))
      const base = i.topics.filter((t) => !OPT_IN.has(t))
      return mine.length === base.length && base.every((t) => mine.includes(t)) ? [] : mine
    })
}

// Een onderwerp dat je zelf aantikt (OPT_IN: Achterklap & showbizz) in het welkom (persona's 14 november, punt 9): wie
// Cultuur koos, kan het eronder aantikken. Uit: `topics` zonder OPT_IN-onderwerpen, plus wat je aantikte (`on`) als je de
// interesse waar het onder valt nog kiest. Gelijk aan Rubriek.withOptIn in de app.
export function withOptIn(topics = [], interests = [], on = []) {
  const under = (t) => INTERESTS.find((i) => i.topics.includes(t))?.id
  return [...topics.filter((t) => !OPT_IN.has(t)), ...on.filter((t, k) => OPT_IN.has(t) && interests.includes(under(t)) && on.indexOf(t) === k)]
}

// Welkom klaar: interesses, onderwerpen en bronnen worden je instellingen. Alleen de bronnen die
// in het welkom te kiezen waren (`all`) veranderen; de rest blijft zoals hij was.
// Koos je opnieuw (je was al eens door het welkom), dan blijven je vaste onderwerpen staan voor
// zover je ze nog volgt; bij de eerste start worden het de eerste drie van je onderwerpen.
// Alleen na de eerste echte keuze komt er één keer de uitleg bij "Jouw Editie" onder de kop van de
// Editie (`editieHint`, Edition.jsx): bij de eerste start, of de eerste keer na meteen lezen
// (`browsing`). Na meteen lezen zelf niet: dan koos je nog niets.
export function applyWelcome(p, choice) {
  const on = new Set(choice.sources)
  const shown = new Set(choice.all.map((s) => s.id))
  const kept = p.onboarded ? (p.pinned || []).filter((t) => choice.topics.includes(t)) : []
  const eersteKeuze = !choice.quick && (!p.onboarded || !!p.browsing)
  return {
    ...p,
    onboarded: true,
    ...(eersteKeuze ? { editieHint: true } : {}),
    // "Liever meteen lezen": later één keer "Maak Hoot van jou" (components/MaakVanJou.jsx). Elke andere
    // afronding (ook opnieuw kiezen via die uitnodiging) zet hem uit, zoals de app (HootStore.applyWelcome).
    browsing: !!choice.quick,
    interests: choice.interests,
    topics: choice.topics,
    rubrieken: RUBRIEKEN, // gekozen in de indeling van nu (topics.js)
    onderwerpen: ONDERWERPEN, // en met de onderwerpen van nu (Crypto erbij)
    pinned: kept.length ? kept : choice.topics.slice(0, 3),
    ...(choice.vak ? { vak: choice.vak } : {}),
    muted: [...(p.muted || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id)],
    enabled: [...(p.enabled || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => s.optional && on.has(s.id)).map((s) => s.id)],
  }
}
