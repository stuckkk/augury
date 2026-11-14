import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, parseSettings } from './clientSettings'

describe('client settings', () => {
  it('falls back to defaults for missing or broken data', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{"motion":"wild","sound":"yes"}')).toEqual(DEFAULT_SETTINGS)
  })
  it('keeps valid values', () => {
    expect(parseSettings('{"motion":"off","sound":false,"vibrate":false,"confirmPlay":false}')).toEqual({
      motion: 'off',
      sound: false,
      vibrate: false,
      confirmPlay: false,
    })
  })
})
