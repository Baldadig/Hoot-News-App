// De rondes van de feed, los van React: useFeed (src/hooks/useFeed.js) is er een dunne laag omheen, en
// tests/editie-p0-dekking.test.mjs speelt er de volgordes mee na die bij het openen voorkomen.
//
// Eerst de kern, dan per gevolgde bron de berichten (src/lib/feedParts.js: alleen wat veranderde, elke
// ronde met de versies van háár kern). Wat je de vorige keer had staat meteen klaar; nieuwe berichten in de
// Stroom wachten bij het automatisch verversen achter een knop. De Editie, de verhalen en de bronnen gaan
// wel meteen door; bij een nieuw dagdeel ook de berichten.
//
// Dekking (keuring P0, 9 november): na elke ronde toetsen we of de berichten bij de kern van nu horen en
// je bronnen van nu dekken (`covers`). Zo niet — je account gaf een bron terwijl de ronde liep, een oude
// ronde was eerder klaar dan de nieuwe, een deel kwam niet binnen — dan halen we één extra ronde op voor
// de kern van nu. Dekt ook die het niet (offline, een bron die niet antwoordt), dan meldt `stuck`: Jouw
// Editie valt dan terug op wat al vastligt of op de server (src/lib/editionSync.js, fallbackEdition), en
// stelt nooit samen met berichten van een vorige kern. Eén extra ronde per kern en bronkeuze: begrensd;
// de volgende ronde (terugkomen, het kwartier, de verversknop) probeert het weer.
import { carryOver } from './sourceStatus.js'
import { freshCount, refreshPlan } from './fresh.js'
import { mutedSet } from './sourcesel.js'
import { gatherParts, wantedSources, covers, keepMissing } from './feedParts.js'
import { withoutRepeats } from '../../shared/stroom.mjs'

// Eén vaste vorm, ook als de server (of een oude cache) een veld mist.
export function normalize(d) {
  if (!d || typeof d !== 'object') return null
  return {
    sources: Array.isArray(d.sources) ? d.sources : [],
    items: Array.isArray(d.items) ? d.items : [],
    related: Array.isArray(d.related) ? d.related : [],
    relatedTag: d.relatedTag || null, // welke versie van de vergelijkingsdata we hebben
    stories: Array.isArray(d.stories) ? d.stories : [],
    edition: d.edition && Array.isArray(d.edition.entries) ? d.edition : null,
    meta: d.meta || null,
    // Bij welke kern de berichten horen: de Editie van dat dagdeel en de bronnen die toen gevraagd (en
    // binnengekomen) zijn. Een cache van vóór dit veld weet het niet: dan null, en Jouw Editie wacht op de
    // verse berichten (editionReady).
    itemsFor: d.itemsFor && typeof d.itemsFor === 'object' ? d.itemsFor : null,
  }
}

