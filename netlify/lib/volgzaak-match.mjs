// Verzamelen op verhaalniveau (volgen 1.5, bouwplanstap 1.4), zuiver en zonder model. Met de gedeelde naamherkenning van
// de Haagse dossiers (netlify/lib/dossiers.mjs: namenInKop, kopBevat, uitgeversPerNaam); alleen de drempels verschillen.
//
// - Een stuk telt (raak) als een van de namen of aliassen van de volgzaak in de kop staat en geen uitsluiting. Een naam
//   uit `algemeen` telt alleen met een tweede naam of een contextwoord in dezelfde kop; alleen zo'n naam is zwak.
// - Per verhaal (de stukken samen op storyId): zeker bij raak-koppen van ZEKER_UITGEVERS of meer uitgevers, twijfel bij
//   één uitgever of alleen zwakke koppen. Een aflevering is geen uitgever (shared/aflevering.mjs).
// - Een los stuk zonder verhaal is hooguit twijfel (sleutel `los:<itemId>`).
// - Valt een volgzaak samen met een Haags dossier van die dag (een van zijn namen in de koppen van DOSSIER_MIN of meer
//   uitgevers, dossierNames over de Haagse stukken), dan is een verhaal met zo'n Haags stuk zeker: het dossier telt als
//   één bundel met al zijn uitgevers.
// - De eenheid is altijd het verhaal: tien stukken over één trailer zijn één treffer met tien bronnen.
// De voorraad heeft geen intro's: een naam die alleen in de intro staat, ziet de matcher niet.
import { normNaam, kopWoorden, namenInKop, kopBevat, uitgeversPerNaam, dossierNames, DOSSIER_MIN } from './dossiers.mjs'
import { publisherOf } from '../../shared/edition-policy.mjs'

export const ZEKER_UITGEVERS = 2
const GEEN = new Set()

const normZin = (s) => kopWoorden(String(s || '')).map(normNaam).join(' ')

// De duiding klaarzetten: de namen genormaliseerd, enkelvoudig (namenInKop) of van meer woorden (kopBevat).
export function bereidVoor(def) {
  const namen = [...(def?.namen?.nl || []), ...(def?.namen?.en || []), ...(def?.aliassen || [])].map(normZin).filter(Boolean)
  const algemeen = new Set((def?.algemeen || []).map(normZin).filter(Boolean))
  const deel = (lijst) => {
    const uniek = [...new Set(lijst)]
    return { enkel: new Set(uniek.filter((n) => !n.includes(' '))), meer: uniek.filter((n) => n.includes(' ')) }
  }
  return { slug: def?.slug, namen: deel([...namen, ...algemeen]), algemeen, context: deel((def?.context || []).map(normZin).filter(Boolean)), uit: deel((def?.uit || []).map(normZin).filter(Boolean)) }
}

// Welke van deze namen staan in de kop?
function treft(kop, { enkel, meer }) {
  const out = enkel.size ? [...namenInKop(kop, enkel, { niet: GEEN })].filter((n) => enkel.has(n) || meer.includes(n)) : []
  for (const n of meer) if (kopBevat(kop, n)) out.push(n)
  return new Set(out)
}

// 'raak' | 'zwak' | null voor één kop. `namen`: de namen die raakten (voor de Haagse bundel).
export function kopOordeel(vb, kop) {
  if (treft(kop, vb.uit).size) return { oordeel: null, namen: GEEN }
  const namen = treft(kop, vb.namen)
  if (!namen.size) return { oordeel: null, namen }
  const sterk = [...namen].filter((n) => !vb.algemeen.has(n))
  if (sterk.length || namen.size >= 2 || treft(kop, vb.context).size) return { oordeel: 'raak', namen }
  return { oordeel: 'zwak', namen }
}

// De Haagse dossiers van deze stukken, per dag: Map(naam → uitgevers), alleen namen met DOSSIER_MIN of meer uitgevers.
export function haagseBundels(stukken) {
  const perDag = new Map()
  for (const s of stukken) if (s.haags && !s.afl) (perDag.get(s.dag) || perDag.set(s.dag, []).get(s.dag)).push({ id: s.id, title: s.kop, source: s.bron })
  const out = new Map()
  for (const pieces of perDag.values()) {
    const per = uitgeversPerNaam(pieces, dossierNames(pieces))
    for (const [n, u] of per) if (u >= DOSSIER_MIN) out.set(n, Math.max(out.get(n) || 0, u))
  }
  return out
}

// Alle verhalen die deze volgzaak raakt. `stukken`: uit de voorraad (stukkenUit); `verhalen`: de verhalen van de
// voorraad; `bundels`: haagseBundels(stukken) (mag worden meegegeven, dan rekent hij het niet opnieuw). Geeft een Map
// (sleutel → { oordeel: 'z'|'t', pubs, laatst, eerst, kop, bron, url, desk, stukken: [ids], f: formerIds }).
export function matchVerhalen(def, stukken, { verhalen = {}, bundels = null } = {}) {
  const vb = bereidVoor(def)
  const bundel = bundels || haagseBundels(stukken)
  const groepen = new Map()
  for (const s of stukken) {
    const key = s.storyId || `los:${s.id}`
    ;(groepen.get(key) || groepen.set(key, []).get(key)).push(s)
  }
  const out = new Map()
  for (const [key, lijst] of groepen) {
    const raak = []
    const zwak = []
    let dossier = false
    for (const s of lijst) {
      const { oordeel, namen } = kopOordeel(vb, s.kop)
      if (!oordeel) continue
      if (oordeel === 'raak' && !s.afl) raak.push(s)
      else zwak.push(s)
      if (s.haags && oordeel === 'raak' && [...namen].some((n) => bundel.has(n))) dossier = true
    }
    if (!raak.length && !zwak.length) continue
    const pubs = new Set(raak.map((s) => publisherOf(s.bron))).size
    const los = key.startsWith('los:')
    const oordeel = !los && (pubs >= ZEKER_UITGEVERS || dossier) ? 'z' : 't'
    const toon = [...(raak.length ? raak : zwak)].sort((a, b) => b.t - a.t)[0]
    const v = verhalen[key] || {}
    out.set(key, {
      oordeel,
      pubs: Math.max(pubs, oordeel === 'z' ? Number(v.n) || 0 : 0),
      laatst: Math.max(...lijst.map((s) => s.t)),
      eerst: Math.min(...lijst.map((s) => s.t)),
      kop: toon.kop,
      bron: toon.bron,
      url: toon.url,
      desk: v.d || null,
      stukken: lijst.map((s) => s.id),
      f: Array.isArray(v.f) ? v.f : [],
    })
  }
  return out
}

// De koppen van een verhaal voor de vraag aan het model: hooguit `max`, nieuwste eerst, één per uitgever eerst.
export function koppenVan(stukken, ids, max = 20) {
  const byId = new Map(stukken.map((s) => [s.id, s]))
  return ids.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => b.t - a.t).slice(0, max).map((s) => ({ bron: s.bron, kop: s.kop }))
}
