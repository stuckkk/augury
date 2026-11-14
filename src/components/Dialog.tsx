import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './Dialog.module.css'

/** A native modal dialog (focus trap, Escape to close) in the table's style. */
export function Dialog({
  open,
  title,
  onClose,
  wide = false,
  children,
}: {
  open: boolean
  title: string
  onClose(): void
  wide?: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ''}`}
      onClose={onClose}
      onClick={e => e.target === ref.current && onClose()}
      aria-label={title}
    >
      {open && (
        <div className={styles.body}>
          <header className={styles.head}>
            <h2>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label={t('app.close')}>
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
