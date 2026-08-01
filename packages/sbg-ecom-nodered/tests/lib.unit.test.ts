// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
import { SBGParser, fromBase64 } from '@coremarine/sbg-ecom'
import type { CMA } from '@coremarine/sbg-ecom'

// coded
import { EKF_EULER, GGA, JUNK, UTC_TIME } from './samples'

import {
  applyFirmware,
  applyMemory,
  cleanUndefined,
  getDefinition,
  getFakeSentence,
  getIds,
  parsePayload,
  toInput,
} from '../src/lib'

/* The wrapper's PURE logic, against a real SBGParser. No node-red here — the RED
   adapter is exercised by wrapper.integration.test.ts, which boots the real runtime. */

const parser = (): SBGParser => new SBGParser()

const sentences = (value: unknown): CMA[] => {
  assert.ok(Array.isArray(value), `expected CMA[], got ${JSON.stringify(value)}`)
  return value as CMA[]
}

describe('toInput — what counts as input for a device speaking two protocols', () => {
  test('a Uint8Array (so a Buffer) goes straight through', () => {
    const bytes = fromBase64(EKF_EULER)
    assert.equal(toInput(bytes), bytes)
    // A node-red serial/TCP/file node hands you a Buffer, and a Buffer IS a Uint8Array.
    assert.ok(toInput(Buffer.from(bytes)) instanceof Uint8Array)
  })

  test('a base64 string is decoded', () => {
    const result = toInput(EKF_EULER)
    assert.ok(result instanceof Uint8Array)
    assert.equal(result.byteLength, 41)
  })

  test('a $-prefixed string is passed through as the SENTENCE, not as base64', () => {
    // This is the one input form septentrio's wrapper does not need: the device
    // interleaves plain NMEA with its binary frames, so both belong on one input.
    assert.equal(toInput(GGA), GGA)
  })

  test('an array of byte numbers is accepted, for JSON-only paths', () => {
    const result = toInput([255, 90, 6, 0])
    assert.ok(result instanceof Uint8Array)
    assert.deepEqual([...(result as Uint8Array)], [255, 90, 6, 0])
  })

  test('an array with a non-byte is refused with a reason', () => {
    assert.match(toInput([1, 2, 999]) as string, /byte values \(integers 0-255\)/)
    assert.match(toInput([1, 'a']) as string, /byte values/)
  })

  test('a string that is neither base64 nor a sentence is refused', () => {
    assert.match(toInput('not base64!!') as string, /must be base64 .* or an NMEA sentence/)
  })

  test('ASCII that happens to match the base64 alphabet decodes rather than erroring', () => {
    // 'abcd' is valid base64 by alphabet AND by length, so it decodes to three bytes.
    // Nothing can tell it apart from intent, and the result is honest: whatever those
    // bytes are, the parser will report them as garbage rather than pretend.
    const decoded = toInput('abcd')
    assert.ok(decoded instanceof Uint8Array)
    assert.equal((decoded as Uint8Array).byteLength, 3)
  })

  test('an empty string is empty input, not an error', () => {
    const decoded = toInput('')
    assert.ok(decoded instanceof Uint8Array)
    assert.equal((decoded as Uint8Array).byteLength, 0)
  })

  test('a base64-alphabet string of the WRONG length is refused', () => {
    // Five characters cannot be base64 — the round-trip check is what catches the class
    // of ASCII that would otherwise arrive as a flood of garbage sentences.
    assert.match(toInput('abcde') as string, /must be base64/)
  })

  test('anything else says what the field wants', () => {
    assert.match(toInput(42) as string, /payload must be a Buffer/)
    assert.match(toInput({}) as string, /payload must be a Buffer/)
  })
})

