// installed
import { UNKNOWN } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { FIRMWARES, LOG_INTERVALS, PROTOCOLS, TBLiveParser } from '../src/index'
import type { Firmware, SentenceId } from '../src/index'

const parser = (): TBLiveParser => new TBLiveParser()

const fake = (id: SentenceId, protocol: Firmware, options = {}): string => {
  const result = parser().getFakeSentence(id, protocol, options)
  if (!result.success) {
    throw new Error(`expected a sentence, got ${JSON.stringify(result.error)}`)
  }
  return result.value
}

// Every id the generator handles, paired with what it must parse back as.
const IDS: SentenceId[] = [
  'emitter', 'receiver', 'ping', 'clock_round', 'clock_set', 'command',
  'listening', 'serial_number', 'firmware', 'frequency', 'listening_mode',
  'log_interval', 'time', 'api', 'restart', 'reset', 'upgrade',
]

describe('the round trip — a fake sentence must parse back as itself', () => {
  const cases = FIRMWARES.flatMap((protocol) => IDS.map((id) => [id, protocol] as const))

  test.each(cases)('%s on %s', (id, protocol) => {
    const sentence = fake(id, protocol)
    const parsed = parser().parseData(sentence)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe(id)
    expect(parsed[0].raw).toBe(sentence)
    // The whole point: a generated fixture must be CLEAN.
    expect(parsed[0].errors).toBeUndefined()
  })

  test.each(cases)('%s on %s reports the right protocol version', (id, protocol) => {
    // Only sentences that carry firmware evidence can state it. The rest inherit
    // whatever the parser has learned, so pin it to make the assertion meaningful.
    const parsed = new TBLiveParser({ firmware: protocol }).parseData(fake(id, protocol))
    expect(parsed[0].protocol.version).toBe(protocol)
  })

  test('every id the parser advertises is fakeable', () => {
    expect(new Set(parser().sentenceIds)).toEqual(new Set(IDS))
  })
})

describe('it is deterministic', () => {
  test('the same call always returns the same string', () => {
    for (const protocol of FIRMWARES) {
      for (const id of IDS) {
        expect(fake(id, protocol)).toBe(fake(id, protocol))
      }
    }
  })

  test('two different parsers agree', () => {
    const a = new TBLiveParser().getFakeSentence('emitter', '1.0.1')
    const b = new TBLiveParser({ memory: false, bufferLimit: 99 }).getFakeSentence('emitter', '1.0.1')
    expect(a).toEqual(b)
  })
})

describe('the defaults reproduce the datasheets', () => {
  test('a 1.0.1 detection is the datasheet example verbatim', () => {
    // `receiver-1.0.1.pdf` §8.2.1
    expect(fake('emitter', '1.0.1')).toBe('$1000042,1589557202,615,S64K,1285,0,24,69,11\r')
  })

  test('a 1.0.1 log is the datasheet example verbatim', () => {
    // `receiver-1.0.1.pdf` §8.2.2
    expect(fake('receiver', '1.0.1')).toBe('$1000042,1589557600,TBR Sensor,297,15,29,69,6\r')
  })

  test('the 1.0.2 shapes drop the strings-sent field', () => {
    expect(fake('emitter', '1.0.2')).toBe('$1000042,1589557202,615,S64K,1285,0,24,69\r')
    expect(fake('receiver', '1.0.2')).toBe('$1000042,1589557600,TBR Sensor,297,15,29,69\r')
  })

  test('the protocol argument genuinely changes the output', () => {
    // 1.0.1 enters command mode with LIVECM, 1.0.2 with TBRC. This is why the
    // protocol is a mandatory argument rather than an option.
    expect(fake('command', '1.0.1')).toBe('LIVECM')
    expect(fake('command', '1.0.2')).toBe('TBRC')
    expect(fake('firmware', '1.0.1')).toBe('FV=1.0.1')
    expect(fake('firmware', '1.0.2')).toBe('FV=1.0.2')
  })

  test('the LM and LI defaults exist in their tables, so fixtures carry metadata', () => {
    const lm = parser().parseData(fake('listening_mode', '1.0.2'))[0]
    expect(lm.metadata.payload).toBeDefined()
    expect(PROTOCOLS[lm.payload[0].value as string]).toBeDefined()
    const li = parser().parseData(fake('log_interval', '1.0.2'))[0]
    expect(li.metadata.payload).toBeDefined()
    expect(LOG_INTERVALS[li.payload[0].value as keyof typeof LOG_INTERVALS]).toBeDefined()
  })

  test('the fake help dump keeps an interior token and is still one sentence', () => {
    const sentence = fake('api', '1.0.2')
    expect(sentence).toContain('EX!')
    const parsed = parser().parseData(sentence)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('api')
  })
})

