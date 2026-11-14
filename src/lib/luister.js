// Luister verder op het web (stap 3). Standaard UIT: het web toont niets tot Alex de koppelingen goedkeurt.
//
// Aanzetten voor iedereen: zet in Netlify (Site configuration › Environment variables) HOOT_LUISTER_WEB=aan. Vanaf de
// volgende ronde van de feed (hooguit tien minuten) staat `meta.luisterWeb: true` in de kern en ziet het web
// Vergelijken › Luister, het koptelefoontje op de kaart, "Luister verder" in het ⋯-menu en Instellingen › Lezen ›
// Podcasts. Uitzetten: de variabele weghalen of op iets anders zetten.
// Eerst zelf bekijken, zonder dat iemand anders het ziet: in de console van je browser
// localStorage.setItem('hoot.luisterWeb', 'aan') en herladen; weer weg met localStorage.removeItem('hoot.luisterWeb').
//
// De keuze van je podcastapp blijft in deze browser (localStorage `hoot.podcastApp`), niet in je account.
import { useCallback, useState } from 'react'
import { PREF_KEY, geldigeKeuze, afleveringen } from '../../shared/luister-weergave.mjs'

export const LOCAL_FLAG = 'hoot.luisterWeb'

function lees(key, storage) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}
const store = () => (typeof window !== 'undefined' ? window.localStorage : null)

export function luisterWebAan(meta, storage = store()) {
  return meta?.luisterWeb === true || lees(LOCAL_FLAG, storage) === 'aan'
}

export const leesKeuze = (storage = store()) => geldigeKeuze(lees(PREF_KEY, storage) || '')
export function bewaarKeuze(keuze, storage = store()) {
  try {
    if (keuze) storage?.setItem(PREF_KEY, keuze)
    else storage?.removeItem(PREF_KEY)
  } catch {}
}

export function usePodcastKeuze() {
  const [keuze, zet] = useState(() => leesKeuze())
  const setKeuze = useCallback((k) => {
    const v = geldigeKeuze(k)
    bewaarKeuze(v)
    zet(v)
  }, [])
  return [keuze, setKeuze]
}

// Wat het web bij een verhaal toont: niets met de schakelaar uit, niets bij Niet tonen, anders de afleveringen die bij
// deze lezer passen (een Engelse show alleen als je die bron volgt).
export function luisterLijst({ aan, keuze, story, volgt }) {
  if (!aan || keuze === 'uit' || !story?.luister) return []
  return afleveringen(story.luister, volgt)
}
