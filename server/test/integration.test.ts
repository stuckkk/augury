import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import type { GameView } from '../../src/engine/types'
import type { ClientMessage, RoomInfo, ServerMessage } from '../../src/network/protocol'
import { createGameServer, type GameServer } from '../src/server'

class Client {
  socket: WebSocket
  room: RoomInfo | null = null
  view: GameView | null = null
  /** Every view received, in order. */
  views: GameView[] = []
  token = ''
  seatId = ''
  roomId = ''
  errors: string[] = []
  left = false
  private waiters: (() => void)[] = []

  constructor(url: string) {
    this.socket = new WebSocket(url)
    this.socket.on('message', raw => {
      const msg = JSON.parse(raw.toString()) as ServerMessage
      if (msg.type === 'joined') {
        this.token = msg.token
        this.seatId = msg.seatId
        this.roomId = msg.roomId
      } else if (msg.type === 'room') this.room = msg.room
      else if (msg.type === 'game') {
        this.view = msg.view
        if (msg.view) this.views.push(msg.view)
      }
      else if (msg.type === 'error') this.errors.push(msg.code)
      else if (msg.type === 'left') this.left = true
      this.waiters.splice(0).forEach(w => w())
    })
  }

  open(): Promise<void> {
    return new Promise(resolve => this.socket.once('open', () => resolve()))
  }

  send(msg: ClientMessage | Record<string, unknown>): void {
    this.socket.send(JSON.stringify(msg))
  }

  async until(cond: () => boolean, what = 'condition', ms = 5000): Promise<void> {
    const deadline = Date.now() + ms
    while (!cond()) {
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
      await new Promise<void>(resolve => {
        const t = setTimeout(resolve, 100)
        this.waiters.push(() => {
          clearTimeout(t)
          resolve()
        })
      })
    }
  }
}

