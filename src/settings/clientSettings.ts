import { useSyncExternalStore } from 'react'

/** Per-browser preferences (nothing here is sent to the server). */
export interface ClientSettings {
  /** 'system' follows prefers-reduced-motion. */
  motion: 'system' | 'on' | 'off'
  sound: boolean
  /** Vibrate on phones when it becomes your move. */
  vibrate: boolean
  /** Ask before playing a card (tap to raise, tap again to play). Off: a single tap plays. */
  confirmPlay: boolean
  /** The small status pill above your seat (who took the trick, bids against tricks). */
  statusLine: boolean
}

const STORAGE_KEY = 'augury-settings'
export const DEFAULT_SETTINGS: ClientSettings = { motion: 'system', sound: true, vibrate: true, confirmPlay: true, statusLine: true }

export function parseSettings(raw: string | null): ClientSettings {
  try {
    const s = JSON.parse(raw ?? '{}') as Partial<ClientSettings>
    return {
      motion: s.motion === 'on' || s.motion === 'off' ? s.motion : 'system',
      sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
      vibrate: typeof s.vibrate === 'boolean' ? s.vibrate : DEFAULT_SETTINGS.vibrate,
      confirmPlay: typeof s.confirmPlay === 'boolean' ? s.confirmPlay : DEFAULT_SETTINGS.confirmPlay,
      statusLine: typeof s.statusLine === 'boolean' ? s.statusLine : DEFAULT_SETTINGS.statusLine,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function load(): ClientSettings {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

let current = load()
const listeners = new Set<() => void>()

function applyMotion(): void {
  // CSS reads this attribute; 'system' leaves it to the media query.
  document.documentElement.dataset.motion = current.motion
}
if (typeof document !== 'undefined') applyMotion()

export function getSettings(): ClientSettings {
  return current
}

export function updateSettings(patch: Partial<ClientSettings>): void {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Not remembered then; still applies to this page.
  }
  applyMotion()
  listeners.forEach(l => l())
}

export function useSettings(): ClientSettings {
  return useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSettings,
  )
}

/** Whether animations should run (setting, or the system preference). */
export function motionEnabled(): boolean {
  if (current.motion !== 'system') return current.motion === 'on'
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
