import { useTranslation } from 'react-i18next'
import { SUITS, type Suit } from '../engine/types'
import { CardFace } from './CardFace'
import { SuitIcon } from './Glyphs'
import styles from './TrumpPicker.module.css'

/** The dealer turned up an Archmage and names the trump suit. */
export function TrumpPicker({ onPick }: { onPick(suit: Suit): void }) {
  const { t } = useTranslation()
  return (
    <div className={styles.picker} role="dialog" aria-label={t('trump.pickTitle')}>
      <p className={styles.title}>{t('trump.pickTitle')}</p>
      <div className={styles.ring}>
        <div className={styles.card}>
          <CardFace card={{ id: 'archmage-x', kind: 'archmage' }} />
        </div>
        {SUITS.map((suit, i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 2 - Math.PI / 4
          return (
            <button
              key={suit}
              type="button"
              className={styles.suit}
              style={{ left: `${50 + Math.cos(a) * 42}%`, top: `${50 + Math.sin(a) * 42}%`, '--c': `var(--${suit})` } as React.CSSProperties}
              onClick={() => onPick(suit)}
            >
              <SuitIcon suit={suit} size={30} />
              <span>{t(`suits.${suit}`)}</span>
            </button>
          )
        })}
      </div>
      <p className={styles.hint}>{t('trump.pickHint')}</p>
    </div>
  )
}
