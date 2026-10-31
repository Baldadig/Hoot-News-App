import { rmSync, readFileSync, writeFileSync } from 'node:fs'
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mergeHeaders } from './merge-headers.mjs'
rmSync('dist', { recursive: true, force: true })
for (const args of [['node_modules/vite/bin/vite.js', 'build'], ['landing/build.mjs']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
// Eén blok per pad (scripts/merge-headers.mjs); het losse bestand onder /lees/ is dan overbodig.
writeFileSync('dist/_headers', mergeHeaders(readFileSync('dist/_headers', 'utf8'), readFileSync('dist/lees/_headers', 'utf8'), '/sw.js\n  Cache-Control: no-cache\n'))
rmSync('dist/lees/_headers', { force: true })
// De oude root-worker stopt met het onderscheppen van de nieuwe voordeur. De nieuwe worker
// staat uitsluitend onder /lees/. Instellingen en opgeslagen berichten worden niet gewist.
writeFileSync('dist/sw.js', `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister().then(()=>self.clients.matchAll({type:'window'})).then(cs=>Promise.all(cs.map(c=>c.navigate(c.url))))));\n`)

await build({ entryPoints: ['scripts/move-out.js'], outfile: 'dist/lees/move-out.js', bundle: true, minify: true, platform: 'browser', target: 'es2022' })
