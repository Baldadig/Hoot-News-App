import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFile } from 'node:fs/promises'
import { layout, cardFormat, titleLines, cardText } from '../../shared/deelkaart.mjs'

const assets = Promise.all([
  readFile(new URL('../../shared/deelkaart/Newsreader-800.ttf', import.meta.url)),
  readFile(new URL('../../shared/deelkaart/SourceSans3-600.ttf', import.meta.url)),
  readFile(new URL('../../public/brand/hoot-logo-mono.svg', import.meta.url), 'utf8'),
])
const el = (type, style, children, props = {}) => ({ type, props: { style, children, ...props } })
export async function renderCard(item, format = 'link') {
  const f = cardFormat(format)
  if (!f) throw new Error('Onbekend formaat')
  const [serif, sans, logo] = await assets
  const { lines, size } = titleLines(item.title, format)
  const text = (value, y, fontSize, extra = {}) => el('div', { position: 'absolute', top: y, left: f.margin, width: f.width - 2 * f.margin, fontSize, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden', ...extra }, value)
  const rule = y => el('div', { position: 'absolute', top: y, left: f.margin, width: f.width - 2 * f.margin, height: 1, backgroundColor: layout.paper })
  const tree = el('div', { display: 'flex', position: 'relative', width: f.width, height: f.height, color: layout.paper, backgroundColor: layout.red, fontFamily: 'Source Sans 3', fontWeight: 600 }, [
    rule(f.ruleTop),
    el('img', { position: 'absolute', top: f.logoY, left: f.margin, width: f.logoWidth, height: f.logoWidth * 73.5 / 239.45 }, undefined, { src: `data:image/svg+xml;base64,${Buffer.from(logo.replaceAll('#000000', layout.paper)).toString('base64')}` }),
    rule(f.ruleBottom),
    text(cardText(item.section || 'Nieuws').toUpperCase(), f.kickerY, f.kickerSize, { letterSpacing: 2 }),
    ...lines.map((line, i) => text(line, f.titleY + i * size * f.lineHeight, size, { fontFamily: 'Newsreader', fontWeight: 800 })),
    rule(f.hairlineY), text(cardText(item.sourceName || item.source || 'Hoot'), f.sourceY, f.sourceSize),
    text(layout.domain, f.siteY, f.siteSize),
  ])
  const svg = await satori(tree, { width: f.width, height: f.height, fonts: [{ name: 'Newsreader', data: serif, weight: 800 }, { name: 'Source Sans 3', data: sans, weight: 600 }] })
  return new Resvg(svg).render().asPng()
}
