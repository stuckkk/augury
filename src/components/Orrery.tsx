import { memo } from 'react'
import styles from './Orrery.module.css'

/** Decorative astrolabe rings: 60 ticks for the 60 cards, slowly turning rings. */
export const Orrery = memo(function Orrery({ progress = 0, accent }: { progress?: number; accent?: string }) {
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2
    const long = i % 5 === 0
    const r1 = long ? 44.5 : 46
    return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * 48} y2={Math.sin(a) * 48} />
  })
  const arc = 2 * Math.PI * 41
  return (
    <svg className={styles.orrery} viewBox="-50 -50 100 100" aria-hidden style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}>
      <circle r="48" className={styles.outer} />
      <g className={styles.ticks}>{ticks}</g>
      <circle r="41" className={styles.track} />
      <circle
        r="41"
        className={styles.progress}
        strokeDasharray={`${arc * progress} ${arc}`}
        transform="rotate(-90)"
      />
      <g className={styles.spinSlow}>
        <circle r="34" className={styles.dashed} />
        <circle r="34" cx="0" cy="0" className={styles.planetOrbit} />
        <circle cx="34" cy="0" r="1.6" className={styles.planet} />
      </g>
      <g className={styles.spinBack}>
        <ellipse rx="27" ry="10" className={styles.ellipse} transform="rotate(-24)" />
        <circle cx="27" cy="0" r="1.1" className={styles.planet} transform="rotate(-24)" />
      </g>
      <circle r="20" className={styles.inner} />
    </svg>
  )
})
