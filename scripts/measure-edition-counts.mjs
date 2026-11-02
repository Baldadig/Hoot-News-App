import fs from 'node:fs'
import {loadSnapshot,editionsNu,contextOf,keyOf,pairwise} from '../tests/helpers/snapshot.mjs'
const snapshot=loadSnapshot(),ctx=contextOf(snapshot),eds=editionsNu(snapshot)
const keys=regular=>eds.map(({edition})=>new Set(edition.entries.filter(e=>!regular || e.desk!=='bubbel').map(e=>keyOf(e,ctx))))
const result={rows:eds.map(({persona,edition})=>({persona:persona.id,regular:edition.entries.filter(e=>e.desk!=='bubbel').length,bubble:edition.entries.filter(e=>e.desk==='bubbel').length,bubbleIsLast:!edition.entries.some(e=>e.desk==='bubbel')||edition.entries.at(-1).desk==='bubbel'})),jaccardAll:pairwise(keys(false)),jaccardRegular:pairwise(keys(true))}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
