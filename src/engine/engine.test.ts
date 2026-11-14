import { describe, expect, it } from 'vitest'
import { DECK_SIZE } from './cards'
import { applyAction, createGame, placings, seatsToAct } from './engine'
import { evenBidsForbidden, forbiddenBid, normalizeOptions, totalRounds } from './rules'
import { roundScore } from './scoring'
import { act, card } from './testing/fixtures'
import { legalCards } from './trick'
import { HIDDEN_CARD_ID, type GameState } from './types'
import { viewFor } from './view'

/** Plays out the current trick with the first legal card for every seat. */
function playTrick(s: GameState): GameState {
  const n = s.players.length
  for (let k = 0; k < n; k++) {
    const seat = s.turn
    s = act(s, seat, { type: 'play', cardId: legalCards(s.players[seat].hand, s.trick)[0].id })
  }
  return s
}

/** Starts round play with every seat bidding `bid` (skipping a forbidden bid). */
function bidAll(s: GameState, bid = 0): GameState {
  if (s.phase === 'chooseTrump') s = act(s, s.dealer, { type: 'chooseTrump', suit: 'moon' })
  while (s.phase === 'bidding') {
    const seat = seatsToAct(s)[0]
    const b = forbiddenBid(s, seat) === bid ? bid + 1 : bid
    s = act(s, seat, { type: 'bid', bid: b })
  }
  return s
}

describe('setup', () => {
  it('deals round r cards to everyone and turns up a trump card', () => {
    const s = createGame(4, {}, 7)
    expect(s.round).toBe(1)
    expect(s.totalRounds).toBe(15)
    s.players.forEach(p => expect(p.hand).toHaveLength(1))
    expect(s.trumpCard).not.toBeNull()
    expect(s.players.flatMap(p => p.hand).length + s.deck.length + 1).toBe(DECK_SIZE)
  })

  it('round counts follow the deck', () => {
    expect([3, 4, 5, 6].map(n => totalRounds(normalizeOptions({}), n))).toEqual([20, 15, 12, 10])
    expect(totalRounds(normalizeOptions({ rounds: 7 }), 6)).toBe(7)
    expect(normalizeOptions({ rounds: 99 }, 6).rounds).toBe(10)
  })

  it('bidding starts left of the dealer', () => {
    for (let seed = 0; seed < 20; seed++) {
      const s = createGame(5, {}, seed)
      if (s.phase === 'bidding') expect(s.turn).toBe((s.dealer + 1) % 5)
      else expect(s.turn).toBe(s.dealer)
    }
  })

  it('trump follows the turned-up card', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = createGame(3, {}, seed)
      const t = s.trumpCard!
      if (t.kind === 'number') expect([s.trump, s.phase]).toEqual([t.suit, 'bidding'])
      if (t.kind === 'fool') expect([s.trump, s.phase]).toEqual([null, 'bidding'])
      if (t.kind === 'archmage') expect([s.trump, s.phase]).toEqual([null, 'chooseTrump'])
    }
  })

  it('a turned-up Archmage lets the dealer (only) pick a suit', () => {
    let seed = 0
    let s = createGame(3, {}, seed)
    while (s.phase !== 'chooseTrump') s = createGame(3, {}, ++seed)
    const other = (s.dealer + 1) % 3
    expect(applyAction(s, other, { type: 'chooseTrump', suit: 'sun' })).toEqual({ ok: false, error: 'NOT_YOUR_TURN' })
    expect(applyAction(s, s.dealer, { type: 'chooseTrump', suit: 'none' as never })).toEqual({ ok: false, error: 'BAD_SUIT' })
    s = act(s, s.dealer, { type: 'chooseTrump', suit: 'comet' })
    expect([s.trump, s.phase, s.turn]).toEqual(['comet', 'bidding', other])
  })

  it('the last round has no trump', () => {
    let s = createGame(6, { rounds: null }, 3)
    while (s.round < 10) {
      s = bidAll(s)
      while (s.phase === 'playing') s = playTrick(s)
      for (let i = 0; i < 6 && s.phase === 'roundEnd'; i++) s = act(s, i, { type: 'ready' })
    }
    expect(s.trumpCard).toBeNull()
    expect(s.trump).toBeNull()
    expect(s.deck).toHaveLength(0)
  })
})

