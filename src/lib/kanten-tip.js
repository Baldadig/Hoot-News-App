// De eenmalige tip "Meer kanten van één verhaal" (keuze r5-kanten-welkom, 5 november; review G4, D20).
// Het eerste verhaal van de Editie dat meer dan één bron heeft; null als de tip al gezien is of er geen is.
export function kantenTip({ rows = [], done = false }) {
  if (done) return null
  const r = rows.find((x) => x.story && x.story.sourceCount > 1)
  return r ? { story: r.story, item: r.item, n: r.story.sourceCount } : null
}
