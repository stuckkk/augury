import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateSettings, useSettings, type ClientSettings } from '../settings/clientSettings'
import { Dialog } from './Dialog'
import { Icon } from './Icons'
import { LanguageToggle } from './LanguageToggle'
import styles from './SettingsMenu.module.css'

export function SettingsButton({ className, iconOnly = false }: { className: string; iconOnly?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const s = useSettings()
  const check = (key: 'sound' | 'vibrate' | 'confirmPlay' | 'statusLine') => (
    <label className={styles.row}>
      <span>
        {t(`settings.${key}`)}
        <small>{t(`settings.${key}Desc`)}</small>
      </span>
      <input type="checkbox" checked={s[key]} onChange={e => updateSettings({ [key]: e.target.checked })} />
    </label>
  )
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={t('settings.button')}>
        <Icon name="gear" />
        {!iconOnly && t('settings.button')}
      </button>
      <Dialog open={open} title={t('settings.title')} onClose={() => setOpen(false)}>
        <div className={styles.list}>
          <div className={styles.row}>
            <span>{t('settings.language')}</span>
            <LanguageToggle />
          </div>
          <div className={styles.row}>
            <span>
              {t('settings.motion')}
              <small>{t('settings.motionDesc')}</small>
            </span>
            <select value={s.motion} onChange={e => updateSettings({ motion: e.target.value as ClientSettings['motion'] })}>
              {(['system', 'on', 'off'] as const).map(m => (
                <option key={m} value={m}>
                  {t(`settings.motion_${m}`)}
                </option>
              ))}
            </select>
          </div>
          {check('sound')}
          {check('vibrate')}
          {check('confirmPlay')}
          {check('statusLine')}
        </div>
      </Dialog>
    </>
  )
}