describe('bidding', () => {
  it('goes clockwise and rejects out-of-turn or out-of-range bids', () => {
    let s = bidAll(createGame(3, {}, 1), 0)
    expect(s.phase).toBe('playing')
    s = createGame(3, {}, 1)
    if (s.phase === 'chooseTrump') s = act(s, s.dealer, { type: 'chooseTrump', suit: 'sun' })
    const first = s.turn
    expect(applyAction(s, (first + 1) % 3, { type: 'bid', bid: 0 })).toEqual({ ok: false, error: 'NOT_YOUR_TURN' })
    expect(applyAction(s, first, { type: 'bid', bid: 2 })).toEqual({ ok: false, error: 'BAD_BID' })
    expect(applyAction(s, first, { type: 'bid', bid: -1 })).toEqual({ ok: false, error: 'BAD_BID' })
    expect(applyAction(s, first, { type: 'bid', bid: 0.5 })).toEqual({ ok: false, error: 'BAD_BID' })
    s = act(s, first, { type: 'bid', bid: 1 })
    expect(s.turn).toBe((first + 1) % 3)
  })

  it('even-out rule: the dealer may not make bids add up to the tricks', () => {
    let s = createGame(4, { noEvenBids: true }, 11)
    if (s.phase === 'chooseTrump') s = act(s, s.dealer, { type: 'chooseTrump', suit: 'sun' })
    for (let k = 0; k < 3; k++) {
      expect(forbiddenBid(s, s.turn)).toBeNull()
      s = act(s, s.turn, { type: 'bid', bid: k === 0 ? 1 : 0 })
    }
    expect(s.turn).toBe(s.dealer)
    expect(forbiddenBid(s, s.dealer)).toBe(0)
    expect(applyAction(s, s.dealer, { type: 'bid', bid: 0 })).toEqual({ ok: false, error: 'FORBIDDEN_BID' })
    expect(viewFor(s, s.dealer).forbiddenBid).toBe(0)
    expect(applyAction(s, s.dealer, { type: 'bid', bid: 1 }).ok).toBe(true)
  })

  it('even-out rule: nothing is forbidden once the others already bid more than the tricks', () => {
    let s = createGame(3, { noEvenBids: true }, 5)
    if (s.phase === 'chooseTrump') s = act(s, s.dealer, { type: 'chooseTrump', suit: 'sun' })
    s = act(s, s.turn, { type: 'bid', bid: 1 })
    s = act(s, s.turn, { type: 'bid', bid: 1 })
    expect(forbiddenBid(s, s.dealer)).toBeNull()
  })

  it('even-out rule can allow even bids through round X', () => {
    const o = normalizeOptions({ noEvenBids: true, evenBidsAllowedThroughRound: 5 })
    expect([1, 5, 6, 12].map(r => evenBidsForbidden(o, r))).toEqual([false, false, true, true])
    expect(evenBidsForbidden(normalizeOptions({ noEvenBids: true }), 1)).toBe(true)
    expect(evenBidsForbidden(normalizeOptions({ noEvenBids: false }), 9)).toBe(false)
  })

  it('hidden bids: anyone may bid in any order; bids stay secret until all are in', () => {
    let s = createGame(3, { hiddenBids: true, noEvenBids: true }, 2)
    expect(s.options.noEvenBids).toBe(false)
    if (s.phase === 'chooseTrump') s = act(s, s.dealer, { type: 'chooseTrump', suit: 'sun' })
    expect(seatsToAct(s)).toEqual([0, 1, 2])
    s = act(s, s.dealer, { type: 'bid', bid: 1 })
    const other = (s.dealer + 1) % 3
    let v = viewFor(s, other)
    expect(v.players[s.dealer]).toMatchObject({ bid: null, hasBid: true })
    expect(viewFor(s, s.dealer).players[s.dealer].bid).toBe(1)
    expect(applyAction(s, s.dealer, { type: 'bid', bid: 0 })).toEqual({ ok: false, error: 'ALREADY_BID' })
    s = act(s, other, { type: 'bid', bid: 0 })
    s = act(s, (other + 1) % 3, { type: 'bid', bid: 0 })
    expect(s.phase).toBe('playing')
    v = viewFor(s, other)
    expect(v.players.map(p => p.bid)).toEqual(s.players.map(p => p.bid))
  })
})

