// Begrippen uit het nieuws, kort uitgelegd — pure functies (tests/glossary.test.mjs).
// Een vaste, nagelopen lijst (geen AI): neutraal, één of twee zinnen, met Wikipedia als bron om
// verder te lezen. Alleen begrippen die vaak in Nederlandstalig nieuws staan en die niet
// iedereen paraat heeft. Een begrip toevoegen: een regel erbij in shared/glossary.json, met een `pattern`
// die het woord (en zijn vormen) vindt maar geen gewone woorden die er toevallig op lijken; daarna npm run build:core.
// De lijst staat in shared/glossary.json: de app (ios/Hoot/Glossary.swift) leest hetzelfde bestand, zodat web en
// app dezelfde begrippen vinden (toets: tests/fixtures/glossary-cases.json, hier en in GlossaryTests.swift).
import glossary from '../../shared/glossary.json' with { type: 'json' }

export const TERMS = glossary.terms.map((t) => ({ term: t.term, match: new RegExp(t.pattern, t.flags), text: t.text, source: t.source }))

// De begrippen die in een tekst voorkomen, in volgorde van de lijst; hooguit `max`.
export function termsIn(text = '', max = 2) {
  const found = []
  for (const t of TERMS) {
    if (found.length >= max) break
    if (t.match.test(text)) found.push(t)
  }
  return found
}
