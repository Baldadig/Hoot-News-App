// Het einde van de Stroom (keuze r5-stroom-einde, 5 november; review F7, G6), herzien na de melding van
// Alex van 14 november: "Er moet wel echt een vorm van scrollen en lezen aan vooraf zijn gegaan."
//
// De Stroom laadt niet eindeloos bij. Hij eindigt na het laatste bericht van de laatste 24 uur (DAG) dat je
// in deze weergave (tab, bronkeuze) nog niet zag: daar staan "Je bent bij." en een stille knop "Ouder nieuws
// tonen" (per keer PAGE berichten). Daaronder ligt wat je al zag en wat ouder is dan een dag. Zonder eerder
// bezoek eindigt hij dus na de laatste 24 uur, zoals afgesproken in r5-stroom-einde.
//
// Gezien is echt gezien. Een bericht telt pas als gezien als het tijdens zelf scrollen in beeld was en je
// er voorbij scrolde, of als het na zelf scrollen GEZIEN_MS helemaal in beeld stond (de laatste berichten
// boven het einde). Laden, een tab of een bron openen markeert niets. Gelijk aan StroomEinde.swift.
//
// Twee bewaarplekken:
// - `hoot:stroom-gezien` (localStorage): de berichten die je echt zag, id → tijd van het bericht. Wat
//   ouder is dan de Stroom (VENSTER, 36 uur) valt eruit. Blijft over sessies heen: wat je zag, blijft gezien;
// - `hoot:stroom-grenzen` (sessionStorage): per weergave waar de lijst ophoudt, vastgezet bij het openen.
//   Zo beweegt niets terwijl je leest, ook niet als je terugkomt van een artikel of van een andere tab.
export const VENSTER = 36 * 60 * 60 * 1000 // de Stroom: de afgelopen 36 uur (shared/stroom.mjs)
export const DAG = 24 * 60 * 60 * 1000 // alleen ongeziene berichten van de laatste dag maken de lijst langer
export const GEZIEN_MS = 1500 // zo lang helemaal in beeld (na zelf scrollen) telt als gezien
export const GEZIEN_KEY = 'hoot:stroom-gezien'
export const GRENZEN_KEY = 'hoot:stroom-grenzen'
// Oud (tot 14 november): één tijd voor alle weergaven, gezet bij het laden. Die zei niets over lezen.
const OUD = { local: 'hoot:stroom-bij', session: 'hoot:stroom-grens' }

export const tijdVan = (item) => {
  const t = Date.parse(item?.publishedAt || '')
  return Number.isFinite(t) ? t : 0
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
    /* geen opslag: dan is niets gezien en zie je alles van de Stroom */
  }
}

// ---- Gezien ----

// Wat je echt zag, zonder wat ouder is dan de Stroom.
export function leesGezien({ local = globalThis.localStorage, now = Date.now() } = {}) {
  const ruw = local ? lees(local, GEZIEN_KEY) : null
  const out = {}
  if (ruw && typeof ruw === 'object') for (const [id, at] of Object.entries(ruw)) if (Number.isFinite(at) && at >= now - VENSTER) out[id] = at
  return out
}

// Berichten als gezien bewaren (alleen toevoegen). Geeft terug hoeveel er nieuw bij kwamen.
export function markeerGezien(items, { local = globalThis.localStorage, now = Date.now() } = {}) {
  if (!local || !items?.length) return 0
  const gezien = leesGezien({ local, now })
  let nieuw = 0
  for (const item of items) {
    if (!item?.id || gezien[item.id]) continue
    gezien[item.id] = tijdVan(item) || now
    nieuw++
  }
  if (nieuw) schrijf(local, GEZIEN_KEY, gezien)
  return nieuw
}

// ---- De grens van een weergave ----

// Waar de lijst ophoudt: na het laatste bericht van de laatste 24 uur dat je nog niet zag. Zag je die
// alle, dan 0: meteen "Je bent bij." (en de knop voor wat ouder is). Gezien en niet gezien mogen door
// elkaar staan; wat je al zag tussen nieuwe berichten in, blijft gewoon op zijn plek. Een ongezien bericht
// van eergisteren maakt de lijst niet langer: dat ligt onder "Ouder nieuws tonen".
export function eindIndex(list, gezien, now = Date.now()) {
  const dag = now - DAG
  for (let i = list.length - 1; i >= 0; i--) if (!gezien[list[i].id] && tijdVan(list[i]) > dag) return i + 1
  return 0
}

// De grens vastzetten als het bericht waar hij na komt (id en tijd), zodat hij niet verschuift als er
// berichten bij komen of je verder leest. `null`: alles gezien.
export function grensVan(list, gezien, now = Date.now()) {
  const i = eindIndex(list, gezien, now)
  return i ? { id: list[i - 1].id, at: tijdVan(list[i - 1]) } : { id: null, at: null }
}

// De index die bij een vastgezette grens hoort.
export function grensIndex(list, grens) {
  if (!grens || !grens.id) return 0
  const i = list.findIndex((item) => item.id === grens.id)
  if (i >= 0) return i + 1
  const j = list.findIndex((item) => tijdVan(item) < grens.at)
  return j < 0 ? list.length : j
}

