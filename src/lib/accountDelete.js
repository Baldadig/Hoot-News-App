// Account verwijderen op het web, op dezelfde manier als de app (ios/Hoot/Account.swift,
// deleteAccount). Los van React, zodat het te testen is (tests/account-verwijderen.test.mjs).
//
// Alles op de server weg (profiel, instellingen, Bewaard) via rpc('delete_my_account'). Zit er een
// Apple-account aan dit account, dan eerst Hoot uit je Apple ID halen (Apple eist dat,
// richtlijn 5.1.1(v)): met een verse code van Apple trekt /api/apple-revoke de toegang in.
// - Zelf geannuleerd: niets gewist, "Je account blijft bestaan."
// - Apple of de server faalt: niets gewist; `appleFailed` en de pagina vraagt Opnieuw, Annuleer of
//   Toch verwijderen. Na het wissen weet niemand meer welk Apple-account het was, dus nooit stil.
// - `skipApple` (Toch verwijderen): wissen zonder intrekken, en zeggen wat je zelf nog doet.

export const DELETE_TEXT = {
  title: 'Je account verwijderen?',
  // De app zegt "ook op de website" en "Wat op deze iPhone staat, blijft". Op het web gaat wat bij
  // je account hoort van dit toestel af (net als bij Uitloggen), dus die zin past hier niet.
  message: 'Je account en Bewaard verdwijnen, ook in de app. Dit kun je niet ongedaan maken.',
  cancel: 'Annuleer',
  confirm: 'Verwijder',
  appleTitle: 'Hoot uit je Apple ID halen lukte niet',
  appleMessage: 'Je account bestaat nog. Probeer het opnieuw, of verwijder het toch.',
  appleRetry: 'Opnieuw',
  appleSkip: 'Toch verwijderen',
  stays: 'Je account blijft bestaan.',
  failed: 'Verwijderen is niet gelukt. Probeer het opnieuw.',
  skippedNote: 'Je account is verwijderd. Haal Hoot nog weg in Instellingen › je naam › Inloggen en beveiliging › Inloggen met Apple.',
}

// Hangt er een Apple-account aan? Supabase weet het (ook als je Apple later koppelde).
export function usesApple(user) {
  const providers = user?.app_metadata?.providers || []
  const identities = (user?.identities || []).map((i) => i?.provider)
  return [...providers, ...identities].includes('apple')
}

// Een verse code van Apple. Het web heeft (nog) geen Sign in with Apple: dit geeft null, en dan
// meldt de pagina eerlijk dat het intrekken niet lukte, met de keuze Opnieuw of Toch verwijderen.
// Een annulering door de gebruiker gooit { canceled: true }. Tests zetten hier een nep.
export const appleCode = async () => null

// De server (api/apple-revoke) wisselt de code in en trekt het token in. true als Apple het
// bevestigde; elke fout (ook 503: niet ingesteld) is false.
export async function revokeApple(code, token, fetchImpl = fetch) {
  if (!code || !token) return false
  try {
    const res = await fetchImpl('/api/apple-revoke', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) })
    return res.ok
  } catch {
    return false
  }
}

// Geeft { ok: true, note? } | { ok: false, appleFailed: true } | { ok: false, message }.
// Bij ok is de gebruiker op de server weg; de aanroeper logt uit en ruimt het toestel op.
export async function deleteAccount({ client, skipApple = false, reauth = appleCode, fetchImpl = fetch }) {
  try {
    let apple = false
    if (!skipApple) {
      const { data, error } = await client.auth.getUser()
      if (error) throw error
      apple = usesApple(data?.user)
    }
    if (apple) {
      let code = null
      try {
        code = await reauth()
      } catch (e) {
        if (e?.canceled) return { ok: false, message: DELETE_TEXT.stays }
      }
      const { data } = await client.auth.getSession()
      if (!(await revokeApple(code, data?.session?.access_token, fetchImpl))) return { ok: false, appleFailed: true }
    }
    const { error } = await client.rpc('delete_my_account')
    if (error) throw error
    return skipApple ? { ok: true, note: DELETE_TEXT.skippedNote } : { ok: true }
  } catch {
    return { ok: false, message: DELETE_TEXT.failed }
  }
}
