import { randomBytes, randomInt } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import type { WebSocket } from 'ws'
import { MAX_PLAYERS, MIN_PLAYERS } from '../../src/engine/cards'
import { applyAction, createGame } from '../../src/engine/engine'
import { DEFAULT_OPTIONS, normalizeOptions } from '../../src/engine/rules'
import type { GameState, RuleOptions } from '../../src/engine/types'
import { viewFor } from '../../src/engine/view'
import type { ClientMessage, RoomInfo, ServerError, ServerMessage } from '../../src/network/protocol'
import { nextBotMove, type BotPacing } from './botDriver'
import { CreationLimiter } from './creationLimiter'

interface Member {
  id: string
  token: string
  name: string
  isBot: boolean
  socket: WebSocket | null
  /** The browser tab that holds this seat. */
  tabId: string
}

interface Room {
  id: string
  hostId: string
  members: Member[]
  options: RuleOptions
  game: GameState | null
  botTimer: ReturnType<typeof setTimeout> | null
  lastActivity: number
}

/** What a room looks like on disk (no sockets, no timers). */
export type RoomSnapshot = Omit<Room, 'botTimer' | 'members'> & { members: Omit<Member, 'socket'>[] }

export interface Connection {
  roomId: string | null
  memberId: string | null
  /** Network address, for the room-creation limit. */
  address: string
}

export interface RoomManagerOptions extends BotPacing {
  /** Rooms nobody is connected to are removed after this long. */
  idleTimeoutMs: number
  maxRooms: number
}

export const DEFAULT_ROOM_OPTIONS: RoomManagerOptions = {
  botDelayMs: 900,
  trickPauseMs: 1600,
  idleTimeoutMs: 2 * 60 * 60 * 1000,
  maxRooms: 200,
}

const BOT_NAMES = ['Vega', 'Altair', 'Lyra', 'Rigel', 'Cassia', 'Sirius', 'Nova', 'Deneb', 'Mira', 'Electra']
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

function send(socket: WebSocket | null, msg: ServerMessage): void {
  if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg))
}

function lanHost(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) if (net.family === 'IPv4' && !net.internal) return net.address
  }
  return null
}

function cleanTabId(raw: unknown): string {
  return typeof raw === 'string' ? raw.slice(0, 40) : ''
}

function cleanName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 20) : ''
  return name || 'Augur'
}

export class RoomManager {
  private rooms = new Map<string, Room>()
  private options: RoomManagerOptions
  private limiter = new CreationLimiter()
  private sweeper: ReturnType<typeof setInterval>

  constructor(options: Partial<RoomManagerOptions> = {}) {
    this.options = { ...DEFAULT_ROOM_OPTIONS, ...options }
    this.sweeper = setInterval(() => this.sweep(), 60_000)
    this.sweeper.unref()
  }

  close(): void {
    clearInterval(this.sweeper)
    for (const room of this.rooms.values()) if (room.botTimer) clearTimeout(room.botTimer)
    this.rooms.clear()
  }

  get roomCount(): number {
    return this.rooms.size
  }

  snapshot(): RoomSnapshot[] {
    return [...this.rooms.values()].map(r => ({
      id: r.id,
      hostId: r.hostId,
      options: r.options,
      game: r.game,
      lastActivity: r.lastActivity,
      members: r.members.map(m => ({ id: m.id, token: m.token, name: m.name, isBot: m.isBot, tabId: m.tabId })),
    }))
  }

  /** Brings back rooms saved by snapshot(); everyone reconnects with their stored token. */
  restore(rooms: RoomSnapshot[]): void {
    for (const saved of rooms) {
      const room: Room = { ...saved, members: saved.members.map(m => ({ ...m, socket: null })), botTimer: null, lastActivity: Date.now() }
      this.rooms.set(room.id, room)
      this.scheduleBots(room)
    }
  }

  private sweep(): void {
    const now = Date.now()
    for (const room of this.rooms.values()) {
      const empty = room.members.every(m => !m.socket)
      if (empty && now - room.lastActivity > this.options.idleTimeoutMs) this.deleteRoom(room)
    }
  }

  private deleteRoom(room: Room): void {
    if (room.botTimer) clearTimeout(room.botTimer)
    this.rooms.delete(room.id)
  }

