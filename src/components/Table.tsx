import { useTranslation } from 'react-i18next'
import type { GameView, Play } from '../engine/types'
import type { RoomInfo } from '../network/protocol'
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

/** Where each seat sits: you at the bottom, the others clockwise around an ellipse (or in a strip on phones). */
function seatPositions(n: number, me: number, w: number, h: number, compact: boolean): Point[] {
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
    return { x: w / 2 - Math.sin(a) * rx, y: h / 2 + Math.cos(a) * ry }
  })
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
  const pos = seatPositions(n, view.seat, w, h, compact)
  const center = { x: w / 2, y: compact ? h / 2 + 4 : h / 2 }
  const acting = actingSeats(view)
  const cardW = Math.round(Math.max(52, Math.min(92, Math.min(w, h) * 0.15)))
  const orrerySize = compact ? Math.min(w * 0.94, h * 0.62) : Math.min(w * 0.9, h * 0.74)

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

          {!(view.phase === 'bidding' && acting.includes(view.seat)) && (
            <div className={styles.status} style={{ left: center.x, top: center.y + cardW * 1.5 * 0.5 + cardW * 0.8 + 8 }}>
              <StatusLine view={view} names={room.seats.map(s => s.name)} tally={tally} />
            </div>
          )}

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

function StatusLine({ view, names, tally }: { view: GameView; names: string[]; tally: { sum: number; unknown: number } }) {
  const { t } = useTranslation()
  // Separate wording for yourself ("You choose…"), since the verb form differs.
  const say = (key: string, seat: number) => (seat === view.seat ? t(`status.${key}You`) : t(`status.${key}`, { name: names[seat] ?? '?' }))
  switch (view.phase) {
    case 'chooseTrump':
      return <span>{say('choosingTrump', view.dealer)}</span>
    case 'bidding': {
      if (view.options.hiddenBids) {
        const done = view.players.filter(p => p.hasBid).length
        return <span>{t('status.sealedBids', { done, total: view.players.length })}</span>
      }
      return (
        <span>
          {say('bidding', view.turn)} <Pressure sum={tally.sum} round={view.round} partial />
        </span>
      )
    }
    case 'playing': {
      const resolved = view.trick.length === 0 && view.lastTrick
      return (
        <span>
          {resolved ? say('tookTrick', view.lastTrick!.winner) : say('playing', view.turn)}{' '}
          <Pressure sum={tally.sum} round={view.round} />
        </span>
      )
    }
    case 'roundEnd':
    case 'gameOver':
      return view.lastTrick ? <span>{say('tookTrick', view.lastTrick.winner)}</span> : null
  }
}

/** Bids against tricks available: is the table over- or under-prophesied? */
function Pressure({ sum, round, partial = false }: { sum: number; round: number; partial?: boolean }) {
  const { t } = useTranslation()
  const diff = sum - round
  const cls = partial ? styles.pressure : diff > 0 ? `${styles.pressure} ${styles.over}` : diff < 0 ? `${styles.pressure} ${styles.under}` : styles.pressure
  return (
    <span className={cls} title={t('status.pressureHint')}>
      {t('status.pressure', { sum, round })}
      {!partial && diff !== 0 && <> · {diff > 0 ? t('status.over', { n: diff }) : t('status.under', { n: -diff })}</>}
    </span>
  )
}