describe('playing', () => {
  it('enforces turn order and following suit', () => {
    let s = bidAll(createGame(3, { rounds: 5 }, 4))
    while (s.round < 5) {
      while (s.phase === 'playing') s = playTrick(s)
      for (let i = 0; i < 3 && s.phase === 'roundEnd'; i++) s = act(s, i, { type: 'ready' })
      s = bidAll(s)
    }
    const leader = s.turn
    expect(applyAction(s, (leader + 1) % 3, { type: 'play', cardId: s.players[(leader + 1) % 3].hand[0].id }).ok).toBe(false)
    expect(applyAction(s, leader, { type: 'play', cardId: 'sun-99' })).toEqual({ ok: false, error: 'NO_SUCH_CARD' })
    s = act(s, leader, { type: 'play', cardId: s.players[leader].hand[0].id })
    const next = s.turn
    const hand = s.players[next].hand
    const illegal = hand.find(c => !legalCards(hand, s.trick).includes(c))
    if (illegal) expect(applyAction(s, next, { type: 'play', cardId: illegal.id })).toEqual({ ok: false, error: 'MUST_FOLLOW_SUIT' })
  })

  it('the trick winner leads next and scores are kept per round', () => {
    let s = bidAll(createGame(4, {}, 9), 0)
    const before = s.players.map(p => p.hand.length)
    s = playTrick(s)
    expect(s.lastTrick?.plays).toHaveLength(4)
    expect(s.players.map(p => p.hand.length)).toEqual(before.map(h => h - 1))
    expect(s.phase).toBe('roundEnd')
    const winner = s.lastTrick!.winner
    expect(s.turn).toBe(winner)
    expect(s.history[0].deltas).toEqual(s.players.map((_, i) => (i === winner ? -10 : 20)))
    expect(s.players.map(p => p.score)).toEqual(s.history[0].totals)
  })

  it('the next round starts once everyone is ready, with the deal moving on', () => {
    let s = playTrick(bidAll(createGame(3, {}, 12)))
    const dealer = s.dealer
    expect(applyAction(s, 0, { type: 'play', cardId: 'x' })).toEqual({ ok: false, error: 'NOT_NOW' })
    s = act(s, 0, { type: 'ready' })
    s = act(s, 1, { type: 'ready' })
    expect(s.round).toBe(1)
    s = act(s, 2, { type: 'ready' })
    expect(s.round).toBe(2)
    expect(s.dealer).toBe((dealer + 1) % 3)
    s.players.forEach(p => expect(p).toMatchObject({ bid: null, tricks: 0 }))
  })

  it('a shorter game ends after the chosen rounds', () => {
    let s = createGame(3, { rounds: 2 }, 3)
    for (let r = 0; r < 2; r++) {
      s = bidAll(s)
      while (s.phase === 'playing') s = playTrick(s)
      for (let i = 0; i < 3 && s.phase === 'roundEnd'; i++) s = act(s, i, { type: 'ready' })
    }
    expect(s.phase).toBe('gameOver')
    expect(s.history).toHaveLength(2)
  })
})

describe('scoring', () => {
  it('scores exact bids and misses', () => {
    expect([roundScore(0, 0), roundScore(3, 3), roundScore(2, 0), roundScore(1, 4)]).toEqual([20, 50, -20, -30])
  })
  it('places ties together', () => expect(placings([30, 50, 30, -10])).toEqual([2, 1, 2, 4]))
})

describe('views', () => {
  it('hide other hands, the deck and the RNG', () => {
    const s = createGame(4, {}, 21)
    const v = viewFor(s, 2)
    expect(v.players[2].hand).toEqual(s.players[2].hand)
    ;[0, 1, 3].forEach(i => expect(v.players[i]).toMatchObject({ hand: null, handCount: 1 }))
    const json = JSON.stringify(v)
    expect(json).not.toContain('"deck"')
    expect(json).not.toContain('"rng"')
    expect(json).not.toContain('"seed"')
    for (const i of [0, 1, 3]) expect(json).not.toContain(`"${s.players[i].hand[0].id}"`)
  })

  it('blind first round: see the others\' cards, not your own, and play it unseen', () => {
    let s = bidAll(createGame(3, { blindFirstRound: true }, 8))
    const v = viewFor(s, s.turn)
    expect(v.blind).toBe(true)
    expect(v.players[s.turn]).toMatchObject({ hand: null, handCount: 1 })
    expect(v.legal).toEqual([HIDDEN_CARD_ID])
    const others = [0, 1, 2].filter(i => i !== s.turn)
    others.forEach(i => expect(v.players[i].hand).toEqual(s.players[i].hand))
    expect(JSON.stringify(v)).not.toContain(`"${s.players[s.turn].hand[0].id}"`)
    s = act(s, s.turn, { type: 'play', cardId: HIDDEN_CARD_ID })
    expect(s.trick).toHaveLength(1)
  })

  it('the blind rule only applies to round 1', () => {
    let s = playTrick(bidAll(createGame(3, { blindFirstRound: true }, 8)))
    for (let i = 0; i < 3; i++) s = act(s, i, { type: 'ready' })
    expect(viewFor(s, 0).blind).toBe(false)
    expect(viewFor(s, 0).players[0].hand).toHaveLength(2)
    expect(card('sun-1').kind).toBe('number')
  })
})
