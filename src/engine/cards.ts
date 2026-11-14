import { SUITS, type Card } from './types'

export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 6
export const DECK_SIZE = 60

export function fullDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (let value = 1; value <= 13; value++) deck.push({ id: `${suit}-${value}`, kind: 'number', suit, value })
  for (let i = 1; i <= 4; i++) deck.push({ id: `archmage-${i}`, kind: 'archmage' })
  for (let i = 1; i <= 4; i++) deck.push({ id: `fool-${i}`, kind: 'fool' })
  return deck
}

/** Rounds in a full game: the deck is dealt out completely in the last one. */
export function maxRounds(players: number): number {
  return Math.floor(DECK_SIZE / players)
}
