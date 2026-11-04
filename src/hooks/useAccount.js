import { useCallback, useEffect, useState } from 'react'
import { supabase, hasSession, isAuthReturn, finishGoogleLogin, signInWithGoogle } from '../lib/account.js'
import { resolveProfile } from '../lib/membership.js'

// Wie er is ingelogd. Een account is er voor iedereen: wie inlogt, krijgt in de database meteen
// een profiel (supabase/migrations/20261104_open_accounts.sql).
// status: 'out' (niet ingelogd) | 'loading' | 'in' (ingelogd)
// `profile` is er normaal meteen. Ontbreekt het tóch (de database is nog niet bijgewerkt), dan
// vraagt Hoot het één keer aan via rpc('join'); lukt dat niet, dan blijft profile null en
// synchroniseert er niets tot het wel lukt (`retry` in Instellingen).
export function useAccount() {
  const [state, setState] = useState(() => ({ status: hasSession() || isAuthReturn() ? 'loading' : 'out', user: null, profile: null, client: null }))

  const resolve = useCallback(async (client, user) => {
    const profile = await resolveProfile(client, user)
    setState({ status: 'in', user, profile, client })
    return profile
  }, [])

  useEffect(() => {
    if (state.status !== 'loading') return
    let sub = null
    let alive = true
    supabase().then(async (client) => {
      const session = (await finishGoogleLogin(client)) || (await client.auth.getSession()).data.session
      if (!alive) return
      if (session) await resolve(client, session.user)
      else setState({ status: 'out', user: null, profile: null, client })
      sub = client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') setState({ status: 'out', user: null, profile: null, client })
      }).data.subscription
    })
    return () => {
      alive = false
      sub?.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    await state.client?.auth.signOut()
    setState((s) => ({ ...s, status: 'out', user: null, profile: null }))
  }, [state.client])

  // Ingelogd zonder profiel: nog eens proberen. Geeft true als het nu gelukt is.
  const retry = useCallback(async () => {
    if (!state.client || !state.user) return false
    return Boolean(await resolve(state.client, state.user))
  }, [state.client, state.user, resolve])

  return { ...state, signIn: signInWithGoogle, signOut, retry }
}
