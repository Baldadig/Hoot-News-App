import { two } from '../lib/edition.js'

// Newsreader heeft proportionele cijfers. Gelijke cijfervakken houden de telling rustig,
// ook als de font geen tnum-alternatieven bevat. Eén leesbaar nummer voor hulptechnologie.
export function EditionNumber({ n }) {
  if (!n) return null
  return <span className="kicker__n" aria-label={two(n)}>{[...two(n)].map((digit, i) => <span className="kicker__digit" aria-hidden="true" key={i}>{digit}</span>)}</span>
}
