import { useCallback, useEffect, useState } from 'react'
import { supabase, hasSession, isAuthReturn, finishGoogleLogin, pendingInvite, clearInvite, signInWithGoogle, inviteLink } from '../lib/account.js'

// Wie er is ingelogd, en of die lid is.
// status: 'out' (niet ingelogd) | 'loading' | 'in' (lid) | 'noInvite' (ingelogd, maar nog geen lid)
export function useAccount() {
  const [state, setState] = useState(() => ({ status: hasSession() || isAuthReturn() ? 'loading' : 'out', user: null, profile: null, client: null }))

  // Lid? Zo niet en er ligt een uitnodiging klaar, dan die nu verzilveren.
  const resolve = useCallback(async (client, user) => {
    const profileOf = () => client.from('profiles').select('is_admin, created_at').eq('id', user.id).maybeSingle()
    let { data: profile } = await profileOf()
    const code = pendingInvite()
    if (!profile && code) {
      const { data: ok } = await client.rpc('redeem_invite', { p_code: code })
      if (ok) ({ data: profile } = await profileOf())
    }
    if (profile) clearInvite()
    setState({ status: profile ? 'in' : 'noInvite', user, profile, client })
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

  // Beheerders: een uitnodigingslink maken (30 dagen geldig).
  const createInvite = useCallback(
    async (note, maxUses = 1) => {
      const { data, error } = await state.client.rpc('create_invite', { p_note: note || null, p_max_uses: maxUses })
      if (error) throw error
      return inviteLink(data)
    },
    [state.client]
  )

  return { ...state, signIn: signInWithGoogle, signOut, createInvite, invite: pendingInvite() }
}
