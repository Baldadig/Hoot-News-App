// Lokale preview van dist met nepdata voor Volgen 1.5 (alleen voor schermafdrukken). Feed uit de vaste fixture
// live-feed-2026-11-11-ochtend, met het veld `volgzaak` op een paar verhalen en meta.volgzaken = true.
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, extname } from 'node:path'

const REPO = process.argv[2]
const PORT = Number(process.argv[3] || 4810)
const DIST = join(REPO, 'dist')
const d = JSON.parse(gunzipSync(readFileSync(join(REPO, 'tests/fixtures/live-feed-2026-11-11-ochtend.json.gz'))))
const byId = new Map([...d.items, ...d.related, ...(d.edition.items || [])].map((i) => [i.id, i]))
const NOW = Date.parse(d.meta.updatedAt) + 15 * 60e3
const iso = (t) => new Date(t).toISOString()

export const ZAKEN = {
  'spionagezaak-vk': { label: 'Spionagezaak VK', regel: 'De Amerikaanse militair die in Engeland voor Rusland spioneerde', rubriek: 'wereld', stories: ['s8bid3j', 'srtc6p7'] },
  'jensen-huang': { label: 'Jensen Huang', regel: 'De topman van Nvidia en zijn bedrijf', rubriek: 'tech', stories: ['sq11b7y'] },
  playstation: { label: 'PlayStation', regel: 'Nieuws over de spelcomputer en de games van Sony', rubriek: 'cultuur', stories: ['srmdnt9', 's1giovu3'] },
  'vredesoverleg-oekraine': { label: 'Vredesoverleg Oekraïne', regel: 'De gesprekken over een einde aan de oorlog', rubriek: 'wereld', stories: ['s14kni0r', 'sljbpf'] },
}
// Oudere verhalen (nep) voor "Eerder" per week.
const OUD = {
  'spionagezaak-vk': [['nos', 'Britse inlichtingendienst onderzoekt lek op Amerikaanse basis', 4, 3], ['nu', 'Defensie VK scherpt toegang tot bases aan na spionagezaak', 9, 2], ['guardian', 'US airman questioned over contacts with Russian handler', 11, 4]],
  'jensen-huang': [['fd', 'Nvidia verwacht opnieuw recordomzet door vraag naar AI-chips', 5, 3], ['nos', 'Chipmakers onder druk door nieuwe exportregels', 12, 5]],
  playstation: [['tweakers', 'Sony verhoogt prijs van PlayStation Plus', 3, 4], ['nu', 'Nieuwe PlayStation-controller duikt op in registratie', 8, 2]],
  'vredesoverleg-oekraine': [['nos', 'Europese landen willen aan tafel bij vredesoverleg', 6, 5]],
}
const storyZaak = new Map()
for (const [slug, z] of Object.entries(ZAKEN)) for (const id of z.stories) storyZaak.set(id, { slug, label: z.label })

const stories = d.stories.map((s) => (storyZaak.has(s.id) ? { ...s, volgzaak: storyZaak.get(s.id) } : s))
const storyOf = new Map()
for (const s of d.stories) for (const id of s.itemIds || []) storyOf.set(id, s.id)
const parts = {}
for (const it of d.items) (parts[it.source] ||= []).push(storyOf.has(it.id) ? { ...it, storyId: storyOf.get(it.id) } : it)
const core = { sources: d.sources, stories, edition: d.edition, meta: { ...d.meta, parts: Object.fromEntries(Object.keys(parts).map((k) => [k, 'v1'])), volgzaken: true } }

const rij = (s) => {
  const l = byId.get(s.leadId)
  return { verhaal: s.id, kop: l?.title, bron: l?.source, url: l?.url, bronnen: s.publisherCount, at: l?.publishedAt, betaald: false, rubriek: null }
}
function stand(slug) {
  const z = ZAKEN[slug]
  const echt = z.stories.map((id) => stories.find((s) => s.id === id)).filter(Boolean).map(rij)
  const oud = (OUD[slug] || []).map(([bron, kop, dagen, bronnen], i) => ({ verhaal: `oud-${slug}-${i}`, kop, bron, url: 'https://example.test/', bronnen, at: iso(NOW - dagen * 864e5), betaald: false, rubriek: z.rubriek }))
  return { v: 1, slug, label: z.label, verhalen: [...echt, ...oud] }
}
const publiek = (slug) => ({ slug, label: ZAKEN[slug].label, regel: ZAKEN[slug].regel, soort: 'zaak', mijlpaal: null, rubriek: ZAKEN[slug].rubriek })

