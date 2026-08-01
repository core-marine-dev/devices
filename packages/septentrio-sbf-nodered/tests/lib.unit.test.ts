// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
import { SeptentrioParser, toBase64 } from '@coremarine/septentrio-sbf'
import type { CMA } from '@coremarine/septentrio-sbf'

// coded
import {
  applyFirmware,
  applyMemory,
  applyProtocol,
  cleanUndefined,
  getDefinition,
  getFakeSentence,
  getIds,
  parsePayload,
  toBytes,
} from '../src/lib'

// The wrapper logic against a REAL SeptentrioParser — no node-red, no mocks. If the
// library changes shape underneath, these fail.

const parser = (): SeptentrioParser => new SeptentrioParser()

// A real AttEuler (5938) frame from a Septentrio receiver: attitude mode 1, so Roll and
// RollDot are at their Do-Not-Use value. Base64 because the wrapper accepts that form and
// a test file can hold it as text.
const ATT_EULER_BASE64 = 'JEC0kzIXLADQkPEW2AgHAAEAAADPsS5DPVAQwfkCldDvlEa++QKV0AxBoD4='
const attEuler = (): Buffer => Buffer.from(ATT_EULER_BASE64, 'base64')

describe('toBytes — the binary input channel', () => {
  test('a Buffer goes straight through, because that is what node-red delivers', () => {
    const bytes = attEuler()
    assert.equal(toBytes(bytes), bytes, 'the same object, not a copy')
  })

  test('a Uint8Array is accepted too', () => {
    const bytes = new Uint8Array([0x24, 0x40])
    assert.equal(toBytes(bytes), bytes)
  })

  test('a base64 string decodes, so a flow file can carry a frame as text', () => {
    const bytes = toBytes(ATT_EULER_BASE64)
    assert.ok(bytes instanceof Uint8Array)
    assert.deepEqual([...(bytes as Uint8Array).subarray(0, 2)], [0x24, 0x40], 'the SBF sync bytes')
    assert.equal((bytes as Uint8Array).byteLength, 44, 'the frame length AttEuler reports')
  })

  test('an array of byte numbers is accepted, for a JSON-only path', () => {
    const bytes = toBytes([0x24, 0x40, 0])
    assert.deepEqual([...(bytes as Uint8Array)], [0x24, 0x40, 0])
  })

  // The reason base64 is validated STRICTLY. An ASCII byte string can match the base64
  // alphabet, and silently decoding it would produce a flood of garbage sentences instead
  // of one clear message.
  test('a non-base64 string is refused with a message, not parsed as garbage', () => {
    assert.equal(toBytes('not base64!'), 'payload string must be base64 — binary SBF should arrive as a Buffer')
  })

  test('an array holding a non-byte is refused', () => {
    assert.equal(toBytes([0x24, 300]), 'payload array must contain byte values (integers 0-255)')
    assert.equal(toBytes([0x24, -1]), 'payload array must contain byte values (integers 0-255)')
    assert.equal(toBytes([0x24, 1.5]), 'payload array must contain byte values (integers 0-255)')
  })

  test('anything else says what it wanted', () => {
    assert.match(toBytes(42) as string, /^payload must be a Buffer of SBF bytes/)
    assert.match(toBytes({}) as string, /^payload must be a Buffer of SBF bytes/)
  })
})

