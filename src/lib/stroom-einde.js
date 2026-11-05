// Het einde van de Stroom (keuze r5-stroom-einde, 5 november; review F7, G6). De Stroom laadt niet
// meer eindeloos bij. Hij eindigt waar je de vorige keer was: "Hier was je gebleven", "Je bent bij."
// en een stille knop "Ouder nieuws tonen" (per keer PAGE berichten, geen automatisch bijladen).
// Zonder eerder bezoek, of als dat langer dan een dag geleden is, eindigt hij na de laatste 24 uur.
//
// Twee bewaarplekken:
// - `hoot:stroom-bij` (localStorage): de tijd van het nieuwste bericht dat je in de Stroom zag;
// - `hoot:stroom-grens` (sessionStorage): de grens van dit bezoek. Die blijft staan zolang het
//   tabblad open is, ook als je terugkomt van een artikel (zelfde tabblad), zodat je plek klopt.
export const DAG = 24 * 60 * 60 * 1000
export const BIJ_KEY = 'hoot:stroom-bij'
export const GRENS_KEY = 'hoot:stroom-grens'

export const tijdVan = (item) => {
  const t = Date.parse(item?.publishedAt || '')
  return Number.isFinite(t) ? t : 0
}

// De grens van dit bezoek. `eerder`: de grens komt van je vorige bezoek (dan zeggen we "Hier was je
// gebleven"); anders is het de laatste dag en zeggen we alleen "Je bent bij.".
export function grensVoor({ sessie, bij, now = Date.now() }) {
  if (sessie && Number.isFinite(sessie.at)) return sessie
  const dag = now - DAG
  if (bij && Number.isFinite(bij.at) && bij.at > dag) return { at: bij.at, eerder: true }
  return { at: dag, eerder: false }
}

// Waar de lijst ophoudt: het eerste bericht dat niet nieuwer is dan de grens.
export function grensIndex(list, at) {
  const i = list.findIndex((item) => tijdVan(item) <= at)
  return i < 0 ? list.length : i
}

const lees = (store, key) => {
  try {
    return JSON.parse(store.getItem(key))
  } catch {
    return null
  }
}
const schrijf = (store, key, value) => {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    /* geen opslag: dan geldt de laatste dag */
  }
}

// Eén keer per bezoek: de grens vastzetten (sessionStorage) en meteen geldt het nieuwste bericht als gezien.
export function bezoekGrens({ local = globalThis.localStorage, session = globalThis.sessionStorage, newest = 0, now = Date.now() } = {}) {
  const grens = grensVoor({ sessie: session && lees(session, GRENS_KEY), bij: local && lees(local, BIJ_KEY), now })
  if (session) schrijf(session, GRENS_KEY, grens)
  if (local && newest) gezien(newest, { local })
  return grens
}

// Het nieuwste bericht dat je zag (alleen vooruit).
export function gezien(at, { local = globalThis.localStorage } = {}) {
  if (!local || !at) return
  const nu = lees(local, BIJ_KEY)
  if (!nu || !(nu.at >= at)) schrijf(local, BIJ_KEY, { at })
}

// "N nieuwe berichten" tonen: wat er tot nu toe bovenaan stond, is waar je was gebleven.
export function nieuweGrens(at, { session = globalThis.sessionStorage } = {}) {
  const grens = { at, eerder: true }
  if (session) schrijf(session, GRENS_KEY, grens)
  return grens
}
