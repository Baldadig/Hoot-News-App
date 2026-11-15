// Volgen 1.5 op het web: alles achter de vlag, de slug nooit in een adres van de server, de voorrang vast per weergave,
// teksten uit één lijst in de huisstijl (geen "onderwerp", geen tijdstippen, geen em-dash).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TEKST, vraagVolgzaak, deelLink, gratisTip, weinigInEigen } from '../src/lib/volgzaak.js'
import { weergaveVoorrang, weergaveGrens, vergeetGrenzen, VOORRANG_KEY, GRENZEN_KEY } from '../src/lib/stroom-einde.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const opslag = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }
}

test('de voorrang ligt vast per weergave, net als de grens; "nieuwe berichten" rekent beide opnieuw', () => {
  const session = opslag()
  let n = 0
  const eerst = weergaveVoorrang('stroom', () => (n++, ['a', 'b']), { session })
  const weer = weergaveVoorrang('stroom', () => (n++, ['x']), { session })
  assert.deepEqual([eerst, weer, n], [['a', 'b'], ['a', 'b'], 1], 'ontvolgen of nieuwe stukken verschuiven niets terwijl je kijkt')
  assert.deepEqual(weergaveVoorrang('stroom:games', () => [], { session }), [], 'per weergave')
  weergaveGrens('stroom', [], { session, local: opslag(), now: 0 })
  vergeetGrenzen({ session })
  assert.equal(session.getItem(VOORRANG_KEY), null)
  assert.equal(session.getItem(GRENZEN_KEY), null)
})

test('de slug en de opdracht gaan alleen in een POST-body, nooit in het adres', async () => {
  const calls = []
  const fetchImpl = async (url, init) => (calls.push({ url, init }), { status: 200, json: async () => ({ ok: true }) })
  const r = await vraagVolgzaak('volgen', { slug: 'gta-6' }, { token: 't', fetchImpl })
  assert.equal(r.status, 200)
  assert.equal(calls[0].url, '/api/volgzaak')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), { slug: 'gta-6', actie: 'volgen' })
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t')
  const zonder = await vraagVolgzaak('pagina', { slug: 'gta-6' }, { fetchImpl })
  assert.equal(zonder.status, 200)
  assert.equal(calls[1].init.headers.Authorization, undefined, 'lezen kan zonder account')
  assert.deepEqual(await vraagVolgzaak('pagina', {}, { fetchImpl: async () => { throw new Error('offline') } }), { status: 0, data: null })
  for (const f of ['src/components/Volg.jsx', 'src/views/Volg.jsx', 'src/views/Search.jsx', 'src/App.jsx']) assert.doesNotMatch(read(f), /\/api\/volgzaak\?/, f)
  // Deel is de enige plek waar de slug in een link staat: de pagina in Hoot, niet een adres van de server.
  assert.equal(deelLink('gta-6', 'https://gethoot.app/lees/'), 'https://gethoot.app/lees/#/volg?naam=gta-6')
  assert.doesNotMatch(read('src/components/Volg.jsx'), /share\(\{ id:/, 'geen id bij Deel: anders vraagt het delen een deelkaart met de slug aan de server')
})

test('teksten: één lijst, het woord "onderwerp" nergens, geen tijdstippen, geen em-dash', () => {
  const alle = Object.values(TEKST).map((t) => (typeof t === 'function' ? t('GTA 6') : t))
  for (const t of alle) {
    assert.doesNotMatch(t, /onderwerp/i, t)
    assert.doesNotMatch(t, /\d{1,2}[:.]\d{2}|\d{1,2} uur/, t)
    assert.doesNotMatch(t, /[—–]/, t)
  }
  assert.equal(TEKST.nietMeer('GTA 6'), 'Je volgt GTA 6 niet meer.')
  assert.equal(TEKST.jeVolgtNaam('Kabinetsformatie'), 'Je volgt Kabinetsformatie.')
  assert.deepEqual([TEKST.bronnen(1), TEKST.bronnen(2), TEKST.bronnen(4)], ['', '+1 bron', '+3 bronnen'])
  for (const f of ['src/components/Volg.jsx', 'src/views/Volg.jsx', 'src/lib/volgzaak.js', 'src/styles/volg.css']) {
    const zichtbaar = read(f).split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
    assert.doesNotMatch(zichtbaar, /'[^']*onderwerp[^']*'|>[^<]*onderwerp[^<]*</i, `${f}: geen "onderwerp" in wat je ziet`)
  }
})

