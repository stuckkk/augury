import type { Suit } from '../engine/types'
import { BURST, STAR, SUN_RAYS } from './glyphPaths'

/** Glyphs are drawn in a 20×20 box centred on 0,0 so they can be placed with a transform. */

export function SuitShape({ suit }: { suit: Suit }) {
  switch (suit) {
    case 'sun':
      return (
        <g>
          <circle r="4.9" />
          <path d={SUN_RAYS} />
        </g>
      )
    case 'moon':
      return <path transform="translate(-1.2 0)" d="M4 -7.6A8 8 0 1 0 4 7.6A7.6 7.6 0 0 1 4 -7.6Z" />
    case 'star':
      return <path d={STAR} />
    case 'comet':
      return (
        <g>
          <circle cx="3.4" cy="-3.4" r="4.2" />
          <path d="M0.2 -6.3Q-3.2 1.2 -9 9Q-1.2 3.2 6.3 -0.2Q2.4 -1.5 0.2 -6.3Z" opacity="0.75" />
        </g>
      )
  }
}

/** All-seeing eye in a starburst. */
export function ArchmageShape() {
  return (
    <g>
      <path d={BURST} opacity="0.55" />
      <path d="M-7.5 0Q0 -7 7.5 0Q0 7 -7.5 0Z" fill="#1a1030" stroke="currentColor" strokeWidth="1.2" />
      <circle r="2.8" />
      <circle r="1" cx="-0.8" cy="-0.8" fill="#fff" />
    </g>
  )
}

/** A cracked half mask. */
export function FoolShape() {
  return (
    <g>
      <path d="M-8 -5.5Q0 -9 8 -5.5Q8.5 4 0 9Q-8.5 4 -8 -5.5Z" />
      <path d="M-5.2 -1.6Q-3.6 -3 -2 -1.6Q-3.6 -0.8 -5.2 -1.6ZM2 -1.6Q3.6 -3 5.2 -1.6Q3.6 -0.8 2 -1.6Z" fill="#0d1a24" />
      <path d="M-3.2 3.4Q0 5.4 3.2 3.4" fill="none" stroke="#0d1a24" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M1 -8.2L-0.6 -4.8L1.4 -2.6L-0.2 0.6" fill="none" stroke="#0d1a24" strokeWidth="0.9" strokeLinejoin="round" />
    </g>
  )
}

/** A suit symbol on its own (for text, buttons, legends). */
export function SuitIcon({ suit, size = 18, title }: { suit: Suit; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" style={{ color: `var(--${suit})`, flex: 'none' }} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <SuitShape suit={suit} />
    </svg>
  )
}
