import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const result=await build({entryPoints:['src/components/WaitingMark.jsx'],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external'})
const module={exports:{}}
new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const render=props=>renderToStaticMarkup(React.createElement(module.exports.WaitingMark,props))
test('WaitingMark: standaard blijft bij bronnen, aangepaste tekst verschijnt zichtbaar en toegankelijk',()=>{
  assert.match(render({}),/Even kijken bij je bronnen/)
  const html=render({label:'Artikel laden'})
  assert.match(html,/role="status"/);assert.match(html,/<span>Artikel laden<\/span>/)
  assert.doesNotMatch(html,/Even kijken bij je bronnen/)
})
test('WaitingMark: stille markering draagt dezelfde passende schermlezertekst',()=>{
  const html=render({text:false,label:'Artikel laden'})
  assert.match(html,/role="status"/);assert.match(html,/aria-label="Artikel laden"/)
  assert.doesNotMatch(html,/<span>Artikel laden<\/span>|Even kijken bij je bronnen/)
})