describe('options override individual fields', () => {
  test('the emitter example from the API design', () => {
    const sentence = fake('emitter', '1.0.2', { receiverID: '100345', emitterID: '33280', frequency: 34 })
    expect(sentence).toBe('$100345,1589557202,615,S64K,33280,0,24,34\r')
    const parsed = parser().parseData(sentence)[0]
    expect(parsed.payload[0].value).toBe('100345')
    expect(parsed.payload[4].value).toBe('33280')
    expect(parsed.payload[7].value).toBe(34)
    expect(parsed.errors).toBeUndefined()
  })

  test('a numeric string keeps its padding', () => {
    expect(fake('emitter', '1.0.2', { receiverID: '001129' })).toContain('$001129,')
    expect(parser().parseData(fake('ping', '1.0.2', { receiverID: '001129' }))[0].payload[0].value).toBe('001129')
  })

  test('a number is accepted as well as a string', () => {
    expect(fake('frequency', '1.0.2', { frequency: 34 })).toBe('FC=34')
    expect(fake('frequency', '1.0.2', { frequency: '34' })).toBe('FC=34')
  })

  test('data: null asks for the empty field an ID-only protocol produces', () => {
    const sentence = fake('emitter', '1.0.2', { transmitProtocol: 'R64K', data: null })
    expect(sentence).toBe('$1000042,1589557202,615,R64K,1285,,24,69\r')
    const parsed = parser().parseData(sentence)[0]
    expect(parsed.payload[5].value).toBeNull()
    // A missing measurement, and still not an error.
    expect(parsed.errors).toBeUndefined()
  })

  test.each([
    [-30],
    ['-30'],
  ])('a negative temperature is allowed as %p — the raw value can be below zero', (temperature) => {
    const parsed = parser().parseData(fake('receiver', '1.0.2', { temperature }))[0]
    expect(parsed.payload[3].value).toBe(-30)
    expect(parsed.payload[3].metadata).toEqual({ raw: -30, celsius: -8 })
  })

  test('a non-integer temperature is rejected', () => {
    expect(parser().getFakeSentence('receiver', '1.0.2', { temperature: 1.5 }).success).toBe(false)
    expect(parser().getFakeSentence('receiver', '1.0.2', { temperature: '1.5' }).success).toBe(false)
  })

  test('an out-of-range frequency is generated without complaint', () => {
    // Shape, not plausibility: 34 kHz is outside 63-77 but that is the deployment's
    // business, not the generator's.
    expect(fake('frequency', '1.0.2', { frequency: 999 })).toBe('FC=999')
  })

  test('overriding every emitter field', () => {
    const sentence = fake('emitter', '1.0.1', {
      receiverID: 1, seconds: 2, milliseconds: 3, transmitProtocol: 'HS256',
      emitterID: 4, data: 5, snr: 6, frequency: 7, sent: 8,
    })
    expect(sentence).toBe('$1,2,3,HS256,4,5,6,7,8\r')
    expect(parser().parseData(sentence)[0].errors).toBeUndefined()
  })
})

describe('it reports which mistake was made, rather than returning null', () => {
  test('an unknown id', () => {
    const result = parser().getFakeSentence('nope' as SentenceId, '1.0.2')
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.map((entry) => entry.message)).toEqual(['Unknown sentence id: "nope"'])
  })

  test('an unknown protocol', () => {
    const result = parser().getFakeSentence('emitter', '9.9.9' as Firmware)
    expect(result.success).toBe(false)
    expect(result.success ? '' : result.error[0].message).toContain('Unknown protocol')
  })

  // The protocol version is MANDATORY here and deliberately so: an `emitter`
  // sentence differs between 1.0.1 and 1.0.2, so a fixture cannot be produced
  // without being told which one. `unknown` is not a shape, so it is refused
  // rather than silently resolved to one.
  test('`unknown` is not a usable protocol for generation', () => {
    expect(parser().getFakeSentence('emitter', UNKNOWN).success).toBe(false)
  })

  test('the two firmwares really do produce different sentences', () => {
    const older = parser().getFakeSentence('emitter', '1.0.1')
    const newer = parser().getFakeSentence('emitter', '1.0.2')
    expect(older.success && newer.success).toBe(true)
    if (!older.success || !newer.success) return
    expect(older.value).not.toBe(newer.value)
  })

  test('an option that does not belong to the id', () => {
    const result = parser().getFakeSentence('frequency', '1.0.2', { snr: 5 } as never)
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.map((entry) => entry.message)).toEqual(['Unknown option \'snr\' for \'frequency\''])
  })

  test('an option with the wrong shape', () => {
    const result = parser().getFakeSentence('emitter', '1.0.2', { frequency: 'abc' as never })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.map((entry) => entry.message)).toEqual(['Invalid option \'frequency\': "abc"'])
  })

  test('an option that belongs to the other firmware', () => {
    // `sent` exists only in 1.0.1 sentences.
    const result = parser().getFakeSentence('emitter', '1.0.2', { sent: 11 })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.map((entry) => entry.message)).toEqual(['Option \'sent\' applies to protocol 1.0.1 only'])
    expect(parser().getFakeSentence('emitter', '1.0.1', { sent: 11 }).success).toBe(true)
  })

  test('several mistakes are all reported at once', () => {
    const result = parser().getFakeSentence('emitter', '9.9.9' as Firmware, { nope: 1, snr: 'x' } as never)
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error).toHaveLength(3)
  })

  test('an explicitly undefined option is ignored, not rejected', () => {
    const result = parser().getFakeSentence('emitter', '1.0.2', { frequency: undefined })
    expect(result.success).toBe(true)
  })

  test('it never throws, whatever it is handed', () => {
    for (const bad of [null, 0, '', [], {}, () => 0]) {
      expect(() => parser().getFakeSentence(bad as SentenceId, bad as Firmware, bad as never)).not.toThrow()
    }
  })
})

