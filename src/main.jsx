import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// App-updates zonder de app geforceerd af te sluiten: bij elke keer openen checken
// we op een nieuwe versie. Neemt een nieuwe service worker het over, dan herladen we
// direct als je bovenaan staat, en anders pas de volgende keer dat je de app opent
// (nooit midden in het lezen).
if ('serviceWorker' in navigator) {
  const sw = navigator.serviceWorker
  let hadController = !!sw.controller
  let stale = false
  sw.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true // eerste installatie: niets te verversen
      return
    }
    const feed = document.querySelector('.view:not([hidden])')
    if (!feed || feed.scrollTop < 50) window.location.reload()
    else stale = true
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (stale) window.location.reload()
    else
      sw.getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {})
  })
}
