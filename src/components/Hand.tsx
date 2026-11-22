import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HIDDEN_CARD_ID, type Card } from '../engine/types'
import { useSettings } from '../settings/clientSettings'
import { CardBack, CardFace } from './CardFace'
import { cardLabel } from './gameUtil'
import styles from './Hand.module.css'
import { useElementSize } from './util'

/** How far the outermost cards may tilt, in degrees; more swings them off the sides. */
const MAX_FAN_ANGLE = 12

/** One fanned row of `count` cards that, tilt included, fits into `width`. */
function fan(count: number, width: number, cardW: number, cardH: number) {
  const mid = (count - 1) / 2
  const tilt = Math.min(4, 36 / Math.max(count, 1), mid > 0 ? MAX_FAN_ANGLE / mid : 0)
  const curve = Math.min(2.6, 70 / ((mid + 1) * (mid + 1)), mid > 0 ? (cardH * 0.2) / (mid * mid) : 0)
  // Cards turn about a point below them (transform-origin 50% 120%), which swings the outer top
  // corners outwards: keep that much room at the sides.
  const a = (mid * tilt * Math.PI) / 180
  const swing = (cardW / 2) * (Math.cos(a) - 1) + cardH * 1.2 * Math.sin(a)
  const margin = Math.max(8, swing + 4)
  const step = count > 1 ? Math.min(cardW * 0.74, (width - cardW - 2 * margin) / (count - 1)) : 0
  return { mid, tilt, curve, step, total: step * (count - 1) + cardW, drop: curve * mid * mid }
}

/**
 * Your cards, fanned along an arc. On narrow screens a crowded hand is split into two rows, so
 * every card's corner stays readable. Playable cards rise and shimmer when it is your move.
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
  const single = fan(n, width, cardW, cardH)
  // Two rows once a single fan would show less than 40% of each card (phones, long rounds).
  const rows = n >= 8 && single.step < cardW * 0.4 ? 2 : 1
  const perRow = Math.ceil(n / rows)
  const fans = rows === 1 ? [single] : [fan(perRow, width, cardW, cardH), fan(n - perRow, width, cardW, cardH)]
  // The back row shows its top part (value and suit) above the front row.
  const rowGap = rows === 2 ? Math.round(cardH * 0.46) : 0
  // Raise the fan so its lowered ends stay inside the hand instead of dropping off screen.
  const lift = Math.max(0, Math.max(...fans.map(f => f.drop)) - 8)

  const press = (id: string) => {
    if (!canPlay || !legal.includes(id)) return
    if (!confirmPlay || selected === id) {
      setSelected(null)
      onPlay(id)
    } else setSelected(id)
  }

  return (
    <div ref={ref} className={styles.hand} style={{ height: cardH + 26 + lift + rowGap }} role="group" aria-label={t('hand.label')}>
      {width > 0 &&
        items.map(({ id, card }, i) => {
          const playable = canPlay && legal.includes(id)
          const row = i < perRow ? 0 : 1
          const f = fans[row]
          const j = i - row * perRow
          const x = (width - f.total) / 2 + j * f.step
          const y = (j - f.mid) * (j - f.mid) * f.curve - lift - (rows === 2 && row === 0 ? rowGap : 0)
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
                  '--r': `${(j - f.mid) * f.tilt}deg`,
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
