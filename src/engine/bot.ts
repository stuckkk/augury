import { fullDeck } from './cards'
import { trickWinner } from './trick'
import { HIDDEN_CARD_ID, SUITS, type Action, type Card, type GameView, type Play, type Suit } from './types'

/**
 * A simple heuristic player. It only gets the same view a human in that seat would get, so it
 * cannot peek at other hands or at the deck.
 */
export function chooseBotAction(view: GameView): Action | null {
  const me = view.players[view.seat]
  switch (view.phase) {
    case 'chooseTrump':
      return view.turn === view.seat ? { type: 'chooseTrump', suit: favouriteSuit(me.hand ?? []) } : null
    case 'bidding':
      if (me.hasBid || (!view.options.hiddenBids && view.turn !== view.seat)) return null
      return { type: 'bid', bid: chooseBid(view) }
    case 'playing':
      if (view.turn !== view.seat || view.legal.length === 0) return null
      return { type: 'play', cardId: choosePlay(view) }
    case 'roundEnd':
      return view.ready[view.seat] ? null : { type: 'ready' }
    case 'gameOver':
      return null
  }
}

/** Rough worth of a card for ordering: Fools lowest, then plain suits, trumps, Archmages. */
function strength(card: Card, trump: Suit | null): number {
  if (card.kind === 'archmage') return 100
  if (card.kind === 'fool') return 0
  return card.suit === trump ? 40 + card.value : card.value
}

function favouriteSuit(hand: readonly Card[]): Suit {
  let best: Suit = SUITS[0]
  let bestScore = -1
  for (const suit of SUITS) {
    const score = hand.reduce((sum, c) => sum + (c.kind === 'number' && c.suit === suit ? 2 + c.value / 6 : 0), 0)
    if (score > bestScore) {
      best = suit
      bestScore = score
    }
  }
  return best
}

/** Chance-like estimate that a single card takes a trick. */
function trickChance(card: Card, trump: Suit | null, players: number): number {
  if (card.kind === 'archmage') return 0.95
  if (card.kind === 'fool') return 0
  // More players mean more Archmages and high trumps to run into.
  const crowd = Math.max(0.5, 1 - (players - 3) * 0.12)
  if (card.suit === trump) return Math.min(0.95, Math.max(0.1, (card.value - 4) / 8)) * (0.65 + 0.35 * crowd)
  const top = trump ? { 13: 0.65, 12: 0.4, 11: 0.2 } : { 13: 0.8, 12: 0.55, 11: 0.3, 10: 0.12 }
  return (top[card.value as keyof typeof top] ?? 0) * crowd
}

/** Expected tricks for a hand: card by card, plus long trump suits that outlast the others' trumps. */
function handEstimate(hand: readonly Card[], trump: Suit | null, players: number, handSize: number): number {
  const base = hand.reduce((sum, c) => sum + trickChance(c, trump, players), 0)
  if (!trump) return base
  const trumps = hand.filter(c => c.kind === 'number' && c.suit === trump).length
  const fairShare = (13 * handSize) / 60
  // Big hands: the other players run out of a suit, so plain cards get ruffed less often by them
  // and our spare trumps take tricks too.
  const length = Math.max(0, trumps - fairShare) * 0.5
  const deepHand = handSize >= 6 ? (handSize - 5) * 0.08 * (6 - players) : 0
  return base + length + deepHand
}

function chooseBid(view: GameView): number {
  const n = view.players.length
  const me = view.players[view.seat]
  const raw = view.blind
    ? blindWinChance(view)
    : handEstimate(me.hand ?? [], view.trump, n, view.round)
  const bid = Math.min(view.round, Math.max(0, Math.round(raw)))
  if (bid !== view.forbiddenBid) return bid
  // Step off the forbidden bid to the side the estimate leans to, if that side exists.
  const down = bid - 1 >= 0 ? bid - 1 : null
  const up = bid + 1 <= view.round ? bid + 1 : null
  return (raw < bid ? (down ?? up) : (up ?? down)) ?? bid
}

/** Blind round: try every card ours could be and see how often it wins against the visible cards. */
function blindWinChance(view: GameView): number {
  const n = view.players.length
  const seen = new Set<string>()
  view.players.forEach(p => p.hand?.forEach(c => seen.add(c.id)))
  if (view.trumpCard) seen.add(view.trumpCard.id)
  const unknown = fullDeck().filter(c => !seen.has(c.id))
  const leader = (view.dealer + 1) % n
  let wins = 0
  for (const card of unknown) {
    const plays: Play[] = []
    for (let k = 0; k < n; k++) {
      const seat = (leader + k) % n
      const c = seat === view.seat ? card : view.players[seat].hand?.[0]
      if (c) plays.push({ seat, card: c })
    }
    if (trickWinner(plays, view.trump) === view.seat) wins++
  }
  return unknown.length ? wins / unknown.length : 0
}

function choosePlay(view: GameView): string {
  if (view.blind) return HIDDEN_CARD_ID
  const me = view.players[view.seat]
  const trump = view.trump
  const legal = (me.hand ?? []).filter(c => view.legal.includes(c.id))
  const byStrength = [...legal].sort((a, b) => strength(a, trump) - strength(b, trump))
  const weakest = byStrength[0]
  const strongest = byStrength[byStrength.length - 1]
  const wantMore = (me.bid ?? 0) > me.tricks
  const wins = (c: Card) => trickWinner([...view.trick, { seat: view.seat, card: c }], trump) === view.seat

  if (view.trick.length === 0) {
    if (!wantMore) return (legal.find(c => c.kind === 'fool') ?? lowestPlain(legal, trump) ?? weakest).id
    // Lead a strong card if it is likely to hold, else probe cheaply.
    return (strength(strongest, trump) >= 52 || strongest.kind === 'archmage' ? strongest : weakest).id
  }

  const winners = byStrength.filter(wins)
  const losers = byStrength.filter(c => !wins(c))
  const lastToPlay = view.trick.length === view.players.length - 1
  if (wantMore) {
    if (winners.length === 0) return (legal.find(c => c.kind === 'fool') ?? lowestPlain(legal, trump) ?? weakest).id
    // Later players can still overtake: take a solid winner unless we are last.
    if (lastToPlay) return winners[0].id
    return (winners.find(c => strength(c, trump) >= 50) ?? winners[winners.length - 1]).id
  }
  // Enough tricks: get rid of the most dangerous card that still loses.
  if (losers.length > 0) {
    const plain = losers.filter(c => c.kind === 'number')
    return (plain.length ? plain[plain.length - 1] : losers[0]).id
  }
  return strongest.id
}

function lowestPlain(cards: readonly Card[], trump: Suit | null): Card | undefined {
  return cards
    .filter(c => c.kind === 'number' && c.suit !== trump)
    .sort((a, b) => strength(a, trump) - strength(b, trump))[0]
}
