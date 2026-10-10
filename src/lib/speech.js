// Voorlezen met de stem van het toestel (Web Speech API) — gratis, offline, Nederlands.
// bulletinText is puur (getest in tests/speech.test.mjs); de rest praat met de browser.

const NUM = ['', 'Eén', 'Twee', 'Drie', 'Vier', 'Vijf', 'Zes', 'Zeven', 'Acht', 'Negen', 'Tien', 'Elf', 'Twaalf']

// De editie als bulletin: per verhaal één stuk tekst (kop, dan kern, dan bron).
export function bulletinText({ slot, date, rows }) {
  const head = `Hoot. De ${slot === 'avond' ? 'avondeditie' : 'ochtendeditie'} van ${date}. ${rows.length === 1 ? 'Eén verhaal' : `${NUM[rows.length] || rows.length} verhalen`}.`
  const parts = rows.map((r, i) => {
    const bits = [`${NUM[i + 1] || i + 1}. ${r.title.replace(/\s+/g, ' ').trim()}.`]
    if (r.summary) bits.push(r.summary.replace(/\s+/g, ' ').trim().replace(/[.…]*$/, '') + '.')
    if (r.sourceName) bits.push(`Bron: ${r.sourceName}.`)
    return bits.join(' ')
  })
  return [head, ...parts, 'Dat was de editie. Je bent bij.']
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  const nl = voices.filter((v) => /^nl/i.test(v.lang))
  // De betere iOS/macOS-stemmen eerst; anders de eerste Nederlandse; anders de standaard.
  return nl.find((v) => /xander|claire|ellen|premium|enhanced/i.test(v.name)) || nl[0] || null
}

let current = { stop: () => {} }

// Spreekt een lijst stukken na elkaar uit (één utterance per stuk: lange utterances
// breken op iOS af). Geeft een stop-functie terug; roept onEnd aan als alles klaar is.
export function speak(parts, { onEnd } = {}) {
  stop()
  const synth = window.speechSynthesis
  const voice = pickVoice()
  let i = 0
  let cancelled = false
  const next = () => {
    if (cancelled || i >= parts.length) {
      if (!cancelled) onEnd?.()
      return
    }
    const u = new SpeechSynthesisUtterance(parts[i++])
    u.lang = 'nl-NL'
    if (voice) u.voice = voice
    u.rate = 1
    u.onend = next
    u.onerror = next
    synth.speak(u)
  }
  current.stop = () => {
    cancelled = true
    synth.cancel()
  }
  // Stemmen komen in Safari soms pas na een tik beschikbaar.
  if (!synth.getVoices().length) synth.addEventListener('voiceschanged', () => {}, { once: true })
  next()
  return current.stop
}

export function stop() {
  current.stop()
  current = { stop: () => {} }
}
