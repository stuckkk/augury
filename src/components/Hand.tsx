import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HIDDEN_CARD_ID, type Card } from '../engine/types'
import { useSettings } from '../settings/clientSettings'
import { CardBack, CardFace } from './CardFace'
import { cardLabel } from './gameUtil'
import styles from './Hand.module.css'
import { useElementSize } from './util'

/**
 * Your cards, fanned along an arc. Playable cards rise and shimmer when it is your move.
 * Tap to raise a card, tap it again to play it (or a single tap, if the setting is off).
 */
export function Hand({
  cards,
  hiddenCount,
  legal,
  canPlay,
  onPlay,
}: {
  cards: Card[]
  /** Blind round: this many face-down cards of your own. */
  hiddenCount: number
  legal: readonly string[]
  canPlay: boolean
  onPlay(cardId: string): void
}) {
  const { t } = useTranslation()
  const { confirmPlay } = useSettings()
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [picked, setSelected] = useState<string | null>(null)
  // A raised card only counts while it can still be played.
  const selected = canPlay && picked && legal.includes(picked) ? picked : null

  const items: { id: string; card: Card | null }[] =
    hiddenCount > 0 ? Array.from({ length: hiddenCount }, () => ({ id: HIDDEN_CARD_ID, card: null })) : cards.map(c => ({ id: c.id, card: c }))
  const n = items.length

  const cardW = Math.round(Math.max(58, Math.min(104, width / 6.2)))
  const cardH = cardW * 1.5
  const step = n > 1 ? Math.min(cardW * 0.74, (width - cardW - 16) / (n - 1)) : 0
  const total = step * (n - 1) + cardW
  const mid = (n - 1) / 2
  const tilt = Math.min(4, 36 / Math.max(n, 1))
  const curve = Math.min(2.6, 70 / ((mid + 1) * (mid + 1)))

  const press = (id: string) => {
    if (!canPlay || !legal.includes(id)) return
    if (!confirmPlay || selected === id) {
      setSelected(null)
      onPlay(id)
    } else setSelected(id)
  }

  return (
    <div ref={ref} className={styles.hand} style={{ height: cardH + 26 }} role="group" aria-label={t('hand.label')}>
      {width > 0 &&
        items.map(({ id, card }, i) => {
          const playable = canPlay && legal.includes(id)
          const x = (width - total) / 2 + i * step
          const y = (i - mid) * (i - mid) * curve
          const cls = [
            styles.card,
            canPlay && (playable ? styles.playable : styles.dimmed),
            selected === id && styles.selected,
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={card ? card.id : `hidden-${i}`}
              type="button"
              className={cls}
              style={
                {
                  left: x,
                  width: cardW,
                  height: cardH,
                  '--y': `${y}px`,
                  '--r': `${(i - mid) * tilt}deg`,
                  '--d': `${i * 35}ms`,
                } as React.CSSProperties
              }
              aria-label={card ? cardLabel(t, card) : t('hand.unseen')}
              aria-disabled={!playable}
              onClick={() => press(id)}
              onDoubleClick={() => playable && (setSelected(null), onPlay(id))}
            >
              {card ? <CardFace card={card} /> : <CardBack mystery />}
            </button>
          )
        })}
      {canPlay && confirmPlay && selected && <div className={styles.hint}>{t('hand.tapAgain')}</div>}
    </div>
  )
}
