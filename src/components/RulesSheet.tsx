import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RuleOptions } from '../engine/types'
import { Dialog } from './Dialog'
import { SuitIcon } from './Glyphs'
import { Icon } from './Icons'
import styles from './RulesSheet.module.css'

const SECTIONS = ['goal', 'deck', 'deal', 'trump', 'bidding', 'play', 'winning', 'scoring'] as const

export function RulesButton({
  options,
  className = 'btn btn-ghost btn-small',
  iconOnly = false,
}: {
  options?: RuleOptions
  className?: string
  iconOnly?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={t('rules.button')}>
        <Icon name="book" />
        {!iconOnly && t('rules.button')}
      </button>
      <Dialog open={open} title={t('rules.title')} onClose={() => setOpen(false)}>
        <RulesText options={options} />
      </Dialog>
    </>
  )
}

export function RulesText({ options }: { options?: RuleOptions }) {
  const { t } = useTranslation()
  const active = options
    ? [
        options.noEvenBids && t('options.noEvenBids') + (options.evenBidsAllowedThroughRound > 0 ? ` (${t('rules.fromRound', { n: options.evenBidsAllowedThroughRound + 1 })})` : ''),
        options.hiddenBids && t('options.hiddenBids'),
        options.blindFirstRound && t('options.blindFirstRound'),
        options.rounds !== null && t('rules.roundsActive', { n: options.rounds }),
      ].filter(Boolean)
    : []
  return (
    <div className={styles.rules}>
      <div className={styles.suits}>
        {(['sun', 'moon', 'star', 'comet'] as const).map(s => (
          <span key={s}>
            <SuitIcon suit={s} size={18} /> {t(`suits.${s}`)}
          </span>
        ))}
      </div>
      {SECTIONS.map(s => (
        <section key={s}>
          <h3>{t(`rules.${s}Title`)}</h3>
          <p>{t(`rules.${s}`)}</p>
        </section>
      ))}
      {options && (
        <section>
          <h3>{t('rules.houseTitle')}</h3>
          <p>{active.length ? active.join(' · ') : t('rules.houseNone')}</p>
        </section>
      )}
    </div>
  )
}