describe('getSentenceDefinition — self-description for remote diagnosis', () => {
  test('omitting the protocol returns every version', () => {
    const result = parser().getSentenceDefinition('emitter')
    expect(result.success).toBe(true)
    const definitions = result.success ? result.value : []
    expect(definitions.map((d) => d.protocol.version)).toEqual([...FIRMWARES])
    // The field count is exactly what the firmware changes.
    expect(definitions.map((d) => d.payload.length)).toEqual([9, 8])
  })

  test('one entry PER FIRMWARE, even when the definition is identical', () => {
    // Deliberate (cru, 2026-07-30): 15 of the 17 ids do not vary by firmware, so
    // omitting `protocol` returns two entries differing only in `protocol.version`.
    // The duplication is kept so every entry is self-describing and callers need one
    // code path — and each description says "Identical on both documented firmwares",
    // which makes the repetition explain itself. Do not collapse this.
    for (const id of parser().sentenceIds) {
      const result = parser().getSentenceDefinition(id)
      expect(result.success).toBe(true)
      const definitions = result.success ? result.value : []
      expect(definitions, `${id}`).toHaveLength(FIRMWARES.length)
      expect(definitions.map((d) => d.protocol.version)).toEqual([...FIRMWARES])
    }
  })

  test('naming the protocol narrows to one, still as an array', () => {
    const result = parser().getSentenceDefinition('receiver', '1.0.2')
    expect(result.success).toBe(true)
    const definitions = result.success ? result.value : []
    expect(definitions).toHaveLength(1)
    expect(definitions[0].payload.map((f) => f.name)).toEqual([
      'receiver_serial_number', 'seconds', 'log', 'temperature',
      'noise_average', 'noise_peak', 'frequency',
    ])
  })

  test('it describes types, units and documented ranges', () => {
    const result = parser().getSentenceDefinition('emitter', '1.0.1')
    const fields = result.success ? result.value[0].payload : []
    const frequency = fields.find((f) => f.name === 'frequency')
    expect(frequency?.type).toBe('uint8')
    expect(frequency?.units).toBe('kHz')
    expect(frequency?.description).toContain('63-77')
    expect(fields.find((f) => f.name === 'receiver_serial_number')?.type).toBe('string')
  })

  test('it is CMA-shaped: id, protocol, payload, mode, description — and nothing a real parse would add', () => {
    const result = parser().getSentenceDefinition('emitter', '1.0.1')
    const definition = result.success ? result.value[0] : undefined
    expect(Object.keys(definition ?? {}).sort((a, b) => a.localeCompare(b)))
      .toEqual(['description', 'id', 'mode', 'payload', 'protocol'])
    expect(definition?.protocol).toEqual({ name: 'TBLive', version: '1.0.1' })
    // A definition has no data, so none of these belong to it.
    expect(definition).not.toHaveProperty('raw')
    expect(definition).not.toHaveProperty('timestamp')
    expect(definition).not.toHaveProperty('metadata')
    expect(definition).not.toHaveProperty('errors')
  })
})

