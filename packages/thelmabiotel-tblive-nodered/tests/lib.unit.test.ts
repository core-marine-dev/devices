// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
import { TBLiveParser } from '@coremarine/thelmabiotel-tblive'

// coded
import { applyFirmware, applyMemory, cleanUndefined, getDefinition, getFakeSentence, getIds, parsePayload } from '../src/lib'

// The wrapper logic against a REAL parser — no node-red, no mocks. The integration
// test boots the actual runtime; this covers every msg handler and its error strings.

const parser = (): TBLiveParser => new TBLiveParser()

// The 1.0.1 datasheet's own example sentences (receiver-1.0.1.pdf S8.2.1 / S8.2.2).
const DETECTION = '$1000042,1589557202,615,S64K,1285,0,24,69,11\r'
const LOG = '$1000042,1589557600,TBR Sensor,297,15,29,69,6\r'

describe('memory', () => {
  test('get reports the current state and the buffer limit', () => {
    assert.deepEqual(applyMemory(parser(), { command: 'get' }), { memory: true, characters: 1024 })
  })

  test('set changes it and reports back', () => {
    const p = parser()
    assert.deepEqual(applyMemory(p, { command: 'set', payload: false }), { memory: false, characters: 1024 })
    assert.equal(p.memory, false)
  })

  test('absent input yields undefined, so the key stays off the output', () => {
    assert.equal(applyMemory(parser(), undefined), undefined)
    assert.equal(applyMemory(parser(), null as never), undefined)
  })

  test('a bad command or payload becomes an error string', () => {
    assert.equal(applyMemory(parser(), { command: 'nope' }), 'memory.command should be "get" or "set"')
    assert.equal(applyMemory(parser(), {}), 'memory.command should be "get" or "set"')
    assert.equal(applyMemory(parser(), { command: 'set', payload: 'yes' }), 'memory.payload should be boolean')
  })
})

describe('firmware', () => {
  test('get reports unknown until something proves it, plus the available ones', () => {
    assert.deepEqual(applyFirmware(parser(), { command: 'get' }), {
      firmware: 'unknown',
      firmwares: ['1.0.1', '1.0.2'],
    })
  })

  test('set pins it, and the pin reaches parsed output', () => {
    const p = parser()
    assert.deepEqual(applyFirmware(p, { command: 'set', payload: '1.0.2' }), {
      firmware: '1.0.2',
      firmwares: ['1.0.1', '1.0.2'],
    })
    assert.equal(p.parseData('FC=69')[0].protocol.version, '1.0.2')
  })

  test('the parser learns it from the stream without being told', () => {
    const p = parser()
    p.parseData('TBRC')
    assert.equal((applyFirmware(p, { command: 'get' }) as { firmware: string }).firmware, '1.0.2')
  })

  test('an unknown value is refused and lists the valid ones', () => {
    const p = parser()
    assert.equal(
      applyFirmware(p, { command: 'set', payload: '9.9.9' }),
      'firmware.payload should be one of: 1.0.1, 1.0.2',
    )
    assert.equal(p.firmware, 'unknown', 'the current firmware is kept')
  })

  test('setting it does NOT discard the buffer', () => {
    // Unlike a protocol switch: the firmware changes how a sentence is read, not how
    // the stream is framed, so a half-received sentence stays valid.
    const p = parser()
    p.addData('$1000042,1589557202,615')
    applyFirmware(p, { command: 'set', payload: '1.0.1' })
    assert.equal(p.buffer, '$1000042,1589557202,615')
    const sentences = p.parseData(',S64K,1285,0,24,69,11\r')
    assert.equal(sentences.length, 1)
    assert.equal(sentences[0].id, 'emitter')
  })

  test('absent input and bad commands', () => {
    assert.equal(applyFirmware(parser(), undefined), undefined)
    assert.equal(applyFirmware(parser(), { command: 'nope' }), 'firmware.command should be "get" or "set"')
    assert.equal(applyFirmware(parser(), {}), 'firmware.command should be "get" or "set"')
  })
})

describe('ids', () => {
  test('any truthy value lists every known sentence id', () => {
    const ids = getIds(parser(), true) as string[]
    assert.ok(Array.isArray(ids))
    assert.equal(ids.length, 17)
    assert.ok(ids.includes('emitter'))
    assert.ok(ids.includes('receiver'))
  })

  test('absent or false yields undefined', () => {
    assert.equal(getIds(parser(), undefined), undefined)
    assert.equal(getIds(parser(), false), undefined)
  })
})

describe('definition', () => {
  test('a bare id returns every firmware version', () => {
    const definitions = getDefinition(parser(), 'emitter') as { protocol: { version: string } }[]
    assert.equal(definitions.length, 2)
    assert.deepEqual(definitions.map((d) => d.protocol.version), ['1.0.1', '1.0.2'])
  })

  test('an object narrows to one protocol', () => {
    const definitions = getDefinition(parser(), { id: 'receiver', protocol: '1.0.2' }) as {
      payload: { name: string }[]
      mode: string
      description: string
    }[]
    assert.equal(definitions.length, 1)
    assert.equal(definitions[0].mode, 'listening')
    assert.equal(definitions[0].payload.length, 7)
    assert.ok(definitions[0].description.includes('Recognised by'), 'carries the wire prose')
  })

  test('it is CMA-shaped', () => {
    const definitions = getDefinition(parser(), { id: 'frequency', protocol: '1.0.1' }) as object[]
    assert.deepEqual(Object.keys(definitions[0]).sort((a, b) => a.localeCompare(b)), ['description', 'id', 'mode', 'payload', 'protocol'])
  })

  test('an unknown id or protocol becomes an error string', () => {
    assert.equal(getDefinition(parser(), 'nope'), 'Unknown sentence id: "nope"')
    assert.ok((getDefinition(parser(), { id: 'emitter', protocol: '9.9' }) as string).includes('Unknown protocol'))
  })

  test('a malformed request becomes an error string', () => {
    assert.equal(getDefinition(parser(), 42), 'definition must be a sentence id string, or { id, protocol? }')
    assert.equal(getDefinition(parser(), { id: 'emitter', protocol: 5 }), 'definition.protocol must be a string')
  })

  test('absent input yields undefined', () => {
    assert.equal(getDefinition(parser(), undefined), undefined)
  })
})

