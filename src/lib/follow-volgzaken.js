// Volgen: pure functies (tests/follow-volgzaken.test.mjs, tests/follow.test.mjs). Vervangt follow.js (dat nu alleen
// hierheen doorverwijst).
//
// Volgen 1.5 (codenaam volgzaak): je volgt niet één bundel maar iets wat over vele verhalen loopt (GTA 6, de
// kabinetsformatie). Hooguit drie tegelijk; wat je volgt staat alleen in je prefs (`volgzaken`), de server kent nooit wie.
//   volgzaken: [{ slug, label, opdracht, at, gezien, status: 'actief' | 'gestopt', gestoptAt }]
// Alles achter de vlag HOOT_VOLGZAKEN (meta.volgzaken of lokaal hoot.volgzaken=aan, src/lib/volgzaak.js).
//
// Daarvoor (tot 1.5, en met de vlag uit nog steeds): je volgde één verhaal (`followStories`), bovenaan de Editie stond wat
// er sinds je laatst keek bij kwam, hooguit vijf, na twee weken vanzelf weg. Die functies staan hieronder ongewijzigd.
import { VOLGZAKEN_MAX } from '../../shared/volgzaak-weergave.mjs'

// ---- Verhalen volgen (followStories, met de vlag uit) ----
export const FOLLOW_MAX = 5
export const FOLLOW_DAYS = 14

export const isFollowing = (list = [], story) => !!story && list.some((f) => f.id === story.id || (story.formerIds || []).includes(f.id))

export function toggleFollow(list = [], story, title, now = Date.now()) {
  if (!story) return list
  if (isFollowing(list, story)) return list.filter((f) => f.id !== story.id && !(story.formerIds || []).includes(f.id))
  return [{ id: story.id, title, at: new Date(now).toISOString() }, ...list].slice(0, FOLLOW_MAX)
}

// Wat er nu te tonen is: per gevolgd verhaal dat nog bestaat (ook onder een nieuwe id) het
// aantal nieuwe berichten; met nieuws eerst. Verlopen volgen valt weg.
export function followedNow(list = [], storiesById = new Map(), newIn = () => 0, now = Date.now()) {
  const fresh = list.filter((f) => now - Date.parse(f.at) < FOLLOW_DAYS * 864e5)
  return fresh
    .map((f) => {
      const story = storiesById.get(f.id)
      return story ? { ...f, story, fresh: newIn(story) } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.fresh - a.fresh)
}

// ---- Volgzaken ----
export { VOLGZAKEN_MAX }
export const GESTOPT_DAGEN = 7 // gestopt blijft nog een week grijs staan, met Volg weer
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
const iso = (now) => new Date(now).toISOString()
const geldig = (z) => !!z && typeof z === 'object' && typeof z.slug === 'string' && z.slug.length >= 2 && SLUG.test(z.slug) && typeof z.label === 'string' && z.label.trim().length > 0
const isoOf = (v) => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null)

// Opschonen bij het lezen (normalizePrefs): geldige rijen, geen dubbelen, hooguit drie actief (de rest wordt gestopt),
// gestopt alleen jonger dan een week, velden op hun maat.
export function normalizeVolgzaken(raw, now = Date.now()) {
  const out = []
  const gehad = new Set()
  let actief = 0
  for (const z of Array.isArray(raw) ? raw : []) {
    if (!geldig(z) || gehad.has(z.slug)) continue
    gehad.add(z.slug)
    let status = z.status === 'gestopt' ? 'gestopt' : 'actief'
    let gestoptAt = status === 'gestopt' ? isoOf(z.gestoptAt) : null
    if (status === 'actief' && actief >= VOLGZAKEN_MAX) {
      status = 'gestopt'
      gestoptAt = iso(now)
    }
    if (status === 'gestopt' && gestoptAt && now - Date.parse(gestoptAt) > GESTOPT_DAGEN * 864e5) continue
    if (status === 'actief') actief++
    out.push({
      slug: z.slug,
      label: z.label.trim().slice(0, 24),
      opdracht: typeof z.opdracht === 'string' ? z.opdracht.slice(0, 200) : '',
      at: isoOf(z.at) || iso(now),
      gezien: isoOf(z.gezien),
      status,
      gestoptAt,
    })
  }
  return out
}

export const actief = (list = []) => (Array.isArray(list) ? list : []).filter((z) => z && z.status !== 'gestopt')
export const gestopt = (list = []) => (Array.isArray(list) ? list : []).filter((z) => z && z.status === 'gestopt')
export const volgt = (list = [], slug) => actief(list).some((z) => z.slug === slug)
export const isVol = (list = []) => actief(list).length >= VOLGZAKEN_MAX

// Volgen. Uitkomst { list, ok, vol }: al gevolgd is ok zonder verandering; gestopt wordt weer actief (bovenaan); bij drie
// actieve volg je niets en is `vol` waar ("Je volgt er al drie." met Beheer).
export function volg(list = [], zaak, now = Date.now()) {
  if (!geldig(zaak)) return { list, ok: false, vol: false }
  if (volgt(list, zaak.slug)) return { list, ok: true, vol: false }
  if (isVol(list)) return { list, ok: false, vol: true }
  const rest = (Array.isArray(list) ? list : []).filter((z) => z.slug !== zaak.slug)
  const rij = { slug: zaak.slug, label: zaak.label.trim().slice(0, 24), opdracht: typeof zaak.opdracht === 'string' ? zaak.opdracht.slice(0, 200) : '', at: iso(now), gezien: null, status: 'actief', gestoptAt: null }
  return { list: [rij, ...rest], ok: true, vol: false }
}