describe('parsePayload', () => {
  test('a real eCom frame comes back as CMA', () => {
    const result = sentences(parsePayload(parser(), EKF_EULER))
    assert.equal(result.length, 1)
    assert.equal(result[0].id, '0:6')
    assert.equal(result[0].metadata.name, 'SBG_ECOM_LOG_EKF_EULER')
    assert.equal(result[0].protocol.name, 'SBG ECOM')
  })

  test('a real NMEA sentence comes back as CMA from the same node', () => {
    const result = sentences(parsePayload(parser(), GGA))
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'GGA')
    assert.equal(result[0].protocol.name, 'NMEA')
  })

  test('junk is REPORTED, never dropped', () => {
    const result = sentences(parsePayload(parser(), JUNK))
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'unknown')
    assert.ok(result[0].errors !== undefined)
  })

  test('an absent payload leaves the key alone', () => {
    assert.equal(parsePayload(parser(), undefined), undefined)
    assert.equal(parsePayload(parser(), null), undefined)
  })

  test('a bad payload returns the error string, not an exception', () => {
    assert.match(parsePayload(parser(), 42) as string, /payload must be a Buffer/)
  })

  test('memory keeps a frame split across two messages', () => {
    const instance = parser()
    const bytes = fromBase64(EKF_EULER)
    assert.deepEqual(parsePayload(instance, bytes.subarray(0, 20)), [])
    const rest = sentences(parsePayload(instance, bytes.subarray(20)))
    assert.equal(rest[0].id, '0:6')
  })
})

describe('memory channel', () => {
  test('get reports the state and the limit in BYTES', () => {
    const report = applyMemory(parser(), { command: 'get' })
    // `bytes`, not `characters`: a whole frame must fit or it is flushed before its last
    // byte arrives. The three string wrappers report characters; this one cannot.
    assert.deepEqual(report, { memory: true, bytes: 4095 })
  })

  test('set changes it and reports back', () => {
    const instance = parser()
    assert.deepEqual(applyMemory(instance, { command: 'set', payload: false }), { memory: false, bytes: 4095 })
    assert.equal(instance.memory, false)
  })

  test('a bad command or payload explains itself', () => {
    assert.match(applyMemory(parser(), { command: 'nope' }) as string, /"get" or "set"/)
    assert.match(applyMemory(parser(), {}) as string, /"get" or "set"/)
    assert.match(applyMemory(parser(), { command: 'set', payload: 'yes' }) as string, /should be boolean/)
  })

  test('absent leaves the key alone', () => {
    assert.equal(applyMemory(parser(), undefined), undefined)
  })
})

describe('firmware channel', () => {
  test('get reports the active firmware and the ones this build knows', () => {
    assert.deepEqual(applyFirmware(parser(), { command: 'get' }), { firmware: '2.3', firmwares: ['2.3'] })
  })

  test('set accepts a modelled version', () => {
    const instance = parser()
    assert.deepEqual(applyFirmware(instance, { command: 'set', payload: '2.3' }), { firmware: '2.3', firmwares: ['2.3'] })
  })

  test('an unmodelled version is refused, not substituted', () => {
    const instance = parser()
    assert.match(applyFirmware(instance, { command: 'set', payload: '9.9' }) as string, /should be one of: 2\.3/)
    assert.equal(instance.firmware, '2.3')
  })

  test('the report carries `clock` once the device has told us the time', () => {
    const instance = parser()
    // Before: no clock at all, which is the answer to "why has my data no timestamp?".
    assert.equal((applyFirmware(instance, { command: 'get' }) as { clock?: unknown }).clock, undefined)
    instance.parseData(fromBase64(UTC_TIME))
    const report = applyFirmware(instance, { command: 'get' }) as { clock?: { uptime: number, utc: number } }
    assert.ok(report.clock !== undefined, 'a real UTC_TIME frame should teach the clock')
    assert.ok(report.clock.utc > 0)
  })
})

describe('ids channel', () => {
  test('any truthy value lists BOTH knowledge bases', () => {
    const ids = getIds(parser(), true)
    assert.ok(Array.isArray(ids))
    const ecom = ids.filter((id) => id.includes(':'))
    assert.equal(ecom.length, 34, 'all 34 class-0 logs')
    assert.ok(ids.includes('GGA'), 'and the NMEA ids')
  })

  test('absent or false leaves the key alone', () => {
    assert.equal(getIds(parser(), undefined), undefined)
    assert.equal(getIds(parser(), false), undefined)
  })
})

