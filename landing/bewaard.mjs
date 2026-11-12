// Vult de landing met de bewaarde, echte Editie uit landing/bewaard.json (zie landing/bewaar.mjs). Dit is de terugval (B):
// de held en Hoot kiest tonen hem tot de live voorpagina (hoot.js) binnen is; de Editie-, Stroom- en Selectie-demo's
// tonen hem altijd. Alleen kop, uitgever en datum; een rubriek alleen als die zeker is. Geen verzonnen kranten.
const SLOT = { ochtend: 'Ochtendeditie', middag: 'Middageditie', avond: 'Avondeditie' }
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
export const reden = (n) => (n >= 5 ? 'Groot nieuws' : n >= 2 ? `${n} bronnen schrijven erover` : 'Ook het lezen waard')

const bron = (x, wanneer, metAantal = true) =>
  `<div class="k-bron"><i>${ini(x.source)}</i><span>${esc(x.source)}<small>${esc(wanneer)}</small></span>${metAantal && x.sourceCount >= 2 ? `<b class="k-n">${x.sourceCount} bronnen</b>` : ''}${BM}</div>`
const kick = (nr, desk) => (label(desk) ? `<div class="k-kick">${nr ? `<span class="k-nr">${nr}</span>` : ''}${label(desk)}</div>` : nr ? `<div class="k-kick k-kick--los"><span class="k-nr">${nr}</span></div>` : '')

export function fragmenten(b) {
  const { kort, lang } = datum(b.date)
  const slot = SLOT[b.slot] || 'Editie'
  const [v1, v2] = b.voorpagina.entries
  const v3 = b.voorpagina.bubble || b.voorpagina.entries[2]
  const ns = [v1, v2, v3].map((x) => x.sourceCount || 1)
  // Hoot kiest: de drie plekken met hun waarom-markering. De bubbel heeft geen nummer.
  const rd = (x, i, ipad) => {
    const w = `w${i + 1}`
    const nr = i < 2 ? `0${i + 1}` : ''
    // zelfde regel als redenen() in hoot.js: plek 2 is nooit ook Groot nieuws
    const mark = i === 2 ? (b.voorpagina.bubble ? 'Buiten je bubbel' : 'Ook het lezen waard') : i === 0 && ns[0] >= 5 ? `Groot nieuws · ${ns[0]} bronnen` : ns[i] >= 2 ? `${ns[i]} bronnen schrijven erover` : 'Ook het lezen waard'
    const beeld = ipad && i > 0 ? `<svg class="k-beeld2" viewBox="0 0 320 160"><use href="#${i === 1 ? 'il-c' : 'il-iris'}"/></svg>` : ''
    return `<div class="rd-item ${ipad && i === 0 ? 'k-lead' : 'k'}">${kick(nr, x.desk)}<div class="k-why"><mark data-w="${w}">${esc(mark)}</mark></div><div class="k-kop${ipad && i === 0 ? ' k-kop--lead' : ''}">${esc(x.title)}</div>${beeld}${bron(x, kort, i < 2)}</div>`
  }
  const lijst = [v1, v2, v3]
  const ed = b.editie
  return {
    BW_SLOT: slot,
    BW_DAG: lang,
    BW_HELD_LABEL: esc(`De ${slot} van ${lang} op iPhone, met het hoofdverhaal: ${v1.title}`),
    // De held: het hoofdverhaal zonder rubriek, alleen het nummer (besluit Alex).
    BW_HELD: `<div class="k-kick k-kick--los"><span class="k-nr">01</span></div><div class="k-why">${esc(reden(ns[0]))}</div><div class="k-kop k-kop--lead">${esc(v1.title)}</div>${bron(v1, kort)}`,
    BW_RD_N: ns.join(' '),
    BW_RD_IPAD_TOP: rd(v1, 0, true),
    BW_RD_IPAD_KOL: rd(v2, 1, true) + rd(v3, 2, true),
    BW_RD_TEL: lijst.map((x, i) => rd(x, i, false)).join('\n        '),
    BW_ED_LEAD: `${kick('01', ed[0].desk)}<div class="k-why">${esc(reden(ed[0].sourceCount))}</div><div class="k-kop k-kop--lead">${esc(ed[0].title)}</div>${bron(ed[0], kort)}`,
    BW_ED_TWEE: `${kick('02', ed[1].desk)}<div class="k-why">${esc(reden(ed[1].sourceCount))}</div><div class="k-kop">${esc(ed[1].title)}</div><svg class="k-beeld2" viewBox="0 0 320 160"><use href="#il-iris"/></svg>${bron(ed[1], kort)}`,
    BW_ED_REST: ed.slice(2, 10).map((x, i) => `<li><span class="sc-nr">${String(i + 3).padStart(2, '0')}</span>${esc(x.title)}</li>`).join(''),
    BW_ED_BUBBEL: b.bubbel ? `${kick('', b.bubbel.desk)}<div class="k-why">Buiten je bubbel</div><div class="k-kop">${esc(b.bubbel.title)}</div>${bron(b.bubbel, kort, false)}` : '',
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