describe('parsePayload', () => {
  test('a real frame decodes to CMA[]', () => {
    const result = parsePayload(parser(), attEuler()) as CMA[]
    assert.ok(Array.isArray(result))
    assert.equal(result.length, 1)
    assert.equal(result[0].id, '5938', 'the id is the block NUMBER')
    assert.equal(result[0].metadata.name, 'AttEuler', 'the name lives in metadata')
    assert.equal(result[0].errors, undefined)
  })

  test('the same frame as base64 gives the same result', () => {
    const fromBuffer = parsePayload(parser(), attEuler()) as CMA[]
    const fromBase64String = parsePayload(parser(), ATT_EULER_BASE64) as CMA[]
    assert.equal(fromBase64String[0].raw, fromBuffer[0].raw)
    assert.equal(fromBase64String[0].id, '5938')
  })

  test('an absent payload yields undefined, so the key is dropped', () => {
    assert.equal(parsePayload(parser(), undefined), undefined)
    assert.equal(parsePayload(parser(), null), undefined)
  })

  test('a bad payload comes back as the error string, not an exception', () => {
    assert.match(parsePayload(parser(), 42) as string, /^payload must be a Buffer/)
  })

  test('junk bytes produce a garbage sentence rather than nothing', () => {
    const result = parsePayload(parser(), [1, 2, 3, 0xFF]) as CMA[]
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'unknown')
    assert.deepEqual(result[0].payload, [])
    assert.ok(result[0].errors?.[0].includes('Unparseable data'))
  })

  // What a STRING means depends on the active protocol: the sentence itself on
  // `nmea`, base64 on `sbf`. A Buffer means bytes on both.
  describe('on the nmea protocol', () => {
    const HRP = '$PSSN,HRP,104751.00,230324,23.455,1.954,0.0125,0.123,0.0234,0.03765,11,0,4.56453,W*20\r\n'
    const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n'

    const nmeaParser = (): SeptentrioParser => {
      const instance = parser()
      instance.protocol = 'nmea'
      return instance
    }

    test('a plain sentence string is the sentence, not base64', () => {
      const result = parsePayload(nmeaParser(), HRP) as CMA[]
      assert.equal(result.length, 1)
      assert.equal(result[0].id, 'PSSNHRP')
      assert.equal(result[0].protocol.name, 'SEPTENTRIO NMEA')
      assert.equal(result[0].errors, undefined)
    })

    test('several sentences in one string all come back', () => {
      const result = parsePayload(nmeaParser(), HRP + GGA) as CMA[]
      assert.equal(result.length, 2)
      assert.deepEqual(result.map((cma) => cma.protocol.name), ['SEPTENTRIO NMEA', 'NMEA'])
    })

    // The reason bytes stay accepted here: a serial node emits Buffers whichever
    // protocol the receiver is configured for, so switching must not break a flow.
    test('a Buffer of the same ASCII gives the same result', () => {
      const fromString = parsePayload(nmeaParser(), HRP) as CMA[]
      const fromBuffer = parsePayload(nmeaParser(), Buffer.from(HRP, 'ascii')) as CMA[]
      assert.equal(fromBuffer[0].id, fromString[0].id)
      assert.equal(fromBuffer[0].raw, fromString[0].raw)
    })

    test('the error message asks for a sentence, not for base64', () => {
      assert.match(parsePayload(nmeaParser(), 42) as string, /^payload should be the NMEA sentence/)
    })
  })
})

describe('applyMemory', () => {
  test('get reports the flag and the limit in BYTES', () => {
    const report = applyMemory(parser(), { command: 'get' })
    assert.deepEqual(report, { memory: true, bytes: 65535 })
  })

  // The buffer limit is reported in bytes, not characters, and the default is the largest
  // a single SBF block can be. That matters: framing is length-prefixed, so a block only
  // decodes once its last byte arrives, and real blocks run past 1000 bytes.
  test('the reported limit is the whole-block default, not the text-protocol one', () => {
    const report = applyMemory(parser(), { command: 'get' }) as { bytes: number }
    assert.equal(report.bytes, 65535)
    assert.notEqual(report.bytes, 1024)
  })

  test('set changes it and reports back', () => {
    const device = parser()
    assert.deepEqual(applyMemory(device, { command: 'set', payload: false }), { memory: false, bytes: 65535 })
    assert.equal(device.memory, false)
  })

  test('a bad command or payload is an error string', () => {
    assert.equal(applyMemory(parser(), { command: 'nope' }), 'memory.command should be "get" or "set"')
    assert.equal(applyMemory(parser(), {}), 'memory.command should be "get" or "set"')
    assert.equal(applyMemory(parser(), { command: 'set', payload: 'yes' }), 'memory.payload should be boolean')
  })

  test('absent input yields undefined', () => {
    assert.equal(applyMemory(parser(), undefined), undefined)
  })
})

describe('applyFirmware', () => {
  test('get reports the active knowledge base and the ones this build has', () => {
    assert.deepEqual(applyFirmware(parser(), { command: 'get' }), { firmware: '4.10.1', firmwares: ['4.10.1'] })
  })

  // `reported` and `leapSeconds` are absent until the receiver proves them, rather than
  // being guessed at — so their absence is itself information.
  test('reported and leapSeconds are absent until the device says otherwise', () => {
    const report = applyFirmware(parser(), { command: 'get' }) as unknown as Record<string, unknown>
    assert.ok(!('reported' in report), 'nothing has told us what the box runs')
    assert.ok(!('leapSeconds' in report), 'no ReceiverTime block seen yet')
  })

  test('set accepts a modelled firmware', () => {
    const device = parser()
    assert.deepEqual(applyFirmware(device, { command: 'set', payload: '4.10.1' }), { firmware: '4.10.1', firmwares: ['4.10.1'] })
  })

  // The library refuses an unmodelled firmware rather than substituting one, and the
  // wrapper says which ones exist instead of failing silently.
  test('set refuses an unmodelled firmware and lists the real ones', () => {
    const device = parser()
    assert.equal(applyFirmware(device, { command: 'set', payload: '9.9.9' }), 'firmware.payload should be one of: 4.10.1')
    assert.equal(device.firmware, '4.10.1', 'the active knowledge base is unchanged')
  })

  test('a bad command is an error string', () => {
    assert.equal(applyFirmware(parser(), { command: 'nope' }), 'firmware.command should be "get" or "set"')
  })
})