// Stop met volgen: de rij gaat weg. `weg` en `index` zijn voor Ongedaan maken (herstel).
export function ontvolg(list = [], slug) {
  const l = Array.isArray(list) ? list : []
  const index = l.findIndex((z) => z.slug === slug)
  if (index < 0) return { list: l, weg: null, index: -1 }
  return { list: l.filter((_, i) => i !== index), weg: l[index], index }
}

// Ongedaan maken: de rij terug op haar plek, zoals ze was. Ondertussen elders weer gevolgd: niets dubbel.
export function herstel(list = [], weg, index = 0) {
  const l = Array.isArray(list) ? list : []
  if (!weg || l.some((z) => z.slug === weg.slug)) return l
  if (weg.status !== 'gestopt' && isVol(l)) return l
  const out = [...l]
  out.splice(Math.max(0, Math.min(index, out.length)), 0, weg)
  return out
}

// Slepen in het beheerblad: van plek `van` naar `naar` binnen de actieve rijen; gestopte rijen blijven achteraan.
export function verplaats(list = [], van, naar) {
  const a = actief(list)
  if (van < 0 || van >= a.length || naar < 0 || naar >= a.length || van === naar) return list
  const out = [...a]
  const [rij] = out.splice(van, 1)
  out.splice(naar, 0, rij)
  return [...out, ...gestopt(list)]
}

// De pagina geopend: wat er tot nu was, is gezien (Zoeken zegt dan "Niets nieuws").
export const bekeken = (list = [], slug, now = Date.now()) => (Array.isArray(list) ? list : []).map((z) => (z.slug === slug ? { ...z, gezien: iso(now) } : z))

// "Nieuw" of "Niets nieuws" in Zoeken: is er een nieuw verhaal sinds je de pagina het laatst opende (of sinds je volgt)?
// Nooit een getal. `info` komt uit /api/volgzaak overzicht ({ laatstNieuw, status }).
export function isNieuw(zaak, info) {
  const t = Date.parse(info?.laatstNieuw || '')
  if (!Number.isFinite(t)) return false
  const sinds = Date.parse(zaak?.gezien || zaak?.at || '')
  return !Number.isFinite(sinds) || t > sinds
}
export const nieuwTekst = (nieuw) => (nieuw ? 'Nieuw' : 'Niets nieuws')

// De rijen in Zoeken: eerst wat nieuw is, verder in je eigen volgorde.
export function inVolgorde(list = [], overzicht = {}) {
  return actief(list)
    .map((z, i) => ({ z, i, nieuw: isNieuw(z, overzicht?.[z.slug]) }))
    .sort((a, b) => (a.nieuw === b.nieuw ? a.i - b.i : a.nieuw ? -1 : 1))
    .map(({ z, nieuw }) => ({ ...z, nieuw }))
}

// ---- De omzetting van followStories (eenmalig, op het toestel) ----
// Alleen als de vlag aan is en je nog niets volgt (of nog nooit omzette): elk gevolgd verhaal dat nog bestaat (ook onder een
// nieuwe id) en een veld `volgzaak` heeft, wordt een gevolgde volgzaak; nieuwste eerst, hooguit drie, dubbelen eruit.
// Gevolgde verhalen zonder veld lopen stil af zoals nu (FOLLOW_DAYS); er wordt niets gewist. `volgzakenOmgezet` voorkomt dat
// een tweede toestel opnieuw omzet en dubbel +1 stuurt. Uitkomst: null (niets te doen) of { volgzaken, nieuw: [slug] }.
export function zetFollowStoriesOm(prefs = {}, storiesById = new Map(), now = Date.now()) {
  if (prefs.volgzakenOmgezet) return null
  if (actief(prefs.volgzaken).length) return { volgzaken: prefs.volgzaken, nieuw: [] }
  const vers = (Array.isArray(prefs.followStories) ? prefs.followStories : [])
    .filter((f) => f && typeof f.id === 'string' && now - Date.parse(f.at) < FOLLOW_DAYS * 864e5)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  let list = Array.isArray(prefs.volgzaken) ? prefs.volgzaken : []
  const nieuw = []
  for (const f of vers) {
    const v = storiesById.get(f.id)?.volgzaak
    if (!v || !geldig(v) || volgt(list, v.slug)) continue
    const r = volg(list, { slug: v.slug, label: v.label }, now)
    if (!r.ok) break
    list = r.list
    nieuw.push(v.slug)
  }
  // De volgorde: het nieuwst gevolgde verhaal bovenaan (volg zet elke nieuwe bovenaan, dus omdraaien).
  if (nieuw.length) list = [...list.filter((z) => nieuw.includes(z.slug)).reverse(), ...list.filter((z) => !nieuw.includes(z.slug))]
  return { volgzaken: list, nieuw }
}
