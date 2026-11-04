import { useEffect, useMemo, useRef, useState } from 'react'
import { composePersonal, personalRows, editionBasis } from '../lib/personal.js'
import { editionReady, fitsEdition, settleEdition, writeBrief } from '../lib/editionSync.js'
import { readJSON, writeJSON } from '../lib/store.js'
import { syncedUid, BRIEF_FULL_TEXT } from '../lib/membership.js'

const KEY = 'hoot:my-edition'

// Jouw editie van dit dagdeel (zie src/lib/personal.js). Volgorde van waarheid (src/lib/editionSync.js):
// 1. al vastgelegd op dit toestel, voor dit dagdeel, deze lezer en deze bronnen en interesses;
// 2. als lid: al vastgelegd in je account (een ander toestel was eerder) — dan die, als hij uit
//    dezelfde bronnen en interesses komt;
// 3. anders nu samenstellen, en vastleggen (op het toestel en, als lid, in je account: de eerste
//    schrijver wint; verliest dit toestel, dan neemt het de Editie van het andere toestel over).
// Veranderen je bronnen of interesses (of laadt je account ze pas net), dan stellen we opnieuw samen.
// Als lid stellen we pas samen als je account één keer is opgehaald (`sync.pulled`, P8-2): anders rekent
// een vers toestel met de standaardinstellingen. Lukt dat ophalen niet (offline), dan toch, maar dan
// alleen op dit toestel; zonder account altijd alleen op dit toestel.
// Samenstellen gebeurt op de start van het dagdeel (global.builtAt), niet op de klok: zo maakt elk
// toestel met dezelfde invoer dezelfde Editie. Wat je las (`readIds`) komt niet terug, tenzij er
// genoeg nieuws bij kwam. Je leesprofiel (`affinity`) blijft op het toestel; alleen de Editie met
// het waarom per plek gaat naar je account.
// Wat in je vorige Edities stond komt alleen terug als het zich ontwikkelde (bouwspec-aanvulling H3,
// H5): `previous` is de vereniging van de laatste drie vastgelegde Edities, van dit toestel én uit je
// account. Daarvoor draagt elke vastgelegde Editie haar `history` (de samenvattingen van de drie
// Edities ervóór, historyOf) mee in `user_state.edition`; ook een overgenomen Editie van het andere
// toestel wordt hier met die history vastgelegd, zodat beide toestellen hetzelfde `previous` hebben
// voor het volgende dagdeel.
// Leden krijgen er een eigen "editie in één minuut" bij (POST /api/brief). Zonder account geen
// samenvatting: die van de algemene editie hoort niet bij jouw verhalen.
export function usePersonalEdition({ data, status, prefs, muted, account, affinity = null, readIds = null, sync = null }) {
  const global = data?.edition || null
  const uid = syncedUid(account)
  const owner = uid || 'anon'
  const pulled = !!sync?.pulled
  const ready = editionReady({ status, global, items: data?.items?.length || 0, uid, pulled, sync: sync?.status })
  const followed = useMemo(() => (data?.sources || []).filter((s) => s.kind !== 'sociaal' && !muted.has(s.id)).map((s) => s.id), [data?.sources, muted])
  const basis = editionBasis(followed, prefs.interests || [], prefs.topics || [], prefs.favorites || [])
  // Zonder bronnenlijst (nog aan het laden) kunnen we de afdruk niet controleren: dan niet weigeren.
  const fits = (e) => fitsEdition(e, { id: global?.id, basis: followed.length ? basis : null }) && e.owner === owner
  const [edition, setEdition] = useState(() => {
    const e = readJSON(KEY, null)
    return fits(e) ? e : null
  })
  const pending = useRef('')
  const settled = useRef('') // de taak (dagdeel, lezer, afdruk) die met je account is afgestemd

  const keep = (e) => {
    setEdition(e)
    writeJSON(KEY, e)
  }

  // Vastleggen of ophalen, één keer per dagdeel per lezer.
  useEffect(() => {
    if (!global || !ready) return
    const current = readJSON(KEY, null)
    const task = `${global.id}|${owner}|${basis}`
    // Al vastgelegd op dit toestel: klaar — tenzij je lid bent en deze Editie nog niet met je account is
    // afgestemd (na een herstart, of omdat het ophalen pas nu lukte): dan alsnog, zonder opnieuw te rekenen.
    if (fits(current) && (!uid || !pulled || settled.current === task)) {
      if (current !== edition) setEdition(current)
      return
    }
    if (pending.current === task) return
    pending.current = task
    settleEdition({
      client: account.client,
      uid,
      owner,
      global,
      basis,
      local: current,
      pulled,
      compose: ({ previous, now }) => composePersonal({ global, stories: data.stories, items: data.items, sources: data.sources, followed: new Set(followed), interests: prefs.interests || [], topics: prefs.topics || [], now, previous, affinity, favorites: prefs.favorites || [], taste: prefs.taste, readIds: readIds || new Set() }),
    })
      .then((r) => {
        if (!r) return
        keep(r.edition)
        if (r.source !== 'unsynced') settled.current = task
      })
      .catch(() => {}) // lukt het nu niet, dan de volgende keer (geen onafgehandelde fout)
      .finally(() => {
        if (pending.current === task) pending.current = ''
      })
  }, [global?.id, ready, owner, basis, pulled]) // eslint-disable-line react-hooks/exhaustive-deps

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
      keep(next)
      // Alleen bij de Editie die in je account staat (zelfde dagdeel en afdruk), en pas na het ophalen.
      if (pulled) await writeBrief(account.client, uid, next)
    })().catch(() => {}) // geen sessie of geen JSON: dan zonder samenvatting
  }, [edition?.version, edition?.basis, edition?.brief, uid, prefs.brief, pulled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Uitloggen of een andere lezer: niet de editie van een ander tonen.
  const shown = edition && edition.owner === owner && edition.id === global?.id ? edition : null
  const briefNote = shown && !shown.brief && briefFull === `${shown.version}|${shown.basis}` ? BRIEF_FULL_TEXT : null
  return { edition: shown, member: !!uid, briefNote }
}
