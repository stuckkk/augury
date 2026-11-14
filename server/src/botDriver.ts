import { chooseBotAction } from '../../src/engine/bot'
import { seatsToAct } from '../../src/engine/engine'
import type { Action, GameState } from '../../src/engine/types'
import { viewFor } from '../../src/engine/view'

export interface BotPacing {
  /** Pause before a bot move, so people can follow what happens. */
  botDelayMs: number
  /** Extra time after a trick is complete, so everyone sees who took it. */
  trickPauseMs: number
}

/** The next move any bot wants to make, and how long to wait before making it. */
export function nextBotMove(
  game: GameState,
  isBot: readonly boolean[],
  pacing: BotPacing,
): { seat: number; action: Action; delay: number } | null {
  for (const seat of seatsToAct(game)) {
    if (!isBot[seat]) continue
    const action = chooseBotAction(viewFor(game, seat))
    if (!action) continue
    const trickJustEnded = game.phase === 'playing' && game.trick.length === 0 && game.lastTrick !== null
    const delay =
      action.type === 'ready' ? Math.min(300, pacing.botDelayMs) : trickJustEnded ? pacing.trickPauseMs : pacing.botDelayMs
    return { seat, action, delay }
  }
  return null
}
