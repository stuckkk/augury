import { useTranslation } from 'react-i18next'
import type { GameView, Play } from '../engine/types'
import type { RoomInfo } from '../network/protocol'
import { useSettings } from '../settings/clientSettings'
import { CardFace } from './CardFace'
import { actingSeats, bidTally } from './gameUtil'
import { SuitIcon } from './Glyphs'
import { Orrery } from './Orrery'
import { Seat } from './Seat'
import styles from './Table.module.css'
import { playerColor, useElementSize } from './util'

interface Point {
  x: number
  y: number
}

/**
 * Where each seat sits: you at the bottom, the others clockwise around an ellipse centred on the
 * orrery at height `cy` (or in a strip on phones).
 */
function seatPositions(n: number, me: number, w: number, h: number, cy: number, compact: boolean): Point[] {
  return Array.from({ length: n }, (_, seat) => {
    const k = (seat - me + n) % n
    if (compact) {
      if (k === 0) return { x: w / 2, y: h - 46 }
      const slots = n - 1
      return { x: (w * (k - 0.5)) / slots, y: 46 }
    }
    // Seats sit on the orrery's rim: a circle, stretched sideways a little where there is room.
    const ry = h * 0.41
    const rx = Math.min(w * 0.42, ry * 1.5)
    const a = (k / n) * Math.PI * 2
    const x = w / 2 - Math.sin(a) * rx
    const up = Math.cos(a) < 0
    // Your own seat sits at the bottom, under the ring (see orreryLayout); seats above the centre stay on screen.
    const y = k === 0 ? h - SEAT_HALF.h - 4 : cy + Math.cos(a) * (up ? Math.min(ry, cy - SEAT_HALF.h - 4) : ry)
    // On narrow, tall tables (tablets upright) the upper left seat would sit on the trump medallion.
    if (x - SEAT_HALF.w < TRUMP_ZONE.right && y - SEAT_HALF.h < TRUMP_ZONE.bottom) return { x, y: TRUMP_ZONE.bottom + SEAT_HALF.h }
    return { x, y }
  })
}

/** The trump medallion in the top left corner (`.trump` in Table.module.css, two-line label), with a margin. */
const TRUMP_ZONE = { right: 16 + 104 + 8, bottom: 14 + 178 + 8 }
/** Half the size of a seat (name pill, orbs and label); seats are centred on their position. */
const SEAT_HALF = { w: 52, h: 46 }
/** Room under the orrery for your own seat and the status pill above it. */
const OWN_SEAT_ROOM = 2 * SEAT_HALF.h + 4 + 38

/**
 * Size and centre height of the orrery on larger screens: centred while there is room, otherwise
 * moved up (and if need be made smaller) so its ring ends above your seat and status pill.
 */
function orreryLayout(w: number, h: number): { size: number; cy: number } {
  const size = Math.max(0, Math.min(w * 0.9, h * 0.74, h - OWN_SEAT_ROOM - 8))
  return { size, cy: Math.max(size / 2 + 8, Math.min(h / 2, h - OWN_SEAT_ROOM - size / 2)) }
}

export function Table({
  view,
  room,
  compact,
  isHost,
  onReplace,
  children,
}: {
  view: GameView
  room: RoomInfo
  compact: boolean
  isHost: boolean
  onReplace(seatId: string): void
  children?: React.ReactNode
}) {
  const [ref, { width: w, height: h }] = useElementSize<HTMLDivElement>()
  const n = view.players.length
  const wide = orreryLayout(w, h)
  const orrerySize = compact ? Math.min(w * 0.94, h * 0.62) : wide.size
  const center = { x: w / 2, y: compact ? h / 2 + 4 : wide.cy }
  const pos = seatPositions(n, view.seat, w, h, center.y, compact)
  const acting = actingSeats(view)
  const cardW = Math.round(Math.max(52, Math.min(92, Math.min(w, h) * 0.15)))

  // While a finished trick is still on the table, show it until someone leads the next one.
  const resolved = view.trick.length === 0 && view.lastTrick ? view.lastTrick : null
  const plays: Play[] = resolved ? resolved.plays : view.trick

  const offset = (seat: number, scale: number) => {
    const dx = pos[seat].x - center.x
    const dy = pos[seat].y - center.y
    const len = Math.hypot(dx, dy) || 1
    return { x: (dx / len) * scale, y: (dy / len) * scale, fx: dx, fy: dy }
  }

  const tally = bidTally(view)
  const { statusLine } = useSettings()
  // Your own bid dial covers this spot while you bid.
  const showStatus = statusLine && !(view.phase === 'bidding' && acting.includes(view.seat))
  const accent = view.trump ? `var(--${view.trump})` : undefined

  return (
    <div ref={ref} className={`${styles.table} ${compact ? styles.compact : ''}`}>
      {w > 0 && (
        <>
          <div
            className={styles.orrery}
            style={{ width: orrerySize, height: orrerySize, left: center.x - orrerySize / 2, top: center.y - orrerySize / 2 }}
          >
            <Orrery progress={view.round / view.totalRounds} accent={accent} />
          </div>

          <svg className={styles.rays} width={w} height={h} aria-hidden>
            {acting.length === 1 && view.phase !== 'roundEnd' && (
              <line
                key={acting[0]}
                x1={center.x}
                y1={center.y}
                x2={pos[acting[0]].x}
                y2={pos[acting[0]].y}
                stroke={playerColor(acting[0])}
                className={styles.ray}
              />
            )}
          </svg>

          {/* Keyed so the announce animation replays whenever a new trump is set. */}
          <Trump
            key={`${view.round}-${view.trump ?? view.phase}`}
            view={view}
            compact={compact}
            top={compact ? center.y : undefined}
          />

          <div className={styles.trick} style={{ left: center.x, top: center.y, '--card-w': `${cardW}px` } as React.CSSProperties}>
            {plays.map((p, i) => {
              const o = offset(p.seat, cardW * 0.8)
              const win = resolved ? offset(resolved.winner, 1) : null
              const isWinner = resolved?.winner === p.seat
              return (
                <div
                  key={p.card.id}
                  className={`${styles.trickCard} ${resolved ? styles.resolved : ''} ${isWinner ? styles.winner : ''}`}
                  style={
                    {
                      '--to-x': `${o.x}px`,
                      '--to-y': `${o.y}px`,
                      '--from-x': `${o.fx}px`,
                      '--from-y': `${o.fy}px`,
                      '--win-x': `${win?.fx ?? 0}px`,
                      '--win-y': `${win?.fy ?? 0}px`,
                      '--rot': `${((p.seat * 37) % 17) - 8}deg`,
                      zIndex: i + 1,
                    } as React.CSSProperties
                  }
                >
                  <CardFace card={p.card} />
                </div>
              )
            })}
          </div>


          {view.players.map((p, i) => {
            const info = room.seats[i]
            if (!info) return null
            return (
              <Seat
                key={info.id}
                info={info}
                player={p}
                color={playerColor(i)}
                me={i === view.seat}
                dealer={i === view.dealer}
                acting={acting.includes(i)}
                ready={view.phase === 'roundEnd' ? view.ready[i] : null}
                compact={compact}
                revealed={i === view.seat ? null : p.hand}
                revealSide={pos[i].x < center.x - 1 ? 'left' : 'right'}
                onReplace={isHost && !info.connected && !info.isBot ? () => onReplace(info.id) : undefined}
                note={i === view.seat && showStatus ? <StatusLine view={view} names={room.seats.map(s => s.name)} tally={tally} /> : null}
                style={{ left: pos[i].x, top: pos[i].y }}
              />
            )
          })}
          {children}
        </>
      )}
    </div>
  )
}

