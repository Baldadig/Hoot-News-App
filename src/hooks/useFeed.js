import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCore, fetchPart, fetchRelated } from '../lib/api.js'
import { takeFeedCache, saveFeedCache } from '../lib/feedCache.js'
import { carryOver } from '../lib/sourceStatus.js'
import { freshCount } from '../lib/fresh.js'
import { mutedSet } from '../lib/sourcesel.js'
import { eachLimited } from '../lib/pool.js'

const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')

// Eén vaste vorm, ook als de server (of een oude cache) een veld mist.
function normalize(d) {
  if (!d || typeof d !== 'object') return null
  return {
    sources: Array.isArray(d.sources) ? d.sources : [],
    items: Array.isArray(d.items) ? d.items : [],
    related: Array.isArray(d.related) ? d.related : [],
    relatedTag: d.relatedTag || null, // welke versie van de vergelijkingsdata we hebben
    stories: Array.isArray(d.stories) ? d.stories : [],
    edition: d.edition && Array.isArray(d.edition.entries) ? d.edition : null,
    meta: d.meta || null,
  }
}

// Welke bronnen deze lezer volgt: wat aan staat; Bluesky alleen als die bestemming aan staat.
export function wantedSources(sources, prefs) {
  const off = mutedSet(prefs, sources)
  return sources.filter((s) => !off.has(s.id) && (s.kind !== 'sociaal' || prefs.bluesky)).map((s) => s.id)
}

// De feed: eerst de kern, dan per gevolgde bron de berichten (alleen wat veranderde).
// Wat je de vorige keer had staat meteen in beeld; nieuwe berichten wachten bij het
// automatisch verversen achter een knop, zodat de inhoud niet verspringt terwijl je leest.
export function useFeed(prefs) {
  const [data, setData] = useState(() => normalize(takeFeedCache()))
  const [status, setStatus] = useState(() => (data ? 'ready' : 'loading')) // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const ctrl = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const pending = useRef(null)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const parts = useRef(new Map()) // bron → { version, items }

  const apply = useCallback((next) => {
    setData(next)
    saveFeedCache(next)
  }, [])

  // De berichten van de gevolgde bronnen; een deel dat niet veranderde halen we niet opnieuw.
  const gather = useCallback(async (core, signal) => {
    const versions = core.meta?.parts || {}
    const want = wantedSources(core.sources, prefsRef.current).filter((id) => versions[id])
    const stale = want.filter((id) => parts.current.get(id)?.version !== versions[id])
    await eachLimited(stale, 6, async (id) => {
      try {
        parts.current.set(id, { version: versions[id], items: await fetchPart(id, versions[id], { signal }) })
      } catch (e) {
        if (e.name === 'AbortError') throw e // een enkele bron die niet lukt houdt de rest niet op
      }
    })
    return want.flatMap((id) => parts.current.get(id)?.items || []).sort(byRecency)
  }, [])

  // Alle publicaties per verhaal: pas als je vergelijkt of in alle bronnen zoekt (App roept dit
  // aan). Daarna houden we ze bij: bij een nieuwe versie halen we ze opnieuw.
  const wantRelated = useRef(false)
  const loadRelated = useCallback(async () => {
    wantRelated.current = true
    const tag = dataRef.current?.meta?.related
    if (!tag || dataRef.current?.relatedTag === tag) return
    try {
      const related = await fetchRelated(tag)
      if (dataRef.current?.meta?.related !== tag) return // intussen een nieuwere kern
      apply({ ...dataRef.current, related, relatedTag: tag })
    } catch {
      /* geen vergelijking nu; de volgende keer opnieuw */
    }
  }, [apply])

  const load = useCallback(
    async ({ defer } = {}) => {
      ctrl.current?.abort()
      const controller = new AbortController()
      ctrl.current = controller
      const had = !!dataRef.current
      if (had) setRefreshing(true)
      else setStatus('loading')
      try {
        const core = normalize(await fetchCore({ signal: controller.signal }))
        if (!core) throw new Error('Onverwacht antwoord')
        // De vergelijkingsdata zit niet in de kern: houd wat we hadden (zie loadRelated).
        const fetched = { ...core, items: await gather(core, controller.signal), related: dataRef.current?.related || [], relatedTag: dataRef.current?.relatedTag || null }
        // Valt een bron uit, dan blijven de berichten staan die we er al van hadden.
        const next = carryOver(dataRef.current, fetched)
        setRefreshError(false)
        const off = mutedSet(prefsRef.current, next.sources)
        const fresh = defer && had ? freshCount(dataRef.current.items, next.items, off) : 0
        if (fresh) {
          pending.current = next
          setPendingCount(fresh)
          saveFeedCache(next)
        } else if (defer && had) {
          // Niets nieuws in de Stroom: alleen de rest bijwerken (bronnen, editie, verhalen).
          apply({ ...next, items: dataRef.current.items })
        } else {
          pending.current = null
          setPendingCount(0)
          apply(next)
        }
        setStatus('ready')
        if (wantRelated.current) loadRelated()
      } catch (e) {
        if (e.name === 'AbortError') return
        if (!dataRef.current) setStatus('error')
        else setRefreshError(true)
      } finally {
        // Afgebroken door een nieuwere ronde: die is nog bezig, de draaier blijft staan.
        if (ctrl.current === controller) setRefreshing(false)
      }
    },
    [apply, gather, loadRelated]
  )

  // Zet je een bron aan of uit, dan meteen de berichten erbij halen of weglaten.
  const wantKey = data ? wantedSources(data.sources, prefs).join(',') : ''
  const firstKey = useRef(wantKey)
  useEffect(() => {
    if (!dataRef.current || wantKey === firstKey.current) return
    firstKey.current = wantKey
    const controller = new AbortController()
    gather(dataRef.current, controller.signal)
      .then((items) => apply({ ...dataRef.current, items }))
      .catch(() => {})
    return () => controller.abort()
  }, [wantKey, gather, apply])

  const applyPending = useCallback(() => {
    if (pending.current) {
      apply(pending.current)
      pending.current = null
    }
    setPendingCount(0)
  }, [apply])

  const reload = useCallback(() => load({ defer: false }), [load])

  useEffect(() => {
    load({ defer: false })
    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ defer: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ defer: true })
    }, 15 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
      ctrl.current?.abort()
    }
  }, [load])

  return { data, status, refreshing, refreshError, reload, pendingCount, applyPending, loadRelated }
}
