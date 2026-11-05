// De bronnen van de meetlezers in de verkiezingsnacht-toetsen (tests/midterms*.test.mjs): de basisbronnen
// plus het vaste voorstel per interesse uit het welkom van vóór 1.1.0. Het nieuwe welkom zet niets vooraf
// aan (src/lib/follow-welcome.js), dus dit voorstel leeft alleen nog hier, zodat de meting
// (Hoot-design/woensdag-2026-11-04/midterms/METING.md en TOETS-2.md) dezelfde lezers houdt.
const ALWAYS = ['nos', 'nu', 'rtl']
const PICK = { politiek: [], binnenland: [], wereld: ['bbc'], economie: [], tech: ['tweakers'], wetenschap: ['quanta'], cultuur: ['nos-cultuur', '3voor12'], sport: ['nos-sport', 'vi'] }
const ORDER = Object.keys(PICK)

// De id's die bestaan en gratis zijn, in de volgorde hierboven.
export function proposeSources(pickable = [], interests = []) {
  const byId = new Map(pickable.map((s) => [s.id, s]))
  const ids = [...new Set([...ALWAYS, ...ORDER.filter((i) => interests.includes(i)).flatMap((i) => PICK[i])])]
  return ids.filter((id) => byId.has(id) && !byId.get(id).paid)
}
