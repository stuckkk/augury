import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Card, Suit } from '../engine/types'

/**
 * Seat colours (by game seat, fixed order). Validated as a categorical palette on the night-sky
 * surface: lightness band, chroma, colour-blind separation and 3:1 contrast all pass.
 */
const PLAYER_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9']

export function playerColor(seat: number): string {
  return PLAYER_COLORS[seat % PLAYER_COLORS.length]
}

export const SUIT_COLOR: Record<Suit, string> = {
  sun: 'var(--sun)',
  moon: 'var(--moon)',
  star: 'var(--star)',
  comet: 'var(--comet)',
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Deterministic pseudo-random numbers from a seed (for decoration only). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SUIT_ORDER = ['sun', 'moon', 'star', 'comet'] as const

/** Archmages first, then suits (trump first) high to low, Fools last. */
export function sortHand(cards: readonly Card[], trump: Suit | null): Card[] {
  const rank = (c: Card) => {
    if (c.kind === 'archmage') return -1
    if (c.kind === 'fool') return 1000
    const suit = c.suit === trump ? -0.5 : SUIT_ORDER.indexOf(c.suit)
    return 100 + suit * 100 + (13 - c.value)
  }
  return [...cards].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))
}

export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}