// De grens van een weergave voor dit bezoek: de vastgezette, of nu vastzetten. `sleutel` is de weergave
// (positionKey: tab en bronkeuze). Ruimt meteen de oude bewaarplekken op.
export function weergaveGrens(sleutel, list, { local = globalThis.localStorage, session = globalThis.sessionStorage, now = Date.now() } = {}) {
  const grenzen = (session && lees(session, GRENZEN_KEY)) || {}
  if (grenzen[sleutel]) return grenzen[sleutel]
  const grens = grensVan(list, leesGezien({ local, now }), now)
  grenzen[sleutel] = grens
  if (session) schrijf(session, GRENZEN_KEY, grenzen)
  try {
    local?.removeItem(OUD.local)
    session?.removeItem(OUD.session)
  } catch {
    /* niet erg */
  }
  return grens
}

// "N nieuwe berichten" tonen: alle weergaven opnieuw bepalen (wat je net las, telt dan als gezien).
export function vergeetGrenzen({ session = globalThis.sessionStorage } = {}) {
  try {
    session?.removeItem(GRENZEN_KEY)
  } catch {
    /* niet erg */
  }
}

// ---- Scrollen en kijken ----

// Niets telt voordat je zelf scrolde (`gescrold`). Daarna heb je een bericht gezien als:
// - het tijdens het scrollen in beeld was (`zag`) en nu helemaal boven de rand ligt (voorbij gescrold);
// - je tijdens het scrollen zowel de boven- als de onderkant in beeld had (er helemaal doorheen, ook een
//   bericht dat hoger is dan het scherm, of het bovenste als je onderaan stilstaat);
// - het al GEZIEN_MS helemaal in beeld staat (`sinds`).
// Puur, voor de toetsen.
// rijen: [{ id, top, bottom }] ten opzichte van het scrollvlak; boven/onder: de zichtbare rand.
export function beoordeel(rijen, { boven, onder, now, gescrold, staat }) {
  const nieuw = []
  for (const r of rijen) {
    if (staat.gezien.has(r.id)) continue
    const zichtbaar = r.bottom > boven && r.top < onder
    const helemaal = r.top >= boven - 1 && r.bottom <= onder + 1
    if (zichtbaar && gescrold) staat.zag.add(r.id)
    if (gescrold && r.top >= boven - 1 && r.top <= onder) staat.kop.add(r.id)
    if (gescrold && r.bottom >= boven && r.bottom <= onder + 1) staat.voet.add(r.id)
    if (helemaal) {
      if (!staat.sinds.has(r.id)) staat.sinds.set(r.id, now)
    } else staat.sinds.delete(r.id)
    const voorbij = gescrold && r.bottom <= boven && staat.zag.has(r.id)
    const lang = gescrold && staat.sinds.has(r.id) && now - staat.sinds.get(r.id) >= GEZIEN_MS
    const door = staat.kop.has(r.id) && staat.voet.has(r.id)
    if (voorbij || door || lang) {
      staat.gezien.add(r.id)
      nieuw.push(r.id)
    }
  }
  return nieuw
}

export const nieuweStaat = () => ({ zag: new Set(), kop: new Set(), voet: new Set(), sinds: new Map(), gezien: new Set() })

// Zelf scrollen: een scroll kort na wiel, aanraking, toets of muis. Herstel van de leespositie of een tab
// die bovenaan begint, scrolt zonder dat jij iets doet en telt dus niet.
const ZELF = ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown']
const ZELF_MS = 1200

// Volgt het scrollvlak van de Stroom. `rijen()` geeft de berichten ([data-id]) die meetellen, `opGezien`
// krijgt de ids die net gezien zijn. Geeft een opruimfunctie terug.
export function volgGezien(scroller, { opGezien, kop = () => 0, rijen }) {
  if (!scroller) return () => {}
  const staat = nieuweStaat()
  let zelfTot = 0
  let gescrold = false
  let frame = 0
  let klok = 0
  const meet = () => {
    frame = 0
    if (typeof document !== 'undefined' && document.hidden) return staat.sinds.clear() // niet in beeld: telt niet
    const box = scroller.getBoundingClientRect()
    if (!box.height) return
    const boven = box.top + kop()
    const lijst = rijen().map((el) => {
      const r = el.getBoundingClientRect()
      return { id: el.dataset.id, top: r.top, bottom: r.bottom }
    })
    const nieuw = beoordeel(lijst, { boven, onder: box.bottom, now: Date.now(), gescrold, staat })
    if (nieuw.length) opGezien(nieuw)
  }
  const plan = () => {
    if (!frame) frame = requestAnimationFrame(meet)
  }
  const zelf = () => {
    zelfTot = Date.now() + ZELF_MS
  }
  const aan = () => {
    if (gescrold) return
    gescrold = true
    plan()
  }
  // Een korte lijst die niet verder kan: wie daar toch scrolt (wiel, vegen, toets), leest ook.
  const probeer = (e) => {
    zelf()
    if (e.type === 'pointerdown' || e.type === 'touchstart') return
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 2) aan()
  }
  const onScroll = () => {
    if (Date.now() <= zelfTot) aan()
    if (gescrold) plan()
  }
  for (const t of ZELF) scroller.addEventListener(t, probeer, { passive: true })
  scroller.addEventListener('scroll', onScroll, { passive: true })
  klok = setInterval(plan, 500) // ook stilstaand kijken telt: hoe lang een bericht helemaal in beeld staat
  plan()
  return () => {
    for (const t of ZELF) scroller.removeEventListener(t, probeer)
    scroller.removeEventListener('scroll', onScroll)
    if (frame) cancelAnimationFrame(frame)
    clearInterval(klok)
  }
}
