import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { play } from '../audio/sound'
import type { GameView } from '../engine/types'
import type { Session } from '../network/useSession'
import { getSettings, motionEnabled } from '../settings/clientSettings'
import { BidDial } from './BidDial'
import { Dialog } from './Dialog'
import styles from './Game.module.css'
import { bidTally, isMyMove } from './gameUtil'
import { Hand } from './Hand'
import { Icon } from './Icons'
import { RoundSummary } from './RoundSummary'
import { RulesButton } from './RulesSheet'
import { Scores, type ScorePlayer } from './Scores'
import { SettingsButton } from './SettingsMenu'
import { Table } from './Table'
import { TrumpPicker } from './TrumpPicker'
import { sortHand, useMediaQuery } from './util'

/** Key of the last finished trick, to notice a new one. */
const trickKey = (v: GameView) => (v.lastTrick ? `${v.round}-${v.tricksPlayed}` : '')

export function Game({ session }: { session: Session }) {
  const { t } = useTranslation()
  const view = session.view!
  const room = session.room!
  const isHost = room.hostId === session.seatId
  const compact = useMediaQuery('(max-width: 640px), (max-height: 520px)')
  const [scoresOpen, setScoresOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  // The round whose summary may show (set a moment after the round ends).
  const [summaryRound, setSummaryRound] = useState<string | null>(null)
  // The last trick everyone has had time to see; until then the next card cannot be played.
  const [settledTrick, setSettledTrick] = useState(() => trickKey(view))
  const prev = useRef<GameView | null>(null)
  const myMove = isMyMove(view)
  const me = view.players[view.seat]
  const players: ScorePlayer[] = room.seats.map((s, seat) => ({ name: s.name, seat }))
  const act = (action: Parameters<Session['send']>[0] & { type: 'action' }) => session.send(action)

  // Sounds, the tab title and a short pause after each trick so nobody plays into a trick they did not see end.
  useEffect(() => {
    const before = prev.current
    prev.current = view
    if (!before) return
    if (view.trick.length > before.trick.length) play('card')
    if (trickKey(view) && trickKey(view) !== trickKey(before)) {
      play(view.lastTrick!.winner === view.seat ? 'trick' : 'card')
    }
  }, [view])

  const lastTrickKey = trickKey(view)
  useEffect(() => {
    const tm = setTimeout(() => setSettledTrick(lastTrickKey), motionEnabled() ? 1300 : 300)
    return () => clearTimeout(tm)
  }, [lastTrickKey])
  const settling = lastTrickKey !== settledTrick && view.trick.length === 0

  useEffect(() => {
    if (!myMove) return
    if (view.phase !== 'roundEnd') {
      play('turn')
      if (getSettings().vibrate) navigator.vibrate?.(60)
    }
  }, [myMove, view.phase, view.round])

  useEffect(() => {
    const base = t('app.title')
    document.title = myMove && view.phase !== 'roundEnd' ? `✦ ${t('game.yourMove')} · ${base}` : base
    return () => {
      document.title = base
    }
  }, [myMove, view.phase, t])

  // Let the last trick land before the scores unroll.
  const ended = view.phase === 'roundEnd' || view.phase === 'gameOver'
  const roundKey = `${view.round}-${ended}`
  const summaryShown = ended && summaryRound === roundKey
  useEffect(() => {
    if (!ended) return
    const tm = setTimeout(() => {
      setSummaryRound(roundKey)
      const rec = view.history[view.history.length - 1]
      if (view.phase === 'gameOver') play(Math.max(...rec.totals) === rec.totals[view.seat] ? 'win' : 'round')
      else play(rec.bids[view.seat] === rec.tricks[view.seat] ? 'round' : 'miss')
    }, motionEnabled() ? 1700 : 400)
    return () => clearTimeout(tm)
    // Only when a round ends, not on every ready update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey])

  const tally = bidTally(view)
  const showDial = view.phase === 'bidding' && myMove
  const showPicker = view.phase === 'chooseTrump' && view.dealer === view.seat
  const canPlay = view.phase === 'playing' && myMove && !settling

  return (
    <div className={`${styles.game} ${compact ? styles.compact : ''}`}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <span className={styles.logo}>{t('app.title')}</span>
          <span className={styles.code}>{room.id}</span>
        </div>
        <div className={styles.roundPill} aria-label={t('game.roundOf', { round: view.round, total: view.totalRounds })}>
          {Array.from({ length: view.totalRounds }, (_, i) => (
            <span key={i} className={i + 1 < view.round ? styles.past : i + 1 === view.round ? styles.now : undefined} />
          ))}
          <b>{t('game.roundShort', { round: view.round, total: view.totalRounds })}</b>
        </div>
        <nav className={styles.actions}>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setScoresOpen(true)} aria-label={t('scores.button')}>
            <Icon name="chart" />
            <span className={styles.label}>{t('scores.button')}</span>
          </button>
          <RulesButton options={view.options} iconOnly={compact} />
          <SettingsButton className="btn btn-ghost btn-small" iconOnly={compact} />
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmLeave(true)} aria-label={t('game.leave')}>
            <Icon name="exit" />
            <span className={styles.label}>{t('game.leave')}</span>
          </button>
        </nav>
      </header>

      <main className={styles.tableArea}>
        <Table view={view} room={room} compact={compact} isHost={isHost} onReplace={seatId => session.send({ type: 'replaceWithBot', seatId })}>
          {showPicker && (
            <div className={styles.centerOverlay}>
              <TrumpPicker onPick={suit => act({ type: 'action', action: { type: 'chooseTrump', suit } })} />
            </div>
          )}
          {showDial && (
            <div className={styles.dialOverlay}>
              <BidDial
                key={`${view.round}`}
                max={view.round}
                forbidden={view.forbiddenBid}
                knownSum={tally.sum}
                othersPending={view.options.hiddenBids ? 0 : tally.unknown - 1}
                hidden={view.options.hiddenBids}
                width={Math.min(window.innerWidth, 560)}
                onBid={bid => act({ type: 'action', action: { type: 'bid', bid } })}
              />
            </div>
          )}
          {ended && summaryShown && (
            <RoundSummary
              view={view}
              players={players}
              isHost={isHost}
              onReady={() => act({ type: 'action', action: { type: 'ready' } })}
              onNewGame={() => session.send({ type: 'newGame' })}
              onLeave={() => session.send({ type: 'leave' })}
            />
          )}
        </Table>
      </main>

      <footer className={`${styles.handArea} ${canPlay ? styles.yourTurn : ''}`}>
        {view.blind && view.phase !== 'roundEnd' && <div className={styles.blindNote}>{canPlay ? t('game.playBlind') : t('game.blindNote')}</div>}
        <Hand
          cards={sortHand(me.hand ?? [], view.trump)}
          hiddenCount={me.hand === null ? me.handCount : 0}
          legal={view.legal}
          canPlay={canPlay}
          onPlay={cardId => act({ type: 'action', action: { type: 'play', cardId } })}
        />
      </footer>

      <Dialog open={scoresOpen} title={t('scores.title')} onClose={() => setScoresOpen(false)} wide>
        <Scores history={view.history} players={players} me={view.seat} totalRounds={view.totalRounds} />
      </Dialog>
      <Dialog open={confirmLeave} title={t('game.leaveTitle')} onClose={() => setConfirmLeave(false)}>
        <p className={styles.leaveText}>{t('game.leaveText')}</p>
        <div className={styles.leaveActions}>
          <button type="button" className="btn" onClick={() => setConfirmLeave(false)}>
            {t('game.stay')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => session.send({ type: 'leave' })}>
            {t('game.leave')}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
