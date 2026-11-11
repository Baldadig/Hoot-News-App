import { useEffect, useMemo, useRef, useState } from 'react'
import { composePersonal, personalRows, editionBasis } from '../lib/personal.js'
import { fitsEdition, writeBrief, provisionalReady, serverRequest, askServer, serverFirst, earlierForServer, SERVER_KEY, PROVISIONAL_KEY } from '../lib/editionSync.js'
import { readJSON, writeJSON } from '../lib/store.js'
import { syncedUid, BRIEF_FULL_TEXT } from '../lib/membership.js'

const KEY = 'hoot:my-edition'

// Jouw Editie van dit dagdeel komt van de server (De Redacteur op de server, besluit Alex 9 november 2026;
// src/lib/editionSync.js serverFirst, Hoot-design/redacteur-server/PLAN.md):
// 1. ligt hier al een Editie van de server voor dit dagdeel, deze lezer en deze bronnen en interesses: die;
// 2. anders POST /api/edition (v2): de server stelt samen en legt als lid zelf vast in je account (de eerste
//    schrijver wint). Wat hij teruggeeft, bewaren we letterlijk; dit toestel schrijft niets naar je account.
//    Als lid pas na het ophalen van je account (`sync.pulled`): anders vraagt een vers toestel met de
//    standaardinstellingen, en zet de server een Editie met de verkeerde afdruk in je account;
// 3. geen antwoord (offline, een fout, 429) en de berichten zijn er: zelf samenstellen als vangnet, voorlopig.
//    Die gaat nooit naar je account en nooit in je geschiedenis; zodra de server antwoordt (weer online,
//    terug in de app, een volgende feedronde) vervangt zijn Editie het vangnet;
// 4. komen ook de berichten niet (`stuck`): de algemene Editie.
// Je leesprofiel (`affinity`) blijft op dit toestel en doet niet mee: web en iPhone hebben elk een eigen
// leesprofiel, en zo geven ze dezelfde Editie. Het vangnet rekent ook zonder, zodat het lijkt op wat komt.
// Leden krijgen er een eigen "editie in één minuut" bij (POST /api/brief). Zonder account geen
// samenvatting: die van de algemene editie hoort niet bij jouw verhalen.
export function usePersonalEdition({ data, status, prefs, muted, account, readIds = null, sync = null, stuck = false }) {
  const global = data?.edition || null
  const uid = syncedUid(account)
  const owner = uid || 'anon'
  const pulled = !!sync?.pulled
  const followed = useMemo(() => (data?.sources || []).filter((s) => s.kind !== 'sociaal' && !muted.has(s.id)).map((s) => s.id), [data?.sources, muted])
  // Het vangnet mag rekenen als de berichten bij de kern op dit toestel en je bronnen van nu horen (itemsCurrent).
  const ready = provisionalReady({ status, global, items: data?.items?.length || 0, itemsFor: data?.itemsFor, followed })
  const basis = editionBasis(followed, prefs.interests || [], prefs.topics || [], prefs.favorites || [])
  const task = `${global?.id}|${owner}|${basis}`
  // Zonder bronnenlijst (nog aan het laden) kunnen we de afdruk niet controleren: dan niet weigeren.
  const fits = (e) => fitsEdition(e, { id: global?.id, basis: followed.length ? basis : null }) && e.owner === owner
  const fromServer = () => readJSON(SERVER_KEY, '') === task
  const [edition, setEdition] = useState(() => {
    const e = readJSON(KEY, null)
    return fits(e) && fromServer() ? e : null
  })
  const [provisional, setProvisional] = useState(() => {
    const e = readJSON(PROVISIONAL_KEY, null)
    return fits(e) ? e : null
  })
  // Opnieuw vragen bij weer online en terug in de app, zolang er geen Editie van de server is.
  const [nonce, setNonce] = useState(0)
  const pending = useRef('')

  const keep = (e, t = task) => {
    setEdition(e)
    writeJSON(KEY, e)
    writeJSON(SERVER_KEY, t)
    setProvisional(null)
    writeJSON(PROVISIONAL_KEY, null)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const again = () => setNonce((n) => n + 1)
    const visible = () => document.visibilityState === 'visible' && again()
    window.addEventListener('online', again)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('online', again)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  useEffect(() => {
    if (!global || !followed.length) return
    const local = readJSON(KEY, null)
    const localFromServer = fromServer()
    if (fits(local) && localFromServer) {
      if (local !== edition) setEdition(local)
      return
    }
    const run = `${task}|${pulled}|${ready}|${stuck}|${nonce}`
    if (pending.current === run) return
    pending.current = run
    const online = typeof navigator === 'undefined' || navigator.onLine !== false
    const request = serverRequest({
      followed,
      interests: prefs.interests || [],
      topics: prefs.topics || [],
      favorites: prefs.favorites || [],
      taste: prefs.taste || null,
      readIds: [...(readIds || [])],
      earlier: uid ? [] : earlierForServer(localFromServer ? local : null, { id: global.id, owner }),
    })
    const ask = async (body) => {
      let token = null
      if (uid && account.client) {
        const { data: s } = await account.client.auth.getSession()
        token = s?.session?.access_token || null
        if (!token) return { status: 0, edition: null }
      }
      const refresh = uid && account.client ? async () => (await account.client.auth.refreshSession())?.data?.session?.access_token || null : null
      return askServer(body, { token, refresh })
    }
    serverFirst({
      global,
      owner,
      basis,
      local,
      localFromServer,
      online,
      mayAsk: !uid || pulled,
      ask,
      request,
      ready,
      stuck,
      compose: ({ previous, now }) => composePersonal({ global, stories: data.stories, items: data.items, sources: data.sources, followed: new Set(followed), interests: prefs.interests || [], topics: prefs.topics || [], now, previous, affinity: null, favorites: prefs.favorites || [], taste: prefs.taste, readIds: readIds || new Set() }),
    })
      .then((r) => {
        if (!r || pending.current !== run) return
        // Een Editie van een later dagdeel (de kern hier loopt achter): bewaren, tonen zodra de kern bij is.
        if (r.ahead) {
          writeJSON(KEY, r.ahead)
          writeJSON(SERVER_KEY, `${r.ahead.id}|${owner}|${r.ahead.basis}`)
        }
        if (r.keep) return keep(r.edition)
        if (r.edition) {
          setProvisional(r.edition)
          if (r.source === 'provisional') writeJSON(PROVISIONAL_KEY, r.edition)
        }
      })
      .catch(() => {}) // lukt het nu niet, dan de volgende keer (geen onafgehandelde fout)
  }, [global?.id, owner, basis, pulled, ready, stuck, nonce, followed.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Leden: een eigen samenvatting, één keer per editie (de server bewaakt het maximum).
  const asked = useRef('')
  // Op (429): de melding hoort bij deze Editie; een volgende Editie vraagt opnieuw.
  const [briefFull, setBriefFull] = useState('')
  useEffect(() => {
    if (!edition || edition.brief || !uid || !account.client || !prefs.brief) return
    // De versie volgt het dagdeel; na opnieuw samenstellen (andere bronnen) is alleen de afdruk anders.
    const key = `${edition.version}|${edition.basis}`
    if (asked.current === key) return
    asked.current = key
    ;(async () => {
      const { data: s } = await account.client.auth.getSession()
      const token = s?.session?.access_token
      if (!token) return
      const res = await fetch('/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ rows: personalRows(edition) }) }).catch(() => null)
      if (res?.status === 429) setBriefFull(key)
      if (!res?.ok) return
      const { brief } = await res.json()
      const current = readJSON(KEY, null)
      if (!brief || current?.version !== edition.version || current?.basis !== edition.basis) return
      const next = { ...current, brief } // met de history van de vastgelegde Editie
      keep(next, readJSON(SERVER_KEY, task))
      // Alleen bij de Editie die in je account staat (zelfde dagdeel en afdruk), en pas na het ophalen.
      if (pulled) await writeBrief(account.client, uid, next)
    })().catch(() => {}) // geen sessie of geen JSON: dan zonder samenvatting
  }, [edition?.version, edition?.basis, edition?.brief, uid, prefs.brief, pulled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Uitloggen of een andere lezer: niet de editie van een ander tonen.
  const mine = (e) => e && e.owner === owner && e.id === global?.id
  const shown = mine(edition) ? edition : mine(provisional) ? provisional : null
  const briefNote = shown && !shown.brief && briefFull === `${shown.version}|${shown.basis}` ? BRIEF_FULL_TEXT : null
  return { edition: shown, member: !!uid, briefNote }
}
