// installed
import { describe, expect, test } from 'vitest'

// coded
import { ValueSchema } from '../src/cma'
import { CharSchema, Int64Schema, TYPE_SCHEMAS, Uint8Schema, Uint64Schema } from '../src/schemas'

describe('field value schemas', () => {
  test('Uint8 accepts 0..255 and rejects out of range', () => {
    expect(Uint8Schema.is(200)).toBe(true)
    expect(Uint8Schema.is(256)).toBe(false)
    expect(Uint8Schema.is(-1)).toBe(false)
  })

  test('Char is a single-character string', () => {
    expect(CharSchema.is('A')).toBe(true)
    expect(CharSchema.is('AB')).toBe(false)
    expect(CharSchema.is('')).toBe(false)
  })

  test('64-bit integers are validated as decimal strings', () => {
    expect(Int64Schema.is('-9223372036854775808')).toBe(true)
    expect(Uint64Schema.is('18446744073709551615')).toBe(true)
    expect(Int64Schema.is('1.5')).toBe(false)
    expect(Uint64Schema.is('-1')).toBe(false)
  })
})

describe('CMA value union', () => {
  test('accepts string | number | boolean | null', () => {
    expect(ValueSchema.is('x')).toBe(true)
    expect(ValueSchema.is(42)).toBe(true)
    expect(ValueSchema.is(true)).toBe(true)
    expect(ValueSchema.is(null)).toBe(true)
  })

  test('rejects bigint (64-bit rides as string, keeping JSON safe)', () => {
    expect(ValueSchema.is(42n)).toBe(false)
  })
})

describe('TYPE_SCHEMAS lookup', () => {
  test('covers every CMA Type tag', () => {
    expect(Object.keys(TYPE_SCHEMAS).sort((a, b) => a.localeCompare(b))).toEqual([
      'boolean', 'char', 'float32', 'float64',
      'int16', 'int32', 'int64', 'int8',
      'string', 'uint16', 'uint32', 'uint64', 'uint8',
    ])
  })

  test('validates a value against its declared type', () => {
    expect(TYPE_SCHEMAS.uint8.is(200)).toBe(true)
    expect(TYPE_SCHEMAS.uint8.is(256)).toBe(false)
    expect(TYPE_SCHEMAS.char.is('N')).toBe(true)
  })
})
