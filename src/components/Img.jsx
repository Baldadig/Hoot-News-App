import { imgProps } from '../lib/img.js'
import { imageMeta } from '../lib/image-meta.js'

// Eén beeld in een vak (.thumb of .media): op maat (lib/img.js), pas geladen als het in zicht
// komt, zonder verwijzer. Lukt de beeld-CDN niet, dan het origineel; lukt dat ook niet, dan
// `onFail` (Beeld.jsx: dan de beeldloze vorm), of zonder onFail verdwijnt het vak (geen kapot plaatje).
export function Img({ url, kind = 'thumb', priority = false, onLoad, onFail, ...rest }) {
  const sized = imgProps(url, kind)
  if (!sized) return null
  const { fallback, ...props } = sized
  const onError = (e) => {
    const img = e.currentTarget
    if (fallback && img.src !== fallback) {
      img.removeAttribute('srcset')
      img.src = fallback
      return
    }
    if (onFail) return onFail()
    const box = img.closest('.thumb, .media')
    if (box) box.hidden = true
  }
  // `fetchpriority` in kleine letters: React 18 kent de prop nog niet (pas vanaf 19) en geeft hem
  // zo ongewijzigd door als attribuut.
  return <img {...props} alt="" loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding={priority ? undefined : 'async'} referrerPolicy="no-referrer" onLoad={onLoad} onError={onError} {...rest} />
}

// Heeft het item een meting (egale randen in het bronbeeld), dan het origineel in een vak met
// .media--measured en de cropStyle-variabelen van de ouder: dezelfde pixels als de meting, de randen
// vallen buiten het vak en het beeld vult het (cover). Zonder meting de gewone, op maat gemaakte Img.
export function MeasuredImg({ item, kind = 'thumb', priority = false, onLoad, onFail, ...rest }) {
  if (!imageMeta(item)) return <Img url={item.image} kind={kind} priority={priority} onLoad={onLoad} onFail={onFail} {...rest} />
  return <img src={item.image} alt="" loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding={priority ? undefined : 'async'} referrerPolicy="no-referrer" onLoad={onLoad} onError={e => { if (onFail) return onFail(); const box = e.currentTarget.closest('.thumb, .media'); if (box) box.hidden = true }} {...rest} />
}
