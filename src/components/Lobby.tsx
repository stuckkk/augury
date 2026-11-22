import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_PLAYERS, MIN_PLAYERS, maxRounds } from '../engine/cards'
import type { RuleOptions } from '../engine/types'
import type { Session } from '../network/useSession'
import { LanguageToggle } from './LanguageToggle'
import styles from './Lobby.module.css'
import { Orrery } from './Orrery'
import { RulesButton } from './RulesSheet'
import { Sigil } from './Sigil'
import { playerColor } from './util'

function inviteLink(roomId: string, lanHost: string | null): string {
  const url = new URL(location.href)
  // Opened on the server machine itself: friends need its network address, not "localhost".
  if (lanHost && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) url.hostname = lanHost
  url.search = `?room=${roomId}`
  url.hash = ''
  return url.toString()
}

export function Lobby({ session }: { session: Session }) {
  const { t } = useTranslation()
  const room = session.room!
  const isHost = room.hostId === session.seatId
  const [copied, setCopied] = useState(false)
  const link = inviteLink(room.id, session.lanHost)
  const count = room.seats.length

  const linkRef = useRef<HTMLInputElement>(null)

  const copy = async () => {
    let ok = false
    // The async clipboard API only exists in secure contexts (https or localhost).
    if (window.isSecureContext && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link)
        ok = true
      } catch {
        // Fall through to the selection-based copy.
      }
    }
    if (!ok && linkRef.current) {
      // Plain http on a LAN: copy the selected text the old way.
      linkRef.current.focus()
      linkRef.current.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        // The link stays selected for copying by hand.
      }
    }
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => room.seats[i] ?? null)

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => session.send({ type: 'leave' })}>
          ← {t('lobby.leave')}
        </button>
        <div className={styles.topRight}>
          <RulesButton options={room.options} />
          <LanguageToggle />
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.tableCol}>
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>{t('lobby.tableCode')}</span>
            <span className={styles.code} aria-label={room.id.split('').join(' ')}>
              {room.id.split('').map((ch, i) => (
                <span key={i}>{ch}</span>
              ))}
            </span>
            <div className={styles.invite}>
              <input ref={linkRef} readOnly value={link} onFocus={e => e.target.select()} aria-label={t('lobby.inviteLink')} />
              <button type="button" className="btn btn-small" onClick={copy}>
                {copied ? t('lobby.copied') : t('lobby.copy')}
              </button>
            </div>
          </div>

          <div className={styles.ring}>
            <div className={styles.ringOrrery}>
              <Orrery progress={count / MAX_PLAYERS} />
            </div>
            <div className={styles.ringCenter}>
              <span className={styles.count}>{count}</span>
              <span>{t('lobby.augurs', { count })}</span>
            </div>
            {slots.map((seat, i) => {
              const a = (i / MAX_PLAYERS) * Math.PI * 2 - Math.PI / 2
              const pos = { left: `${50 + Math.cos(a) * 44}%`, top: `${50 + Math.sin(a) * 44}%` }
              if (!seat) {
                return (
                  <div key={`empty-${i}`} className={`${styles.slot} ${styles.empty}`} style={pos}>
                    {isHost ? (
                      <button type="button" className={styles.addBot} onClick={() => session.send({ type: 'addBot' })}>
                        + {t('lobby.addBot')}
                      </button>
                    ) : (
                      <span>{t('lobby.openSeat')}</span>
                    )}
                  </div>
                )
              }
              const me = seat.id === session.seatId
              return (
                <div key={seat.id} className={`${styles.slot} ${me ? styles.me : ''}`} style={pos}>
                  <Sigil name={seat.name} color={playerColor(i)} size={40} isBot={seat.isBot} />
                  <span className={styles.name}>{seat.name}</span>
                  <span className={styles.tags}>
                    {seat.id === room.hostId && <span>{t('lobby.host')}</span>}
                    {seat.isBot && <span>{t('lobby.bot')}</span>}
                    {me && <span>{t('lobby.you')}</span>}
                    {!seat.connected && <span className={styles.offline}>{t('lobby.offline')}</span>}
                  </span>
                  {isHost && !me && (
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={t('lobby.remove', { name: seat.name })}
                      onClick={() => session.send({ type: 'removeSeat', seatId: seat.id })}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.rulesCol}>
          <h2>{t('lobby.houseRules')}</h2>
          <p className={styles.hint}>{isHost ? t('lobby.hostSets') : t('lobby.hostSetsGuest')}</p>
          <OptionsForm
            options={room.options}
            players={Math.max(MIN_PLAYERS, count)}
            disabled={!isHost}
            onChange={options => session.send({ type: 'setOptions', options })}
          />
          <div className={styles.start}>
            {isHost ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={count < MIN_PLAYERS}
                onClick={() => session.send({ type: 'start' })}
              >
                {t('lobby.start')}
              </button>
            ) : (
              <p className={styles.waitHost}>{t('lobby.waitingForHost')}</p>
            )}
            {count < MIN_PLAYERS && <p className={styles.hint}>{t('lobby.needPlayers', { min: MIN_PLAYERS })}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function Toggle({
  checked,
  disabled,
  label,
  description,
  onChange,
  children,
}: {
  checked: boolean
  disabled: boolean
  label: string
  description: string
  onChange(v: boolean): void
  children?: React.ReactNode
}) {
  return (
    <div className={`${styles.option} ${checked ? styles.optionOn : ''}`}>
      <label className={styles.optionHead}>
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
        <span className={styles.switch} aria-hidden />
        <span className={styles.optionLabel}>{label}</span>
      </label>
      <p className={styles.optionDesc}>{description}</p>
      {children}
    </div>
  )
}

function OptionsForm({
  options,
  players,
  disabled,
  onChange,
}: {
  options: RuleOptions
  players: number
  disabled: boolean
  onChange(o: RuleOptions): void
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<RuleOptions>) => onChange({ ...options, ...patch })
  const full = maxRounds(players)
  return (
    <div className={styles.options}>
      <Toggle
        checked={options.noEvenBids}
        disabled={disabled || options.hiddenBids}
        label={t('options.noEvenBids')}
        description={options.hiddenBids ? t('options.noEvenBidsHidden') : t('options.noEvenBidsDesc')}
        onChange={v => set({ noEvenBids: v })}
      >
        {options.noEvenBids && (
          <label className={styles.inline}>
            {t('options.evenUntil')}
            <input
              type="number"
              min={0}
              max={20}
              value={options.evenBidsAllowedThroughRound}
              disabled={disabled}
              onChange={e => set({ evenBidsAllowedThroughRound: Number(e.target.value) })}
            />
            <span className={styles.hint}>{t('options.evenUntilHint')}</span>
          </label>
        )}
      </Toggle>
      <Toggle
        checked={options.hiddenBids}
        disabled={disabled}
        label={t('options.hiddenBids')}
        description={t('options.hiddenBidsDesc')}
        onChange={v => set({ hiddenBids: v })}
      />
      <Toggle
        checked={options.blindFirstRound}
        disabled={disabled}
        label={t('options.blindFirstRound')}
        description={t('options.blindFirstRoundDesc')}
        onChange={v => set({ blindFirstRound: v })}
      />
      <Toggle
        checked={options.rounds !== null}
        disabled={disabled}
        label={t('options.shorterGame')}
        description={t('options.fullGameDesc', { rounds: full, players })}
        onChange={v => set({ rounds: v ? Math.min(10, full) : null })}
      >
        {options.rounds !== null && (
          <label className={styles.inline}>
            {t('options.rounds')}
            <input
              type="range"
              min={1}
              max={20}
              value={options.rounds}
              disabled={disabled}
              onChange={e => set({ rounds: Number(e.target.value) })}
            />
            <output className={styles.roundsOut}>{Math.min(options.rounds, full)}</output>
            {options.rounds > full && <span className={styles.hint}>{t('options.roundsCapped', { rounds: full })}</span>}
          </label>
        )}
      </Toggle>
    </div>
  )
}
