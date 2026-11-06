// Het hoofdverhaal (01) helemaal boven de vouw: variant e (Alex, 6 november; Hoot-design/boven-de-vouw/RAPPORT.md
// en vouw-1.1.1/VERSLAG.md). Spiegel van ios/Hoot/Views/Vouw.swift: web en app gelijk.
//
// Volgorde: eerst geeft het beeld ruimte (van 3:2 tot 2:1), dan de kop (30/36 naar 26/32), pas als laatste de intro
// (een hele zin minder). Past het dan nog niet (een heel lange kop), dan loopt het gewoon door. De bronregel van 01
// eindigt boven de tabbalk, binnen het eerste scherm; daarna begint 02.
// Alleen op een telefoon bij de standaard tekstgrootte, op de iPhone mini (812 hoog) en op schermen van Pro-formaat
// en groter. Op de mini strakker: kop 26 al vanaf 4 regels op 30, en de intro hooguit 2 regels. De SE (667) en
// grotere tekst houden de gewone kaart.
import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import { SENTENCE_END } from '../../shared/zinnen.mjs'

export const VOUW = {
  mini: { introRegels: 2, kop26Vanaf: 4 },
  pro: { introRegels: 5, kop26Vanaf: null },
}

// Welk profiel geldt: null = gewoon doorlopen. `schermHoogte`: het toestel (screen.height), niet het venster van
// de browser, zodat Safari met en zonder balken hetzelfde kiest. `schaal`: de lettermaat van <html> ten opzichte van 16.
export function vouwProfiel({ schermHoogte, schaal = 1, groot = false }) {
  if (groot || schaal > 1.001 || !(schermHoogte >= 800)) return null
  return schermHoogte < 850 ? 'mini' : 'pro'
}

// Het beeld tot de rand: tussen 2:1 (minst) en 3:2 (meest) van de breedte.
export const beeldHoogte = (ruimte, tekst, breedte) => Math.min(breedte * 2 / 3, Math.max(breedte / 2, ruimte - tekst))

// De hele intro, en dan steeds één hele zin minder (zoals IntroText.candidates in de app).
export function introKandidaten(text) {
  if (!text) return []
  const ends = []
  for (const m of text.matchAll(SENTENCE_END)) {
    if (m[0][0] === '.' && text[m.index - 1] === '.') continue
    ends.push(m.index + m[0].length)
  }
  const out = [text]
  for (const e of ends.reverse()) {
    const p = text.slice(0, e).trim()
    if (p && p !== out[out.length - 1]) out.push(p)
  }
  return out
}

// De varianten van ruim naar krap: kop 30 met de hele intro, kop 26 met de hele intro, kop 26 met steeds een zin
// minder, en tot slot kop 26 zonder intro.
export function varianten(kandidaten) {
  return [{ k26: false, intro: 0 }, ...kandidaten.map((_, i) => ({ k26: true, intro: i })), { k26: true, intro: null }]
}

// Past deze variant? `tekst`: van de bovenkant van 01 tot de onderkant van de bronregel, zonder het beeld.
export function past({ ruimte, tekst, minBeeld, introRegels, kopRegels, profiel, stap }) {
  const p = VOUW[profiel]
  if (stap === 0 && p.kop26Vanaf && kopRegels >= p.kop26Vanaf) return false
  if (introRegels > p.introRegels) return false
  return tekst + minBeeld <= ruimte + 0.5
}

const regels = (el) => {
  if (!el) return 0
  const lh = parseFloat(getComputedStyle(el).lineHeight)
  return lh > 0 ? Math.round(el.getBoundingClientRect().height / lh) : 0
}

// Hoe ver 01 van de bovenkant van de inhoud staat: ook als er al gescrold is.
const scrolled = (el) => {
  let y = window.scrollY || 0
  for (let p = el.parentElement; p; p = p.parentElement) y += p.scrollTop || 0
  return y
}

// De vouw: de bovenkant van de tabbalk als die onderaan staat, anders de onderkant van het venster.
const vouwLijn = () => {
  const nav = document.querySelector('.nav')
  const r = nav?.getBoundingClientRect()
  return r && r.height > 0 && r.top > innerHeight / 2 && r.top < innerHeight ? r.top : innerHeight
}

const profielNu = () => {
  if (typeof window === 'undefined') return null
  const html = document.documentElement
  const groot = html.dataset.text === 'groot' || html.dataset.systeem === 'groot' || html.dataset.systeem === 'ax'
  return vouwProfiel({ schermHoogte: window.screen?.height || innerHeight, schaal: (parseFloat(getComputedStyle(html).fontSize) || 16) / 16, groot })
}

// Voor de kaart van 01: welke variant en hoe hoog het beeld. `aan`: alleen de lead op een telefoon.
// Geeft { stap, variant, beeld, profiel } terug; zonder profiel null (de gewone kaart).
export function useVouw(ref, { aan, introTekst, key }) {
  const kandidaten = introKandidaten(introTekst)
  const lijst = varianten(kandidaten)
  const [s, setS] = useState({ stap: 0, beeld: null, profiel: null, ronde: 0 })
  const breedte = useRef(0)

  // Opnieuw beginnen bij een andere breedte (draaien), een ander verhaal, andere tekstgrootte en als de letters er zijn.
  // Niet bij een andere hoogte: Safari verandert die tijdens het scrollen (balken in en uit).
  useEffect(() => {
    if (!aan) return undefined
    const opnieuw = () => setS((o) => ({ stap: 0, beeld: null, profiel: profielNu(), ronde: o.ronde + 1 }))
    breedte.current = innerWidth
    const resize = () => { if (innerWidth !== breedte.current) { breedte.current = innerWidth; opnieuw() } }
    addEventListener('resize', resize)
    document.fonts?.ready?.then(opnieuw)
    const mo = new MutationObserver(opnieuw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text', 'data-systeem'] })
    opnieuw()
    return () => { removeEventListener('resize', resize); mo.disconnect() }
  }, [aan, key])

  useLayoutEffect(() => {
    const el = ref.current
    if (!aan || !el || !s.profiel) return
    const media = el.querySelector('.kaart__beeld')
    const meta = el.querySelector('.kmeta')
    if (!meta) return
    const top = el.getBoundingClientRect().top + scrolled(el)
    const ruimte = vouwLijn() + scrolled(el) - top
    const mediaH = media ? media.getBoundingClientRect().height : 0
    const tekst = meta.getBoundingClientRect().bottom + scrolled(el) - top - mediaH
    const w = media ? media.getBoundingClientRect().width : 0
    const ok = past({ ruimte, tekst, minBeeld: w / 2, introRegels: regels(el.querySelector('.kaart__sum')), kopRegels: regels(el.querySelector('.kaart__title--lead')), profiel: s.profiel, stap: s.stap })
    if (!ok && s.stap < lijst.length - 1) { setS((o) => ({ ...o, stap: o.stap + 1 })); return }
    const beeld = media ? Math.round(beeldHoogte(ruimte, tekst, w) * 2) / 2 : null
    if (beeld !== s.beeld) setS((o) => ({ ...o, beeld }))
  })

  if (!aan || !s.profiel) return null
  const v = lijst[Math.min(s.stap, lijst.length - 1)]
  return { stap: s.stap, profiel: s.profiel, beeld: s.beeld, k26: v.k26, intro: v.intro == null ? '' : kandidaten[v.intro] }
}
