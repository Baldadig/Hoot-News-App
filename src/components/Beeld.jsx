import { useEffect, useState } from 'react'
import { Img } from './Img.jsx'

// Beeldloos (build 46): de vorm van een bericht zonder beeld. Eén plek, voor web; de app spiegelt
// hem in BeeldloosView (ios/Hoot/Views/Beeldloos.swift). Hij staat waar anders het beeld zou staan:
// het stuk heeft geen beeld, het beeld is te klein voor die plek, of het laadt niet. Nooit een
// grijs vlak en nooit een beeld van een ander artikel.
// Tijdelijk: geen eigen vlak. De tekst neemt de plek in (de kop over de volle breedte), net als
// voorheen. Alex kiest het blijvende ontwerp nog uit zes concepten; dat komt hier, en alleen hier.
// `kind`: 'lead' (hoofdverhaal), 'tijdlijn' (beeld over de kolom) of 'krant' (miniatuur).
// eslint-disable-next-line no-unused-vars
export function Beeldloos({ item, kind }) {
  return null
}

// Het beeld van een bericht in zijn vak, of anders Beeldloos. `fits`: past dit beeld op deze plek
// (src/lib/img.js: fitsHero, fitsLarge)? `children(onFail)` tekent het beeld zelf; zonder children
// het gewone <Img>. `as`: het element van het vak (een span binnen een link van de Editie). Laadt het niet, dan wordt het Beeldloos (op web en in de app hetzelfde).
export function Beeld({ item, kind, url = item?.image, fits = () => true, as: Tag = 'div', className, style, imgKind = 'thumb', children, ...img }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  if (!url || !fits(url) || failed) return <Beeldloos item={item} kind={kind} />
  const onFail = () => setFailed(true)
  return (
    <Tag className={className} style={style}>
      {children ? children(onFail) : <Img url={url} kind={imgKind} onFail={onFail} {...img} />}
    </Tag>
  )
}
