import { useEffect, useState } from 'react'
import { readJSON, writeJSON } from '../lib/store.js'
import { selectionKey, cleanClosed } from '../lib/selection-fold.js'

// Lokaal per lezer, zonder prefs/account-sync. Bij eigenaarwisseling nooit de vorige set schrijven.
export function useSelectionFold(owner, chosen, ready = true) {
  const key = selectionKey(owner)
  const read = () => cleanClosed(readJSON(key, []), chosen)
  const [state, setState] = useState(() => ({ key, closed: read() }))
  const closed = state.key === key ? cleanClosed(state.closed, chosen) : read()
  useEffect(() => {
    const next = read()
    setState({ key, closed: next })
    if (ready) writeJSON(key, next)
  }, [key, chosen.join('|'), ready]) // eslint-disable-line react-hooks/exhaustive-deps
  const setClosed = value => {
    if (!ready) return
    const next = cleanClosed(value, chosen)
    setState({ key, closed: next })
    writeJSON(key, next)
  }
  return [closed, setClosed]
}
