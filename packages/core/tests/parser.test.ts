// installed
import { describe, expect, test } from 'vitest'

// coded
import { StringParser } from '../src/parser'
import type { DraftCMA, ExtractedSentences } from '../src/types'

// Minimal concrete parser: newline-delimited sentences. Anything after the
// last newline is an incomplete sentence and becomes the remainder.
class LineParser extends StringParser {
  protected extractSentences(buffer: string): ExtractedSentences<string> {
    const parts = buffer.split('\n')
    const remainder = parts.pop() ?? ''
    const sentences: DraftCMA[] = parts.map((raw) => ({
      raw,
      timestamp: 0,
      id: raw,
      protocol: { name: 'test', version: '1.0' },
      payload: [],
    }))
    return { sentences, remainder }
  }
}

describe('Parser base contract', () => {
  test('parseData drains complete sentences and keeps the remainder buffered', () => {
    const parser = new LineParser()
    const sentences = parser.parseData('AAA\nBBB\nCC')
    expect(sentences.map((s) => s.id)).toEqual(['AAA', 'BBB'])
    expect(parser.buffer).toBe('CC')
  })

  test('a second call completes the buffered remainder (memory on)', () => {
    const parser = new LineParser({ memory: true })
    parser.parseData('AAA\nCC')
    const sentences = parser.parseData('DD\n')
    expect(sentences.map((s) => s.id)).toEqual(['CCDD'])
    expect(parser.buffer).toBe('')
  })

  test('memory off drops the previous buffer on each call', () => {
    const parser = new LineParser({ memory: false })
    parser.parseData('AAA\nCC')
    const sentences = parser.parseData('DD\n')
    expect(sentences.map((s) => s.id)).toEqual(['DD'])
  })

  test('parseData returns and clears the accumulated queue', () => {
    const parser = new LineParser()
    parser.addData('AAA\n')
    parser.addData('BBB\n')
    expect(parser.parseData().map((s) => s.id)).toEqual(['AAA', 'BBB'])
    expect(parser.parseData()).toEqual([])
  })

  test('core stamps metadata.timestamp on every emitted sentence', () => {
    const before = Date.now()
    const [sentence] = new LineParser().parseData('AAA\n')
    const after = Date.now()
    // received: when addData ran; bounded by this test's window.
    expect(sentence.metadata.timestamp.received).toBeGreaterThanOrEqual(before)
    expect(sentence.metadata.timestamp.received).toBeLessThanOrEqual(after)
    // parsed mirrors the draft's root timestamp (LineParser used 0).
    expect(sentence.metadata.timestamp.parsed).toBe(0)
    // no protocol sentence timestamp by default.
    expect(sentence.metadata.timestamp.sentence).toBeUndefined()
  })

  test('options: bufferLimit defaults and is settable', () => {
    const parser = new LineParser()
    expect(parser.bufferLimit).toBe(1024)
    parser.bufferLimit = 2048
    expect(parser.bufferLimit).toBe(2048)
  })

  test('setters never throw: an invalid assignment is discarded, the value is kept', () => {
    const parser = new LineParser({ memory: true, bufferLimit: 2048 })
    expect(() => {
      // @ts-expect-error — runtime guard against a bad (non-boolean) assignment
      parser.memory = 'nope'
    }).not.toThrow()
    expect(parser.memory).toBe(true)
    // -1 is a valid number to TS but not a natural: rejected at runtime, no throw
    expect(() => {
      parser.bufferLimit = -1
    }).not.toThrow()
    expect(parser.bufferLimit).toBe(2048)
  })
})
