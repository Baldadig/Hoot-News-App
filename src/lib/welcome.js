// Wat het welkom met je instellingen doet — pure functies (tests/welcome.test.mjs).

// Opnieuw kiezen (vanuit Bronnen of Instellingen): je bronnen beginnen met wat nu aan staat,
// niet met een nieuw voorstel.
export const sourcesOn = (pickable = [], muted = new Set()) => pickable.filter((s) => !muted.has(s.id)).map((s) => s.id)

// ---- Het voorstel voor je bronnen ----
// Neutraal, voor iedereen gelijk: alleen gratis bronnen, Nederlands eerst. Altijd NOS, NU.nl en
// RTL Nieuws; per gekozen interesse de beste gratis bron of twee. Politiek, Binnenland en Economie
// vallen al onder die drie. Een bron met abonnement staat nooit vooraf aan: die staat in het blad
// onder 'Ook bij je interesses', en daar zet je hem zelf aan. Zelfde lijsten als de app.
export const ALWAYS = ['nos', 'nu', 'rtl']
export const PICK = { politiek: [], binnenland: [], wereld: ['bbc'], economie: [], tech: ['tweakers'], wetenschap: ['quanta'], cultuur: ['nos-cultuur', '3voor12'], sport: ['nos-sport', 'vi'] }
export const ALSO = {
  politiek: ['nrc', 'volkskrant', 'ftm', 'politico-eu'],
  binnenland: ['ad', 'parool', 'trouw'],
  wereld: ['guardian', 'aljazeera', 'nyt', 'economist'],
  economie: ['fd', 'ft', 'economist'],
  tech: ['theverge', 'ars'],
  wetenschap: ['nature'],
  cultuur: ['variety', 'pitchfork'],
  sport: ['wielerflits', 'sporza'],
}
const ORDER = Object.keys(PICK)
const inOrder = (interests) => ORDER.filter((i) => interests.includes(i))

// Het voorstel bij je interesses: de id's die bestaan en gratis zijn, in de volgorde hierboven.
export function proposeSources(pickable = [], interests = []) {
  const byId = new Map(pickable.map((s) => [s.id, s]))
  const ids = [...new Set([...ALWAYS, ...inOrder(interests).flatMap((i) => PICK[i])])]
  return ids.filter((id) => byId.has(id) && !byId.get(id).paid)
}

// Wat het blad Aanpassen onder 'Ook bij je interesses' toont: wat bij je interesses past en nu
// niet aan staat. Eerst de vaste drie als je die uitzette, dan per interesse, gratis vóór abonnement.
export function moreSources(pickable = [], interests = [], on = []) {
  const byId = new Map(pickable.map((s) => [s.id, s]))
  const ids = [...new Set([...ALWAYS, ...inOrder(interests).flatMap((i) => [...PICK[i], ...ALSO[i]])])]
  return ids.filter((id) => byId.has(id) && !on.includes(id)).sort((a, b) => Number(!!byId.get(a).paid) - Number(!!byId.get(b).paid))
}

// Je bronnen in één regel: 'NOS', 'NOS en NU.nl', 'NOS, NU.nl en RTL Nieuws' of 'NOS, NU.nl en 3 meer'.
export function sourceLine(names = []) {
  if (!names.length) return 'Geen bronnen'
  if (names.length <= 2) return names.join(' en ')
  if (names.length === 3) return `${names[0]}, ${names[1]} en ${names[2]}`
  return `${names[0]}, ${names[1]} en ${names.length - 2} meer`
}

// ---- Niets scrolt in het welkom: groepen pillen over pagina's verdeeld ----
// `heights` zijn de hoogtes van de groepen (px), `avail` de hoogte die een pagina heeft, `gap` de
// ruimte tussen twee groepen. Geeft per pagina de nummers van de groepen, in volgorde: zo veel
// als er past, en een groep die alleen al te hoog is staat op een eigen pagina.
export function packPages(heights = [], avail = 0, gap = 0) {
  const pages = []
  let page = []
  let used = 0
  heights.forEach((h, i) => {
    const next = page.length ? used + gap + h : h
    if (page.length && next > avail) {
      pages.push(page)
      page = [i]
      used = h
    } else {
      page.push(i)
      used = next
    }
  })
  if (page.length) pages.push(page)
  return pages.length ? pages : [[]]
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
// Editie (`editieHint`, Edition.jsx); daarna staat die uitleg alleen bij Instellingen › Edities.
export function applyWelcome(p, choice) {
  const on = new Set(choice.sources)
  const shown = new Set(choice.all.map((s) => s.id))
  const kept = p.onboarded ? (p.pinned || []).filter((t) => choice.topics.includes(t)) : []
  return {
    ...p,
    onboarded: true,
    ...(p.onboarded ? {} : { editieHint: true }),
    interests: choice.interests,
    topics: choice.topics,
    pinned: kept.length ? kept : choice.topics.slice(0, 3),
    ...(choice.vak ? { vak: choice.vak } : {}),
    muted: [...(p.muted || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id)],
    enabled: [...(p.enabled || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => s.optional && on.has(s.id)).map((s) => s.id)],
  }
}