describe('applyProtocol', () => {
  test('get reports the active protocol and every one the device can speak', () => {
    assert.deepEqual(applyProtocol(parser(), { command: 'get' }), { protocol: 'sbf', protocols: ['sbf', 'nmea'] })
  })

  test('set accepts sbf', () => {
    assert.deepEqual(applyProtocol(parser(), { command: 'set', payload: 'sbf' }), { protocol: 'sbf', protocols: ['sbf', 'nmea'] })
  })

  // A Septentrio box can be configured for NMEA output instead of SBF, so the
  // selector really switches the framing rules the node applies to its input.
  test('set accepts nmea, and the node then parses NMEA', () => {
    const node = parser()
    assert.deepEqual(applyProtocol(node, { command: 'set', payload: 'nmea' }), { protocol: 'nmea', protocols: ['sbf', 'nmea'] })
    const sentences = node.parseData(Buffer.from('$PSSN,TFM,104751.00,2,1021,1023,1025*5F\r\n', 'ascii'))
    assert.equal(sentences.length, 1)
    assert.equal(sentences[0].id, 'PSSNTFM')
  })

  test('set refuses anything else and lists what is available', () => {
    assert.equal(applyProtocol(parser(), { command: 'set', payload: 'rtcm' }), 'protocol.payload should be one of: sbf, nmea')
  })
})

describe('getIds', () => {
  test('a truthy value lists every block this parser knows', () => {
    const ids = getIds(parser(), true) as string[]
    assert.equal(ids.length, 108, 'all 108 blocks of Appendix B')
    assert.ok(ids.includes('5938'), 'AttEuler')
    assert.ok(ids.includes('4027'), 'MeasEpoch')
    // Ids are STRINGS, matching what a parsed CMA carries, so a flow can compare directly.
    assert.ok(ids.every((id) => typeof id === 'string'))
  })

  test('absent or false yields undefined', () => {
    assert.equal(getIds(parser(), undefined), undefined)
    assert.equal(getIds(parser(), false), undefined)
  })
})

describe('getDefinition', () => {
  test('a NUMBER is accepted, because an SBF id is a number on the wire', () => {
    const definition = getDefinition(parser(), 5938) as unknown as { id: string, name: string }[]
    assert.equal(definition.length, 1)
    assert.equal(definition[0].id, '5938')
    assert.equal(definition[0].name, 'AttEuler')
  })

  test('a string id works too, and gives the same answer', () => {
    const byNumber = getDefinition(parser(), 5938)
    const byString = getDefinition(parser(), '5938')
    assert.deepEqual(byString, byNumber)
  })

  // The per-revision split is the point: a receiver generation only sends the fields its
  // revision defines, so PVTGeodetic's three revisions are three different field lists.
  test('a multi-revision block returns ONE ENTRY PER REVISION', () => {
    const definition = getDefinition(parser(), 4007) as unknown as { revision: number, payload: unknown[] }[]
    assert.equal(definition.length, 3, 'PVTGeodetic has revisions 0, 1 and 2')
    assert.deepEqual(definition.map((entry) => entry.revision), [0, 1, 2])
    // Each revision ADDS fields (§4.1.6), so the lists grow.
    assert.ok(definition[1].payload.length > definition[0].payload.length)
    assert.ok(definition[2].payload.length > definition[1].payload.length)
  })

  test('{ id, protocol } selects the knowledge base', () => {
    const definition = getDefinition(parser(), { id: 5938, protocol: '4.10.1' }) as { protocol: { version: string } }[]
    assert.equal(definition[0].protocol.version, '4.10.1')
  })

  test('an unknown block is an error string naming the firmware', () => {
    assert.equal(getDefinition(parser(), 1234), 'Block 1234 is not modelled for firmware 4.10.1')
  })

  test('an unsupported firmware is refused rather than answered from the wrong table', () => {
    assert.match(getDefinition(parser(), { id: 5938, protocol: '9.9.9' }) as string, /^Firmware "9\.9\.9" is not supported/)
  })

  test('a malformed request says what it wanted', () => {
    assert.equal(getDefinition(parser(), {}), 'definition must be a block number, or { id, protocol? }')
    assert.equal(getDefinition(parser(), { id: 5938, protocol: 7 }), 'definition.protocol must be a firmware string')
  })

  test('absent input yields undefined', () => {
    assert.equal(getDefinition(parser(), undefined), undefined)
  })
})