describe('fake', () => {
  test('it reproduces the datasheet example, and parses back clean', () => {
    const sentence = getFakeSentence(parser(), { id: 'emitter', protocol: '1.0.1' })
    assert.equal(sentence, DETECTION)
    const parsed = parser().parseData(sentence as string)
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].id, 'emitter')
    assert.equal(parsed[0].errors, undefined)
  })

  test('it is deterministic', () => {
    const p = parser()
    const first = getFakeSentence(p, { id: 'receiver', protocol: '1.0.1' })
    assert.equal(first, LOG)
    assert.equal(getFakeSentence(p, { id: 'receiver', protocol: '1.0.1' }), first)
  })

  test('the protocol genuinely changes the output', () => {
    assert.equal(getFakeSentence(parser(), { id: 'command', protocol: '1.0.1' }), 'LIVECM')
    assert.equal(getFakeSentence(parser(), { id: 'command', protocol: '1.0.2' }), 'TBRC')
  })

  test('options override individual fields', () => {
    const sentence = getFakeSentence(parser(), {
      id: 'emitter',
      protocol: '1.0.2',
      options: { receiverID: '100345', emitterID: '33280', frequency: 34 },
    })
    assert.equal(sentence, '$100345,1589557202,615,S64K,33280,0,24,34\r')
  })

  test('data: null asks for the empty field an ID-only protocol produces', () => {
    const sentence = getFakeSentence(parser(), {
      id: 'emitter',
      protocol: '1.0.2',
      options: { transmitProtocol: 'R64K', data: null },
    }) as string
    assert.equal(sentence, '$1000042,1589557202,615,R64K,1285,,24,69\r')
    assert.equal(parser().parseData(sentence)[0].payload[5].value, null)
  })

  test('a missing protocol is refused, and says what is valid', () => {
    assert.equal(
      getFakeSentence(parser(), { id: 'emitter' }),
      'fake.protocol is required and should be one of: 1.0.1, 1.0.2',
    )
  })

  test('the library errors are surfaced, joined', () => {
    assert.equal(getFakeSentence(parser(), { id: 'nope', protocol: '1.0.2' }), 'Unknown sentence id: "nope"')
    assert.equal(
      getFakeSentence(parser(), { id: 'emitter', protocol: '1.0.2', options: { sent: 11 } }),
      'Option \'sent\' applies to protocol 1.0.1 only',
    )
  })

  test('a malformed request becomes an error string', () => {
    assert.equal(getFakeSentence(parser(), 'emitter'), 'fake must be an object: { id, protocol, options? }')
    assert.equal(getFakeSentence(parser(), { id: 5, protocol: '1.0.2' }), 'fake.id must be a sentence id string')
    assert.equal(getFakeSentence(parser(), { id: 'emitter', protocol: '1.0.2', options: 'x' }), 'fake.options must be an object')
  })

  test('absent input yields undefined', () => {
    assert.equal(getFakeSentence(parser(), undefined), undefined)
  })
})

describe('payload', () => {
  test('a detection becomes a CMA array', () => {
    const sentences = parsePayload(parser(), DETECTION) as { id: string, protocol: { name: string, version: string } }[]
    assert.equal(sentences.length, 1)
    assert.equal(sentences[0].id, 'emitter')
    assert.deepEqual(sentences[0].protocol, { name: 'TBLive', version: '1.0.1' })
  })

  test('a log becomes a receiver CMA', () => {
    const sentences = parsePayload(parser(), LOG) as { id: string }[]
    assert.equal(sentences[0].id, 'receiver')
  })

  test('memory reassembles a sentence split across two messages', () => {
    // The receiver sends one character per millisecond, so this is routine.
    const p = parser()
    assert.deepEqual(parsePayload(p, DETECTION.slice(0, 12)), [])
    const sentences = parsePayload(p, DETECTION.slice(12)) as { id: string }[]
    assert.equal(sentences.length, 1)
    assert.equal(sentences[0].id, 'emitter')
  })

  test('line noise arrives as a garbage sentence rather than vanishing', () => {
    const sentences = parsePayload(parser(), 'not a sentence') as { id: string, errors: string[], raw: string }[]
    assert.equal(sentences.length, 1)
    assert.equal(sentences[0].id, 'unknown')
    assert.deepEqual(sentences[0].errors, ['Unrecognised input'])
    assert.equal(sentences[0].raw, 'not a sentence')
  })

  test('a non-string payload becomes an error string', () => {
    assert.equal(parsePayload(parser(), { input: 'invalid' }), 'payload must be an ASCII string')
    assert.equal(parsePayload(parser(), 42), 'payload must be an ASCII string')
  })

  test('absent input yields undefined', () => {
    assert.equal(parsePayload(parser(), undefined), undefined)
  })
})

describe('cleanUndefined', () => {
  test('it removes only the undefined keys', () => {
    const msg: Record<string, unknown> = { a: 1, b: undefined, c: null, d: false, e: '' }
    cleanUndefined(msg)
    assert.deepEqual(msg, { a: 1, c: null, d: false, e: '' })
  })
})
