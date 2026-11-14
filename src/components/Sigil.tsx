import { memo } from 'react'
import { hashString, seeded } from './util'

/** A small personal constellation for each player, derived from their name. */
export const Sigil = memo(function Sigil({ name, color, size = 34, isBot = false }: { name: string; color: string; size?: number; isBot?: boolean }) {
  const rand = seeded(hashString(name))
  const n = 4 + Math.floor(rand() * 2)
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rand() * 0.9
    const r = 4 + rand() * 7
    return [Math.cos(a) * r, Math.sin(a) * r] as const
  })
  return (
    <svg width={size} height={size} viewBox="-17 -17 34 34" aria-hidden style={{ flex: 'none' }}>
      <circle r="16" fill="rgba(5,8,22,0.85)" stroke={color} strokeWidth="1.4" strokeDasharray={isBot ? '2 2.2' : undefined} />
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="0.9" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 2.1 : 1.3} fill={color} />
      ))}
    </svg>
  )
})
