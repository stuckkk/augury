import { maxRounds } from './cards'
import type { GameState, RuleOptions } from './types'

export const DEFAULT_OPTIONS: RuleOptions = {
  noEvenBids: false,
  evenBidsAllowedThroughRound: 0,
  hiddenBids: false,
  blindFirstRound: false,
  rounds: null,
}

function int(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * Makes any client-sent options safe. With `players` the round count is clamped to what the
 * deck allows for that table; without it (lobby, table size still changing) to the 3-player maximum.
 */
export function normalizeOptions(raw: unknown, players?: number): RuleOptions {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const limit = maxRounds(players ?? 3)
  const hiddenBids = o.hiddenBids === true
  return {
    // With simultaneous bids nobody bids last, so the even-out rule has no one to apply to.
    noEvenBids: o.noEvenBids === true && !hiddenBids,
    evenBidsAllowedThroughRound: int(o.evenBidsAllowedThroughRound, 0, maxRounds(3), 0),
    hiddenBids,
    blindFirstRound: o.blindFirstRound === true,
    rounds: o.rounds === null || o.rounds === undefined ? null : int(o.rounds, 1, limit, limit),
  }
}

export function totalRounds(options: RuleOptions, players: number): number {
  return Math.min(options.rounds ?? maxRounds(players), maxRounds(players))
}

/** Whether the even-out restriction is in force this round. */
export function evenBidsForbidden(options: RuleOptions, round: number): boolean {
  return options.noEvenBids && !options.hiddenBids && round > options.evenBidsAllowedThroughRound
}

/** The bid `seat` may not make right now (it would even out the bids), or null. */
export function forbiddenBid(state: GameState, seat: number): number | null {
  if (state.phase !== 'bidding' || !evenBidsForbidden(state.options, state.round)) return null
  // Only the last bidder is restricted: the dealer, once everyone else has bid.
  if (seat !== state.dealer) return null
  const others = state.players.filter((_, i) => i !== seat)
  if (others.some(p => p.bid === null)) return null
  const rest = state.round - others.reduce((sum, p) => sum + (p.bid ?? 0), 0)
  return rest >= 0 ? rest : null
}

export function isBlindRound(state: Pick<GameState, 'options' | 'round'>): boolean {
  return state.options.blindFirstRound && state.round === 1
}
