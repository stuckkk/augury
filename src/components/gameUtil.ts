import type { TFunction } from 'i18next'
import type { Card, GameView } from '../engine/types'

/** Seats the game is waiting for. */
export function actingSeats(view: GameView): number[] {
  const all = view.players.map((_, i) => i)
  switch (view.phase) {
    case 'chooseTrump':
      return [view.dealer]
    case 'bidding':
      return view.options.hiddenBids ? all.filter(i => !view.players[i].hasBid) : [view.turn]
    case 'playing':
      return [view.turn]
    case 'roundEnd':
      return all.filter(i => !view.ready[i])
    case 'gameOver':
      return []
  }
}

export function isMyMove(view: GameView): boolean {
  return actingSeats(view).includes(view.seat)
}

export function cardLabel(t: TFunction, card: Card): string {
  if (card.kind === 'archmage') return t('cards.archmage')
  if (card.kind === 'fool') return t('cards.fool')
  return t('cards.number', { value: card.value, suit: t(`suits.${card.suit}`) })
}

/** Sum of the bids known so far, and how many are still unknown to this viewer. */
export function bidTally(view: GameView): { sum: number; unknown: number } {
  let sum = 0
  let unknown = 0
  for (const p of view.players) {
    if (p.bid === null) unknown++
    else sum += p.bid
  }
  return { sum, unknown }
}
