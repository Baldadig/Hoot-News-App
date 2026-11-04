import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Img } from './Img.jsx'
import { fitsHero, fitsLarge } from '../lib/img.js'
import { placeholderBase, placeholderPlan } from '../../shared/placeholder.mjs'

// Beeldloos (build 46): een bericht zonder beeld krijgt een Hoot-placeholderbeeld dat het beeldvak
// precies vult. Eén plek, voor web; de app spiegelt hem in BeeldloosView (ios/Hoot/Views/Beeldloos.swift).
// Hij staat waar anders het beeld zou staan: het stuk heeft geen beeld, het beeld is te klein voor die
// plek, of het laadt niet. Nooit een grijs vlak en nooit een beeld van een ander artikel.
// Zes beelden (shared/placeholder.mjs): welk, volgt uit de id van het artikel, en twee beeldloze rijen
// direct na elkaar krijgen nooit hetzelfde (PlaceholderList). Het is decoratie: aria-hidden.
// `kind`: 'lead' (hoofdverhaal), 'tijdlijn' (beeld over de kolom) of 'krant' (miniatuur).
const BOX = { lead: 'media media--lead', tijdlijn: 'media media--tl', krant: 'thumb' }
const Plan = createContext(null)

// Toont deze rij op deze plek het placeholderbeeld (geen beeld, of te klein voor de plek)?
export function isBare(item, kind) {
  if (!item || item.kind === 'post' || kind === 'boven') return false // boven: het grote beeld in een paar (Edition)
  if (!item.image) return true
  if (kind === 'lead') return !fitsHero(item.image)
  if (kind === 'tijdlijn') return !fitsLarge(item.image)
  return false
}

// Een lijst van boven naar onder: `rows` is [{ item, kind }]. Zo weet een rij welk beeld zijn buur heeft.
export function PlaceholderList({ rows, children }) {
  const key = rows.map((r) => `${r.item?.id}:${isBare(r.item, r.kind) ? 1 : 0}`).join('|')
  const plan = useMemo(() => placeholderPlan(rows.map((r) => ({ id: r.item?.id, bare: isBare(r.item, r.kind) }))), [key])
  return <Plan.Provider value={plan}>{children}</Plan.Provider>
}

// Beeld 1 tot 6 voor dit stuk.
export function usePlaceholder(item) {
  const plan = useContext(Plan)
  return (plan?.get(item?.id) ?? placeholderBase(item?.id ?? '')) + 1
}

export function Beeldloos({ item, kind, as: Tag = 'div' }) {
  const n = usePlaceholder(item)
  return <Tag className={`${BOX[kind] || BOX.krant} ph ph--${n}${kind === 'krant' ? ' ph--klein' : ''}`} data-ph={n} aria-hidden="true" />
}

// Het beeld van een bericht in zijn vak, of anders Beeldloos. `fits`: past dit beeld op deze plek
// (src/lib/img.js: fitsHero, fitsLarge)? `children(onFail)` tekent het beeld zelf; zonder children
// het gewone <Img>. `as`: het element van het vak (een span binnen een link van de Editie). Laadt het niet, dan wordt het Beeldloos (op web en in de app hetzelfde).
export function Beeld({ item, kind, url = item?.image, fits = () => true, as: Tag = 'div', className, style, imgKind = 'thumb', children, ...img }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  if (!url || !fits(url) || failed) return <Beeldloos item={item} kind={kind} as={Tag} />
  const onFail = () => setFailed(true)
  return (
    <Tag className={className} style={style}>
      {children ? children(onFail) : <Img url={url} kind={imgKind} onFail={onFail} {...img} />}
    </Tag>
  )
}
