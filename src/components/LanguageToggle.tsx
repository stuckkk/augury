import { useTranslation } from 'react-i18next'
import styles from './LanguageToggle.module.css'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  return (
    <div className={styles.toggle} role="group" aria-label={t('settings.language')}>
      {(['en', 'de'] as const).map(lng => (
        <button
          key={lng}
          type="button"
          aria-pressed={i18n.language === lng}
          className={i18n.language === lng ? styles.on : undefined}
          onClick={() => void i18n.changeLanguage(lng)}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
