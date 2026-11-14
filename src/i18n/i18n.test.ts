import { describe, expect, it } from 'vitest'
import de from './de.json'
import en from './en.json'
import { SERVER_ERRORS } from '../network/protocol'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))
}

describe('translations', () => {
  it('English and German have the same keys', () => {
    expect(keys(de).sort()).toEqual(keys(en).sort())
  })
  it('every server error has a message', () => {
    for (const code of SERVER_ERRORS) expect(keys(en)).toContain(`errors.${code}`)
  })
  it('no empty strings', () => {
    const values = (o: object): string[] => Object.values(o).flatMap(v => (typeof v === 'object' ? values(v) : [v]))
    for (const v of [...values(en), ...values(de)]) expect(v.trim()).not.toBe('')
  })
})
