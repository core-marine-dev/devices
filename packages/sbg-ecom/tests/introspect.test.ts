// installed
import { describe, expect, test } from 'vitest'

// coded
import { CLASS_LOG_ECOM_0, PROTOCOL_NAME, SBGParser, logId } from '../src'

/* INTROSPECTION AND FAKE FRAMES.

   Both exist for DIAGNOSIS: these libraries run on remote installations with
   restricted internet access for years, so being able to ask the deployed binary what
   it expects — and to feed it a frame it built itself — settles questions that would
   otherwise need the datasheet.

   Per decision D9 there is NO protocol selector. An eCom id always contains a colon
   and an NMEA id never does, so both calls dispatch on the id itself. */

const parser = (): SBGParser => new SBGParser()

describe('sentenceIds covers both knowledge bases', () => {
  test('all 34 class-0 logs are there, as <class>:<message>', () => {
    const ids = parser().sentenceIds
    const ecom = ids.filter((id) => id.includes(':'))
    /* §2.3.1's own list has 34 entries for SBG_ECOM_CLASS_LOG_ECOM_0, and the 0.0.x
       parser implemented 25 of them. Both numbers were wrong in three places in the
       old docs (22, 24 and 25 for the same thing), so this assertion is the guard
       against the count drifting again — count §2.3.1, do not trust prose. */
    expect(ecom).toHaveLength(34)
    expect(ecom).toContain(logId(CLASS_LOG_ECOM_0, 6))
    // The nine the old parser was missing.
    for (const message of [24, 25, 26, 27, 28, 45, 46, 48, 49]) {
      expect(ecom).toContain(`0:${message}`)
    }
  })

  test('the NMEA ids ride along, and never collide with an eCom id', () => {
    const ids = parser().sentenceIds
    const nmea = ids.filter((id) => !id.includes(':'))
    expect(nmea).toContain('GGA')
    // This is what makes D9's "dispatch on the id" safe: the two sets are disjoint by
    // construction, because a colon cannot appear in an NMEA sentence id.
    expect(nmea.some((id) => id.includes(':'))).toBe(false)
  })
})

describe('getSentenceDefinition answers for either protocol', () => {
  test('an eCom id returns the field table', () => {
    const result = parser().getSentenceDefinition('0:6')
    expect(result.success).toBe(true)
    if (!result.success) return
    const [definition] = result.value
    expect(definition.id).toBe('0:6')
    expect(definition.protocol).toEqual({ name: PROTOCOL_NAME, version: '2.3' })
    expect(definition.payload.map((one) => one.name)).toEqual([
      'TIME_STAMP', 'ROLL', 'PITCH', 'YAW', 'ROLL_ACC', 'PITCH_ACC', 'YAW_ACC', 'SOLUTION_STATUS',
    ])
  })

  test('an NMEA id is answered by nmea-parser, without any setting', () => {
    const result = parser().getSentenceDefinition('GGA')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value[0].id).toBe('GGA')
  })

  test('getLogDefinition exposes the richer eCom shape the facade cannot promise', () => {
    const result = parser().getLogDefinition('0:5')
    expect(result.success).toBe(true)
    if (!result.success) return
    // `name` and `opaque` are eCom's own keys — a facade fronting two protocols can
    // only promise what both deliver, so they live on this method instead.
    expect(result.value[0].name).toBe('SBG_ECOM_LOG_MAG_CALIB')
    expect(result.value[0].payload).toHaveLength(2)
  })

  test('an opaque log says so', () => {
    const result = parser().getLogDefinition('0:31')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value[0].opaque).toBe(true)
    expect(result.value[0].payload).toEqual([])
  })

  test('the answer is exactly ONE entry — sbgECom has no revision concept', () => {
    // Septentrio returns one entry per block revision, which is why the shared
    // contract is an array. §2.1.1 gives sbgECom no revision field at all.
    const result = parser().getLogDefinition('0:6')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value).toHaveLength(1)
  })
})

describe('refusals are Results with a reason, never throws or nulls', () => {
  test('an unmodelled message in a modelled class', () => {
    const result = parser().getLogDefinition('0:99')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error[0].kind).toBe('unknown-log')
    expect(result.error[0].message).toMatch(/Message 99 is not modelled in class 0/)
  })

  test('an unmodelled class lists the ones that are modelled', () => {
    const result = parser().getLogDefinition('16:4')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error[0].message).toMatch(/modelled classes: 0 \(SBG_ECOM_CLASS_LOG_ECOM_0\)/)
  })

  test('a malformed id explains the shape instead of guessing', () => {
    for (const id of ['0:', ':6', '0:6:1', 'a:b', '0x0:6', '0:6.5']) {
      const result = parser().getLogDefinition(id)
      expect(result.success, id).toBe(false)
      if (result.success) continue
      expect(result.error[0].message).toMatch(/An eCom id is "<class>:<message>"/)
    }
  })

  test('an unsupported firmware is refused, not silently answered from the wrong table', () => {
    const result = parser().getSentenceDefinition('0:6', '9.9')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error[0].kind).toBe('unknown-firmware')
    expect(result.error[0].message).toMatch(/supported: 2\.3/)
  })

  test('the firmware setter never throws — an unknown value keeps the current one', () => {
    const instance = parser()
    instance.firmware = 'nonsense'
    expect(instance.firmware).toBe('2.3')
  })
})

