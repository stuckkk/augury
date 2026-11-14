import { useTranslation } from 'react-i18next'
import styles from './ProphecyOrbs.module.css'

/**
 * A player's prophecy at a glance: one moon per trick they bid. Won tricks fill the moons;
 * tricks beyond the bid show as cracked red moons. A bid of 0 is a halo that shatters when broken.
 */
export function ProphecyOrbs({ bid, tricks, sealed }: { bid: number | null; tricks: number; sealed: boolean }) {
  const { t } = useTranslation()
  if (bid === null) {
    return (
      <div className={styles.orbs} aria-label={sealed ? t('seat.sealed') : t('seat.noBid')}>
        {sealed ? <span className={styles.seal}>✦</span> : <span className={styles.pending}>· · ·</span>}
      </div>
    )
  }
  const label = t('seat.orbs', { bid, tricks })
  if (bid === 0) {
    return (
      <div className={styles.orbs} aria-label={label} title={label}>
        <span className={`${styles.halo} ${tricks > 0 ? styles.broken : ''}`} />
        {Array.from({ length: tricks }, (_, i) => (
          <span key={i} className={`${styles.orb} ${styles.over}`} />
        ))}
      </div>
    )
  }
  const n = Math.max(bid, tricks)
  const small = n > 8
  return (
    <div className={`${styles.orbs} ${small ? styles.small : ''}`} aria-label={label} title={label}>
      {Array.from({ length: n }, (_, i) => {
        const cls = i >= bid ? styles.over : i < tricks ? styles.won : styles.open
        return <span key={i} className={`${styles.orb} ${cls}`} />
      })}
      {tricks === bid && <span className={styles.check} aria-hidden>✓</span>}
    </div>
  )
}