describe('getFakeSentence', () => {
  test('a block number gives a real frame, as a Buffer for node-red', () => {
    const frame = getFakeSentence(parser(), 5938)
    assert.ok(Buffer.isBuffer(frame), 'a Buffer, the type node-red routes binary as')
    assert.equal((frame as Buffer).byteLength, 44)
    assert.deepEqual([...(frame as Buffer).subarray(0, 2)], [0x24, 0x40], 'real sync bytes')
  })

  // The whole point of a fake frame: it carries a real CRC and a real Length, so it parses
  // straight back. That is what makes it usable as a committed example flow input.
  test('the frame round-trips through the parser with no errors', () => {
    const frame = getFakeSentence(parser(), 5938) as Buffer
    const parsed = parsePayload(parser(), frame) as CMA[]
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].id, '5938')
    assert.equal(parsed[0].metadata.name, 'AttEuler')
    assert.equal(parsed[0].errors, undefined, 'a real CRC, so no CRC error')
  })

  // Idempotent by design, because a fixture that drifts cannot be committed.
  test('the same request returns the same bytes every time', () => {
    const first = getFakeSentence(parser(), 5938) as Buffer
    const second = getFakeSentence(parser(), 5938) as Buffer
    assert.equal(first.toString('base64'), second.toString('base64'))
  })

  test('options select a revision and override fields by name', () => {
    const frame = getFakeSentence(parser(), { id: 4007, options: { revision: 2, fields: { NrSV: 12 } } }) as Buffer
    const parsed = parsePayload(parser(), frame) as CMA[]
    assert.equal(parsed[0].metadata.revision, 2)
    const nrSV = parsed[0].payload.find((field: { name: string }) => field.name === 'NrSV')
    assert.equal(nrSV?.value, 12)
  })

  test('random: true varies the filler but stays reproducible', () => {
    const zeros = getFakeSentence(parser(), 5938) as Buffer
    const varied = getFakeSentence(parser(), { id: 5938, options: { random: true } }) as Buffer
    assert.notEqual(varied.toString('base64'), zeros.toString('base64'))
    const again = getFakeSentence(parser(), { id: 5938, options: { random: true } }) as Buffer
    assert.equal(again.toString('base64'), varied.toString('base64'), 'seeded, so still reproducible')
  })

  test('an unknown block is an error string', () => {
    assert.match(getFakeSentence(parser(), 1234) as string, /is not modelled/)
  })

  test('a malformed request says what it wanted', () => {
    assert.equal(getFakeSentence(parser(), { id: 5938, options: 'nope' }), 'fake.options must be an object')
    assert.equal(getFakeSentence(parser(), true), 'fake must be a block number, or { id, protocol?, options? }')
  })
})

describe('the msg contract', () => {
  test('cleanUndefined drops keys whose input was absent', () => {
    const msg: Record<string, unknown> = { payload: [], memory: undefined, firmware: undefined, topic: 'keep' }
    cleanUndefined(msg)
    assert.deepEqual(Object.keys(msg), ['payload', 'topic'])
  })

  // Control channels are applied before the payload in parser.ts, so one message can
  // reconfigure and feed data at once. This is the logic-level check of that ordering.
  // With memory OFF each message REPLACES the buffer, so a frame split across two
  // messages is lost — which is why the node ships with memory on and the editor says so.
  test('memory off loses a frame that arrives split', () => {
    const device = parser()
    applyMemory(device, { command: 'set', payload: false })
    const frame = attEuler()
    assert.deepEqual(parsePayload(device, frame.subarray(0, 20)), [], 'nothing yet')
    const second = parsePayload(device, frame.subarray(20)) as CMA[]
    // The head was thrown away when the tail arrived, so the tail alone is junk.
    assert.ok(second.every((cma) => cma.id === 'unknown'), 'no AttEuler — the head is gone')
  })

  test('memory on carries a split frame across messages', () => {
    const device = parser()
    const frame = attEuler()
    const first = parsePayload(device, frame.subarray(0, 20)) as CMA[]
    assert.deepEqual(first, [], 'nothing yet — the block is not complete')
    const second = parsePayload(device, frame.subarray(20)) as CMA[]
    assert.equal(second.length, 1, 'the tail completed it')
    assert.equal(second[0].id, '5938')
    assert.equal(second[0].errors, undefined)
  })

  // The base64 channel closes the diagnostic loop: what comes out as `raw` can go back in
  // as `payload`. Worth pinning, because it is the reason strings are accepted at all.
  test('a CMA raw can be injected back as payload', () => {
    const parsed = parsePayload(parser(), attEuler()) as CMA[]
    const reparsed = parsePayload(parser(), parsed[0].raw) as CMA[]
    assert.equal(reparsed[0].raw, parsed[0].raw)
    assert.equal(reparsed[0].id, parsed[0].id)
    // And the same holds for a frame built by toBase64 from the library.
    const again = parsePayload(parser(), toBase64(attEuler())) as CMA[]
    assert.equal(again[0].id, '5938')
  })
})