describe('getFakeSentence round-trips through the parser', () => {
  test('every modelled log fabricates a frame that parses straight back', () => {
    const instance = parser()
    for (const id of instance.sentenceIds.filter((one) => one.includes(':'))) {
      const fake = instance.getFakeSentence(id)
      expect(fake.success, id).toBe(true)
      if (!fake.success) continue
      const [sentence] = new SBGParser().parseData(fake.value)
      // A real CRC and a real LEN, so it is indistinguishable from wire input.
      expect(sentence.errors, id).toBeUndefined()
      expect(sentence.id, id).toBe(id)
    }
  })

  test('a fake is IDEMPOTENT, so it can be committed into a flow or a spec', () => {
    const first = parser().getFakeSentence('0:8')
    const second = parser().getFakeSentence('0:8')
    expect(first.success && second.success).toBe(true)
    if (!first.success || !second.success) return
    expect([...first.value]).toEqual([...second.value])
  })

  test('random: true varies the fields but keeps the frame valid', () => {
    const fake = parser().getFakeSentence('0:6', undefined, { random: true })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = new SBGParser().parseData(fake.value)
    expect(sentence.errors).toBeUndefined()
    expect(sentence.payload.some((one) => one.value !== 0)).toBe(true)
  })

  test('field overrides are applied by NAME', () => {
    const fake = parser().getFakeSentence('0:6', undefined, { fields: { ROLL: 0.5, PITCH: -0.25 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = new SBGParser().parseData(fake.value)
    expect(sentence.payload.find((one) => one.name === 'ROLL')?.value).toBeCloseTo(0.5, 6)
    expect(sentence.payload.find((one) => one.name === 'PITCH')?.value).toBeCloseTo(-0.25, 6)
  })

  test('an NMEA id fabricates a sentence, returned as bytes', () => {
    const fake = parser().getFakeSentence('GGA')
    expect(fake.success).toBe(true)
    if (!fake.success) return
    // Bytes, because that is what this parser's addData takes — and it round-trips.
    const [sentence] = new SBGParser().parseData(fake.value)
    expect(sentence.id).toBe('GGA')
  })

  test('an unmodelled id is refused with a reason', () => {
    const fake = parser().getFakeSentence('0:99')
    expect(fake.success).toBe(false)
    if (fake.success) return
    expect(fake.error[0].kind).toBe('unknown-log')
  })
})

describe('large frames — decision D7', () => {
  const page = (options: { transmissionId?: number, pageIndex?: number, pages?: number, data?: Uint8Array }): Uint8Array => {
    const fake = parser().getFakeSentence('0:6', undefined, { large: options })
    if (!fake.success) throw new Error('could not fabricate a large frame')
    return fake.value
  }

  test('a page is ONE CMA, with the pagination in metadata and no reassembly', () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const [sentence] = new SBGParser().parseData(page({ transmissionId: 7, pageIndex: 1, pages: 3, data }))
    expect(sentence.errors).toBeUndefined()
    expect(sentence.metadata.large).toEqual({ transmissionId: 7, pageIndex: 1, pages: 3 })
  })

  test('the id has the large-frame bit MASKED OFF, so pages share a standard id', () => {
    // The flag is framing, not identity: page frames of class 0 must read '0:6', not
    // '128:6'.
    const [sentence] = new SBGParser().parseData(page({ pageIndex: 0, pages: 2 }))
    expect(sentence.id).toBe('0:6')
    expect(sentence.metadata.class).toMatchObject({ value: 0 })
  })

  test('the payload is exactly one string field holding the fragment as base64', () => {
    const data = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
    const [sentence] = new SBGParser().parseData(page({ data }))
    expect(sentence.payload).toHaveLength(1)
    const [field] = sentence.payload
    expect(field.name).toBe('DATA')
    expect(field.type).toBe('string')
    expect(field.value).toBe('3q2+7w==')
    // raw and value hold the same base64 deliberately — see src/protocol-ecom.ts.
    expect(field.raw).toBe(field.value)
  })

  test('a page is NOT decoded into the log field table', () => {
    // A page cuts at a fixed byte boundary and can split a field in half, so
    // publishing ROLL/PITCH/YAW from a fragment would be an invention.
    const [sentence] = new SBGParser().parseData(page({ data: new Uint8Array(32) }))
    expect(sentence.payload.map((one) => one.name)).toEqual(['DATA'])
  })

  test('LEN includes the 5-byte page header, so the frame still frames', () => {
    const data = new Uint8Array(10)
    const bytes = page({ data })
    // §2.1.2.2: "LEN ... including TX ID, PAGE IDX, NR PAGES and DATA fields."
    expect(new DataView(bytes.buffer).getUint16(4, true)).toBe(5 + data.byteLength)
    const parsed = new SBGParser().parseData(bytes)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].metadata.length).toMatchObject({ value: 15 })
  })

  test('pages of one transmission stay separate CMAs — nothing is held', () => {
    const instance = new SBGParser()
    const sentences = [
      ...instance.parseData(page({ transmissionId: 1, pageIndex: 0, pages: 2, data: new Uint8Array([1]) })),
      ...instance.parseData(page({ transmissionId: 1, pageIndex: 1, pages: 2, data: new Uint8Array([2]) })),
    ]
    // A lost page must never leave a transmission buffered forever, which is why
    // reassembly belongs to a layer that can time it out (cru's call, D7).
    expect(sentences).toHaveLength(2)
    expect(sentences.map((one) => (one.metadata.large as { pageIndex: number }).pageIndex)).toEqual([0, 1])
  })
})
