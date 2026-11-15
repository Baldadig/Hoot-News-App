// De voorraad van volgzaken (volgen 1.5, bouwplanstap 1.1). Er bestaat geen verhalenarchief van veertien dagen, dus
// schrijven we er zelf een, vanaf de deploy van blok 1 en ook met de vlag uit: zo ligt er bij de lancering genoeg om een
// nieuwe volgzaak meteen een gevulde pagina te geven. Geen model, geen intro, geen beeld: per stuk alleen tijd, bron,
// kop, link, verhaal, taal en twee vlaggen.
//
// Per Nederlandse dag één gzip-archief `volgzaak-voorraad:<jjjj-mm-dd>`:
//   stukken: { <itemId>: [t, bron, kop, url, storyId|null, lang|null, aflevering 0|1, haags 0|1] }
//   verhalen: { <storyId>: { f: formerIds, d: desk, l: 'light'|'sport'|null, n: publisherCount, lead: leadId } }
//   meta: { v: 1, dag, builtAt, tags: { bron: etag } }
// De dag is die van `firstSeenAt` (anders `publishedAt`). Elke ronde leest vandaag en gisteren, voegt samen op item-id
// (de eerste tijd blijft, het verhaal wordt bijgewerkt: zo volgt de voorraad een verhaal dat van id wisselt) en schrijft
// alleen wat veranderde. De bron: KEYS.start (de verhalen en de etag per deel) en alleen de delen die veranderden.
// Opruimen na veertien dagen: netlify/lib/opruimen.mjs.
import { KEYS } from './kv.mjs'
import { SOURCES } from './sources.mjs'
import { isAflevering } from '../../shared/aflevering.mjs'
import { haagsPiece } from './dossiers.mjs'
import { VK, dagNL, voorraadAan, binnen, KV_MS } from './volgzaak-basis.mjs'

export const VOORRAAD_MS = 8000
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
const DAG_MS = 864e5

// Eén stuk zoals de voorraad het bewaart, of null (geen artikel, geen kop of link, een Bluesky-bericht).
export function stukVan(it) {
  if (!it || it.kind !== 'article' || typeof it.title !== 'string' || !it.title.trim() || typeof it.url !== 'string' || !it.url) return null
  const t = Date.parse(it.firstSeenAt) || Date.parse(it.publishedAt)
  if (!Number.isFinite(t)) return null
  let haags = 0
  try {
    haags = haagsPiece(it) ? 1 : 0
  } catch {
    haags = 0
  }
  return [t, String(it.source || ''), it.title.trim().slice(0, 300), it.url, it.storyId || null, it.lang || SOURCE.get(it.source)?.lang || null, isAflevering(it) ? 1 : 0, haags]
}

const leeg = (dag) => ({ meta: { v: 1, dag, builtAt: null, tags: {} }, stukken: {}, verhalen: {} })
const geldig = (doc, dag) => (doc && doc.meta?.v === 1 && doc.stukken && typeof doc.stukken === 'object' ? { meta: { ...doc.meta, dag, tags: doc.meta.tags || {} }, stukken: { ...doc.stukken }, verhalen: { ...(doc.verhalen || {}) } } : leeg(dag))

// Samenvoegen (zuiver, idempotent): de stukken van deze ronde in de documenten van vandaag en gisteren. Een stuk dat al
// in een van beide staat, blijft daar (eerste tijd), met het nieuwste verhaal, kop en link. Een nieuw stuk gaat naar de
// dag van zijn tijd, als dat vandaag of gisteren is. Geeft { docs, gewijzigd: Set(dag) }.
export function voegSamen(docs, stukken, verhalen, { vandaag, gisteren }) {
  const out = { [vandaag]: geldig(docs[vandaag], vandaag), [gisteren]: geldig(docs[gisteren], gisteren) }
  const gewijzigd = new Set()
  for (const [id, s] of Object.entries(stukken)) {
    const dag = id in out[gisteren].stukken ? gisteren : id in out[vandaag].stukken ? vandaag : dagNL(s[0])
    if (!(dag in out)) continue
    const cur = out[dag].stukken[id]
    const next = cur ? [cur[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]] : s
    if (!cur || JSON.stringify(cur) !== JSON.stringify(next)) {
      out[dag].stukken[id] = next
      gewijzigd.add(dag)
    }
  }
  // De verhalen: alleen die een stuk in dat document hebben, met de laatste stand.
  for (const dag of [vandaag, gisteren]) {
    const doc = out[dag]
    const ids = new Set(Object.values(doc.stukken).map((s) => s[4]).filter(Boolean))
    for (const id of ids) {
      const v = verhalen[id]
      if (!v) continue
      if (JSON.stringify(doc.verhalen[id]) !== JSON.stringify(v)) {
        doc.verhalen[id] = v
        gewijzigd.add(dag)
      }
    }
  }
  return { docs: out, gewijzigd }
}

export const verhaalVan = (st) => ({ f: Array.isArray(st.formerIds) ? st.formerIds.slice(0, 20) : [], d: st.desk || null, l: st.light ? 'light' : st.sport ? 'sport' : null, n: Number(st.publisherCount) || 0, lead: st.leadId || null })