describe('definition channel', () => {
  test('an eCom id gets the RICHER answer, with the log name', () => {
    const result = getDefinition(parser(), '0:6')
    assert.ok(Array.isArray(result))
    const [definition] = result as { id: string, name: string, payload: { name: string }[] }[]
    assert.equal(definition.id, '0:6')
    // `name` is eCom's own key — the facade cannot promise it, so the wrapper asks the
    // eCom side directly. A flow debugging an SBG box wants the log name.
    assert.equal(definition.name, 'SBG_ECOM_LOG_EKF_EULER')
    assert.equal(definition.payload[0].name, 'TIME_STAMP')
  })

  test('an NMEA id is answered by nmea-parser', () => {
    const result = getDefinition(parser(), 'GGA')
    assert.ok(Array.isArray(result))
    assert.equal((result as { id: string }[])[0].id, 'GGA')
  })

  test('the object form takes a firmware', () => {
    const result = getDefinition(parser(), { id: '0:6', protocol: '2.3' })
    assert.ok(Array.isArray(result))
  })

  test('an unknown id returns the reason as a string', () => {
    assert.match(getDefinition(parser(), '0:99') as string, /not modelled/)
    assert.match(getDefinition(parser(), 'ZZZ') as string, /.+/)
  })

  test('a malformed request explains the shape', () => {
    assert.match(getDefinition(parser(), 42) as string, /must be a sentence id, or \{ id, protocol\? \}/)
    assert.match(getDefinition(parser(), { id: '0:6', protocol: 5 }) as string, /must be a firmware string/)
  })
})

describe('fake channel', () => {
  test('a bare id returns a Buffer that parses straight back', () => {
    const fake = getFakeSentence(parser(), '0:6')
    assert.ok(Buffer.isBuffer(fake), 'returned as a Buffer so node-red routes it as binary')
    const parsed = sentences(parsePayload(parser(), fake))
    assert.equal(parsed[0].id, '0:6')
    assert.equal(parsed[0].errors, undefined)
  })

  test('options are passed through', () => {
    const fake = getFakeSentence(parser(), { id: '0:6', options: { fields: { ROLL: 0.5 } } })
    assert.ok(Buffer.isBuffer(fake))
    const parsed = sentences(parsePayload(parser(), fake))
    const roll = parsed[0].payload.find((one) => one.name === 'ROLL')
    assert.ok(typeof roll?.value === 'number')
    assert.ok(Math.abs(roll.value - 0.5) < 1e-6)
  })

  test('the same request returns the same bytes, so it can live in a flow file', () => {
    assert.deepEqual(getFakeSentence(parser(), '0:8'), getFakeSentence(parser(), '0:8'))
  })

  test('an NMEA id fabricates a sentence too', () => {
    const fake = getFakeSentence(parser(), 'GGA')
    assert.ok(Buffer.isBuffer(fake))
  })

  test('a malformed request or unknown id returns a string', () => {
    assert.match(getFakeSentence(parser(), 42) as string, /must be a sentence id/)
    assert.match(getFakeSentence(parser(), { id: 6 }) as string, /fake\.id must be a sentence id/)
    assert.match(getFakeSentence(parser(), { id: '0:6', options: 'no' }) as string, /options must be an object/)
    assert.match(getFakeSentence(parser(), '0:99') as string, /No log/)
  })
})

describe('cleanUndefined', () => {
  test('drops only the keys whose handler returned undefined', () => {
    const msg: Record<string, unknown> = { payload: [1], memory: undefined, topic: 'keep', ids: undefined }
    cleanUndefined(msg)
    assert.deepEqual(Object.keys(msg), ['payload', 'topic'])
  })
})
