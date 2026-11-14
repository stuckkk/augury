import { useTranslation } from 'react-i18next'
import styles from './App.module.css'
import { CardDefs } from './components/CardFace'
import { Entrance } from './components/Entrance'
import { Game } from './components/Game'
import { Lobby } from './components/Lobby'
import { Sky } from './components/Sky'
import { useSession } from './network/useSession'

export default function App() {
  const session = useSession()
  const { t } = useTranslation()
  const { room, view, seatId } = session
  const inRoom = !!room && room.seats.some(s => s.id === seatId)

  let screen
  if ((!session.connected && !inRoom) || session.restoring) {
    screen = (
      <div className={styles.waiting} role="status">
        <span className={styles.spinner} aria-hidden />
        {t('app.connecting')}
      </div>
    )
  } else if (!inRoom) screen = <Entrance session={session} />
  else if (!room.started || !view) screen = <Lobby session={session} />
  else screen = <Game session={session} />

  return (
    <>
      <CardDefs />
      <Sky />
      <div className={styles.app}>{screen}</div>
      <div className={styles.toasts} aria-live="assertive">
        {session.error && (
          <div key={session.error.at} className={styles.toast}>
            {t(`errors.${session.error.code}`)}
          </div>
        )}
        {!session.connected && inRoom && <div className={styles.toast}>{t('app.reconnecting')}</div>}
      </div>
    </>
  )
}