// `on`: { data, status, refreshing, refreshError, pending, stuck } — elk een functie die de nieuwe waarde krijgt.
export function createFeedRounds({ initial = null, fetchCore, fetchPart, fetchRelated, getPrefs, save = () => {}, on = {} }) {
  const emit = (k, v) => on[k]?.(v)
  let data = normalize(initial)
  let pending = null // de berichten van de Stroom die achter de knop wachten
  let pendingFor = null // waarvoor die verzameld zijn
  const parts = new Map() // bron → { version, items }
  let coreRound = 0 // telt elke kern die load toepast
  let ctrl = null
  let topCtrl = null
  let topUpKey = '' // voor welke kern en bronkeuze de extra ronde al liep
  let stuck = false
  let wantRelated = false

  const wanted = (core) => wantedSources(core?.sources || [], getPrefs())
  const gather = (core, signal) => gatherParts({ core, wanted: wanted(core), parts, fetchPart, signal })
  // In de cache staan ook de berichten die nog achter de knop wachten: bij een koude start staan ze er dan gewoon.
  const apply = (next) => {
    data = next
    emit('data', next)
    save(pending ? { ...next, items: pending, itemsFor: pendingFor } : next)
  }
  const setStuck = (v) => {
    if (stuck === v) return
    stuck = v
    emit('stuck', v)
  }
  const clearPending = () => {
    pending = null
    pendingFor = null
    emit('pending', 0)
  }

  // Dekken de berichten de kern en de bronnen van nu? Zo niet: één extra ronde, daarna `stuck`.
  async function settle() {
    const d = data
    if (!d) return
    const w = wanted(d)
    if (covers(d.itemsFor, d, w)) return setStuck(false)
    const key = `${coreRound}|${d.edition?.id || ''}|${w.join(',')}`
    if (topUpKey === key) return setStuck(true)
    topUpKey = key
    topCtrl?.abort()
    const c = new AbortController()
    topCtrl = c
    let got = null
    try {
      got = await gather(d, c.signal)
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
    // Intussen een nieuwere kern of andere berichten (load, een bron die je aanzette): die toetsen we.
    if (data.meta !== d.meta || data.edition?.id !== d.edition?.id || data.itemsFor !== d.itemsFor) return settle()
    if (got) {
      const kept = keepMissing(data, got)
      clearPending()
      apply({ ...data, items: kept.items, itemsFor: kept.itemsFor })
    }
    setStuck(!covers(data.itemsFor, data, wanted(data)))
  }

  // Alle publicaties per verhaal: pas als je vergelijkt of in alle bronnen zoekt. Daarna houden we ze bij.
  async function loadRelated() {
    wantRelated = true
    const tag = data?.meta?.related
    if (!tag || data?.relatedTag === tag) return
    try {
      const related = await fetchRelated(tag)
      if (data?.meta?.related !== tag) return // intussen een nieuwere kern
      apply({ ...data, related, relatedTag: tag })
    } catch {
      /* geen vergelijking nu; de volgende keer opnieuw */
    }
  }

  async function load({ defer } = {}) {
    ctrl?.abort()
    const controller = new AbortController()
    ctrl = controller
    const had = !!data
    if (had) emit('refreshing', true)
    else emit('status', 'loading')
    try {
      const got = await fetchCore({ signal: controller.signal })
      const fromCache = got.fromCache
      const core = normalize(got.data)
      if (!core) throw new Error('Onverwacht antwoord')
      // De vergelijkingsdata zit niet in de kern: houd wat we hadden (zie loadRelated).
      const { items, itemsFor } = await gather(core, controller.signal)
      const fetched = { ...core, items, itemsFor, related: data?.related || [], relatedTag: data?.relatedTag || null }
      // Valt een bron uit (volgens de server), dan blijven de berichten staan die we er al van hadden.
      const next = carryOver(data, fetched)
      // Data uit de cache van de service worker: tonen, maar de verversing is mislukt.
      emit('refreshError', fromCache && had)
      const off = mutedSet(getPrefs(), next.sources)
      // Hetzelfde stuk bij twee zusterkranten is één nieuw bericht (de Stroom toont het één keer).
      const fresh = defer && had ? freshCount(data.items, withoutRepeats(next.items), off) : 0
      // Een nieuw dagdeel gaat in zijn geheel door, en ook berichten die je bronnen van nu niet dekken
      // (zie refreshPlan): Jouw Editie komt uit de berichten van nu, niet uit die van uren terug.
      const covered = had && covers(data.itemsFor, next, wanted(next))
      const plan = refreshPlan({ defer, prev: had ? data : null, next, fresh, covered })
      if (plan === 'wachten') {
        // Alleen de berichten wachten; de rest (Editie, verhalen, bronnen) meteen bijwerken.
        pending = next.items
        pendingFor = next.itemsFor
        emit('pending', fresh)
        apply({ ...next, items: data.items, itemsFor: data.itemsFor })
      } else if (plan === 'rest') {
        // Niets nieuws in de Stroom: alleen de rest bijwerken. Wat nog achter de knop wachtte is achterhaald.
        clearPending()
        apply({ ...next, items: data.items, itemsFor: data.itemsFor })
      } else {
        clearPending()
        apply(next)
      }
      coreRound += 1
      emit('status', 'ready')
      if (wantRelated) loadRelated()
    } catch (e) {
      if (e?.name === 'AbortError') return
      if (!data) emit('status', 'error')
      else emit('refreshError', true)
    } finally {
      // Afgebroken door een nieuwere ronde: die is nog bezig, de draaier blijft staan.
      if (ctrl === controller) emit('refreshing', false)
    }
    // Ook als de kern niet binnenkwam (offline): dekt wat er staat de bronnen van nu niet, dan één keer
    // de delen opnieuw, en anders `stuck`.
    if (ctrl === controller) await settle()
  }

  // Je zette een bron aan of uit, of je account gaf andere bronnen: de berichten erbij halen. Kwam er
  // intussen een nieuwe kern (load), dan horen deze berichten bij de vorige: niet onder de nieuwe zetten,
  // maar opnieuw verzamelen bij de kern van nu. Geeft een functie die de ronde afbreekt (met `.done`).
  function wantChanged() {
    const controller = new AbortController()
    const done = (async () => {
      if (!data) return
      let got = null
      for (let tries = 0; tries < 3 && !got; tries++) {
        const seen = coreRound
        got = await gather(data, controller.signal)
        if (coreRound !== seen) got = null
      }
      if (got) {
        // Deze berichten zijn de nieuwste, met de bron die je net aanzette: wat nog achter de knop wachtte
        // is daarmee achterhaald (anders haalde die knop de nieuwe bron weer weg).
        const kept = keepMissing(data, got)
        clearPending()
        apply({ ...data, items: kept.items, itemsFor: kept.itemsFor })
      }
      await settle()
    })().catch(() => {})
    const cancel = () => controller.abort()
    cancel.done = done
    return cancel
  }

  function applyPending() {
    if (pending) {
      const items = pending
      const itemsFor = pendingFor
      clearPending()
      apply({ ...data, items, itemsFor })
      settle()
    } else emit('pending', 0)
  }

  return {
    get data() {
      return data
    },
    get stuck() {
      return stuck
    },
    load,
    wantChanged,
    applyPending,
    loadRelated,
    abort() {
      ctrl?.abort()
      topCtrl?.abort()
    },
  }
}