describe('game server', () => {
  let server: GameServer
  let url: string
  const clients: Client[] = []

  async function connect(): Promise<Client> {
    const c = new Client(url)
    clients.push(c)
    await c.open()
    return c
  }

  async function lobbyWithBots(bots: number, options: object = {}): Promise<Client> {
    const host = await connect()
    host.send({ type: 'create', name: 'Ada', tabId: 'tab-ada' })
    await host.until(() => !!host.room, 'room')
    if (Object.keys(options).length) host.send({ type: 'setOptions', options })
    for (let i = 0; i < bots; i++) host.send({ type: 'addBot' })
    await host.until(() => host.room!.seats.length === bots + 1, 'bots')
    return host
  }

  beforeEach(async () => {
    server = createGameServer({ botDelayMs: 1, trickPauseMs: 1, staticDir: '/nonexistent' })
    await new Promise<void>(resolve => server.http.listen(0, resolve))
    url = `ws://localhost:${(server.http.address() as AddressInfo).port}/ws`
  })

  afterEach(async () => {
    clients.splice(0).forEach(c => c.socket.terminate())
    await server.close()
  })

  it('runs a lobby: create, join, bots, options and host-only controls', async () => {
    const host = await connect()
    host.send({ type: 'create', name: '  Ada  ', tabId: 'a' })
    await host.until(() => !!host.room, 'room')
    expect(host.room!.seats.map(s => s.name)).toEqual(['Ada'])
    expect(host.room!.hostId).toBe(host.seatId)

    const guest = await connect()
    guest.send({ type: 'join', roomId: host.roomId.toLowerCase(), name: 'Ada', tabId: 'b' })
    await guest.until(() => guest.room?.seats.length === 2, 'guest seated')
    expect(guest.room!.seats.map(s => s.name)).toEqual(['Ada', 'Ada 2'])

    guest.send({ type: 'addBot' })
    guest.send({ type: 'start' })
    guest.send({ type: 'setOptions', options: { hiddenBids: true } })
    await guest.until(() => guest.errors.length === 3, 'errors')
    expect(guest.errors).toEqual(['HOST_ONLY', 'HOST_ONLY', 'HOST_ONLY'])

    host.send({ type: 'start' })
    await host.until(() => host.errors.length === 1)
    expect(host.errors).toEqual(['NEED_MORE_PLAYERS'])

    host.send({ type: 'setOptions', options: { noEvenBids: true, evenBidsAllowedThroughRound: 5, rounds: 3, junk: 1 } })
    await guest.until(() => guest.room!.options.rounds === 3, 'options')
    expect(guest.room!.options).toEqual({ noEvenBids: true, evenBidsAllowedThroughRound: 5, hiddenBids: false, blindFirstRound: false, rounds: 3 })

    host.send({ type: 'addBot' })
    await host.until(() => host.room!.seats.length === 3)
    expect(host.room!.seats[2].isBot).toBe(true)
    host.send({ type: 'start' })
    await guest.until(() => !!guest.view, 'game')
    expect(guest.room!.started).toBe(true)

    const late = await connect()
    late.send({ type: 'join', roomId: host.roomId, name: 'Late' })
    await late.until(() => late.errors.length > 0)
    expect(late.errors).toEqual(['GAME_STARTED'])
  })

  it('rejects malformed messages without dropping the connection', async () => {
    const c = await connect()
    c.socket.send('not json')
    c.send({ type: 'nope' })
    c.send({ type: 'create', name: 42 })
    c.send({ type: 'action', action: { type: 'bid', bid: 1 } })
    await c.until(() => c.errors.length === 4)
    expect(c.errors).toEqual(['MALFORMED_MESSAGE', 'MALFORMED_MESSAGE', 'MALFORMED_MESSAGE', 'NOT_IN_ROOM'])
    c.send({ type: 'create', name: 'Still here' })
    await c.until(() => !!c.room)
  })

  it('plays a whole game with one person and two bots, never showing other hands', async () => {
    const host = await lobbyWithBots(2, { rounds: 4 })
    host.send({ type: 'start' })
    await host.until(
      () => {
        const v = host.view
        if (!v) return false
        const me = v.players[v.seat]
        if (v.phase === 'chooseTrump' && v.turn === v.seat) host.send({ type: 'action', action: { type: 'chooseTrump', suit: 'star' } })
        if (v.phase === 'bidding' && v.turn === v.seat && !me.hasBid) {
          host.send({ type: 'action', action: { type: 'bid', bid: v.forbiddenBid === 0 ? 1 : 0 } })
        }
        if (v.phase === 'playing' && v.legal.length) host.send({ type: 'action', action: { type: 'play', cardId: v.legal[0] } })
        if (v.phase === 'roundEnd' && !v.ready[v.seat]) host.send({ type: 'action', action: { type: 'ready' } })
        return v.phase === 'gameOver'
      },
      'game over',
      20_000,
    )
    // Each round's hand is seen in full at the start of the round, and other hands never.
    const dealt = host.views.filter(v => v.players[v.seat].hand?.length === v.round && v.phase !== 'playing')
    expect(new Set(dealt.map(v => v.round))).toEqual(new Set([1, 2, 3, 4]))
    for (const v of host.views) v.players.forEach((p, i) => i !== v.seat && expect(p.hand).toBeNull())
    expect(host.view!.history).toHaveLength(4)

    host.send({ type: 'newGame' })
    await host.until(() => host.room?.started === false, 'back in lobby')
    expect(host.view).toBeNull()
    expect(host.room!.seats).toHaveLength(3)
  })

  it('keeps a seat across reconnects, but not for a second tab', async () => {
    const host = await lobbyWithBots(2)
    host.send({ type: 'start' })
    await host.until(() => !!host.view)

    const otherTab = await connect()
    otherTab.send({ type: 'rejoin', roomId: host.roomId, token: host.token, tabId: 'another-tab' })
    await otherTab.until(() => otherTab.errors.length > 0)
    expect(otherTab.errors).toEqual(['SEAT_IN_USE'])

    host.socket.terminate()
    const back = await connect()
    back.send({ type: 'rejoin', roomId: host.roomId, token: host.token, tabId: 'tab-ada' })
    await back.until(() => !!back.view, 'view after rejoin')
    expect(back.seatId).toBe(host.seatId)

    const stranger = await connect()
    stranger.send({ type: 'rejoin', roomId: host.roomId, token: 'wrong' })
    await stranger.until(() => stranger.errors.length > 0)
    expect(stranger.errors).toEqual(['BAD_TOKEN'])
  })

  it('lets the host hand a vanished player\'s seat to a bot', async () => {
    const host = await connect()
    host.send({ type: 'create', name: 'Ada' })
    await host.until(() => !!host.room)
    const guest = await connect()
    guest.send({ type: 'join', roomId: host.roomId, name: 'Bo' })
    await host.until(() => host.room!.seats.length === 2)
    host.send({ type: 'addBot' })
    await host.until(() => host.room!.seats.length === 3)
    host.send({ type: 'start' })
    await guest.until(() => !!guest.view)

    host.send({ type: 'replaceWithBot', seatId: guest.seatId })
    await host.until(() => host.errors.length > 0)
    expect(host.errors).toEqual(['STILL_CONNECTED'])

    guest.socket.terminate()
    await host.until(() => host.room!.seats.find(s => s.id === guest.seatId)?.connected === false, 'guest gone')
    host.send({ type: 'replaceWithBot', seatId: guest.seatId })
    await host.until(() => !!host.room!.seats.find(s => s.id === guest.seatId)?.isBot, 'bot seat')
  })

  it('snapshots and restores rooms', async () => {
    const host = await lobbyWithBots(2)
    host.send({ type: 'start' })
    await host.until(() => !!host.view)
    const saved = JSON.parse(JSON.stringify(server.rooms.snapshot()))
    expect(JSON.stringify(saved)).not.toContain('socket')

    await server.close()
    server = createGameServer({ botDelayMs: 1, trickPauseMs: 1, staticDir: '/nonexistent' })
    server.rooms.restore(saved)
    await new Promise<void>(resolve => server.http.listen(0, resolve))
    url = `ws://localhost:${(server.http.address() as AddressInfo).port}/ws`

    const back = await connect()
    back.send({ type: 'rejoin', roomId: host.roomId, token: host.token, tabId: 'tab-ada' })
    await back.until(() => !!back.view, 'restored view')
    expect(back.view!.round).toBe(host.view!.round)
  })
})
