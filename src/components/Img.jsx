import { imgProps } from '../lib/img.js'

// Eén beeld in een vak (.thumb of .media): op maat (lib/img.js), pas geladen als het in zicht
// komt, zonder verwijzer. Lukt de beeld-CDN niet, dan het origineel; lukt dat ook niet, dan
// verdwijnt het vak (geen kapot plaatje).
export function Img({ url, kind = 'thumb', priority = false, onLoad, ...rest }) {
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
    const box = img.closest('.thumb, .media')
    if (box) box.hidden = true
  }
  return <img {...props} alt="" loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding={priority ? undefined : 'async'} referrerPolicy="no-referrer" onLoad={onLoad} onError={onError} {...rest} />
}
