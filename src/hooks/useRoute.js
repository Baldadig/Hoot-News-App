import { useCallback, useEffect, useState } from 'react'
import { parseHash, toHash } from '../lib/context.js'

// Kleine hash-router: #/stroom?bron=nrc&verhaal=s123
// De terugknop van de browser/telefoon werkt daardoor voorspelbaar (filters en een
// geopend verhaal zijn gewoon stappen in de geschiedenis).
// Een gewoon anker (bv. #inhoud) is geen route en laat het scherm staan.
const parse = (previous) => parseHash(window.location.hash, previous)

let pushed = 0 // hoeveel stappen we zelf hebben toegevoegd (dan kan "terug" veilig)

export function useRoute() {
  const [route, setRoute] = useState(() => parse())

  useEffect(() => {
    const onChange = () => setRoute((prev) => parse(prev))
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  const go = useCallback((path, params = {}, { replace = false } = {}) => {
    const url = toHash(path, params)
    if (url === (window.location.hash || '#/editie')) return
    if (replace) window.history.replaceState(null, '', url)
    else {
      window.history.pushState(null, '', url)
      pushed++
    }
    setRoute((prev) => parse(prev))
  }, [])

  // Eén stap terug als die van ons is; anders naar `fallback` zonder de geschiedenis te vervuilen.
  const back = useCallback(
    (fallbackPath, fallbackParams = {}) => {
      if (pushed > 0) {
        pushed--
        window.history.back()
      } else go(fallbackPath, fallbackParams, { replace: true })
    },
    [go]
  )

  return { ...route, go, back }
}
