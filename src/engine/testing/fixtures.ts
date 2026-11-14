import { fullDeck } from '../cards'
import { applyAction } from '../engine'
import type { Action, Card, GameState, Play } from '../types'

const byId = new Map(fullDeck().map(c => [c.id, c]))

/** Cards by id, e.g. card('sun-7'), card('archmage-1'), card('fool-2'). */
export function card(id: string): Card {
  const c = byId.get(id)
  if (!c) throw new Error(`no card ${id}`)
  return c
}

/** Plays by seat order 0, 1, 2…: plays('sun-3', 'fool-1') */
export function plays(...ids: string[]): Play[] {
  return ids.map((id, seat) => ({ seat, card: card(id) }))
}

export function act(state: GameState, seat: number, action: Action): GameState {
  const result = applyAction(state, seat, action)
  if (!result.ok) throw new Error(`${action.type} by ${seat} rejected: ${result.error}`)
  return result.state
}