function Trump({ view, compact, top }: { view: GameView; compact: boolean; top?: number }) {
  const { t } = useTranslation()
  const label = view.trump ? t(`suits.${view.trump}`) : view.phase === 'chooseTrump' ? t('trump.choosing') : t('trump.none')
  return (
    <div
      className={`${styles.trump} ${compact ? styles.trumpCompact : ''}`}
      style={{ '--trump-accent': view.trump ? `var(--${view.trump})` : 'var(--gold)', top } as React.CSSProperties}
      aria-label={`${t('trump.title')}: ${label}`}
    >
      <div className={styles.trumpCard}>
        {view.trumpCard ? <CardFace card={view.trumpCard} /> : <div className={styles.noCard}>∅</div>}
      </div>
      <div className={styles.trumpText}>
        <span className={styles.trumpTitle}>{t('trump.title')}</span>
        <span className={styles.trumpSuit}>
          {view.trump && <SuitIcon suit={view.trump} size={compact ? 16 : 20} />}
          {label}
        </span>
      </div>
    </div>
  )
}

/**
 * A small pill above your seat: what the seats and cards don't already show (who took the last
 * trick, all bids against the tricks of the round). Whose turn it is shows on the seats themselves.
 */
function StatusLine({ view, names, tally }: { view: GameView; names: string[]; tally: { sum: number; unknown: number } }) {
  const { t } = useTranslation()
  // Separate wording for yourself ("You choose…"), since the verb form differs.
  const say = (key: string, seat: number) => (seat === view.seat ? t(`status.${key}You`) : t(`status.${key}`, { name: names[seat] ?? '?' }))
  let content: React.ReactNode = null
  switch (view.phase) {
    case 'chooseTrump':
      content = say('choosingTrump', view.dealer)
      break
    case 'bidding':
      content = view.options.hiddenBids ? (
        t('status.sealedBids', { done: view.players.filter(p => p.hasBid).length, total: view.players.length })
      ) : (
        <Pressure sum={tally.sum} round={view.round} partial />
      )
      break
    case 'playing': {
      const resolved = view.trick.length === 0 && view.lastTrick
      content = (
        <>
          {resolved && <>{say('tookTrick', view.lastTrick!.winner)} · </>}
          <Pressure sum={tally.sum} round={view.round} />
        </>
      )
      break
    }
    case 'roundEnd':
    case 'gameOver':
      content = view.lastTrick ? say('tookTrick', view.lastTrick.winner) : null
  }
  return content ? <div className={styles.status}>{content}</div> : null
}

/** Bids against tricks available: is the table over- or under-prophesied? */
function Pressure({ sum, round, partial = false }: { sum: number; round: number; partial?: boolean }) {
  const { t } = useTranslation()
  const diff = sum - round
  const cls = partial ? styles.pressure : diff > 0 ? `${styles.pressure} ${styles.over}` : diff < 0 ? `${styles.pressure} ${styles.under}` : styles.pressure
  return (
    <span className={cls} title={t('status.pressureHint')}>
      {t('status.pressure', { sum, round })}
      {!partial && diff !== 0 && <> · {diff > 0 ? `+${diff}` : `−${-diff}`}</>}
    </span>
  )
}
