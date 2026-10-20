import { useEffect, useRef, useState } from 'react'
import { PlayIcon } from './icons.jsx'
import { watch } from '../lib/inview.js'
import { saveData } from '../lib/media.js'

const fullscreen = (v) => !!(document.fullscreenElement || v?.webkitDisplayingFullscreen)

// Video in drie standen, afhankelijk van hoe dichtbij hij is:
// ver weg — alleen het stilstaande beeld (en dat pas als het in zicht komt);
// binnen anderhalf scherm — de speler staat klaar en haalt de afspeellijst op;
// in beeld — hij buffert het begin alvast, zodat afspelen direct start.
// Scroll je weg terwijl hij speelt, dan pauzeert hij. Er speelt er altijd maar één (lib/media.js).
export function Video({ src, poster, label, style }) {
  const box = useRef(null)
  const video = useRef(null)
  const [near, setNear] = useState(false)
  const [inView, setInView] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => watch(box.current, { rootMargin: '150% 0px' }, (e) => setNear(e.isIntersecting)), [])
  useEffect(
    () =>
      watch(box.current, { threshold: [0, 0.25, 0.5] }, (e) => {
        setInView(e.intersectionRatio >= 0.5)
        const v = video.current
        if (e.intersectionRatio < 0.25 && v && !v.paused && !fullscreen(v)) v.pause()
      }),
    []
  )

  const start = () => {
    setStarted(true)
    video.current?.play()?.catch(() => {})
  }

  return (
    <div ref={box} className="media media--social media--video" style={style}>
      {near || started ? (
        <video ref={video} src={src} poster={poster || undefined} preload={inView && !saveData() ? 'auto' : 'metadata'} playsInline controls={started} onPlay={() => setStarted(true)} />
      ) : poster ? (
        <img src={poster} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      ) : null}
      {started ? null : (
        <button type="button" className="media__start" onClick={start} aria-label={label}>
          <span className="media__play">
            <PlayIcon />
          </span>
        </button>
      )}
    </div>
  )
}
