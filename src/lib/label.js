// Het label boven een artikel in de Editie — één kleine, pure functie (tests/label.test.mjs). Zelfde
// regels en testgevallen als de app (ios/Hoot, Label.swift).
//   kicker  = (sub)interesse van de lezer als het verhaal die raakt ('Politiek · Den Haag',
//             'Cultuur · Film & series'), anders de rubriek; een sportbron is Sport.
//   why     = de waarom-regel van De Redacteur, alleen als die iets toevoegt: niet 'Omdat je X
//             volgt' als de kicker dat al zegt. Wel 'Vervolg op wat je las', 'Groot nieuws · N
//             bronnen', 'Uit je voorkeursbron …', 'Naast je bubbel …'.
//   outside = 'Buiten je bronnen' hoort bij de bronregel, niet bij de kicker.
import { INTERESTS, topicById } from './topics.js'

const INTEREST_OF = Object.fromEntries(INTERESTS.flatMap((i) => i.topics.map((t) => [t, i.id])))
// Deze redenen zegt het label zelf al (Why.js: WHY_IN_LABEL).
const IN_LABEL = new Set(['rubriek', 'extern', 'bubbel', 'breed'])

// `topics`: de onderwerpen van het verhaal. `follows`: de onderwerpen die de lezer volgt. `cat`: de
// rubriek van de bron. `desk`/`deskLabel`: de plek in de Editie. `section`: de rubriek van het
// bericht zelf. `why`: { code, text } van De Redacteur. `followed`: de bron staat bij je bronnen.
export function labelFor({ topics = [], follows = [], cat = null, desk = null, deskLabel = null, section = null, why = null, followed = true } = {}) {
  const outside = desk === 'extern' || why?.code === 'extern' || followed === false
  const mine = topics.find((t) => follows.includes(t) && topicById(t) && INTEREST_OF[t])
  let kicker = null
  let byInterest = false
  if (desk === 'bubbel' || desk === 'breed') kicker = deskLabel // 'Buiten je bubbel · via …', 'Waar iedereen over schrijft · N bronnen'
  else if (mine) {
    const interest = INTERESTS.find((i) => i.id === INTEREST_OF[mine]).label
    const topic = topicById(mine).label
    kicker = interest === topic ? interest : `${interest} · ${topic}`
    byInterest = true
  } else if (cat === 'sport') kicker = 'Sport'
  else kicker = (desk === 'extern' ? null : deskLabel) || section || null
  const text = why && typeof why.text === 'string' && why.text.trim() ? why.text : null
  const keep = text && !IN_LABEL.has(why.code) && !(why.code === 'interest' && byInterest)
  return { kicker, why: keep ? { ...why } : null, outside }
}
