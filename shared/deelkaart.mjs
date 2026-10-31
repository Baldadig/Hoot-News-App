import layout from './deelkaart/layout.json' with { type: 'json' }
import advances from './deelkaart/advances.json' with { type: 'json' }
export { layout }
export const cardFormat = value => Object.hasOwn(layout.formats, value) ? layout.formats[value] : null
const clean = value => String(value || '').replace(/\s+/gu, ' ').trim()
const widthOf = (text, size) => Array.from(text).reduce((n, c) => n + (advances[c] ?? .65), 0) * size

// Dezelfde eenvoudige regelval in Swift: dezelfde glyphmaten, geen laatste regel met één woord.
export function titleLines(value, format = 'link') {
  const f = cardFormat(format)
  if (!f) throw new Error('Onbekend formaat')
  const title = Array.from(clean(value) || 'Hoot').slice(0, 500).join('')
  const width = (f.width - 2 * f.margin) * .96
  let lines = [], size = f.titleSize
  for (; size >= f.minTitleSize; size -= 2) {
    lines = []
    let line = ''
    for (let word of title.split(' ')) {
      if (widthOf(word, size) > width) {
        while (word && widthOf(word + '…', size) > width) word = Array.from(word).slice(0, -1).join('')
        word += '…'
      }
      const next = line ? line + ' ' + word : word
      if (line && widthOf(next, size) > width) { lines.push(line); line = word }
      else line = next
    }
    if (line) lines.push(line)
    if (lines.length <= 4) break
  }
  size = Math.max(size, f.minTitleSize)
  if (lines.length > 4) {
    lines = lines.slice(0, 4)
    let words = lines[3].split(' ')
    while (words.length > 1 && widthOf(words.join(' ') + '…', size) > width) words.pop()
    lines[3] = words.join(' ') + '…'
  }
  for (let i = 1; i < lines.length; i++) if (!lines[i].includes(' ')) {
    const words = lines[i - 1].split(' ')
    const tail = words.pop() + ' ' + lines[i]
    if (words.length && widthOf(tail, size) <= width) { lines[i - 1] = words.join(' '); lines[i] = tail }
  }
  return { lines, size }
}
export const cardText = value => Array.from(clean(value)).slice(0, 140).join('')
