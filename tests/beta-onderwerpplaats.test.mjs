import {test} from 'node:test'
import assert from 'node:assert/strict'
import {subjectPlaceOf,desksOf,primaryDesk} from '../netlify/lib/desks.mjs'
const desk=i=>primaryDesk([desksOf(i)])
test('verkiezingsplaats wint van het land dat in een Amerikaans campagnedebat besproken wordt',()=>{
  const article={source:'volkskrant',title:'Ruzie over Israël bederft eenheid Democraten in Michigan',summary:'De kansen bij tussentijdse verkiezingen in Michigan worden kleiner.',url:'https://www.volkskrant.nl/buitenland/michigan'}
  assert.equal(desk(article),'vs')
  assert.deepEqual(subjectPlaceOf(article).countries,['us'])
  assert.equal(subjectPlaceOf(article).basis,'verkiezingsplaats')
  assert.equal(desk({source:'nyt',title:'Iran Braces for More War, No Matter the Outcome of the U.S. and Israeli Elections',summary:'President Trump faces a midterm fight.',url:'https://nytimes.com/world/middleeast/iran-war'}),'middenoosten','een besproken buitenlandse verkiezing is geen plaats van de hoofdgebeurtenis')
  assert.equal(desk({source:'nyt',title:'El-Sayed’s Campaign Doesn’t Want Haley Stevens at His Events',summary:'A debate about Israel divides the candidates.',url:'https://nytimes.com/2026/11/01/us/politics/el-sayed-haley-stevens.html'}),'vs')
})
test('India en een lokaal protest worden niet naar de uitgever of organisatienaam ingedeeld',()=>{
  for(const source of ['nyt','nos','bbc']) {
    assert.equal(desk({source,title:'India’s Congress Party Holds Mass Protest in New Delhi',summary:'President Trump follows developments.',url:'https://example.com/world/india'}),'buitenland')
    assert.equal(desk({source,title:'Meer dan 300 arrestaties bij protest Palestine Action in Londen'}),'buitenland')
    assert.equal(desk({source,title:'Minderjarigen aangehouden in Den Haag',summary:'Protesten in Frankrijk vormen de achtergrond.'}),'binnenland')
  }
  assert.deepEqual(subjectPlaceOf({source:'nyt',title:'Talks resume tomorrow'}).countries,[])
})
test('vak- en leefstijlstukken en sportsamenstellingen zijn geen vals Binnenland',()=>{
  for(const title of ['Recept: soep van linzen','Wat Eten We Vandaag: soep','Een spannende eredivisiewedstrijd','De veldrijders starten op de Koppenberg']) assert.equal(desk({source:'nos',title}),null,title)
  assert.equal(desk({source:'wired',title:'Cosmic debris reveals the end of the solar system'}),'wetenschap')
})
