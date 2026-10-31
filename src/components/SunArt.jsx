import { useEffect, useId, useRef } from 'react'
import { K, W, H, HZ, CX, LINE, STILL, breathe, halo, introSun, editieSun, waterShift } from '../lib/sun.js'
import { reduced } from '../lib/motion.js'

// De punt als zon in Welkom (iOS OnboardingArt.swift): één SVG van 168 × 140 met vier varianten.
// - intro: op de rode intro, in papier; komt één keer op achter de horizon en ademt dan
// - editie: gaat op en onder, 6 s op en 6 s onder, en ademt
// - stroom: een kleine zon met halo boven stromend water
// - selectie: een kleine zon die ademt tussen twee ringen, de halo dijt uit
// Alle tekeningen lopen op één klok (één requestAnimationFrame voor allemaal): een pagina komt
// binnen midden in zijn lus. Alleen de intro telt vanaf zijn eigen begin (de opkomst). Bij
// Minder beweging een stilbeeld (lib/sun.js STILL). De kleuren komen uit de CSS (.sun__*): accent
// en inkt, op merkrood allebei papier. Alles onder de horizon is geknipt.

// ---- De klok ----
const painters = new Set()
let frame = 0
const nowS = () => performance.now() / 1000
function loop() {
  const t = nowS()
  for (const p of painters) p(t)
  frame = painters.size ? requestAnimationFrame(loop) : 0
}
function join(paint) {
  painters.add(paint)
  if (!frame) frame = requestAnimationFrame(loop)
  return () => painters.delete(paint)
}

const f2 = (x) => x.toFixed(2)

// Het water van de Stroom: twee rijen streepjes, vier keer herhaald zodat het schuiven naadloos is.
const ROWS = [
  { y: HZ + 13.75, o: 0.3, off: 0, segs: [[0, 20], [28, 28], [64, 16], [88, 24], [120, 20]] },
  { y: HZ + 25, o: 0.18, off: 12.5, segs: [[0, 14], [26, 22], [60, 12], [84, 18], [120, 16]] },
]

export default function SunArt({ kind, className = '' }) {
  const id = useId().replace(/:/g, '')
  const sun = useRef(null)
  const ring = useRef(null)
  const water = useRef([])

  useEffect(() => {
    const t0 = nowS()
    const paint = (t, still = false) => {
      const s = sun.current
      if (kind === 'intro' && s) {
        const v = introSun(t, t - t0, still)
        s.setAttribute('r', f2(v.r))
        s.setAttribute('cy', f2(v.cy))
      } else if (kind === 'editie' && s) {
        const v = editieSun(t)
        s.setAttribute('r', f2(v.r))
        s.setAttribute('cy', f2(v.cy))
      } else {
        const h = halo(t)
        ring.current?.setAttribute('r', f2(h.r))
        ring.current?.setAttribute('stroke-opacity', h.o.toFixed(3))
        if (kind === 'selectie' && s) s.setAttribute('r', f2(12 * K * breathe(t)))
        if (kind === 'stroom') water.current.forEach((g) => g?.setAttribute('transform', `translate(${f2(-waterShift(t))} 0)`))
      }
    }
    let leave = null
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
    const set = () => {
      leave?.()
      leave = null
      if (reduced()) paint(STILL[kind], true)
      else leave = join(paint)
    }
    set()
    mq?.addEventListener?.('change', set)
    return () => {
      leave?.()
      mq?.removeEventListener?.('change', set)
    }
  }, [kind])

  const small = kind === 'stroom' || kind === 'selectie'
  const cy = kind === 'stroom' ? HZ - 24 * K : HZ - 22 * K
  return (
    <svg className={`sun sun--${kind} ${className}`.trim()} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}-sky`}>
          <rect x={-20} y={-20} width={W + 40} height={HZ + 20} />
        </clipPath>
        {kind === 'stroom' ? (
          <clipPath id={`${id}-water`}>
            <rect x={CX - 70} y={HZ + 4} width={140} height={35} />
          </clipPath>
        ) : null}
      </defs>
      <g clipPath={`url(#${id}-sky)`}>
        {kind === 'selectie' ? (
          <>
            <circle className="sun__ring" cx={CX} cy={cy} r={30 * K} strokeOpacity={0.12} />
            <circle className="sun__ring" cx={CX} cy={cy} r={22 * K} strokeOpacity={0.25} />
          </>
        ) : null}
        {small ? <circle ref={ring} className="sun__ring" cx={CX} cy={cy} r={25} /> : null}
        <circle ref={sun} className="sun__disc" cx={CX} cy={small ? cy : kind === 'intro' ? HZ + 23 * K : HZ} r={small ? 12 * K : 22 * K} />
      </g>
      <line className="sun__line" x1={CX - LINE} x2={CX + LINE} y1={HZ} y2={HZ} strokeOpacity={kind === 'stroom' ? 0.6 : undefined} />
      {kind === 'stroom' ? (
        <g clipPath={`url(#${id}-water)`}>
          {ROWS.map((row, i) => (
            <g key={i} ref={(el) => (water.current[i] = el)} className="sun__water" strokeOpacity={row.o}>
              {[0, 1, 2, 3].flatMap((rep) =>
                row.segs.map(([x, w], j) => {
                  const x0 = CX - 70 + row.off + rep * 140 * K + x * K
                  return <line key={`${rep}-${j}`} x1={x0} x2={x0 + w * K} y1={row.y} y2={row.y} />
                }),
              )}
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  )
}
