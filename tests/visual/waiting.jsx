// Alleen controle van de echte component; geen productpagina of nieuwe web-artikellezer.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles.css'
import { WaitingMark } from '../../src/components/WaitingMark.jsx'
createRoot(document.getElementById('root')).render(<main style={{padding:32,maxWidth:390,display:'grid',gap:32}}><h1 className="head-4">Laadmarkeringen</h1><section><p className="label">Editie en Stroom</p><WaitingMark/></section><section><p className="label">Aangepaste tekst</p><WaitingMark label="Artikel laden"/></section><section><p className="label">Zonder zichtbare tekst</p><WaitingMark label="Artikel laden" text={false}/></section></main>)
