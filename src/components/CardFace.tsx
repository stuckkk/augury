import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Card } from '../engine/types'
import { ArchmageShape, FoolShape, SuitShape } from './Glyphs'
import { SPARKLE } from './glyphPaths'
import { hashString, seeded } from './util'

/**
 * A card as SVG (100×150). Number cards carry a little constellation with as many stars as the
 * card's value, so every card of the deck looks different.
 */
export const CardFace = memo(function CardFace({ card }: { card: Card }) {
  const { t } = useTranslation()
  if (card.kind === 'archmage') {
    return (
      <svg viewBox="0 0 100 150" className="card-svg" role="img" aria-label={t('cards.archmage')}>
        <rect x="1" y="1" width="98" height="148" rx="9" fill="url(#g-archmage)" stroke="var(--archmage)" strokeWidth="1.6" />
        <rect x="6" y="6" width="88" height="138" rx="6" fill="none" stroke="var(--archmage)" strokeOpacity="0.35" />
        <g fill="var(--archmage)" style={{ color: 'var(--archmage)' }}>
          <g transform="translate(16 19) scale(0.8)"><ArchmageShape /></g>
          <g transform="translate(84 131) rotate(180) scale(0.8)"><ArchmageShape /></g>
          <circle cx="50" cy="72" r="30" fill="none" stroke="var(--archmage)" strokeOpacity="0.3" strokeDasharray="1 3" />
          <g transform="translate(50 72) scale(2.6)"><ArchmageShape /></g>
        </g>
        <text x="50" y="125" textAnchor="middle" className="card-label" fill="var(--archmage)">{t('cards.archmage')}</text>
      </svg>
    )
  }
  if (card.kind === 'fool') {
    return (
      <svg viewBox="0 0 100 150" className="card-svg" role="img" aria-label={t('cards.fool')}>
        <rect x="1" y="1" width="98" height="148" rx="9" fill="url(#g-fool)" stroke="var(--fool)" strokeWidth="1.6" />
        <rect x="6" y="6" width="88" height="138" rx="6" fill="none" stroke="var(--fool)" strokeOpacity="0.3" />
        <g fill="var(--fool)">
          <g transform="translate(16 19) scale(0.8)"><FoolShape /></g>
          <g transform="translate(84 131) rotate(180) scale(0.8)"><FoolShape /></g>
          <g transform="translate(50 70) scale(2.6)"><FoolShape /></g>
        </g>
        <text x="50" y="125" textAnchor="middle" className="card-label" fill="var(--fool)">{t('cards.fool')}</text>
      </svg>
    )
  }
  const color = `var(--${card.suit})`
  const stars = constellation(card.id, card.value)
  return (
    <svg viewBox="0 0 100 150" className="card-svg" role="img" aria-label={t('cards.number', { value: card.value, suit: t(`suits.${card.suit}`) })}>
      <rect x="1" y="1" width="98" height="148" rx="9" fill="url(#g-number)" stroke={color} strokeWidth="1.6" />
      <rect x="6" y="6" width="88" height="138" rx="6" fill="none" stroke={color} strokeOpacity="0.28" />
      <g fill={color}>
        <g transform="translate(50 78) scale(3.2)" opacity="0.12"><SuitShape suit={card.suit} /></g>
        <polyline points={stars.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="0.8" />
        {stars.map(([x, y], i) => (
          <path key={i} d={SPARKLE} transform={`translate(${x} ${y}) scale(${i === 0 ? 0.42 : 0.3})`} />
        ))}
        <text x="13" y="31" className="card-value" textAnchor="middle">{card.value}</text>
        <g transform="translate(13 42) scale(0.62)"><SuitShape suit={card.suit} /></g>
        <g transform="rotate(180 50 75)">
          <text x="13" y="31" className="card-value" textAnchor="middle">{card.value}</text>
          <g transform="translate(13 42) scale(0.62)"><SuitShape suit={card.suit} /></g>
        </g>
      </g>
    </svg>
  )
})

/** Star positions inside the card's central field, deterministic per card. */
function constellation(id: string, count: number): [number, number][] {
  const rand = seeded(hashString(id))
  const pts: [number, number][] = []
  for (let i = 0; i < count; i++) {
    let best: [number, number] = [50, 75]
    let bestGap = -1
    // A few tries each, keeping the point farthest from the others, so stars spread out.
    for (let k = 0; k < 8; k++) {
      const p: [number, number] = [30 + rand() * 44, 34 + rand() * 82]
      const gap = Math.min(99, ...pts.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])))
      if (gap > bestGap) {
        best = p
        bestGap = gap
      }
    }
    pts.push([Math.round(best[0] * 10) / 10, Math.round(best[1] * 10) / 10])
  }
  // Join them like a constellation: nearest neighbour walk.
  const path = [pts[0]]
  const rest = pts.slice(1)
  while (rest.length) {
    const last = path[path.length - 1]
    let k = 0
    rest.forEach((p, i) => {
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < Math.hypot(rest[k][0] - last[0], rest[k][1] - last[1])) k = i
    })
    path.push(rest.splice(k, 1)[0])
  }
  return path
}

export const CardBack = memo(function CardBack({ mystery = false }: { mystery?: boolean }) {
  return (
    <svg viewBox="0 0 100 150" className="card-svg" aria-hidden>
      <rect x="1" y="1" width="98" height="148" rx="9" fill="url(#g-back)" stroke="var(--gold-dim)" strokeWidth="1.4" />
      <rect x="6" y="6" width="88" height="138" rx="6" fill="url(#p-back)" stroke="var(--gold)" strokeOpacity="0.35" />
      <g fill="none" stroke="var(--gold)" strokeOpacity="0.55">
        <circle cx="50" cy="75" r="30" />
        <circle cx="50" cy="75" r="22" strokeDasharray="2 3" />
        <ellipse cx="50" cy="75" rx="30" ry="11" transform="rotate(-25 50 75)" />
      </g>
      <path d={SPARKLE} transform="translate(50 75) scale(1.1)" fill="var(--gold)" />
      {mystery && (
        <text x="50" y="132" textAnchor="middle" className="card-value" fill="var(--gold-bright)">?</text>
      )}
    </svg>
  )
})

/** Shared gradients for all cards; rendered once at the root. */
export function CardDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="g-number" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#1d2858" />
          <stop offset="1" stopColor="#0b1130" />
        </linearGradient>
        <radialGradient id="g-archmage" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#4a2a7a" />
          <stop offset="0.6" stopColor="#24124a" />
          <stop offset="1" stopColor="#120a28" />
        </radialGradient>
        <linearGradient id="g-fool" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#1f3d44" />
          <stop offset="1" stopColor="#0d1d26" />
        </linearGradient>
        <linearGradient id="g-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2560" />
          <stop offset="1" stopColor="#0a0f2c" />
        </linearGradient>
        <pattern id="p-back" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.7" fill="#e9c46a" fillOpacity="0.3" />
        </pattern>
      </defs>
    </svg>
  )
}
