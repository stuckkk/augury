import { forbiddenBid, isBlindRound } from './rules'
import { legalCards } from './trick'
import { HIDDEN_CARD_ID, type GameState, type GameView } from './types'

/** What `seat` may know: no other hands (except in the blind round), no deck, no RNG. */
export function viewFor(state: GameState, seat: number): GameView {
  const blind = isBlindRound(state)
  // Hidden bids stay hidden until the last one is in.
  const bidsSecret = state.options.hiddenBids && state.phase === 'bidding'
  const myTurnToPlay = state.phase === 'playing' && state.turn === seat
  const myHand = state.players[seat].hand
  return {
    seat,
    options: state.options,
    round: state.round,
    totalRounds: state.totalRounds,
    dealer: state.dealer,
    phase: state.phase,
    turn: state.turn,
    trumpCard: state.trumpCard,
    trump: state.trump,
    trick: state.trick,
    tricksPlayed: state.tricksPlayed,
    lastTrick: state.lastTrick,
    history: state.history,
    ready: state.ready,
    players: state.players.map((p, i) => {
      const mine = i === seat
      return {
        bid: bidsSecret && !mine ? null : p.bid,
        hasBid: p.bid !== null,
        tricks: p.tricks,
        score: p.score,
        handCount: p.hand.length,
        // Blind round: your own card is face down (null), everyone else's is face up.
        hand: mine === blind ? null : p.hand,
      }
    }),
    blind,
    legal: myTurnToPlay ? (blind ? myHand.map(() => HIDDEN_CARD_ID) : legalCards(myHand, state.trick).map(c => c.id)) : [],
    forbiddenBid: forbiddenBid(state, seat),
  }
}
