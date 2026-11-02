// Bundelt de rekenkern van De Redacteur voor de iPhone (bouwspec §9): src/lib/editionCore.js met
// alles wat het importeert → ios/Hoot/Resources/edition-core.js, één IIFE die `globalThis.HootCore`
// zet. esbuild komt al mee met vite. De uitvoer is deterministisch (geen tijdstip, paden relatief aan
// de repo), zodat het ingecheckte bestand te toetsen is tegen een verse build (tests/editionGolden.test.mjs).
//
//   npm run build:core            bouwt en schrijft
//   node scripts/build-edition-core.mjs --check   alleen vergelijken met het ingecheckte bestand
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const ENTRY = 'src/lib/editionCore.js'
export const OUT = 'ios/Hoot/Resources/edition-core.js'

const HEADER = [
  '// Hoot — De Redacteur, rekenkern voor de iPhone. Gegenereerd uit src/lib/editionCore.js door',
  '// scripts/build-edition-core.mjs (npm run build:core). Niet met de hand bewerken: pas de bron aan',
  '// en bouw opnieuw. Web en app rekenen met precies deze code (bouwspec §9).',
].join('\n')

// Het alfabet van JavaScriptCore op iOS 26: ES2022 is ruim genoeg, en zo blijven klassen, ?. en ??
// staan zoals in de bron (minder vertaling, makkelijker lezen bij een fout op het toestel).
export async function buildCore() {
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'HootCore',
    platform: 'neutral',
    target: ['es2022'],
    charset: 'utf8',
    legalComments: 'none',
    minify: false,
    treeShaking: true,
    logLevel: 'silent',
    banner: { js: HEADER },
  })
  return result.outputFiles[0].text
}

export const hashOf = (text) => createHash('sha256').update(text).digest('hex')
export const readCore = () => readFileSync(resolve(ROOT, OUT), 'utf8')

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const fresh = await buildCore()
  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = readCore()
    } catch {}
    if (hashOf(current) !== hashOf(fresh)) {
      console.error(`${OUT} loopt achter op ${ENTRY}: draai npm run build:core`)
      process.exit(1)
    }
    console.log(`${OUT} is bij (${hashOf(fresh).slice(0, 12)})`)
  } else {
    mkdirSync(dirname(resolve(ROOT, OUT)), { recursive: true })
    writeFileSync(resolve(ROOT, OUT), fresh)
    copyFileSync(resolve(ROOT, 'shared/slots.json'), resolve(ROOT, 'ios/Hoot/Resources/slots.json'))
    copyFileSync(resolve(ROOT, 'shared/edition-limits.json'), resolve(ROOT, 'ios/Hoot/Resources/edition-limits.json'))
    copyFileSync(resolve(ROOT, 'shared/edition-display.json'), resolve(ROOT, 'ios/Hoot/Resources/edition-display.json'))
    console.log(`${OUT}: ${(fresh.length / 1024).toFixed(0)} kB, sha256 ${hashOf(fresh).slice(0, 12)}`)
  }
}
