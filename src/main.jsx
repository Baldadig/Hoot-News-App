import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Lettertypes van de Zaterdagkrant (alleen Latijns schrift): Newsreader voor koppen, Source Sans 3 voor tekst.
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-800.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import '@fontsource/source-sans-3/latin-800.css'
// Roboto Medium alleen voor de Google-knop (hun richtlijn); wordt pas geladen als die er staat.
import '@fontsource/roboto/latin-500.css'
import './styles.css'
import { registerUpdates } from './lib/swUpdate.js'
import { captureInvite, captureGoogleReturn } from './lib/account.js'
import { loadFeedCache } from './lib/feedCache.js'
import { migrate } from './lib/migrate.js'

// Uitnodigingslink (?uitnodiging=…) en terugkomst van Google (#id_token=…): onthouden en uit de
// adresbalk halen, vóór de app die als route leest.
captureInvite()
captureGoogleReturn()

// Opslag van oudere versies omzetten (één keer, zie src/lib/migrate.js).
try {
  migrate(localStorage)
} catch {
  /* geen opslag: niets om te migreren */
}

// Gaat er bij het tekenen iets mis (bijv. een bericht in een vorm die we niet verwachtten), dan
// een nette melding met een knop in plaats van een leeg wit scherm.
class Fallback extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error(error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="empty" role="alert">
        <h1 className="empty__title">Er ging iets mis</h1>
        <p className="empty__text">Hoot kon dit scherm niet tonen. Opnieuw laden helpt meestal.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Opnieuw laden
        </button>
      </div>
    )
  }
}

// Eerst de feed van de vorige keer (IndexedDB, hooguit een paar honderd ms), dan pas tekenen:
// zo staat er bij een warme start meteen inhoud, zonder flits van een lege of ladende staat.
loadFeedCache().finally(() =>
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Fallback>
        <App />
      </Fallback>
    </React.StrictMode>
  )
)

// De service worker en het bijhouden van nieuwe versies: zie src/lib/swUpdate.js.
registerUpdates()
