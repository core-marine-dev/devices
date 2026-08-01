// installed
import { describe, expect, test } from 'vitest'

// coded
import { generator, hashSeed, seeded } from '../src/pseudorandom'

// A fake sentence has to be committable, so with no options it must be the same
// bytes every time. These specs pin that property, not the numbers themselves.

describe('hashSeed', () => {
  test('is stable and differs per label', () => {
    expect(hashSeed('GGA:0')).toBe(hashSeed('GGA:0'))
    expect(hashSeed('GGA:0')).not.toBe(hashSeed('GGA:1'))
    expect(hashSeed('')).toBeGreaterThan(0)
  })

  test('stays a 32-bit unsigned integer', () => {
    for (const label of ['', 'a', 'GGA', 'a very much longer label 12345']) {
      const hash = hashSeed(label)
      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThanOrEqual(0xFFFFFFFF)
    }
  })
})

describe('seeded', () => {
  test('the same seed replays the same sequence', () => {
    const first = seeded(42)
    const second = seeded(42)
    const a = [first(), first(), first()]
    const b = [second(), second(), second()]
    expect(a).toStrictEqual(b)
  })

  test('different seeds diverge', () => {
    expect(seeded(1)()).not.toBe(seeded(2)())
  })

  test('yields values in [0, 1)', () => {
    const next = seeded(7)
    for (let index = 0; index < 500; index++) {
      const value = next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  test('does not collapse to one value', () => {
    const next = seeded(99)
    const values = new Set(Array.from({ length: 50 }, () => next()))
    expect(values.size).toBe(50)
  })
})

describe('generator', () => {
  test('seeded by default — two generators for one label agree', () => {
    const a = generator('GGA:2')
    const b = generator('GGA:2')
    expect([a(), a()]).toStrictEqual([b(), b()])
  })

  test('random when asked — two generators disagree', () => {
    const a = generator('GGA:2', true)
    const b = generator('GGA:2', true)
    // 20 draws colliding would be ~2^-600; a single draw would be flaky.
    const draws = (next: () => number): number[] => Array.from({ length: 20 }, () => next())
    expect(draws(a)).not.toStrictEqual(draws(b))
  })
})