// De voorraad bijwerken. `lees(key)`: een kant-en-klaar document ({ body, builtAt, etag }, readDoc); `leesArchief` en
// `schrijfArchief`: readArchive en writeArchive. Nooit een fout naar buiten; geeft { stats, docs } (docs: vandaag en
// gisteren, voor de matching van de ronde).
export async function voorraadRonde({ now = Date.now(), env = process.env, lees, leesArchief, schrijfArchief, budget = VOORRAAD_MS, kvMs = KV_MS } = {}) {
  const stats = { gelezen: 0, stukken: 0, nieuw: 0, geschreven: 0 }
  if (!voorraadAan(env)) return { stats: { ...stats, uit: 'noodrem' }, docs: null }
  const tot = now + budget
  const vandaag = dagNL(now)
  const gisteren = dagNL(now - DAG_MS)
  try {
    const [startDoc, docV, docG] = await Promise.all([binnen(lees(KEYS.start), kvMs), binnen(leesArchief(VK.voorraad(vandaag)), kvMs).catch(() => null), binnen(leesArchief(VK.voorraad(gisteren)), kvMs).catch(() => null)])
    const docs = { [vandaag]: docV, [gisteren]: docG }
    if (!startDoc?.body) return { stats: { ...stats, uit: 'geen feed' }, docs: { [vandaag]: geldig(docV, vandaag), [gisteren]: geldig(docG, gisteren) } }
    const builtAt = startDoc.builtAt || null
    const vorigeTags = docV?.meta?.tags && Object.keys(docV.meta.tags).length ? docV.meta.tags : docG?.meta?.tags || {}
    // Nachtrust: de feed is niet opnieuw gebouwd sinds de vorige keer.
    if (builtAt && (docV?.meta?.builtAt === builtAt || (!docV && docG?.meta?.builtAt === builtAt))) return { stats: { ...stats, nachtrust: true }, docs: { [vandaag]: geldig(docV, vandaag), [gisteren]: geldig(docG, gisteren) } }
    const kern = JSON.parse(startDoc.body)
    const tags = kern?.meta?.parts && typeof kern.meta.parts === 'object' ? kern.meta.parts : {}
    const verhalen = {}
    for (const st of Array.isArray(kern?.stories) ? kern.stories : []) if (st?.id) verhalen[st.id] = verhaalVan(st)
    const teLezen = Object.keys(tags).filter((id) => vorigeTags[id] !== tags[id])
    const stukken = {}
    const gelezenTags = { ...vorigeTags }
    await Promise.all(
      teLezen.map(async (id) => {
        const ms = Math.min(kvMs, tot - Date.now())
        if (ms <= 0) return
        const d = await binnen(lees(KEYS.part(id)), ms).catch(() => null)
        if (!d?.body) return
        let lijst
        try {
          lijst = JSON.parse(d.body)?.items
        } catch {
          return
        }
        stats.gelezen++
        gelezenTags[id] = tags[id]
        for (const it of Array.isArray(lijst) ? lijst : []) {
          const s = stukVan(it)
          if (s) stukken[it.id] = s
        }
      }),
    )
    stats.stukken = Object.keys(stukken).length
    const { docs: samen, gewijzigd } = voegSamen(docs, stukken, verhalen, { vandaag, gisteren })
    for (const dag of [vandaag, gisteren]) stats.nieuw += Object.keys(samen[dag].stukken).length - Object.keys(geldig(docs[dag], dag).stukken).length
    // Vandaag draagt de stand van de ronde (builtAt en de etags die gelezen zijn), ook als er geen stuk bij kwam.
    samen[vandaag].meta = { ...samen[vandaag].meta, builtAt, tags: gelezenTags }
    gewijzigd.add(vandaag)
    for (const dag of gewijzigd) {
      if (Date.now() > tot + kvMs) break
      await binnen(schrijfArchief(VK.voorraad(dag), samen[dag]), kvMs * 2)
        .then(() => stats.geschreven++)
        .catch(() => {})
    }
    return { stats, docs: samen }
  } catch (e) {
    return { stats: { ...stats, fout: String(e?.message || e).slice(0, 80) }, docs: null }
  }
}

// De stukken uit een of meer voorraaddocumenten als lijst, plus de verhalen (de nieuwste stand wint).
export function stukkenUit(docs) {
  const stukken = new Map()
  const verhalen = {}
  for (const doc of Object.values(docs || {}).filter(Boolean)) {
    for (const [id, s] of Object.entries(doc.stukken || {})) {
      if (!Array.isArray(s)) continue
      const cur = stukken.get(id)
      if (!cur || s[0] < cur.t) stukken.set(id, { id, t: s[0], bron: s[1], kop: s[2], url: s[3], storyId: s[4] || null, lang: s[5] || null, afl: !!s[6], haags: !!s[7], dag: doc.meta?.dag || null })
    }
    Object.assign(verhalen, doc.verhalen || {})
  }
  return { stukken: [...stukken.values()], verhalen }
}

// De dagen van de voorraad die nu kunnen bestaan, nieuwste eerst (vandaag en veertien dagen terug).
export function voorraadDagen(now, dagen = 15) {
  return Array.from({ length: dagen }, (_, i) => dagNL(now - i * DAG_MS)).filter((d, i, a) => a.indexOf(d) === i)
}