describe('descriptions — prose carrying what a structured `wire` object would', () => {
  const description = (id: SentenceId, protocol?: Firmware): string => {
    const result = parser().getSentenceDefinition(id, protocol)
    return result.success ? (result.value[0].description ?? '') : ''
  }

  test('every sentence on every firmware has one', () => {
    for (const protocol of FIRMWARES) {
      for (const id of parser().sentenceIds) {
        expect(description(id, protocol).length, `${id} @ ${protocol}`).toBeGreaterThan(0)
      }
    }
  })

  test('every payload field has one', () => {
    for (const protocol of FIRMWARES) {
      for (const id of parser().sentenceIds) {
        const result = parser().getSentenceDefinition(id, protocol)
        const fields = result.success ? result.value[0].payload : []
        for (const field of fields) {
          expect(field.description, `${id} @ ${protocol} -> ${field.name}`).toBeDefined()
        }
      }
    }
  })

  test('it says how the sentence is recognised, per strategy', () => {
    expect(description('emitter', '1.0.1')).toContain('Recognised by `$` and terminated by `<CR>`')
    expect(description('restart', '1.0.1')).toContain('Recognised as the fixed literal `RR!`')
    expect(description('frequency', '1.0.1')).toContain('followed by exactly 2 digits')
    expect(description('serial_number', '1.0.1')).toContain('followed by 6 to 7 digits')
    expect(description('firmware', '1.0.1')).toContain('dotted version')
  })

  test('control characters are named, not embedded raw', () => {
    for (const protocol of FIRMWARES) {
      for (const id of parser().sentenceIds) {
        expect(description(id, protocol)).not.toContain('\r')
      }
    }
    expect(description('ping', '1.0.1')).toContain('`><><CR>`')
  })

  test('it says whether the firmware matters', () => {
    // The two mode-switch sentences are the case that would otherwise look identical
    // across firmwares once the structured wire form is gone.
    expect(description('command', '1.0.1')).toContain('`LIVECM`')
    expect(description('command', '1.0.2')).toContain('`TBRC`')
    expect(description('command', '1.0.1')).toContain('Firmware 1.0.1 only')
    expect(description('frequency', '1.0.1')).toContain('Identical on both documented firmwares')
  })

  test('a sample says what the other firmware sends', () => {
    expect(description('emitter', '1.0.2')).toContain('its 8 fields: firmware 1.0.1 sends 9')
    expect(description('receiver', '1.0.1')).toContain('its 8 fields: firmware 1.0.2 sends 7')
  })

  test('it carries the operational warnings from the datasheets', () => {
    expect(description('reset', '1.0.2')).toContain('DELETES')
    expect(description('upgrade', '1.0.2')).toContain('brick')
    expect(description('api', '1.0.2')).toContain('opaque')
  })

  test('it says which API the sentence belongs to', () => {
    const modes = (id: SentenceId): unknown[] => {
      const result = parser().getSentenceDefinition(id)
      return result.success ? result.value.map((d) => d.mode) : []
    }
    expect(modes('emitter')).toEqual(['listening', 'listening'])
    expect(modes('listening')).toEqual(['command', 'command'])
    expect(modes('command')).toEqual(['listening', 'listening'])
    expect(modes('upgrade')).toEqual(['update', 'update'])
  })

  test('every advertised id can be described', () => {
    for (const id of parser().sentenceIds) {
      const result = parser().getSentenceDefinition(id)
      expect(result.success, `${id} is not describable`).toBe(true)
    }
  })

  test('the description matches what the parser actually emits', () => {
    // The definition is only worth having if it is true, so check it against a
    // real parse rather than against itself.
    for (const protocol of FIRMWARES) {
      for (const id of ['emitter', 'receiver'] as const) {
        const described = parser().getSentenceDefinition(id, protocol)
        const names = described.success ? described.value[0].payload.map((f) => f.name) : []
        const parsed = parser().parseData(fake(id, protocol))[0]
        expect(parsed.payload.map((f) => f.name)).toEqual(names)
      }
    }
  })

  test('it reports an unknown id and an unknown protocol', () => {
    const badId = parser().getSentenceDefinition('nope' as SentenceId)
    expect(badId.success ? [] : badId.error.map((entry) => entry.message)).toEqual(['Unknown sentence id: "nope"'])
    const badProtocol = parser().getSentenceDefinition('emitter', '9.9.9' as Firmware)
    expect(badProtocol.success ? '' : badProtocol.error[0].message).toContain('Unknown protocol')
  })

  test('the returned fields are a copy, so a caller cannot corrupt the parser', () => {
    const first = parser().getSentenceDefinition('emitter', '1.0.1')
    if (first.success) {
      first.value[0].payload.length = 0
    }
    const second = parser().getSentenceDefinition('emitter', '1.0.1')
    expect(second.success ? second.value[0].payload.length : 0).toBe(9)
  })
})
