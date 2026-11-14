import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { placings } from '../engine/engine'
import type { GameView } from '../engine/types'
import { motionEnabled } from '../settings/clientSettings'
import styles from './RoundSummary.module.css'
import { StarChart, type ScorePlayer } from './Scores'
import { Sigil } from './Sigil'
import { playerColor } from './util'

/** Counts from 0 up (or down) to `to` once shown. */
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(motionEnabled() ? 0 : to)
  useEffect(() => {
    if (!motionEnabled()) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 700)
      setV(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to])
  return <>{v > 0 ? `+${v}` : v}</>
}

export function RoundSummary({
  view,
  players,
  isHost,
  onReady,
  onNewGame,
  onLeave,
}: {
  view: GameView
  players: ScorePlayer[]
  isHost: boolean
  onReady(): void
  onNewGame(): void
  onLeave(): void
}) {
  const { t } = useTranslation()
  const record = view.history[view.history.length - 1]
  const final = view.phase === 'gameOver'
  if (!record) return null
  const place = placings(record.totals)
  const order = players.map(p => p.seat).sort((a, b) => record.totals[b] - record.totals[a])
  const waitingFor = players.filter(p => !view.ready[p.seat]).map(p => p.name)
  const winners = order.filter(seat => place[seat] === 1).map(seat => players.find(p => p.seat === seat)?.name ?? '?')
  const headline = !final
    ? t('summary.title')
    : place[view.seat] === 1
      ? winners.length > 1
        ? t('summary.youShare')
        : t('summary.youWin')
      : winners.length > 1
        ? t('summary.shared', { names: winners.join(' & ') })
        : t('summary.winner', { name: winners[0] })

  return (
    <div className={styles.backdrop}>
      <section className={`${styles.scroll} ${final ? styles.final : ''}`} aria-live="polite">
        <header className={styles.head}>
          <span className={styles.kicker}>{final ? t('summary.finalKicker') : t('summary.kicker', { n: record.round, total: view.totalRounds })}</span>
          <h2>{headline}</h2>
        </header>

        <ol className={styles.rows}>
          {order.map((seat, i) => {
            const p = players.find(q => q.seat === seat)!
            const hit = record.bids[seat] === record.tricks[seat]
            return (
              <li key={seat} className={`${styles.row} ${seat === view.seat ? styles.me : ''}`} style={{ animationDelay: `${i * 70}ms` }}>
                <span className={styles.place}>{final && place[seat] === 1 ? '✦' : place[seat]}</span>
                <Sigil name={p.name} color={playerColor(seat)} size={30} />
                <span className={styles.name}>{p.name}</span>
                {!final && (
                  <span className={styles.prophecy} title={t('summary.bidTricksHint')}>
                    <span className={hit ? styles.hit : styles.miss}>{hit ? '✓' : '✗'}</span>
                    {t('scores.bidTricks', { bid: record.bids[seat], tricks: record.tricks[seat] })}
                  </span>
                )}
                {!final && (
                  <span className={`${styles.delta} ${record.deltas[seat] >= 0 ? styles.plus : styles.minus}`}>
                    <CountUp to={record.deltas[seat]} />
                  </span>
                )}
                <span className={styles.total}>{record.totals[seat]}</span>
              </li>
            )
          })}
        </ol>

        {final && <StarChart history={view.history} players={players} me={view.seat} totalRounds={view.totalRounds} />}

        <footer className={styles.foot}>
          {final ? (
            <>
              {isHost ? (
                <button type="button" className="btn btn-primary" onClick={onNewGame}>
                  {t('summary.newGame')}
                </button>
              ) : (
                <p className={styles.waiting}>{t('summary.hostDecides')}</p>
              )}
              <button type="button" className="btn" onClick={onLeave}>
                {t('summary.leave')}
              </button>
            </>
          ) : view.ready[view.seat] ? (
            <p className={styles.waiting}>{t('summary.waitingFor', { names: waitingFor.join(', ') })}</p>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onReady} autoFocus>
              {t('summary.next', { n: record.round + 1 })}
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
