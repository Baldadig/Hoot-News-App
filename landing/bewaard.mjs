// Vult de landing met de bewaarde, echte Editie uit landing/bewaard.json (zie landing/bewaar.mjs). Dit is de terugval (B):
// de held en Hoot kiest tonen hem tot de live voorpagina (hoot.js) binnen is; de Editie-, Stroom- en Selectie-demo's
// tonen hem altijd. Alleen kop, uitgever en datum; een rubriek alleen als die zeker is. Geen verzonnen kranten.
import { SOURCES } from '../netlify/lib/sources.mjs'
const SLOT = { ochtend: 'Ochtendeditie', middag: 'Middageditie', avond: 'Avondeditie' }
const VOLGENDE = { ochtend: 'vanmiddag', middag: 'vanavond', avond: 'morgenochtend' }
// Zelfde woorden als de app; Buitenland heet op de landing Wereld (de Stroom-tab).
export const RUBRIEK = { binnenland: 'Binnenland', buitenland: 'Wereld', cultuur: 'Cultuur', tech: 'Tech', wetenschap: 'Wetenschap', sport: 'Sport', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne' }
const MAAND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const WEEKDAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ini = (b) => esc(String(b).replace(/^(de|het|the)\s+/i, '').charAt(0).toUpperCase())
const BM = '<svg class="sc-bm" viewBox="0 0 14 18"><use href="#i-bm"/></svg><svg class="k-meer" viewBox="0 0 24 24"><use href="#i-meer"/></svg>'
export const label = (desk) => RUBRIEK[desk] || ''

export function datum(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  return { kort: `${d} ${MAAND[m - 1]}`, lang: `${WEEKDAG[dt.getUTCDay()]} ${d} ${MAAND[m - 1]}` }
}
// Eén beslisregel voor de waarom-markering in Hoot kiest, gelijk aan redenen() in hoot.js. Plek 3 is 'Buiten je bubbel'
// alleen als de Editie echt een bubbel heeft; anders 'Ook het lezen waard'. Geeft null als twee plekken dezelfde reden krijgen.
export const REDEN = {
  groot: ['Groot nieuws', 'Veel bronnen schrijven erover.'],
  meer: ['Meerdere bronnen', 'Meer dan één bron schrijft erover.'],
  eigen: ['Ook het lezen waard', 'Eén bron schrijft erover, en het is de moeite waard.'],
  bubbel: ['Buiten je bubbel', 'Iets wat je anders niet had gelezen.'],
}
export function redenen(ns, bubbel) {
  const s0 = ns[0] >= 5 ? 'groot' : ns[0] >= 2 ? 'meer' : 'eigen'
  const s1 = ns[1] >= 2 ? (s0 !== 'meer' ? 'meer' : null) : 'eigen' // 'eigen' ("Eén bron") alleen bij echt één bron
  const s2 = bubbel ? 'bubbel' : ns[2] >= 2 ? null : 'eigen'
  return s1 && s2 && new Set([s0, s1, s2]).size === 3 ? [s0, s1, s2] : null
}
const markering = (soort, n) => (soort === 'groot' ? `Groot nieuws · ${n} bronnen` : soort === 'meer' ? `${n} bronnen schrijven erover` : REDEN[soort][0])
export const reden = (n) => (n >= 5 ? 'Groot nieuws' : n >= 2 ? `${n} bronnen schrijven erover` : 'Ook het lezen waard')

// Zonder `wanneer` (de Editie-demo) alleen de bronnaam: geen datum die naast de held van vandaag oud oogt.
// Het echte logo van de bron (landing/bronnen/<id>.webp) als de naam in de catalogus staat; anders de beginletter.
const ID_VAN = new Map(SOURCES.map((s) => [s.name, s.id]))
const logo = (x) => {
  const id = x.sourceId || ID_VAN.get(x.source)
  return id ? `<img src="/img/bronnen/${esc(id)}.webp" alt="" width="24" height="24" loading="lazy">` : `<i>${ini(x.source)}</i>`
}
const bron = (x, wanneer, metAantal = true) =>
  `<div class="k-bron">${logo(x)}<span>${esc(x.source)}${wanneer ? `<small>${esc(wanneer)}</small>` : ''}</span>${metAantal && x.sourceCount >= 2 ? `<b class="k-n">${x.sourceCount} bronnen</b>` : ''}${BM}</div>`
const kick = (nr, desk) => (label(desk) ? `<div class="k-kick">${nr ? `<span class="k-nr">${nr}</span>` : ''}${label(desk)}</div>` : nr ? `<div class="k-kick k-kick--los"><span class="k-nr">${nr}</span></div>` : '')

// Het bronnenblok ("Eén verhaal, veel bronnen"): de breedste verhalen van de bewaarde Editie, of anders plek 01.
// Zelfde opmaak als vhTeken() in hoot.js: hooguit VH_LOGOS logo's, daarna een schijf met de rest.
export const VH_LOGOS = 8
export const vhAantal = (x) => Math.max(Number(x.sourceCount) || 1, (x.sources || []).length)
export function vhTekst(x) {
  const n = vhAantal(x), namen = (x.sources || []).slice(0, 3).map((s) => s.name), rest = n - namen.length
  const kop = `<b>${n === 1 ? '1 bron' : n + ' bronnen'}</b> ${n === 1 ? 'schrijft' : 'schrijven'} erover`
  return namen.length ? `${kop}: ${esc(namen.join(', '))}${rest > 0 ? ` en ${rest} andere` : ''}.` : `${kop}.`
}
export function verhaalVelden(b) {
  const lijst = (b.voorpagina.breed?.length ? b.voorpagina.breed : [b.voorpagina.entries[0]]).map((x) => ({ title: x.title, sourceCount: x.sourceCount, sources: x.sources || [] }))
  const x = lijst[0], n = vhAantal(x), toon = x.sources.slice(0, VH_LOGOS)
  return {
    BW_VH_DATA: esc(JSON.stringify(lijst)),
    BW_VH_KOP: esc(x.title),
    BW_VH_LABEL: esc(x.sources.length ? `De logo's van ${x.sources.slice(0, 3).map((s) => s.name).join(', ')}${n > 3 ? ` en ${n - 3} andere bronnen` : ''}` : 'De bronnen van dit verhaal'),
    BW_VH_STAPEL: toon.map((s) => `<img src="/img/bronnen/${esc(s.id)}.webp" alt="" width="40" height="40">`).join('') + (n > toon.length && toon.length ? `<span class="vh-meer">+${n - toon.length}</span>` : ''),
    BW_VH_TEL: vhTekst(x),
  }
}

export function fragmenten(b) {
  if (!b?.selectie?.velden?.length) throw new Error('landing/bewaard.json heeft geen Selectie; ververs met node landing/bewaar.mjs.')
  const { kort, lang } = datum(b.date)
  const slot = SLOT[b.slot] || 'Editie'
  const [v1, v2] = b.voorpagina.entries
  const v3 = b.voorpagina.bubble || b.voorpagina.entries[2]
  const ns = [v1, v2, v3].map((x) => x.sourceCount || 1)
  const rds = redenen(ns, !!b.voorpagina.bubble)
  if (!rds) throw new Error('landing/bewaard.json: Hoot kiest heeft geen drie verschillende redenen; ververs met node landing/bewaar.mjs.')
  // Hoot kiest: de drie plekken met hun waarom-markering. De bubbel heeft geen nummer.
  const rd = (x, i, ipad) => {
    const w = `w${i + 1}`
    const nr = i < 2 ? `0${i + 1}` : ''
    const mark = markering(rds[i], ns[i])
    const beeld = ipad && i > 0 ? `<svg class="k-beeld2" viewBox="0 0 320 160"><use href="#${i === 1 ? 'il-c' : 'il-iris'}"/></svg>` : ''
    return `<div class="rd-item ${ipad && i === 0 ? 'k-lead' : 'k'}">${kick(nr, x.desk)}<div class="k-why"><mark data-w="${w}">${esc(mark)}</mark></div><div class="k-kop${ipad && i === 0 ? ' k-kop--lead' : ''}">${esc(x.title)}</div>${beeld}${bron(x, kort, false)}</div>`
  }
  const lijst = [v1, v2, v3]
  const ed = b.editie
  return {
    BW_SLOT: slot,
    BW_SLOT_ID: SLOT[b.slot] ? b.slot : 'avond',
    BW_DAG: lang,
    BW_DATUM: esc(b.date),
    BW_VOLGENDE: VOLGENDE[b.slot] || 'morgenochtend',
    BW_HELD_LABEL: esc(`De ${slot} van ${lang}, met het hoofdverhaal: ${v1.title}. Lees verder in Hoot`),
    // De held: het hoofdverhaal zonder rubriek, alleen het nummer (besluit Alex).
    BW_HELD: `<div class="k-kick k-kick--los"><span class="k-nr">01</span></div><div class="k-why">${esc(reden(ns[0]))}</div><div class="k-kop k-kop--lead">${esc(v1.title)}</div>${bron(v1, kort)}`,
    ...verhaalVelden(b),
    BW_RD_N: ns.join(' '),
    BW_RD_BUBBEL: b.voorpagina.bubble ? 'ja' : 'nee',
    BW_RD_UITLEG: rds.map((r, i) => `<li class="${i === 1 ? 'l' : 'r'}" data-bij="w${i + 1}"><b>${REDEN[r][0]}</b>${REDEN[r][1]}</li>`).join('\n      '),
    BW_RD_IPAD_TOP: rd(v1, 0, true),
    BW_RD_IPAD_KOL: rd(v2, 1, true) + rd(v3, 2, true),
    BW_RD_TEL: lijst.map((x, i) => rd(x, i, false)).join('\n        '),
    BW_ED_LEAD: `${kick('01', ed[0].desk)}<div class="k-why">${esc(reden(ed[0].sourceCount))}</div><div class="k-kop k-kop--lead">${esc(ed[0].title)}</div>${bron(ed[0], '')}`,
    BW_ED_TWEE: `${kick('02', ed[1].desk)}<div class="k-why">${esc(reden(ed[1].sourceCount))}</div><div class="k-kop">${esc(ed[1].title)}</div><svg class="k-beeld2" viewBox="0 0 320 160"><use href="#il-iris"/></svg>${bron(ed[1], '')}`,
    BW_ED_REST: ed.slice(2, 10).map((x, i) => `<li><span class="sc-nr">${String(i + 3).padStart(2, '0')}</span>${esc(x.title)}</li>`).join(''),
    // Geen bubbel in deze Editie: dan ook geen leeg bubbelblok.
    BW_ED_BUBBEL: b.bubbel ? `<div class="sc-bubbel"><div class="k">${kick('', b.bubbel.desk)}<div class="k-why">Buiten je bubbel</div><div class="k-kop">${esc(b.bubbel.title)}</div>${bron(b.bubbel, '', false)}</div></div>` : '',
    BW_SEL_WEEK: `Week ${b.selectie.week}`,
    BW_SEL_LEDE: `${b.selectie.velden.reduce((n, v) => n + v.count, 0)} stukken in ${b.selectie.velden.length} onderwerpen`,
    BW_SEL_INHOUD: b.selectie.velden.map((v) => `<div class="sc-irij"><span><b>${esc(v.label)}</b><small>${v.count} stukken</small></span><svg viewBox="0 0 24 24"><use href="#i-neer"/></svg></div>`).join('\n            '),
    BW_SEL_LABEL: esc(`De Selectie op iPhone: de inhoud bovenaan, met ${b.selectie.velden.map((v) => v.label.replace(/&/g, 'en')).join(' en ')}`),
    BW_SEL_ONDERWERP: `<b>${esc(b.selectie.velden[0].label)}</b><small>${b.selectie.velden[0].count} stukken</small>`,
    BW_SEL_KAART: `<div class="k-kop">${esc(b.selectie.kaart.title)}</div>${bron({ ...b.selectie.kaart, sourceCount: 1 }, `Week ${b.selectie.week}`, false)}`,
    // De Stroom: per tab de nieuwste berichten, de eerste met een eigen illustratie; "Hier was je gebleven" in Alles.
    PANELEN: Object.entries(b.stroom).map(([k, arr]) => {
      const items = arr.map((x, i) => `<div class="k"><div class="k-kop">${esc(x.title)}</div>${i === 0 ? `<svg class="k-beeld2" viewBox="0 0 320 160"><use href="#${{ alles: 'il-c', binnenland: 'il-a', wereld: 'il-c', cultuur: 'il-iris' }[k]}"/></svg>` : ''}${bron(x, kort, false)}</div>`)
      if (k === 'alles') items.splice(1, 0, '<div class="sc-hier">Hier was je gebleven</div>')
      return `<div class="sc-lijst" data-pan="${k}"${k === 'alles' ? '' : ' hidden'}>${items.join('')}</div>`
    }).join(''),
  }
}

export const vulBewaard = (html, b) => {
  const f = fragmenten(b)
  return html.replace(/\{\{((?:BW_\w+)|PANELEN)\}\}/g, (_, k) => f[k])
}
