// Je profiel na het inloggen — los van React, zodat het te testen is (tests/membership.test.mjs).
// Normaal maakt de database het profiel zelf aan bij je eerste inlog (trigger, zie
// supabase/migrations/20261104_open_accounts.sql). Ontbreekt het toch, dan één keer het vangnet
// rpc('join') en opnieuw lezen. Lukt ook dat niet (of is er geen verbinding), dan null.
export async function resolveProfile(client, user) {
  const read = async () => {
    const { data, error } = await client.from('profiles').select('is_admin, created_at').eq('id', user.id).maybeSingle()
    return error ? null : data || null
  }
  try {
    const profile = await read()
    if (profile) return profile
    const { error } = await client.rpc('join')
    return error ? null : await read()
  } catch {
    return null
  }
}

// Ingelogd, maar (nog) zonder profiel: dan synchroniseert er niets en zegt Instellingen dat het
// account er bijna is.
export const accountPending = (account) => account?.status === 'in' && !account.profile

// Het account dat synchroniseert en een eigen Editie krijgt: ingelogd én met profiel.
export const syncedUid = (account) => (account?.status === 'in' && account.profile ? account.user?.id || null : null)

export const PENDING_TEXT = 'Je account is er bijna. Probeer het zo nog eens.'

// Het plafond van /api/brief is bereikt (429): rustig zeggen in plaats van de samenvatting stil weg te laten.
export const BRIEF_FULL_TEXT = 'Vandaag zijn de samenvattingen op. Morgen maakt Hoot er weer een.'

// Instellingen: ingelogd zonder profiel én offline is meestal gewoon geen verbinding, geen half account.
// Dan de bestaande offline-toestand ("Wacht op verbinding") en geen knop Opnieuw.
export const pendingShown = (account, online = true) => accountPending(account) && online
