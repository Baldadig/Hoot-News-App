import { useEffect, useRef, useState } from 'react'
import { composePersonal, personalRows } from '../lib/personal.js'
import { readJSON, writeJSON } from '../lib/store.js'

const KEY = 'hoot:my-edition'

// Jouw editie van dit dagdeel (zie src/lib/personal.js). Volgorde van waarheid:
// 1. al vastgelegd op dit toestel, voor dit dagdeel en voor deze lezer;
// 2. als lid: al vastgelegd in je account (een ander toestel was eerder) — dan die;
// 3. anders nu samenstellen, en vastleggen (op het toestel en, als lid, in je account).
// Leden krijgen er een eigen "editie in één minuut" bij (POST /api/brief). Zonder account geen
// samenvatting: die van de algemene editie hoort niet bij jouw verhalen.
export function usePersonalEdition({ data, status, prefs, muted, account }) {
  const global = data?.edition || null
  const uid = account.status === 'in' ? account.user.id : null
  const owner = uid || 'anon'
  const ready = status === 'ready' && !!global && (data?.items?.length || 0) > 0
  const [edition, setEdition] = useState(() => {
    const e = readJSON(KEY, null)
    return e && e.id === global?.id && e.owner === owner ? e : null
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
    if (current && current.id === global.id && current.owner === owner) {
      if (current !== edition) setEdition(current)
      return
    }
    const task = `${global.id}|${owner}`
    if (pending.current === task) return
    pending.current = task
    ;(async () => {
      if (uid && account.client) {
        // Een ander toestel was eerder: dan die editie (kolom ontbreekt nog? dan stilletjes verder).
        const { data: row } = await account.client.from('user_state').select('edition').eq('user_id', uid).maybeSingle().then((r) => r, () => ({}))
        const theirs = row?.edition
        if (theirs && theirs.id === global.id) return keep({ ...theirs, owner })
      }
      const followed = new Set((data.sources || []).filter((s) => s.kind !== 'sociaal' && !muted.has(s.id)).map((s) => s.id))
      const mine = composePersonal({ global, stories: data.stories, items: data.items, sources: data.sources, followed, interests: prefs.interests || [], topics: prefs.topics || [] })
      if (!mine) return
      const stamped = { ...mine, owner }
      keep(stamped)
      if (uid && account.client) await account.client.from('user_state').update({ edition: stamped }).eq('user_id', uid).then(() => {}, () => {})
    })().finally(() => {
      if (pending.current === task) pending.current = ''
    })
  }, [global?.id, ready, owner]) // eslint-disable-line react-hooks/exhaustive-deps

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
