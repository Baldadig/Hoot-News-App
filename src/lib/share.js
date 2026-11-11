// Delen: artikelen als Hoot-kaart met de link naar het artikel erbij; posts houden hun bronlink.
import { safeHttpUrl } from '../../shared/util.mjs'

export const SHARE_CUT = 100

// Een Bluesky-post heeft geen kop: dan de titel van de gedeelde link, of het begin van de post
// (afgebroken op een spatie binnen 100 tekens, met een beletselteken), anders de bron.
export function shareTitle(item) {
  const title = (item?.title || '').trim()
  if (title) return title
  const linkTitle = (item?.linkTitle || '').trim()
  if (linkTitle) return linkTitle
  const text = (item?.summary || '').trim()
  if (!text) return item?.sourceName || 'Hoot'
  if (text.length <= SHARE_CUT) return text
  const cut = text.slice(0, SHARE_CUT)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut) + '…'
}

// De link wijst altijd naar het artikel zelf bij de uitgever (besluit Alex 11-11); Hoot staat al op de kaart.
export const shareLink = (item) => safeHttpUrl(item?.url) || null

// Wat er te delen valt, in de vorm van navigator.share: { title, url }, of null zonder link.
export function shareData(item) {
  const url = shareLink(item)
  return url ? { title: shareTitle(item), url } : null
}

// Welke weg: het deelblad als de browser het heeft (en de gegevens aankan), anders het klembord.
export function sharePlan(nav = typeof navigator !== 'undefined' ? navigator : {}, data = null) {
  if (typeof nav.share === 'function' && (!data || typeof nav.canShare !== 'function' || nav.canShare(data))) return 'blad'
  if (nav.clipboard && typeof nav.clipboard.writeText === 'function') return 'klembord'
  return 'geen'
}

// Deel een bericht. Geeft terug wat er gebeurde: 'gedeeld' (het deelblad ging open en dicht),
// 'gekopieerd' (de link staat op het klembord), 'geannuleerd' (je sloot het deelblad zelf),
// 'mislukt' (geen link, of de browser weigerde). App.jsx zet daar de melding bij.
export async function shareItem(item, nav = typeof navigator !== 'undefined' ? navigator : {}, { fetcher = fetch, FileClass = File } = {}) {
  const data = shareData(item)
  if (!data) return 'mislukt'
  const ownCard = item?.id && item.kind !== 'post'
  let payload = data
  if (ownCard && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      const response = await fetcher(`/api/deelkaart?id=${encodeURIComponent(item.id)}&f=staand`, { signal: AbortSignal.timeout(5000) })
      if (response.ok && /image\/png/i.test(response.headers.get('content-type') || '')) {
        const file = new FileClass([await response.blob()], 'hoot-krantenkop.png', { type: 'image/png' })
        // Kaart én link: veel apps laten `url` vallen zodra er een bestand bij zit, `text` komt wel aan.
        const withFile = { title: data.title, text: data.url, files: [file] }
        if (nav.canShare(withFile)) payload = withFile
      }
    } catch { /* Link kopiëren als de kaart niet beschikbaar is. */ }
  }
  const plan = ownCard && !payload.files ? (nav.clipboard?.writeText ? 'klembord' : 'geen') : sharePlan(nav, payload)
  if (plan === 'blad') {
    try {
      await nav.share(payload)
      return 'gedeeld'
    } catch (e) {
      if (e?.name === 'AbortError') return 'geannuleerd'
      // Het deelblad wilde niet (bijvoorbeeld zonder gebaar): dan het klembord.
    }
  }
  if (plan !== 'geen') {
    try {
      await nav.clipboard.writeText(data.url)
      return 'gekopieerd'
    } catch {
      /* geen toegang tot het klembord */
    }
  }
  return 'mislukt'
}

// De melding bij wat er gebeurde; leeg als er niets te zeggen valt (het deelblad zegt het zelf).
export function shareNotice(result) {
  if (result === 'gekopieerd') return 'Link gekopieerd'
  if (result === 'mislukt') return 'Delen lukte niet'
  return ''
}
