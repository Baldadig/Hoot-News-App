import { useEffect, useMemo, useRef, useState } from 'react'
import { composePersonal, personalRows, editionBasis } from '../lib/personal.js'
import { previousOf } from '../../netlify/lib/stories.mjs'
import { readJSON, writeJSON } from '../lib/store.js'

const KEY = 'hoot:my-edition'

// Jouw editie van dit dagdeel (zie src/lib/personal.js). Volgorde van waarheid:
// 1. al vastgelegd op dit toestel, voor dit dagdeel, deze lezer en deze bronnen en interesses;
// 2. als lid: al vastgelegd in je account (een ander toestel was eerder) — dan die, als hij uit
//    dezelfde bronnen en interesses komt;
// 3. anders nu samenstellen, en vastleggen (op het toestel en, als lid, in je account).
// Veranderen je bronnen of interesses (of laadt je account ze pas net), dan stellen we opnieuw samen.
// Leden krijgen er een eigen "editie in één minuut" bij (POST /api/brief). Zonder account geen
// samenvatting: die van de algemene editie hoort niet bij jouw verhalen.
export function usePersonalEdition({ data, status, prefs, muted, account, affinity = null }) {
  const global = data?.edition || null
  const uid = account.status === 'in' ? account.user.id : null
  const owner = uid || 'anon'
  const ready = status === 'ready' && !!global && (data?.items?.length || 0) > 0
  const followed = useMemo(() => (data?.sources || []).filter((s) => s.kind !== 'sociaal' && !muted.has(s.id)).map((s) => s.id), [data?.sources, muted])
  const basis = editionBasis(followed, prefs.interests || [], prefs.topics || [], prefs.favorites || [])
  // Zonder bronnenlijst (nog aan het laden) kunnen we de afdruk niet controleren: dan niet weigeren.
  const fits = (e) => !!e && e.id === global?.id && e.owner === owner && (!followed.length || e.basis === basis)
  const [edition, setEdition] = useState(() => {
    const e = readJSON(KEY, null)
    return fits(e) ? e : null
  })
  const pending = useRef('')

  const keep = (e) => {
    setEdition(e)
    writeJSON(KEY, e)
  }

  // Vastleggen of ophalen, één keer per dagdeel per lezer.
  useEffect(() => {
    if (!global || !ready) return
    const current = readJSON(KEY, null)
    if (fits(current)) {
      if (current !== edition) setEdition(current)
      return
    }
    const task = `${global.id}|${owner}|${basis}`
    if (pending.current === task) return
    pending.current = task
    ;(async () => {
      if (uid && account.client) {
        // Een ander toestel was eerder: dan die editie (kolom ontbreekt nog? dan stilletjes verder).
        const { data: row } = await account.client.from('user_state').select('edition').eq('user_id', uid).maybeSingle().then((r) => r, () => ({}))
        const theirs = row?.edition
        if (theirs && theirs.id === global.id && theirs.basis === basis) return keep({ ...theirs, owner })
      }
      // De editie van het vorige dagdeel (nog op dit toestel): wat daarin stond, komt alleen terug
      // als het zich ontwikkelde.
      const previous = current && current.id !== global.id && current.owner === owner ? previousOf(current) : null
      const mine = composePersonal({ global, stories: data.stories, items: data.items, sources: data.sources, followed: new Set(followed), interests: prefs.interests || [], topics: prefs.topics || [], previous, affinity, favorites: prefs.favorites || [] })
      if (!mine) return
      const stamped = { ...mine, owner, basis }
      keep(stamped)
      if (uid && account.client) await account.client.from('user_state').update({ edition: stamped }).eq('user_id', uid).then(() => {}, () => {})
    })().finally(() => {
      if (pending.current === task) pending.current = ''
    })
  }, [global?.id, ready, owner, basis]) // eslint-disable-line react-hooks/exhaustive-deps

  // Leden: een eigen samenvatting, één keer per editie (de server bewaakt het maximum).
  const asked = useRef('')
  useEffect(() => {
    if (!edition || edition.brief || !uid || !account.client || !prefs.brief) return
    if (asked.current === edition.version) return
    asked.current = edition.version
    ;(async () => {
      const { data: s } = await account.client.auth.getSession()
      const token = s?.session?.access_token
      if (!token) return
      const res = await fetch('/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ rows: personalRows(edition) }) }).catch(() => null)
      if (!res?.ok) return
      const { brief } = await res.json()
      const current = readJSON(KEY, null)
      if (!brief || current?.version !== edition.version) return
      const next = { ...current, brief }
      keep(next)
      await account.client.from('user_state').update({ edition: next }).eq('user_id', uid).then(() => {}, () => {})
    })()
  }, [edition?.version, edition?.brief, uid, prefs.brief]) // eslint-disable-line react-hooks/exhaustive-deps

  // Uitloggen of een andere lezer: niet de editie van een ander tonen.
  const shown = edition && edition.owner === owner && edition.id === global?.id ? edition : null
  return { edition: shown, member: !!uid }
}
