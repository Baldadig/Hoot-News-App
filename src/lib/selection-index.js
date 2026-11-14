// Selectie-index B (concepten-2/4-selectie-index.html): de inhoud bovenaan, één rijvorm. Pure
// functies, zodat tests/selectie-index.test.mjs de toestanden kan nalopen; DigestView.swift doet
// hetzelfde (SelectionOverview).

// "3 stukken", "1 stuk", en voor een onderwerp zonder stukken "Nog geen stukken" (nooit "0 stukken").
export const pieces = (n) => (n === 0 ? 'Nog geen stukken' : n === 1 ? '1 stuk' : `${n} stukken`)

// "Fotografie", "Fotografie en Gaming", "AI, Fotografie en Gaming".
export const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`)

// "Tot dan verbergen." (besluit Alex 14 november): een onderwerp dat nog niet in de weekbundel (/api/vak) zit,
// nieuw in de code of deze week zonder bronnen, blijft verborgen tot de bundel het heeft: in de Selectie, bij het
// kiezen (Instellingen, welkom) en in elke telling. Zonder bundel (nog niet geladen) telt alles mee, want dan weet
// Hoot het niet. HootStore.offersField in de app.
export const offersField = (digest, id) => !digest || (digest.fields || []).some((f) => f.id === id)
// De onderwerpen (ids of { id }) die de bundel levert, in hun eigen volgorde.
export const offeredFields = (fields, digest) => fields.filter((f) => offersField(digest, typeof f === 'string' ? f : f.id))
// "Alle onderwerpen": aan als je elk aangeboden onderwerp volgt. Aanzetten voegt de aangeboden toe en houdt wat je al
// had (een verborgen onderwerp gaat niet verloren); uitzetten leegt alles. `order`: de vaste volgorde (vakByDomain).
// DigestFieldsList in de app.
export const allChosen = (chosen, offered) => offered.length > 0 && offered.every((id) => chosen.includes(id))
export const chooseAll = (on, order, chosen, offered) => (on ? order.filter((id) => offered.includes(id) || chosen.includes(id)) : [])

// Wat de Selectie toont. `fields`: de gekozen onderwerpen in vaste volgorde, elk met `top` (de
// stukken van deze week); `offered`: ids die de server deze week levert.
// - state 'kies': nog niets gekozen;
// - state 'leeg': gekozen, maar nergens stukken ("Nog niets voor X"); `unoffered`: geen bronnen;
// - state 'vol': de kop telt alleen onderwerpen met stukken; lege onderwerpen staan onderaan.
// Een gekozen onderwerp dat de bundel niet levert, staat er niet (offersField), tenzij geen enkel gekozen
// onderwerp geleverd wordt: dan blijft de lege Selectie met haar uitleg.
export function selectionOverview(chosen, offered) {
  const shown = chosen.filter((f) => offered.has(f.id))
  const fields = shown.length ? shown : chosen
  const live = fields.filter((f) => f.top.length > 0)
  const empty = fields.filter((f) => f.top.length === 0)
  const picked = live.reduce((n, f) => n + f.top.length, 0)
  if (!fields.length) return { state: 'kies', fields: [], live, picked: 0 }
  if (!live.length) return { state: 'leeg', fields, live, picked: 0, names: joinNames(fields.map((f) => f.label)), unoffered: fields.every((f) => !offered.has(f.id)) }
  return { state: 'vol', fields: [...live, ...empty], live, picked }
}

export const summaryLine = (o) => `${pieces(o.picked)} in ${o.live.length === 1 ? '1 onderwerp' : `${o.live.length} onderwerpen`}`

export const EMPTY_FIELD = 'Deze week sprong er niets uit. Maandag kijkt Hoot opnieuw.'
export const NO_SOURCES = 'Hoot heeft hier nog te weinig goede bronnen voor. Kies er een onderwerp bij, dan lees je maandag meer.'
export const CHOOSE = 'Voor je werk of uit interesse: elke maandag per onderwerp de drie beste stukken van de week.'

// Een voorproefje voor een lege Selectie (keuze r5-selectie-onderwerpen, 5 november; review G13): uit de
// Selectie van deze week per domein het eerste onderwerp met stukken, hooguit `max`, elk met zijn beste stuk.
// `domains`: vakByDomain() (de vaste volgorde); `fields`: digest.fields van de server.
export function voorproefje(domains = [], fields = [], max = 3) {
  const byId = new Map(fields.map((f) => [f.id, f]))
  const out = []
  for (const d of domains) {
    const f = d.fields.map((x) => ({ ...x, ...byId.get(x.id) })).find((x) => x.top?.length)
    if (f) out.push({ id: f.id, label: f.label, item: f.top[0] })
    if (out.length >= max) break
  }
  return out
}
export const VOORPROEF = 'Zo ziet het eruit: per onderwerp de beste stukken van de week.'
