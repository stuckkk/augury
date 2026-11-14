import { memo } from 'react'
import styles from './Sky.module.css'
import { seeded } from './util'

/** The fixed starfield behind everything. */
export const Sky = memo(function Sky() {
  const rand = seeded(1729)
  const stars = Array.from({ length: 170 }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: rand() < 0.08 ? 1.3 : 0.4 + rand() * 0.6,
    o: 0.25 + rand() * 0.6,
    twinkle: rand() < 0.18,
    delay: rand() * 6,
  }))
  return (
    <svg className={styles.sky} aria-hidden preserveAspectRatio="none">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="#fff"
          opacity={s.o}
          className={s.twinkle ? styles.twinkle : undefined}
          style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
        />
      ))}
    </svg>
  )
})
