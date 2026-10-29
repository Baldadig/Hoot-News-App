// Wat het welkom met je instellingen doet — pure functies (tests/welcome.test.mjs).

// Opnieuw kiezen (vanuit Bronnen of Instellingen): stap 4 begint met de bronnen die nu aan staan,
// niet met nieuwe suggesties.
export const sourcesOn = (pickable = [], muted = new Set()) => pickable.filter((s) => !muted.has(s.id)).map((s) => s.id)

// Welkom klaar: interesses, onderwerpen en bronnen worden je instellingen. Alleen de bronnen die
// in het welkom te kiezen waren (`all`) veranderen; de rest blijft zoals hij was.
// Koos je opnieuw (je was al eens door het welkom), dan blijven je vaste onderwerpen staan voor
// zover je ze nog volgt; bij de eerste start worden het de eerste drie van je onderwerpen.
export function applyWelcome(p, choice) {
  const on = new Set(choice.sources)
  const shown = new Set(choice.all.map((s) => s.id))
  const kept = p.onboarded ? (p.pinned || []).filter((t) => choice.topics.includes(t)) : []
  return {
    ...p,
    onboarded: true,
    interests: choice.interests,
    topics: choice.topics,
    pinned: kept.length ? kept : choice.topics.slice(0, 3),
    ...(choice.vak ? { vak: choice.vak } : {}),
    muted: [...(p.muted || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id)],
    enabled: [...(p.enabled || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => s.optional && on.has(s.id)).map((s) => s.id)],
  }
}
