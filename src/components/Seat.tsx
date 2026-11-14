import { useTranslation } from 'react-i18next'
import type { Card, PlayerView } from '../engine/types'
import { CardFace } from './CardFace'
import type { SeatInfo } from '../network/protocol'
import { ProphecyOrbs } from './ProphecyOrbs'
import styles from './Seat.module.css'
import { Sigil } from './Sigil'

export interface SeatProps {
  info: SeatInfo
  player: PlayerView
  color: string
  me: boolean
  dealer: boolean
  acting: boolean
  ready: boolean | null
  compact: boolean
  /** Cards of this player you can see (the blind round shows everyone else's card). */
  revealed: Card[] | null
  /** Which side of the plate those cards sit on: outward, away from the table's centre. */
  revealSide: 'left' | 'right'
  /** Host may give this (disconnected) seat to a bot. */
  onReplace?: () => void
  style: React.CSSProperties
}

export function Seat({ info, player, color, me, dealer, acting, ready, compact, revealed, revealSide, onReplace, style }: SeatProps) {
  const { t } = useTranslation()
  const cls = [styles.seat, acting && styles.acting, me && styles.me, compact && styles.compact].filter(Boolean).join(' ')
  return (
    <div className={cls} style={{ ...style, '--seat': color } as React.CSSProperties}>
      <div className={styles.plate}>
        <span className={styles.sigil}>
          <Sigil name={info.name} color={color} size={compact ? 28 : 36} isBot={info.isBot} />
          {dealer && (
            <span className={styles.dealer} title={t('seat.dealer')} aria-label={t('seat.dealer')}>
              D
            </span>
          )}
        </span>
        <span className={styles.text}>
          <span className={styles.name}>
            {info.name}
            {me && <span className={styles.you}> · {t('lobby.you')}</span>}
          </span>
          <span className={styles.score}>
            {player.score}
            {!compact && <span className={styles.unit}> {t('seat.points')}</span>}
          </span>
        </span>
      </div>
      {revealed && revealed.length > 0 && (
        <div className={`${styles.revealed} ${revealSide === 'left' ? styles.revealLeft : ''}`}>
          {revealed.map(c => (
            <span key={c.id} className={styles.revealedCard}>
              <CardFace card={c} />
            </span>
          ))}
        </div>
      )}
      <ProphecyOrbs bid={player.bid} tricks={player.tricks} sealed={player.hasBid} />
      <span className={styles.status}>
        {!info.connected && <span className={styles.offline}>{t('lobby.offline')}</span>}
        {info.isBot && !compact && <span className={styles.bot}>{t('lobby.bot')}</span>}
        {acting && ready === null && <span className={styles.thinking} aria-label={t('seat.thinking')}><i /><i /><i /></span>}
        {ready && <span className={styles.ready}>{t('seat.ready')}</span>}
      </span>
      {onReplace && (
        <button type="button" className={`btn btn-small ${styles.replace}`} onClick={onReplace}>
          {t('seat.replaceWithBot')}
        </button>
      )}
    </div>
  )
}
