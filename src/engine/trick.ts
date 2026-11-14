import type { Card, Play, Suit } from './types'

/**
 * The suit others must follow, or null when there is none: nothing played yet, only Fools so
 * far, or an Archmage came before the first number card.
 */
export function leadSuit(plays: readonly Play[]): Suit | null {
  for (const { card } of plays) {
    if (card.kind === 'archmage') return null
    if (card.kind === 'number') return card.suit
  }
  return null
}

/** Archmages and Fools may always be played; number cards must follow the lead suit if possible. */
export function legalCards(hand: readonly Card[], plays: readonly Play[]): Card[] {
  const suit = leadSuit(plays)
  if (!suit || !hand.some(c => c.kind === 'number' && c.suit === suit)) return [...hand]
  return hand.filter(c => c.kind !== 'number' || c.suit === suit)
}

/** Index into `plays` of the winning play. */
export function winningPlay(plays: readonly Play[], trump: Suit | null): number {
  const archmage = plays.findIndex(p => p.card.kind === 'archmage')
  if (archmage >= 0) return archmage
  const lead = leadSuit(plays)
  let best = -1
  let bestRank = -1
  plays.forEach(({ card }, i) => {
    if (card.kind !== 'number') return
    // Trumps beat the lead suit; other suits never win.
    const rank = card.suit === trump ? 100 + card.value : card.suit === lead ? card.value : -1
    if (rank > bestRank) {
      best = i
      bestRank = rank
    }
  })
  // Only Fools: the first one takes it.
  return best >= 0 ? best : 0
}

export function trickWinner(plays: readonly Play[], trump: Suit | null): number {
  return plays[winningPlay(plays, trump)].seat
}
