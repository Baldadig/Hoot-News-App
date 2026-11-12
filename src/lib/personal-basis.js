// De lichte helpers van de persoonlijke Editie (zonder de zware rekenkern in personal.js): ze gaan mee in de
// eerste lading, de rekenkern (composePersonal, het vangnet) laadt pas als hij nodig is (Snel · 2).
// personal.js exporteert dezelfde namen nog, voor de server, de scripts en de toetsen.
import { BASIS_REVISION } from '../../shared/editor-version.mjs'
import { recentEditions } from '../../shared/edition-history.mjs'

// Zonder de velden ter inzage (`_parts`, `_plan`): zo gaat de Editie naar het toestel en je account.
export function withoutDebug(edition) {
  if (!edition) return edition
  const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')))
  return { ...strip(edition), entries: (edition.entries || []).map(strip) }
}

// De Edities van vóór deze, voor `previous` en voor `history` (aanvulling-pariteit-herhaling.md H3, H5):
// wat op dit toestel ligt (de laatste vastgelegde Editie met haar `history`) en wat in je account staat
// (`user_state.edition`, met de zijne), samen, ontdubbeld op id, de laatste HISTORY_MAX (nieuwste eerst).
// De Editie van dit dagdeel zelf telt niet mee (die wordt juist samengesteld of overgenomen), wat lokaal
// van een andere lezer is ook niet; de rij uit het account is altijd van deze lezer. Zo kennen beide
// toestellen dezelfde Edities van toen, ook als het ene de Middag oversloeg.
export function earlierEditions({ local = null, account = null, id = null, owner = null } = {}) {
  const rows = []
  const add = (e) => {
    if (!e || typeof e !== 'object') return
    if (Array.isArray(e.history)) rows.push(...e.history)
    if (e.id !== id) rows.push(e)
  }
  if (local && (!owner || local.owner === owner)) add(local)
  add(account)
  return recentEditions(rows)
}

// Vingerafdruk van waaruit een editie is samengesteld: je bronnen en interesses. Een editie met
// een andere afdruk is niet (meer) de jouwe — bijvoorbeeld gemaakt op een toestel dat je
// instellingen nog niet had geladen — en wordt opnieuw samengesteld.
export function editionBasis(followed = [], interests = [], topics = [], favorites = []) {
  const parts = [[...followed].sort().join(','), [...interests].sort().join(','), [...topics].sort().join(',')]
  if (favorites.length) parts.push([...favorites].sort().join(',')) // zonder voorkeuren: dezelfde afdruk als vroeger
  const text = [BASIS_REVISION, ...parts].join('|') // vast, niet de revisie (shared/editor-version.mjs)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

// De invoer voor het overzicht in één minuut: per plek het getoonde bericht (met de plek erbij,
// voor de verwijzingen per blok). Zelfde vorm als briefRows op de server.
export function personalRows(edition) {
  const byId = new Map((edition?.items || []).map((i) => [i.id, i]))
  const rows = []
  ;(edition?.entries || []).forEach((e, entry) => {
    if (e.desk === 'bubbel') return
    const item = byId.get(e.leadId || e.id)
    if (item) rows.push({ entry, sourceName: item.sourceName, title: item.title, summary: item.summary || '' })
  })
  return rows
}
