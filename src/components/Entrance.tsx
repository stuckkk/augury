import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Card } from '../engine/types'
import { roomFromUrl, type Session } from '../network/useSession'
import { CardFace } from './CardFace'
import styles from './Entrance.module.css'
import { LanguageToggle } from './LanguageToggle'
import { Orrery } from './Orrery'
import { RulesButton } from './RulesSheet'

const NAME_KEY = 'augury-name'
const SHOWCASE: Card[] = [
  { id: 'fool-1', kind: 'fool' },
  { id: 'moon-7', kind: 'number', suit: 'moon', value: 7 },
  { id: 'archmage-1', kind: 'archmage' },
  { id: 'sun-13', kind: 'number', suit: 'sun', value: 13 },
  { id: 'comet-4', kind: 'number', suit: 'comet', value: 4 },
]

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function Entrance({ session }: { session: Session }) {
  const { t } = useTranslation()
  const [name, setName] = useState(storedName)
  const [code, setCode] = useState(roomFromUrl)
  const invited = !!roomFromUrl()

  const remember = () => {
    try {
      localStorage.setItem(NAME_KEY, name.trim())
    } catch {
      // Fine: the name is asked again next time.
    }
  }
  const create = () => {
    remember()
    session.send({ type: 'create', name })
  }
  const join = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (code.trim().length < 5) return
    remember()
    session.send({ type: 'join', roomId: code.trim().toUpperCase(), name })
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <RulesButton />
        <LanguageToggle />
      </header>

      <section className={styles.hero}>
        <div className={styles.orrery}>
          <Orrery progress={0.62} />
        </div>
        <div className={styles.fan} aria-hidden>
          {SHOWCASE.map((c, i) => (
            <div key={c.id} className={styles.fanCard} style={{ '--i': i - 2 } as React.CSSProperties}>
              <CardFace card={c} />
            </div>
          ))}
        </div>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <p className={styles.tagline}>{t('entrance.tagline')}</p>
      </section>

      <section className={styles.panel}>
        <label className={styles.field}>
          <span>{t('entrance.yourName')}</span>
          <input
            value={name}
            maxLength={20}
            autoComplete="nickname"
            placeholder={t('entrance.namePlaceholder')}
            onChange={e => setName(e.target.value)}
          />
        </label>

        <div className={styles.actions}>
          {!invited && (
            <button type="button" className="btn btn-primary" onClick={create} disabled={!name.trim()}>
              {t('entrance.create')}
            </button>
          )}
          <form className={styles.join} onSubmit={join}>
            <input
              aria-label={t('entrance.code')}
              value={code}
              maxLength={5}
              placeholder={t('entrance.code')}
              className={styles.code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            />
            <button type="submit" className={invited ? 'btn btn-primary' : 'btn'} disabled={!name.trim() || code.length < 5}>
              {t('entrance.join')}
            </button>
          </form>
          {invited && (
            <button type="button" className="btn btn-ghost btn-small" onClick={create} disabled={!name.trim()}>
              {t('entrance.createInstead')}
            </button>
          )}
        </div>
      </section>

      <footer className={styles.footer}>{t('entrance.footer')}</footer>
    </div>
  )
}
