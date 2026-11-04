// Uitkomst van een verversing van de Selectie. Een mislukte verversing met een opgeslagen Selectie
// laat die gewoon staan (status 'ready'), maar is wel mislukt: refreshFailed. Dat houdt het
// trekgebaar eerlijk (fout-afloop, "Verversen lukte niet") zonder de Selectie weg te halen.
export function settleVak(prevStatus, ok, hasStored) {
  if (ok) return { status: 'ready', refreshFailed: false }
  return { status: prevStatus === 'refreshing' || hasStored ? 'ready' : 'error', refreshFailed: true }
}
