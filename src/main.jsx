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
import './styles.css'
import { registerUpdates } from './lib/swUpdate.js'
import { captureInvite } from './lib/account.js'

// Uitnodigingslink (?uitnodiging=…): onthouden tot je inlogt, en uit de adresbalk halen.
captureInvite()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// De service worker en het bijhouden van nieuwe versies: zie src/lib/swUpdate.js.
registerUpdates()
