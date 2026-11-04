import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFile } from 'node:fs/promises'
import { layout, cardFormat, titleLines, cardText } from '../../shared/deelkaart.mjs'
import publisherMarks from '../../shared/deelkaart/publisher-marks.json' with { type: 'json' }

const assets = Promise.all([
  readFile(new URL('../../shared/deelkaart/Newsreader-800.ttf', import.meta.url)),
  readFile(new URL('../../shared/deelkaart/SourceSans3-600.ttf', import.meta.url)),
  readFile(new URL('../../public/brand/hoot-logo-mono.svg', import.meta.url), 'utf8'),
])
const el = (type, style, children, props = {}) => ({ type, props: { style, children, ...props } })
export async function renderCard(item, format = 'link', { marks = publisherMarks } = {}) {
  const f = cardFormat(format)
  if (!f) throw new Error('Onbekend formaat')
  const [serif, sans, logo] = await assets
  const { lines, size } = titleLines(item.title, format)
  const text = (value, y, fontSize, extra = {}) => el('div', { position: 'absolute', top: y, left: f.margin, width: f.width - 2 * f.margin, fontSize, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden', ...extra }, value)
  const rule = y => el('div', { position: 'absolute', top: y, left: f.margin, width: f.width - 2 * f.margin, height: 1, backgroundColor: layout.paper })
  const mark = /^data:image\/png;base64,iVBOR/.test(marks[item.source] || '') ? marks[item.source] : null
  const sourceName = cardText(item.sourceName || item.source || 'Hoot')
  // Uitgeverslogo: een papieren schijf met het logo in merkrood, zodat geen logokleur met het rood
  // vecht (Brand Guide v2.2 › Deelkaart). Zonder logo het monogram: een lijncirkel in papier.
  const m = layout.mark, inset = Math.round(m.size * m.pad)
  const publisher = el('div', { display: 'flex', alignItems: 'center', position: 'absolute', top: f.sourceY - (m.size - f.sourceSize) / 2, left: f.margin, width: f.width - 2 * f.margin, height: m.size, gap: 12 }, [
    mark ? el('div', { display: 'flex', width: m.size, height: m.size, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: m.size / 2, backgroundColor: m.disc }, [
      el('img', { width: m.size - 2 * inset, height: m.size - 2 * inset }, undefined, { src: mark }),
    ]) :
      el('div', { display: 'flex', width: m.size, height: m.size, flexShrink: 0, alignItems: 'center', justifyContent: 'center', border: `1px solid ${layout.paper}`, borderRadius: m.size / 2, fontSize: 16, lineHeight: 1 }, Array.from(sourceName)[0] || 'H'),
    el('div', { fontSize: f.sourceSize, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden', flexShrink: 1 }, sourceName),
  ])
  const tree = el('div', { display: 'flex', position: 'relative', width: f.width, height: f.height, color: layout.paper, backgroundColor: layout.red, fontFamily: 'Source Sans 3', fontWeight: 600 }, [
    rule(f.ruleTop),
    el('img', { position: 'absolute', top: f.logoY, left: f.margin, width: f.logoWidth, height: f.logoWidth * 73.5 / 239.45 }, undefined, { src: `data:image/svg+xml;base64,${Buffer.from(logo.replaceAll('#000000', layout.paper)).toString('base64')}` }),
    rule(f.ruleBottom),
    text(cardText(item.section || 'Nieuws').toUpperCase(), f.kickerY, f.kickerSize, { letterSpacing: 2 }),
    ...lines.map((line, i) => text(line, f.titleY + i * size * f.lineHeight, size, { fontFamily: 'Newsreader', fontWeight: 800 })),
    rule(f.hairlineY), publisher,
    text(layout.domain, f.siteY, f.siteSize),
  ])
  try {
    const svg = await satori(tree, { width: f.width, height: f.height, fonts: [{ name: 'Newsreader', data: serif, weight: 800 }, { name: 'Source Sans 3', data: sans, weight: 600 }] })
    return new Resvg(svg).render().asPng()
  } catch (error) {
    if (mark) return renderCard(item, format, { marks: {} })
    throw error
  }
}
