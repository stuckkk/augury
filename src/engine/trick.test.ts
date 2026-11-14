import { describe, expect, it } from 'vitest'
import { card, plays } from './testing/fixtures'
import { leadSuit, legalCards, trickWinner } from './trick'

describe('lead suit', () => {
  it('is the first card\'s suit', () => expect(leadSuit(plays('moon-3', 'sun-9'))).toBe('moon'))
  it('skips Fools led before it', () => expect(leadSuit(plays('fool-1', 'fool-2', 'comet-4'))).toBe('comet'))
  it('is none when an Archmage is led', () => expect(leadSuit(plays('archmage-1', 'sun-2'))).toBeNull())
  it('is none when an Archmage follows a led Fool', () => expect(leadSuit(plays('fool-1', 'archmage-1', 'sun-2'))).toBeNull())
})

describe('legal cards', () => {
  const hand = ['sun-2', 'sun-12', 'moon-5', 'archmage-1', 'fool-1'].map(card)
  const ids = (cs: { id: string }[]) => cs.map(c => c.id).sort()
  it('must follow suit but may always play Archmage or Fool', () =>
    expect(ids(legalCards(hand, plays('sun-7')))).toEqual(['archmage-1', 'fool-1', 'sun-12', 'sun-2']))
  it('may play anything without the lead suit', () => expect(legalCards(hand, plays('comet-7'))).toHaveLength(5))
  it('may play anything when leading', () => expect(legalCards(hand, [])).toHaveLength(5))
  it('may play anything after a led Archmage', () => expect(legalCards(hand, plays('archmage-2'))).toHaveLength(5))
  it('follows the first number card after led Fools', () =>
    expect(ids(legalCards(hand, plays('fool-2', 'moon-1')))).toEqual(['archmage-1', 'fool-1', 'moon-5']))
})

describe('trick winner', () => {
  it('first Archmage wins', () => expect(trickWinner(plays('sun-13', 'archmage-1', 'archmage-2'), 'sun')).toBe(1))
  it('highest trump beats the lead suit', () => expect(trickWinner(plays('moon-13', 'sun-2', 'sun-5', 'moon-12'), 'sun')).toBe(2))
  it('highest of the lead suit wins without trumps', () => expect(trickWinner(plays('moon-4', 'comet-13', 'moon-9'), 'sun')).toBe(2))
  it('off-suit cards never win', () => expect(trickWinner(plays('moon-1', 'comet-13', 'star-13'), null)).toBe(0))
  it('a led Fool lets the next number card set the suit', () => expect(trickWinner(plays('fool-1', 'star-3', 'moon-13'), null)).toBe(1))
  it('all Fools: the first one wins', () => expect(trickWinner(plays('fool-3', 'fool-1', 'fool-2'), 'sun')).toBe(0))
  it('Fools lose to anything', () => expect(trickWinner(plays('fool-1', 'fool-2', 'comet-1'), 'sun')).toBe(2))
})
