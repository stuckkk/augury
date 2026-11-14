import { fullDeck, MAX_PLAYERS, MIN_PLAYERS } from './cards'
import { nextRandom, shuffle } from './rng'
import { forbiddenBid, isBlindRound, normalizeOptions, totalRounds } from './rules'
import { roundScore } from './scoring'
import { legalCards, trickWinner } from './trick'
import { HIDDEN_CARD_ID, SUITS, type Action, type ActionResult, type GameState, type RuleOptions } from './types'

export function createGame(playerCount: number, options: Partial<RuleOptions>, seed: number): GameState {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) throw new Error(`need ${MIN_PLAYERS}–${MAX_PLAYERS} players`)
  const opts = normalizeOptions(options, playerCount)
  const [r, rng] = nextRandom(seed >>> 0)
  const state: GameState = {
    options: opts,
    players: Array.from({ length: playerCount }, () => ({ hand: [], bid: null, tricks: 0, score: 0 })),
    round: 0,
    totalRounds: totalRounds(opts, playerCount),
    // startRound moves the deal on by one seat, so start one before the randomly chosen dealer.
    dealer: (Math.floor(r * playerCount) + playerCount - 1) % playerCount,
    phase: 'bidding',
    turn: 0,
    trumpCard: null,
    trump: null,
    deck: [],
    trick: [],
    tricksPlayed: 0,
    lastTrick: null,
    history: [],
    ready: Array(playerCount).fill(false),
    seed,
    rng,
  }
  startRound(state)
  return state
}

/** Deals the next round (mutates). */
function startRound(state: GameState): void {
  const n = state.players.length
  state.round += 1
  state.dealer = (state.dealer + 1) % n
  const [deck, rng] = shuffle(fullDeck(), state.rng)
  state.rng = rng
  for (let i = 0; i < n; i++) {
    const p = state.players[(state.dealer + 1 + i) % n]
    p.hand = deck.slice(i * state.round, (i + 1) * state.round)
    p.bid = null
    p.tricks = 0
  }
  const rest = deck.slice(n * state.round)
  state.trumpCard = rest.shift() ?? null
  state.deck = rest
  state.trick = []
  state.tricksPlayed = 0
  state.lastTrick = null
  state.ready = Array(n).fill(false)
  const firstBidder = (state.dealer + 1) % n
  if (state.trumpCard?.kind === 'archmage') {
    state.trump = null
    state.phase = 'chooseTrump'
    state.turn = state.dealer
  } else {
    state.trump = state.trumpCard?.kind === 'number' ? state.trumpCard.suit : null
    state.phase = 'bidding'
    state.turn = firstBidder
  }
}

function canBidNow(state: GameState, seat: number): boolean {
  if (state.players[seat].bid !== null) return false
  return state.options.hiddenBids || state.turn === seat
}

/** Seats that may act right now (used by bots and the UI to know whom to wait for). */
export function seatsToAct(state: GameState): number[] {
  switch (state.phase) {
    case 'chooseTrump':
    case 'playing':
      return [state.turn]
    case 'bidding':
      return state.players.map((_, i) => i).filter(i => canBidNow(state, i))
    case 'roundEnd':
      return state.ready.map((r, i) => (r ? -1 : i)).filter(i => i >= 0)
    case 'gameOver':
      return []
  }
}

export function applyAction(prev: GameState, seat: number, action: Action): ActionResult {
  if (!Number.isInteger(seat) || seat < 0 || seat >= prev.players.length) return { ok: false, error: 'NO_SUCH_SEAT' }
  if (!action || typeof action !== 'object') return { ok: false, error: 'BAD_ACTION' }
  const state = structuredClone(prev)
  const n = state.players.length
  const me = state.players[seat]

  switch (action.type) {
    case 'chooseTrump': {
      if (state.phase !== 'chooseTrump') return { ok: false, error: 'NOT_NOW' }
      if (seat !== state.dealer) return { ok: false, error: 'NOT_YOUR_TURN' }
      if (!SUITS.includes(action.suit)) return { ok: false, error: 'BAD_SUIT' }
      state.trump = action.suit
      state.phase = 'bidding'
      state.turn = (state.dealer + 1) % n
      return { ok: true, state }
    }

    case 'bid': {
      if (state.phase !== 'bidding') return { ok: false, error: 'NOT_NOW' }
      if (me.bid !== null) return { ok: false, error: 'ALREADY_BID' }
      if (!canBidNow(state, seat)) return { ok: false, error: 'NOT_YOUR_TURN' }
      const bid = action.bid
      if (!Number.isInteger(bid) || bid < 0 || bid > state.round) return { ok: false, error: 'BAD_BID' }
      if (bid === forbiddenBid(state, seat)) return { ok: false, error: 'FORBIDDEN_BID' }
      me.bid = bid
      if (state.players.every(p => p.bid !== null)) {
        state.phase = 'playing'
        state.turn = (state.dealer + 1) % n
      } else if (!state.options.hiddenBids) {
        state.turn = (seat + 1) % n
      }
      return { ok: true, state }
    }

    case 'play': {
      if (state.phase !== 'playing') return { ok: false, error: 'NOT_NOW' }
      if (seat !== state.turn) return { ok: false, error: 'NOT_YOUR_TURN' }
      // In the blind round the player cannot know their card's id; they hold exactly one card.
      const id = action.cardId === HIDDEN_CARD_ID && isBlindRound(state) && me.hand.length === 1 ? me.hand[0].id : action.cardId
      const card = me.hand.find(c => c.id === id)
      if (!card) return { ok: false, error: 'NO_SUCH_CARD' }
      if (!legalCards(me.hand, state.trick).includes(card)) return { ok: false, error: 'MUST_FOLLOW_SUIT' }
      me.hand = me.hand.filter(c => c !== card)
      state.trick.push({ seat, card })
      if (state.trick.length < n) {
        state.turn = (seat + 1) % n
        return { ok: true, state }
      }
      const winner = trickWinner(state.trick, state.trump)
      state.players[winner].tricks += 1
      state.lastTrick = { plays: state.trick, winner }
      state.trick = []
      state.tricksPlayed += 1
      state.turn = winner
      if (state.tricksPlayed === state.round) endRound(state)
      return { ok: true, state }
    }

    case 'ready': {
      if (state.phase !== 'roundEnd') return { ok: false, error: 'NOT_NOW' }
      state.ready[seat] = true
      if (state.ready.every(Boolean)) startRound(state)
      return { ok: true, state }
    }

    default:
      return { ok: false, error: 'BAD_ACTION' }
  }
}

function endRound(state: GameState): void {
  const deltas = state.players.map(p => roundScore(p.bid ?? 0, p.tricks))
  state.players.forEach((p, i) => (p.score += deltas[i]))
  state.history.push({
    round: state.round,
    bids: state.players.map(p => p.bid ?? 0),
    tricks: state.players.map(p => p.tricks),
    deltas,
    totals: state.players.map(p => p.score),
  })
  state.phase = state.round >= state.totalRounds ? 'gameOver' : 'roundEnd'
}

/** Final placing per seat (1 = best; ties share a place). */
export function placings(scores: readonly number[]): number[] {
  return scores.map(s => 1 + scores.filter(o => o > s).length)
}
