import { describe, expect, it } from 'vitest'
import { chooseBotAction } from './bot'
import { DECK_SIZE } from './cards'
import { applyAction, createGame, seatsToAct } from './engine'
import type { GameState, RuleOptions } from './types'
import { viewFor } from './view'

/** Plays a whole game with bots in every seat, checking invariants along the way. */
function playOut(players: number, options: Partial<RuleOptions>, seed: number): GameState {
  let s = createGame(players, options, seed)
  for (let steps = 0; s.phase !== 'gameOver'; steps++) {
    if (steps > 20_000) throw new Error('game did not finish')
    const cards = s.players.reduce((sum, p) => sum + p.hand.length, 0) + s.deck.length + (s.trumpCard ? 1 : 0)
    const inTricks = s.trick.length + s.players.length * s.tricksPlayed
    expect(cards + inTricks).toBe(DECK_SIZE)
    const seat = seatsToAct(s)[0]
    const action = chooseBotAction(viewFor(s, seat))
    if (!action) throw new Error(`bot in seat ${seat} has no move in ${s.phase}`)
    const result = applyAction(s, seat, action)
    if (!result.ok) throw new Error(`bot move ${JSON.stringify(action)} rejected: ${result.error}`)
    s = result.state
  }
  return s
}

const variants: Partial<RuleOptions>[] = [
  {},
  { noEvenBids: true },
  { noEvenBids: true, evenBidsAllowedThroughRound: 5 },
  { hiddenBids: true },
  { blindFirstRound: true, noEvenBids: true },
  { rounds: 4, blindFirstRound: true, hiddenBids: true },
]

describe('bot-only games', () => {
  for (const players of [3, 4, 5, 6]) {
    it(`finish with consistent scores for ${players} players`, () => {
      for (const [i, options] of variants.entries()) {
        for (let seed = 0; seed < 4; seed++) {
          const s = playOut(players, options, seed * 101 + i)
          expect(s.history).toHaveLength(s.totalRounds)
          for (const r of s.history) expect(r.tricks.reduce((a, b) => a + b, 0)).toBe(r.round)
          const totals = s.players.map((_, p) => s.history.reduce((sum, r) => sum + r.deltas[p], 0))
          expect(totals).toEqual(s.players.map(p => p.score))
        }
      }
    })
  }

  it('bots make a fair share of their bids', () => {
    let hits = 0
    let total = 0
    for (let seed = 0; seed < 20; seed++) {
      const s = playOut(4, {}, seed)
      for (const r of s.history) r.bids.forEach((b, i) => ((total += 1), (hits += b === r.tricks[i] ? 1 : 0)))
    }
    expect(hits / total).toBeGreaterThan(0.4)
  })
})
