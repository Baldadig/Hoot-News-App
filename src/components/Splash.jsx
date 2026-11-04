import { useEffect, useRef } from 'react'
import { holdBrandBar } from './Brand.jsx'
import { reduced, reducedPlan, fade, irisClose, tint, glide, wordAt, splashDot, splashTimes, landTimes, restDelay, waitFor, sleep, rootColor, IRIS, LAND, BOUNCE_MS, SPLASH_MAX_MS, SPLASH_IRIS_MS, SPLASH_LAND_MS } from '../lib/motion.js'

// Het opstartscherm, naar HootApp.endSplash. Het vlak zelf staat al in index.html (merkrood, het
// woordmerk in papier, de punt stuitert in CSS) zodat het er is vóór de app laadt; dit onderdeel
// neemt dat element over en haalt het weg zodra er iets te lezen is:
// - minstens één sprong (1,6 s), dan tot de Editie er is (`ready`), hooguit 5 s;
// - naar de app: eerst vervagen, dan reizen. Het grote woordmerk vervaagt op zijn plek en beweegt
//   niet; alleen de iris (het rode vlak) sluit en reist in 0,7 s naar de gemeten punt van het kleine
//   "hoot." (de kop van de Editie, of het woordmerk in de zijbalk), en kleurt daar naar de punt (in
//   donker koraal). Staat er geen "hoot." in beeld, dan sluit het rood tot de eigen punt en vervaagt
//   het kort;
// - naar Welkom (`toWelcome`): het rood blijft; alleen het woordmerk glijdt, in de rust van de
//   sprong, naar linksboven op de rode intro en het opstartscherm vervaagt (de tekst komt op). De
//   iris komt dan pas bij de eerste papieren stap (Welcome.jsx);
// - Minder beweging: één fade van 0,35 s.
// De tijden staan in lib/motion.js. Zolang het staat, is de app eronder `inert` (App.jsx) en kleurt
// de browserbalk merkrood.
export default function Splash({ ready, toWelcome, onDone }) {
  const readyRef = useRef(ready)
  readyRef.current = ready
  const welcomeRef = useRef(toWelcome)
  welcomeRef.current = toWelcome
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const node = document.getElementById('splash')
    if (!node || node.hidden) {
      doneRef.current()
      return
    }
    let alive = true
    const release = holdBrandBar()
    const finish = () => {
      if (!alive) return
      alive = false
      node.remove()
      release()
      doneRef.current()
      // Welkom lag inert onder het opstartscherm en kon zijn kop nog niet voorlezen: nu wel.
      document.querySelector('.ob__red h1')?.focus({ preventScroll: true })
    }
    ;(async () => {
      const mark = node.querySelector('.splash__mark')
      const hop = node.querySelector('.splash__hop')
      const dot = node.querySelector('.splash__dot')
      const t0 = Number(node.dataset.at) || performance.now()
      // 1. Minstens één sprong, dan tot de Editie er is, hooguit 5 s.
      await sleep(Math.max(0, BOUNCE_MS - (performance.now() - t0)))
      while (alive && !readyRef.current && performance.now() - t0 < SPLASH_MAX_MS) await sleep(100)
      if (!alive) return
      if (reduced() || !node.animate) {
        await fade(node, reducedPlan().fade, 1, 0, 'ease-out').finished.catch(() => {})
        return finish()
      }
      // Eigen woord en punt (in rust), als vertrekpunt van het glijden en als terugval voor de iris.
      const box = mark.getBoundingClientRect()
      const own = { left: box.left, top: box.top, w: box.width, h: box.height, dot: splashDot(box) }

      // 2a. Naar de rode intro van Welkom: het rood blijft, het woordmerk landt op "hoot." linksboven.
      if (welcomeRef.current) {
        const to = await waitFor(() => wordAt(document.querySelector('.ob__red .ob__brand svg')), 1500)
        if (!alive) return
        if (to) {
          // In de rust van de sprong vertrekken: de punt ligt dan stil, precies waar de intro hem heeft.
          const anim = hop?.getAnimations?.()[0]
          const phase = anim ? Number(anim.currentTime) || 0 : performance.now() - t0
          await sleep(restDelay(phase))
          if (!alive) return
          if (hop) hop.style.animation = 'none'
          if (dot) dot.style.animation = 'none'
          const t = landTimes(SPLASH_LAND_MS)
          glide(mark, own, to, { duration: t.word, easing: LAND })
          await sleep(t.fadeAt)
          if (!alive) return
          await fade(node, t.fade, 1, 0, 'ease-out').finished.catch(() => {})
          return finish()
        }
        // Geen intro in beeld (nog niet geladen): dan gewoon vervagen.
        await fade(node, reducedPlan().fade, 1, 0, 'ease-out').finished.catch(() => {})
        return finish()
      }

      // 2b. Naar de app: het rood sluit als iris tot de punt van het kleine "hoot." (de kop van de
      // Editie op smal, het woordmerk in de zijbalk op breed), of tot de eigen punt.
      const to = wordAt([...document.querySelectorAll('.edbrand svg, .nav__brand svg')].find((el) => el.getBoundingClientRect().width > 0))
      const t = splashTimes(SPLASH_IRIS_MS)
      const target = to ? to.dot : own.dot
      // Het woord (met zijn papieren punt) vervaagt op zijn plek; de iris vertrekt als het half weg is.
      if (hop) hop.style.animation = 'none'
      fade(mark, t.fade, 1, 0, 'ease-out')
      irisClose(node, { ...target, w: innerWidth, h: innerHeight, duration: t.travel, delay: t.delay, easing: IRIS })
      tint(node, rootColor('--brand-red'), rootColor('--accent'), { delay: t.tintStart, duration: t.tintDur })
      await sleep(t.end)
      if (!alive) return
      if (!to) await fade(node, t.fadeOwn, 1, 0, 'ease-out').finished.catch(() => {})
      finish()
    })()
    return () => {
      // Opnieuw gemonteerd (StrictMode) of weg: deze reeks stopt; het element blijft voor de volgende.
      if (alive) {
        alive = false
        release()
      }
    }
  }, [])

  return null
}