function volgzaak(body) {
  const a = body.actie
  if (a === 'pagina') return ZAKEN[body.slug] ? { volgzaak: publiek(body.slug), status: 'actief', stand: stand(body.slug) } : [404, { error: 'Niet gevonden.' }]
  if (a === 'overzicht') return { overzicht: Object.fromEntries(body.slugs.map((s) => [s, ZAKEN[s] ? { laatstNieuw: stand(s).verhalen.map((v) => v.at).sort().pop(), status: 'actief' } : null])) }
  if (a === 'volgen' || a === 'ontvolgen') return { ok: true, slug: body.slug, label: ZAKEN[body.slug]?.label }
  if (a === 'duiden') {
    const o = String(body.opdracht || '').toLowerCase()
    if (/oekra/.test(o)) {
      // Zoals de echte server: gedeeld per volgzaak, uit alle bronnen en talen, tot 12, met betaald (het toestel kiest er drie).
      const st = stand('vredesoverleg-oekraine').verhalen.slice(0, 12)
      return { soort: 'volgzaak', volgzaak: { ...publiek('vredesoverleg-oekraine'), loopt: true }, eerder: st.map((v) => ({ verhaal: v.verhaal, kop: v.kop, bron: v.bron, bronnen: v.bronnen, at: v.at, betaald: !!v.betaald })), bronnen: { nos: 3, nu: 2, bbc: 2 } }
    }
    if (/tata/.test(o)) return { soort: 'bedoel', keuzes: [{ naam: 'Rechtszaak tegen Tata Steel', regel: 'Omwonenden in IJmuiden tegen het staalbedrijf', opdracht: 'rechtszaak tata steel' }, { naam: 'Groen staal in IJmuiden', regel: 'De plannen en het geld voor schoner staal', opdracht: 'groen staal ijmuiden' }] }
    if (/^games?$/.test(o)) return { soort: 'rubriek', rubriek: 'cultuur', binnen: [{ naam: 'GTA 6', regel: 'De nieuwe Grand Theft Auto van Rockstar', opdracht: 'gta 6' }] }
    return { soort: 'geen', tekst: 'Hier valt geen nieuws te volgen.' }
  }
  return [400, { error: 'Geen geldige invoer.' }]
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg' }
const json = (res, code, obj) => (res.writeHead(code, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(obj)))

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (url.pathname === '/api/feed') {
    if (url.searchParams.get('deel') === 'start') return json(res, 200, core)
    if (url.searchParams.get('deel') === 'verhalen') return json(res, 200, { related: d.related })
    if (url.searchParams.get('bron')) return json(res, 200, { items: parts[url.searchParams.get('bron')] || [] })
    return json(res, 200, core)
  }
  if (url.pathname === '/api/volgzaak') {
    let t = ''
    for await (const c of req) t += c
    const out = volgzaak(JSON.parse(t || '{}'))
    return Array.isArray(out) ? json(res, out[0], out[1]) : json(res, 200, out)
  }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return json(res, 404, { error: 'nep' })
  if (url.pathname === '/leeg') return (res.writeHead(200, { 'Content-Type': 'text/html' }), res.end('<!doctype html><title>leeg</title>'))
  if (url.pathname === '/' || url.pathname === '/lees') return (res.writeHead(302, { Location: '/lees/' }), res.end())
  let file = join(DIST, url.pathname)
  if (!existsSync(file) || statSync(file).isDirectory()) file = existsSync(join(file, 'index.html')) ? join(file, 'index.html') : join(DIST, 'lees/index.html')
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
}).listen(PORT, () => console.log(`nepserver op ${PORT}, nu ${iso(NOW)}`))
