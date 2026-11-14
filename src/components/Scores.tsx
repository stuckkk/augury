import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RoundRecord } from '../engine/types'
import { SPARKLE } from './glyphPaths'
import styles from './Scores.module.css'
import { playerColor } from './util'

export interface ScorePlayer {
  name: string
  seat: number
}

/** Star chart (running totals as constellation lines) and the classic score ledger. */
export function Scores({ history, players, me, totalRounds }: { history: RoundRecord[]; players: ScorePlayer[]; me: number; totalRounds: number }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'chart' | 'ledger'>('chart')
  return (
    <div className={styles.scores}>
      <div className={styles.tabs} role="tablist">
        {(['chart', 'ledger'] as const).map(k => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? styles.tabOn : styles.tab} onClick={() => setTab(k)}>
            {t(`scores.${k}`)}
          </button>
        ))}
      </div>
      {tab === 'chart' ? (
        <StarChart history={history} players={players} me={me} totalRounds={totalRounds} />
      ) : (
        <Ledger history={history} players={players} me={me} />
      )}
    </div>
  )
}

const W = 640
const H = 300
const M = { left: 44, right: 16, top: 16, bottom: 30 }

function niceStep(range: number): number {
  const raw = range / 5
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  return [1, 2, 5, 10].map(f => f * mag).find(s => s >= raw) ?? raw
}

export function StarChart({ history, players, me, totalRounds }: { history: RoundRecord[]; players: ScorePlayer[]; me: number; totalRounds: number }) {
  const { t } = useTranslation()
  const [hover, setHover] = useState<number | null>(null)
  const all = history.flatMap(r => r.totals)
  const lo = Math.min(0, ...all)
  const hi = Math.max(20, ...all)
  const step = niceStep(hi - lo)
  const yMin = Math.floor(lo / step) * step
  const yMax = Math.ceil(hi / step) * step
  const rounds = Math.max(totalRounds, 1)
  const x = (r: number) => M.left + (r / rounds) * (W - M.left - M.right)
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - M.top - M.bottom)
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(v)
  const xTicks = Array.from({ length: rounds + 1 }, (_, r) => r).filter(r => rounds <= 12 || r % 2 === 0 || r === rounds)

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const r = Math.round(((px - M.left) / (W - M.left - M.right)) * rounds)
    setHover(r >= 1 && r <= history.length ? r : null)
  }
  const hovered = hover ? history[hover - 1] : null

  return (
    <figure className={styles.chart}>
      <ul className={styles.legend}>
        {players.map(p => (
          <li key={p.seat} className={p.seat === me ? styles.legendMe : undefined}>
            <span className={styles.swatch} style={{ background: playerColor(p.seat) }} />
            {p.name}
            <b>{history.length ? history[history.length - 1].totals[p.seat] : 0}</b>
          </li>
        ))}
      </ul>
      <div className={styles.plot}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('scores.chartLabel')} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map(v => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className={v === 0 ? styles.zero : styles.grid} />
              <text x={M.left - 8} y={y(v)} className={styles.axis} textAnchor="end" dominantBaseline="middle">
                {v}
              </text>
            </g>
          ))}
          {xTicks.map(r => (
            <text key={r} x={x(r)} y={H - 10} className={styles.axis} textAnchor="middle">
              {r}
            </text>
          ))}
          {hover && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={H - M.bottom} className={styles.crosshair} />}
          {players.map(p => {
            const pts = [[x(0), y(0)], ...history.map((r, i) => [x(i + 1), y(r.totals[p.seat])])]
            const color = playerColor(p.seat)
            return (
              <g key={p.seat} className={p.seat === me ? styles.lineMe : undefined}>
                <polyline points={pts.map(q => q.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={p.seat === me ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
                {pts.slice(1).map(([px, py], i) => (
                  <path key={i} d={SPARKLE} transform={`translate(${px} ${py}) scale(${hover === i + 1 ? 0.95 : 0.7})`} fill={color} stroke="var(--ink-1)" strokeWidth="2" paintOrder="stroke" />
                ))}
              </g>
            )
          })}
        </svg>
        {hovered && hover && (
          <div className={styles.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }}>
            <strong>{t('scores.round', { n: hover })}</strong>
            {players
              .map(p => ({ p, total: hovered.totals[p.seat], delta: hovered.deltas[p.seat] }))
              .sort((a, b) => b.total - a.total)
              .map(({ p, total, delta }) => (
                <span key={p.seat}>
                  <i style={{ background: playerColor(p.seat) }} />
                  {p.name}
                  <b>{total}</b>
                  <em className={delta >= 0 ? styles.plus : styles.minus}>{delta > 0 ? `+${delta}` : delta}</em>
                </span>
              ))}
          </div>
        )}
      </div>
      {history.length === 0 && <figcaption className={styles.empty}>{t('scores.noneYet')}</figcaption>}
    </figure>
  )
}

export function Ledger({ history, players, me }: { history: RoundRecord[]; players: ScorePlayer[]; me: number }) {
  const { t } = useTranslation()
  return (
    <div className={styles.ledgerWrap}>
      <table className={styles.ledger}>
        <thead>
          <tr>
            <th scope="col">{t('scores.roundShort')}</th>
            {players.map(p => (
              <th key={p.seat} scope="col" className={p.seat === me ? styles.colMe : undefined}>
                <span className={styles.swatch} style={{ background: playerColor(p.seat) }} />
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map(r => (
            <tr key={r.round}>
              <th scope="row">{r.round}</th>
              {players.map(p => {
                const hit = r.bids[p.seat] === r.tricks[p.seat]
                return (
                  <td key={p.seat} className={p.seat === me ? styles.colMe : undefined}>
                    <span className={styles.total}>{r.totals[p.seat]}</span>
                    <span className={styles.detail}>
                      {t('scores.bidTricks', { bid: r.bids[p.seat], tricks: r.tricks[p.seat] })}
                      <em className={hit ? styles.plus : styles.minus}>{r.deltas[p.seat] > 0 ? `+${r.deltas[p.seat]}` : r.deltas[p.seat]}</em>
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan={players.length + 1} className={styles.empty}>
                {t('scores.noneYet')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
