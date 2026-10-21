// Het AI-overzicht van de editie als blokken met een tussenkop (server, voorlezen en app).

// "## Kop" + alinea → [{ head, text }]. Tekst zonder koppen wordt één blok per alinea (zonder kop).
export function parseBrief(text) {
  const sections = []
  let pending = null // kop met een witregel ervoor zijn alinea
  for (const block of String(text || '').split(/\n\s*\n|\n(?=#)/)) {
    const lines = block.trim().split('\n')
    const m = lines[0]?.match(/^#{1,4}\s*(.+?)[\s:.]*$/)
    const head = m ? m[1].replace(/\*\*/g, '').trim() : pending
    const body = (m ? lines.slice(1) : lines).join(' ').replace(/\s+/g, ' ').trim()
    pending = body ? null : head
    if (body) sections.push({ head, text: body })
  }
  return sections
}

// Oude overzichten (vóór v1.18) waren één tekst; nieuwe zijn blokken met een kop.
export const briefSections = (brief) => brief?.sections || (brief?.text ? parseBrief(brief.text) : [])