test('dunne dekking: een gratis bron in jouw taal die je nog niet volgt; nooit een betaalmuur, nooit een taal die je niet koos', () => {
  const sources = [{ id: 'nos', lang: 'nl' }, { id: 'tweakers', lang: 'nl' }, { id: 'nrc', lang: 'nl', paid: true }, { id: 'verge', lang: 'en' }]
  const eigen = new Set(['nos'])
  assert.equal(gratisTip({ nrc: 9, verge: 8, tweakers: 3, nos: 1 }, sources, eigen).id, 'tweakers')
  assert.equal(gratisTip({ nrc: 9, verge: 8 }, sources, eigen), null)
  assert.equal(weinigInEigen({ nos: 1, tweakers: 5 }, eigen), true)
  assert.equal(weinigInEigen({ nos: 3 }, eigen), false)
})

test('met de vlag uit verandert er niets: geen route, oude Editie-blok en oude pil, de Stroom in de tijd', () => {
  const app = read('src/App.jsx')
  assert.match(app, /\(volgAan && route\.path === 'volg'\)/, 'de route volg bestaat alleen met de vlag')
  assert.match(app, /page === 'volg' && volgAan/)
  assert.match(app, /volgzaken: volgAan \? prefs\.volgzaken : \[\]/, 'zonder vlag geen labels en geen voorrang')
  assert.match(app, /\{volgAan \? <BeheerBlad/)
  const stream = read('src/views/Stream.jsx')
  assert.match(stream, /volgAan && grens && !bubbelLijst \? weergaveVoorrang/, 'zonder vlag geen voorrang (en niets in de sessie)')
  const edition = read('src/views/Edition.jsx')
  assert.match(edition, /const following = volgAan \? \[\] : followedNow\(/, 'zonder vlag het oude blok Je volgt')
  const story = read('src/views/Story.jsx')
  assert.match(story, /'Volg dit verhaal'/, 'zonder vlag de oude pil')
  const items = read('src/components/Items.jsx')
  assert.match(items, /const zaak = volgAan && story\?\.volgzaak\?\.slug/, 'kaartmenu alleen met de vlag')
  const search = read('src/views/Search.jsx')
  assert.match(search, /if \(!volgAan \|\| !lid/, 'Zoeken duidt alleen met de vlag en een account')
  assert.match(read('netlify/lib/build.mjs'), /volgzakenStand\(\) === 'aan' \? \{ volgzaken: true \} : \{\}/, 'meta.volgzaken alleen bij aan')
})

test('het label: een eigen knop in de rubriekregel met een raakvlak van 44 dat naar boven groeit, nooit over de kop', () => {
  const items = read('src/components/Items.jsx')
  assert.match(items, /className="volglabel" role="button" tabIndex=\{0\} aria-label=\{VOLG_TEKST\.label\(volgt\.label\)\}/)
  assert.match(items, /e\.preventDefault\(\)\n\s*e\.stopPropagation\(\)/, 'tik op het label opent de pagina, niet het verhaal')
  const css = read('src/styles/volg.css')
  assert.match(css, /inset-block: calc\(var\(--lh-1\) - var\(--tap\)\) 0;/, 'boven 44 - regel erbij, onder 0')
  assert.equal(TEKST.label('GTA 6'), 'Je volgt GTA 6, opent de pagina')
})
