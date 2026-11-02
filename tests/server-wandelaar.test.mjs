import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {articleTopics} from '../netlify/lib/topics.mjs'
import {desksOf} from '../netlify/lib/desks.mjs'
const {item}=JSON.parse(fs.readFileSync(new URL('./fixtures/server-wandelaar.json',import.meta.url)))
test('echte Britse wereldtocht blijft buitenland zonder geopolitieke Oekraïne-tag',()=>{
 assert.deepEqual([...desksOf(item)],['buitenland'])
 const result=articleTopics(item)
 assert.ok(!result.topics.includes('oekraine'))
 assert.ok(!result.mainTopics.includes('oekraine'))
})
test('Engelse wereldwandeling noemt Rusland alleen als route',()=>{
 const result=articleTopics({title:'British explorer completes a round-the-world walk',summary:'He crossed Russia on foot after twenty years of travel.'})
 assert.ok(!result.topics.includes('oekraine'))
})
test('oorlog in de kop of eerste zin blijft een werkelijk onderwerp',()=>{
 for(const it of [
  {title:'Britse avonturier wandelt langs de frontlinie in Oekraïne',summary:'De oorlog heeft het gebied verwoest.'},
  {title:'Britse avonturier voltooit wereldtocht te voet',summary:'Hij vluchtte voor Russische troepen tijdens de oorlog in Oekraïne.'},
  {title:'Rusland valt energiecentrale in Oekraïne aan',summary:'De aanval verstoort de stroomvoorziening.'},
 ]) assert.ok(articleTopics(it).topics.includes('oekraine'),it.title)
})
test('een losse oorlogszin verder in de intro wordt geen hoofdonderwerp van de tocht',()=>{
 const it={...item,summary:'Hij trok via de Beringstraat door Rusland. Jaren later brak de oorlog in Oekraïne uit.'}
 assert.ok(!articleTopics(it).topics.includes('oekraine'))
})
