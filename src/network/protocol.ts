import type { Action, GameView, RuleOptions } from '../engine/types'

export interface SeatInfo {
  id: string
  name: string
  isBot: boolean
  connected: boolean
}

export interface RoomInfo {
  id: string
  hostId: string
  started: boolean
  options: RuleOptions
  /** In game order once the game has started (seat index = position here). */
  seats: SeatInfo[]
}

export type ClientMessage =
  // tabId identifies one browser tab, so a second tab of the same browser cannot take over a live seat.
  | { type: 'create'; name: string; tabId?: string }
  | { type: 'join'; roomId: string; name: string; tabId?: string }
  | { type: 'rejoin'; roomId: string; token: string; tabId?: string }
  | { type: 'setOptions'; options: RuleOptions }
  | { type: 'addBot' }
  | { type: 'removeSeat'; seatId: string }
  | { type: 'start' }
  /** After a game: back to the lobby with the same table. */
  | { type: 'newGame' }
  | { type: 'replaceWithBot'; seatId: string }
  | { type: 'action'; action: Action }
  | { type: 'leave' }

export const SERVER_ERRORS = [
  'MALFORMED_MESSAGE',
  'SERVER_FULL',
  'TOO_MANY_ROOMS',
  'NO_SUCH_ROOM',
  'GAME_STARTED',
  'ROOM_FULL',
  'BAD_TOKEN',
  'SEAT_IN_USE',
  'NOT_IN_ROOM',
  'HOST_ONLY',
  'NO_SUCH_SEAT',
  'NOT_NOW',
  'NEED_MORE_PLAYERS',
  'STILL_CONNECTED',
  // From the rules engine:
  'NOT_YOUR_TURN',
  'BAD_ACTION',
  'BAD_SUIT',
  'BAD_BID',
  'ALREADY_BID',
  'FORBIDDEN_BID',
  'NO_SUCH_CARD',
  'MUST_FOLLOW_SUIT',
] as const
export type ServerError = (typeof SERVER_ERRORS)[number]

export type ServerMessage =
  /** lanHost: an address of the server on the local network, for invite links made on the server's own machine. */
  | { type: 'joined'; roomId: string; token: string; seatId: string; lanHost: string | null }
  | { type: 'room'; room: RoomInfo }
  | { type: 'game'; view: GameView | null }
  | { type: 'left' }
  | { type: 'error'; code: ServerError }

const str = (v: unknown, max = 64) => typeof v === 'string' && v.length <= max
const optStr = (v: unknown) => v === undefined || str(v)

/** Shape check for anything a client sends; contents are checked again where they are used. */
export function isClientMessage(msg: unknown): msg is ClientMessage {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as Record<string, unknown>
  switch (m.type) {
    case 'create':
      return str(m.name) && optStr(m.tabId)
    case 'join':
      return str(m.roomId) && str(m.name) && optStr(m.tabId)
    case 'rejoin':
      return str(m.roomId) && str(m.token) && optStr(m.tabId)
    case 'setOptions':
      return !!m.options && typeof m.options === 'object'
    case 'removeSeat':
    case 'replaceWithBot':
      return str(m.seatId)
    case 'action':
      return !!m.action && typeof m.action === 'object' && str((m.action as Record<string, unknown>).type)
    case 'addBot':
    case 'start':
    case 'newGame':
    case 'leave':
      return true
    default:
      return false
  }
}
