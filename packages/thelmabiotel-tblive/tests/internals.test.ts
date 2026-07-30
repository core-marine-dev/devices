// installed
import { UNKNOWN } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { aggregate } from '../src/metadata'
import { buildSentence } from '../src/sentences'
import type { Match } from '../src/tokenizer'

// Guarantees for whoever extends this parser next. The public API cannot reach
// these paths today, but adding a sentence to the table can — and the contract is
// that nothing throws and nothing is invented.

describe('aggregators survive a degenerate payload', () => {
  test.each([
    'emitter',
    'receiver',
    'ping',
    'serial_number',
    'listening_mode',
    'log_interval',
    'time',
  ] as const)('%s given an empty payload', (id) => {
    expect(() => aggregate(id, [])).not.toThrow()
  })

  test('a lookup aggregator with no field returns nothing rather than a guess', () => {
    expect(aggregate('listening_mode', [])).toBeUndefined()
    expect(aggregate('log_interval', [])).toBeUndefined()
    expect(aggregate('time', [])).toBeUndefined()
  })

  test('an identity aggregator with no field falls back to unknown', () => {
    expect(aggregate('emitter', [])).toEqual({ receiver: UNKNOWN, emitter: UNKNOWN })
    expect(aggregate('ping', [])).toEqual({ receiver: UNKNOWN })
  })

  test('a sentence with no aggregator gets no payload metadata', () => {
    expect(aggregate('restart', [])).toBeUndefined()
    expect(aggregate(UNKNOWN, [])).toBeUndefined()
  })
})

describe('a token defined without fields degrades instead of throwing', () => {
  // `fields` is optional on TokenSpec because `$…\r` resolves its shape later. A
  // future token added without fields must not produce a broken CMA.
  const match: Match = {
    start: 0,
    end: 3,
    spec: { token: 'nofields', id: 'restart', mode: 'command', kind: 'literal', start: 'ZZ!' },
  }

  test('it becomes an unknown sentence with an empty payload', () => {
    const sentence = buildSentence('ZZ!', match, { timestamp: 1, firmware: UNKNOWN })
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.payload).toEqual([])
    expect(sentence.metadata?.mode).toBe('command')
  })
})
