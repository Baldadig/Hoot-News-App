// Alleen meten, nooit labels of regels aanpassen. Zonder vlag uitsluitend ontwikkeling.
// --final opent ook de bevroren controle; --regression meet alleen de bekende regressies.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { desksOf, primaryDesk } from '../netlify/lib/desks.mjs'
import { EDITOR_REVISION } from '../shared/editor-version.mjs'
const root = new URL('../', import.meta.url)
const read = p => readFileSync(new URL(p, root))
const fixture = JSON.parse(read('tests/fixtures/categorie-set-v2.json'))
const provenance = JSON.parse(read('docs/codex-blokken/categorie/provenance.json'))
for (const [file, hash] of Object.entries(provenance.hashes)) {
  if (createHash('sha256').update(read('docs/codex-blokken/categorie/'+file)).digest('hex') !== hash) throw Error('Bevroren annotatie gewijzigd: '+file)
}
// De daadwerkelijk gescoorde fixture moet ook exact bij de bevroren invoer/labels passen.
const frozenLabels = JSON.parse(read('docs/codex-blokken/categorie/v2a-blinde-labels.json'))
const frozenInput = new Map(JSON.parse(read('docs/codex-blokken/categorie/v2a-blinde-invoer.json')).map(r=>[r.id,r]))
const actual = new Map(fixture.cases.filter(r=>r.cohort==='v2a').map(r=>[r.id,r]))
if (actual.size !== frozenLabels.length) throw Error('V2a-set gewijzigd sinds bevriezing')
for (const frozen of frozenLabels) {
  const row = actual.get(frozen.id)
  if (!row || !isDeepStrictEqual({id:row.id,split:row.split,group:row.group,label:row.label},frozen)) throw Error('Gescoord label of split wijkt af: '+frozen.id)
  const input = frozenInput.get(frozen.id)
  for (const [key,value] of Object.entries(input)) if (!isDeepStrictEqual(row.article[key]??null,value)) throw Error('Gescoorde tekst wijkt af: '+frozen.id+' '+key)
}
const groups = new Map(), ids = new Set()
for (const row of fixture.cases) {
  const key = row.cohort+':'+row.id
  if (ids.has(key)) throw Error('Dubbele id: '+key)
  ids.add(key)
  if (groups.has(row.group) && groups.get(row.group) !== row.split) throw Error('Gebeurtenis lekt tussen splits: '+row.group)
  groups.set(row.group,row.split)
}
// Alle voorspellingen lokaal afgeleid uit dezelfde ongewijzigde classifier; voorspellingen uit de feed negeren.
const labels = ['binnenland','buitenland','vs','middenoosten','oekraine','wetenschap','overig']
const matrix = () => Object.fromEntries(labels.map(a=>[a,Object.fromEntries(labels.map(b=>[b,0]))]))
function metrics(rows) {
  const confusion = matrix(), perDesk = Object.fromEntries(labels.map(l=>[l,{expected:0,predicted:0,correct:0}]))
  let scored=0,correct=0,rawUnknown=0,uncertainGold=0
  const disagreements=[]
  for (const row of rows) {
    const raw = primaryDesk([desksOf(row.article)])
    if (!raw) rawUnknown++
    const predicted=raw||'overig', expected=row.label.desk
    if (!expected || row.label.uncertain?.desk) { uncertainGold++; continue }
    if (!labels.includes(expected) || !labels.includes(predicted)) throw Error('Onbekend label')
    scored++; confusion[expected][predicted]++;perDesk[expected].expected++;perDesk[predicted].predicted++
    if (expected===predicted) { correct++;perDesk[expected].correct++ }
    else disagreements.push({id:row.id,expected,predicted,rawUnknown:!raw})
  }
  for (const c of Object.values(perDesk)) {
    c.precision=c.predicted?c.correct/c.predicted:null
    c.recall=c.expected?c.correct/c.expected:null
  }
  return {total:rows.length,scored,uncertainGold,correct,accuracy:scored?correct/scored:null,unknown:{raw:rawUnknown,coverage:rows.length?(rows.length-rawUnknown)/rows.length:null,note:'Raw null kan bewust Overig zijn; dit is classifierdekking, geen foutpercentage. Onzekere goudrubrieken zijn niet gescoord.'},perDesk,confusion,disagreements}
}
const splits=process.argv.includes('--regression')?['regression']:process.argv.includes('--final')?['development','control']:['development']
const results={}
for (const cohort of [...new Set(fixture.cases.map(r=>r.cohort))]) for (const split of splits) {
  const rows=fixture.cases.filter(r=>r.cohort===cohort&&r.split===split)
  if(!rows.length)continue
  results[cohort+':'+split]={...metrics(rows),byGeographicalClass:Object.fromEntries(['domestic','foreign','multiple','global','unknown'].map(g=>[g,metrics(rows.filter(r=>(r.label.geographicalClass||'unknown')===g))]))}
}
console.log(JSON.stringify({revision:EDITOR_REVISION,annotation:fixture.annotation,controlOpened:process.argv.includes('--final'),v2b:fixture.v2b,geography:'Rubriekmetingen gestratificeerd op onafhankelijk gelabelde geografie. De huidige classifier levert geen apart landveld; land-precision/recall kan daarom niet eerlijk worden gemeten. Geen uitgeversland als vervanging.',results},null,2))
