// Voor/na-beelden van het pakket Merk en normen: deelkaarten en lege bladzijden (web).
// node scripts/merk-shots.mjs <map>   (Chrome headless voor de lege bladzijden)
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { renderCard } from '../netlify/lib/deelkaart.mjs'

const out = process.argv[2]
await mkdir(out, { recursive: true })
for (const [source, sourceName] of [['nos', 'NOS'], ['nrc', 'NRC'], ['guardian', 'The Guardian'], ['onbekend', 'Onbekende Bron']]) {
  for (const format of ['link', 'staand']) {
    const png = await renderCard({ id: 'x', title: 'De stad krijgt meer groen en minder auto’s in het centrum', section: 'Binnenland', source, sourceName }, format)
    await writeFile(`${out}/web-deelkaart-${source}-${format}.png`, png)
  }
}
const tmp = await mkdtemp(join(tmpdir(), 'merk-shots-'))
const src = fileURLToPath(new URL('../src/', import.meta.url))
const entry = join(tmp, 'entry.jsx')
await writeFile(entry, `import { renderToStaticMarkup } from 'react-dom/server'
import { Empty } from '${src}components/Shell.jsx'
import * as I from '${src}components/icons.jsx'
export default () => renderToStaticMarkup(<div style={{display:'grid',gridTemplateColumns:'repeat(3,390px)',gap:'0'}}>
  {[['SavedArt','Nog niets bewaard','Tik op de bladwijzer bij een verhaal.'],['SearchArt','Waar zoek je naar?','In koppen en intro’s van je Stroom.'],['EditionArt','Er is nog geen Editie','In de Stroom staat alles wat er wél is.']].map(([a,t,x]) => <div key={a} className="col col--read" style={{padding:'0 16px'}}><Empty art={I[a]} title={t} action={<a className="btn" href="#">Naar de Editie</a>}>{x}</Empty></div>)}
</div>)`)
const bundle = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', loader: { '.svg': 'text', '.png': 'empty', '.woff2': 'empty' }, nodePaths: [fileURLToPath(new URL('../node_modules', import.meta.url))], logLevel: 'error', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } })
const mod = join(tmp, 'bundle.mjs')
await writeFile(mod, bundle.outputFiles[0].text)
const markup = (await import(mod)).default()
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
for (const theme of ['light', 'dark', 'night']) {
  const html = `${out}/_leeg-${theme}.html`
  await writeFile(html, `<!doctype html><html data-theme="${theme}"><meta charset="utf-8"><style>${css}</style><style>.empty--page{min-height:560px;translate:none}</style><body style="margin:0;width:1170px;background:var(--paper)">${markup}</body></html>`)
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--screenshot=${out}/web-leeg-${theme}.png`, '--window-size=1170,640', '--force-device-scale-factor=1', 'file://' + html], { stdio: 'ignore' })
}