  private newRoomId(): string {
    for (;;) {
      let id = ''
      for (let i = 0; i < 5; i++) id += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)]
      if (!this.rooms.has(id)) return id
    }
  }

  private roomInfo(room: Room): RoomInfo {
    return {
      id: room.id,
      hostId: room.hostId,
      started: !!room.game,
      options: room.options,
      seats: room.members.map(m => ({ id: m.id, name: m.name, isBot: m.isBot, connected: m.isBot || !!m.socket })),
    }
  }

  private broadcast(room: Room): void {
    const info = this.roomInfo(room)
    room.members.forEach((m, i) => {
      if (!m.socket) return
      send(m.socket, { type: 'room', room: info })
      send(m.socket, { type: 'game', view: room.game ? viewFor(room.game, i) : null })
    })
  }

  private uniqueName(room: Room, name: string): string {
    const taken = new Set(room.members.map(m => m.name))
    if (!taken.has(name)) return name
    for (let i = 2; ; i++) if (!taken.has(`${name} ${i}`)) return `${name} ${i}`
  }

  private addMember(room: Room, name: string, isBot: boolean): Member {
    const member: Member = {
      id: randomBytes(6).toString('hex'),
      token: isBot ? '' : randomBytes(18).toString('base64url'),
      name: this.uniqueName(room, name),
      isBot,
      socket: null,
      tabId: '',
    }
    room.members.push(member)
    return member
  }

  private attach(room: Room, member: Member, socket: WebSocket, conn: Connection, tabId: unknown): void {
    member.tabId = cleanTabId(tabId)
    if (member.socket && member.socket !== socket) {
      // The same seat opened again in the same tab (a reload): the newer connection wins.
      send(member.socket, { type: 'left' })
      member.socket.close()
    }
    member.socket = socket
    conn.roomId = room.id
    conn.memberId = member.id
    send(socket, { type: 'joined', roomId: room.id, token: member.token, seatId: member.id, lanHost: lanHost() })
  }

  handle(socket: WebSocket, conn: Connection, msg: ClientMessage): void {
    const fail = (code: ServerError) => send(socket, { type: 'error', code })

    if (msg.type === 'create' || msg.type === 'join' || msg.type === 'rejoin') {
      if (conn.roomId) this.detach(socket, conn, true)
    }

    switch (msg.type) {
      case 'create': {
        if (this.rooms.size >= this.options.maxRooms) return fail('SERVER_FULL')
        if (!this.limiter.allow(conn.address)) return fail('TOO_MANY_ROOMS')
        const room: Room = {
          id: this.newRoomId(),
          hostId: '',
          members: [],
          options: { ...DEFAULT_OPTIONS },
          game: null,
          botTimer: null,
          lastActivity: Date.now(),
        }
        this.rooms.set(room.id, room)
        const member = this.addMember(room, cleanName(msg.name), false)
        room.hostId = member.id
        this.attach(room, member, socket, conn, msg.tabId)
        return this.broadcast(room)
      }
      case 'join': {
        const room = this.rooms.get(msg.roomId.toUpperCase().trim())
        if (!room) return fail('NO_SUCH_ROOM')
        if (room.game) return fail('GAME_STARTED')
        if (room.members.length >= MAX_PLAYERS) return fail('ROOM_FULL')
        const member = this.addMember(room, cleanName(msg.name), false)
        this.attach(room, member, socket, conn, msg.tabId)
        room.lastActivity = Date.now()
        return this.broadcast(room)
      }
      case 'rejoin': {
        const room = this.rooms.get(msg.roomId)
        if (!room) return fail('NO_SUCH_ROOM')
        const member = room.members.find(m => !m.isBot && m.token === msg.token)
        if (!member) return fail('BAD_TOKEN')
        // Another tab of the same browser knows the token too; it must not push the player out.
        if (member.socket && member.socket !== socket && member.tabId !== cleanTabId(msg.tabId)) return fail('SEAT_IN_USE')
        this.attach(room, member, socket, conn, msg.tabId)
        room.lastActivity = Date.now()
        return this.broadcast(room)
      }
    }

    const room = conn.roomId ? this.rooms.get(conn.roomId) : undefined
    const me = room?.members.find(m => m.id === conn.memberId)
    if (!room || !me || me.socket !== socket) return fail('NOT_IN_ROOM')
    room.lastActivity = Date.now()
    const isHost = room.hostId === me.id

    switch (msg.type) {
      case 'setOptions': {
        if (!isHost) return fail('HOST_ONLY')
        if (room.game) return fail('GAME_STARTED')
        room.options = normalizeOptions(msg.options)
        return this.broadcast(room)
      }
      case 'addBot': {
        if (!isHost) return fail('HOST_ONLY')
        if (room.game) return fail('GAME_STARTED')
        if (room.members.length >= MAX_PLAYERS) return fail('ROOM_FULL')
        const free = BOT_NAMES.filter(n => !room.members.some(m => m.name === n))
        this.addMember(room, free[randomInt(free.length)], true)
        return this.broadcast(room)
      }
      case 'removeSeat': {
        if (!isHost) return fail('HOST_ONLY')
        if (room.game) return fail('GAME_STARTED')
        const target = room.members.find(m => m.id === msg.seatId)
        if (!target || target.id === me.id) return fail('NO_SUCH_SEAT')
        room.members = room.members.filter(m => m !== target)
        if (target.socket) send(target.socket, { type: 'left' })
        return this.broadcast(room)
      }
      case 'start': {
        if (!isHost) return fail('HOST_ONLY')
        if (room.game) return fail('NOT_NOW')
        if (room.members.length < MIN_PLAYERS) return fail('NEED_MORE_PLAYERS')
        // Random seating.
        for (let i = room.members.length - 1; i > 0; i--) {
          const j = randomInt(i + 1)
          ;[room.members[i], room.members[j]] = [room.members[j], room.members[i]]
        }
        room.game = createGame(room.members.length, room.options, randomInt(2 ** 31))
        this.broadcast(room)
        return this.scheduleBots(room)
      }
      case 'newGame': {
        if (!isHost) return fail('HOST_ONLY')
        if (room.game?.phase !== 'gameOver') return fail('NOT_NOW')
        room.game = null
        // Seats that lost their player mid-game stay as bots; empty human seats are freed.
        room.members = room.members.filter(m => m.isBot || m.socket)
        return this.broadcast(room)
      }
      case 'replaceWithBot': {
        if (!isHost) return fail('HOST_ONLY')
        const target = room.members.find(m => m.id === msg.seatId)
        if (!room.game || !target || target.isBot || target.id === me.id) return fail('NO_SUCH_SEAT')
        if (target.socket) return fail('STILL_CONNECTED')
        target.isBot = true
        target.token = ''
        this.broadcast(room)
        return this.scheduleBots(room)
      }
      case 'action': {
        if (!room.game) return fail('NOT_NOW')
        const result = applyAction(room.game, room.members.indexOf(me), msg.action)
        if (!result.ok) return fail(result.error as ServerError)
        room.game = result.state
        this.broadcast(room)
        return this.scheduleBots(room)
      }
      case 'leave':
        return this.detach(socket, conn, true)
      default:
        return fail('MALFORMED_MESSAGE')
    }
  }

  /** A socket went away. `explicit`: the player chose to leave (rather than losing the connection). */
  detach(socket: WebSocket, conn: Connection, explicit = false): void {
    const room = conn.roomId ? this.rooms.get(conn.roomId) : undefined
    conn.roomId = null
    conn.memberId = null
    if (!room) return
    // Late close of a socket a reconnect already replaced: nothing to do.
    const member = room.members.find(m => m.socket === socket)
    if (!member) return
    member.socket = null
    if (explicit) send(socket, { type: 'left' })
    if (explicit && !room.game) {
      // Leaving the lobby frees the seat; the host role moves on.
      room.members = room.members.filter(m => m !== member)
      const nextHost = room.members.find(m => !m.isBot)
      if (!nextHost) return this.deleteRoom(room)
      if (room.hostId === member.id) room.hostId = nextHost.id
    } else if (room.hostId === member.id) {
      // Keep the table manageable while the host is away.
      const nextHost = room.members.find(m => !m.isBot && m.socket)
      if (nextHost) room.hostId = nextHost.id
    }
    this.broadcast(room)
  }

  private scheduleBots(room: Room): void {
    if (room.botTimer) clearTimeout(room.botTimer)
    room.botTimer = null
    if (!room.game) return
    const move = nextBotMove(room.game, room.members.map(m => m.isBot), this.options)
    if (!move) return
    room.botTimer = setTimeout(() => {
      room.botTimer = null
      if (!room.game || !this.rooms.has(room.id)) return
      const result = applyAction(room.game, move.seat, move.action)
      if (!result.ok) {
        console.error(`bot move ${move.action.type} rejected: ${result.error}`)
        return
      }
      room.game = result.state
      this.broadcast(room)
      this.scheduleBots(room)
    }, move.delay)
  }
}
