export const SUITS = ['sun', 'moon', 'star', 'comet'] as const
export type Suit = (typeof SUITS)[number]

export type Card =
  | { id: string; kind: 'number'; suit: Suit; value: number }
  /** Always wins the trick (the first one played does). */
  | { id: string; kind: 'archmage' }
  /** Always loses the trick (unless every card is a Fool). */
  | { id: string; kind: 'fool' }

/** Stands for the viewer's own unseen card in the blind first round (it is played without knowing it). */
export const HIDDEN_CARD_ID = 'hidden'

export interface RuleOptions {
  /** The dealer, bidding last, may not make the bids add up to the number of tricks. */
  noEvenBids: boolean
  /** With noEvenBids: bids may still even out up to and including this round (0 = never). */
  evenBidsAllowedThroughRound: number
  /** Everyone bids at once; the bids are revealed when all are in. */
  hiddenBids: boolean
  /** In round 1 you see everyone's single card except your own. */
  blindFirstRound: boolean
  /** Number of rounds to play; null plays through the whole deck. */
  rounds: number | null
}

export type Phase = 'chooseTrump' | 'bidding' | 'playing' | 'roundEnd' | 'gameOver'

export interface Play {
  seat: number
  card: Card
}

export interface CompletedTrick {
  plays: Play[]
  winner: number
}

export interface PlayerState {
  hand: Card[]
  bid: number | null
  tricks: number
  score: number
}

export interface RoundRecord {
  round: number
  bids: number[]
  tricks: number[]
  deltas: number[]
  totals: number[]
}

export interface GameState {
  options: RuleOptions
  players: PlayerState[]
  /** 1-based; also the number of cards each player holds at the start of the round. */
  round: number
  totalRounds: number
  dealer: number
  phase: Phase
  /** Who acts next (chooseTrump: the dealer; bidding: next bidder unless bids are hidden; playing). */
  turn: number
  /** The card turned up after dealing; null when the deck ran out. */
  trumpCard: Card | null
  trump: Suit | null
  /** Undealt cards (secret). */
  deck: Card[]
  trick: Play[]
  /** Tricks finished this round. */
  tricksPlayed: number
  lastTrick: CompletedTrick | null
  history: RoundRecord[]
  /** Round end: who has seen the scores and wants to go on. */
  ready: boolean[]
  seed: number
  /** RNG state (secret: it would reveal every future deal). */
  rng: number
}

export type Action =
  | { type: 'chooseTrump'; suit: Suit }
  | { type: 'bid'; bid: number }
  | { type: 'play'; cardId: string }
  | { type: 'ready' }

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string }

export interface PlayerView {
  /** null while unknown (not yet bid, or hidden until everyone has bid). */
  bid: number | null
  hasBid: boolean
  tricks: number
  score: number
  handCount: number
  /** The cards this viewer can see in that hand (their own; in the blind round everyone else's instead); null if none. */
  hand: Card[] | null
}

export interface GameView {
  seat: number
  options: RuleOptions
  round: number
  totalRounds: number
  dealer: number
  phase: Phase
  turn: number
  trumpCard: Card | null
  trump: Suit | null
  trick: Play[]
  tricksPlayed: number
  lastTrick: CompletedTrick | null
  history: RoundRecord[]
  ready: boolean[]
  players: PlayerView[]
  /** True in the blind round: the viewer's own card is face down. */
  blind: boolean
  /** Ids of the cards the viewer may play right now (empty when it is not their move). */
  legal: string[]
  /** A bid the viewer may not make right now (even-out rule), or null. */
  forbiddenBid: number | null
}
