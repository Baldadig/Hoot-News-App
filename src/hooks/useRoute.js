import { useCallback, useEffect, useState } from 'react'

// Kleine hash-router: #/stroom?bron=nrc&verhaal=s123
// De terugknop van de browser/telefoon werkt daardoor voorspelbaar (filters en een
// geopend verhaal zijn gewoon stappen in de geschiedenis).
function parse() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [path, query = ''] = h.split('?')
  return { path: path || 'editie', params: Object.fromEntries(new URLSearchParams(query)) }
}

let pushed = 0 // hoeveel stappen we zelf hebben toegevoegd (dan kan "terug" veilig)

export function useRoute() {
  const [route, setRoute] = useState(parse)

  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  const go = useCallback((path, params = {}, { replace = false } = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    const url = '#/' + path + (q ? '?' + q : '')
    if (url === (window.location.hash || '#/editie')) return
    if (replace) window.history.replaceState(null, '', url)
    else {
      window.history.pushState(null, '', url)
      pushed++
    }
    setRoute(parse())
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
