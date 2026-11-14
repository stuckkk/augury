import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './BidDial.module.css'

/**
 * A semicircular dial of possible bids. The bid that would even out the table (house rule) is
 * etched out. The centre shows the pick, the bids so far and whether the table is over or under.
 */
export function BidDial({
  max,
  forbidden,
  knownSum,
  othersPending,
  hidden,
  width,
  onBid,
}: {
  max: number
  forbidden: number | null
  /** Sum of the other bids we know of. */
  knownSum: number
  othersPending: number
  hidden: boolean
  width: number
  onBid(bid: number): void
}) {
  const { t } = useTranslation()
  const [pick, setPick] = useState<number | null>(null)
  const values = Array.from({ length: max + 1 }, (_, i) => i)
  const btn = width < 420 ? 36 : 42
  const outer = Math.min(220, (Math.min(width, 520) - btn - 8) / 2)
  const twoRings = values.length > 11
  const rings = twoRings ? [values.slice(0, Math.ceil(values.length / 2)), values.slice(Math.ceil(values.length / 2))] : [values]
  // Keep the arc clear of the centre (label, number, button), even with only two or three values.
  const radii = twoRings ? [outer - btn - 6, outer] : [Math.min(outer, Math.max(btn * 3.4, (values.length * (btn + 8)) / Math.PI))]
  const dialW = (radii[radii.length - 1] + btn / 2) * 2
  const dialH = radii[radii.length - 1] + btn / 2 + 8

  const total = pick === null ? null : knownSum + pick
  return (
    <div className={styles.wrap}>
      <div className={styles.dial} style={{ width: dialW, height: dialH, '--btn': `${btn}px` } as React.CSSProperties} role="radiogroup" aria-label={t('bid.title', { count: max })}>
        <svg className={styles.arc} width={dialW} height={dialH} aria-hidden>
          {radii.map(r => (
            <path key={r} d={`M ${dialW / 2 - r} ${dialH - 4} A ${r} ${r} 0 0 1 ${dialW / 2 + r} ${dialH - 4}`} />
          ))}
        </svg>
        {rings.map((ring, ri) =>
          ring.map((v, i) => {
            // Spread over the arc but keep clear of its flat ends and, for few values, of the centre.
            const a = Math.PI + (ring.length === 1 ? 0.5 : 0.12 + (0.76 * i) / (ring.length - 1)) * Math.PI
            const r = radii[ri]
            const x = dialW / 2 + Math.cos(a) * r
            const y = dialH - 4 + Math.sin(a) * r
            const isForbidden = v === forbidden
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={pick === v}
                disabled={isForbidden}
                title={isForbidden ? t('bid.forbidden') : undefined}
                className={`${styles.value} ${pick === v ? styles.picked : ''} ${isForbidden ? styles.forbidden : ''}`}
                style={{ left: x, top: y, animationDelay: `${(ri * ring.length + i) * 18}ms` }}
                onClick={() => setPick(v)}
                onDoubleClick={() => !isForbidden && onBid(v)}
              >
                {v}
              </button>
            )
          }),
        )}
        <div className={styles.center}>
          <span className={styles.prompt}>{t('bid.prompt')}</span>
          <span className={styles.big}>{pick ?? '?'}</span>
          <button type="button" className="btn btn-primary btn-small" disabled={pick === null} onClick={() => pick !== null && onBid(pick)}>
            {t('bid.confirm')}
          </button>
        </div>
      </div>
      <p className={styles.gauge}>
        {hidden ? (
          t('bid.hiddenNote')
        ) : (
          <>
            {t('bid.soFar', { sum: knownSum, round: max })}
            {total !== null && othersPending === 0 && (
              <span className={total > max ? styles.over : total < max ? styles.under : styles.even}>
                {' · '}
                {total > max ? t('status.over', { n: total - max }) : total < max ? t('status.under', { n: max - total }) : t('bid.even')}
              </span>
            )}
            {othersPending > 0 && <span className={styles.pending}> · {t('bid.pending', { count: othersPending })}</span>}
          </>
        )}
        {forbidden !== null && <span className={styles.rule}> · {t('bid.forbiddenValue', { n: forbidden })}</span>}
      </p>
    </div>
  )
}
