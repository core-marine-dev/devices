// installed
import { describe, expect, test } from 'vitest'

// coded
import { SBGParser } from '../src'

/* THE PROPRIETARY NMEA SENTENCES OF §3.3.

   Every sentence below is the manual's OWN printed example, verbatim, with two
   exceptions that are marked where they appear. That matters: a fake round trip
   would prove nothing here, because the fake is built from the same field table it
   is then decoded with. The datasheet's example is the only independent witness,
   and all thirteen §3.3 examples were checksum-verified by computation before being
   used (unlike §3.2, where three do not compute).

   No capture in the corpus contains any of these sentences — the corpus has GGA,
   HDT and ZDA only — so the manual really is the only witness available. */

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const stream = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    stream.set(part, offset)
    offset += part.byteLength
  }
  return stream
}

/* `cma.metadata` is a LOOSE object at this layer: the facade fronts two protocols, so
   only the shared `timestamp` block is typed and nmea's own keys (checksum, talker)
   are not narrowed here. Reading one back in a spec therefore needs the shape stated. */
const talker = (metadata: Record<string, unknown>): string | undefined =>
  (metadata.talker as { value?: string } | undefined)?.value

const parse = (sentence: string) => new SBGParser().parseData(`${sentence}\r\n`)
const one = (sentence: string) => {
  const sentences = parse(sentence)
  expect(sentences).toHaveLength(1)
  return sentences[0]
}

// §3.3, verbatim.
const EXAMPLES = {
  PRDID: '$PRDID,-012.39,+002.14,366.91*7A',
  PASHR: '$PASHR,123816.80,312.95,T,-000.83,-000.42,-000.01,0.234,0.224,0.298,1,0*09',
  PSBGI: '$PSBGI,003944.74,-0.08,0.07,0.00,-0.02,0.06,-9.72,*42',
  PSBGB: '$PSBGB,1,000344.000,0,3.529,-12.821,6.122,0.101,0.098,10.117,0,0,0.004,0.050,2,0.772,0.004,-0.017,1.043,4.476,0.171,866.025,0,*53',
  PHINF: '$PHINF,08030027*7B',
  PHTRO: '$PHTRO,0.03,P,0.22,T*56',
  PHOCT: '$PHOCT,01,000201.000,E,00,356.592,E,+000.225,E,+00.039,E,+00.023,T,+00.023,+00.016,+00.003,+00.002,-00.001,+00.000,+0001.96*04',
  INDYN: '$INDYN,48.87949927,1.99962275,0.000,218.714,-0.909,0.291,-0.011,-0.073,-0.024,0.019*6A',
  GGK: '$PTNL,GGK,161159.00,013020,4854.61758182,N,00210.08881241,E,1,07,8.3,EHT140.509,M*75',
} as const

/* CONSTRUCTED, not from the manual: §3.3.10 prints the PHTRO example under PHLIN,
   so this sentence has no printed example at all. Field ORDER and count come from
   its table; the values are chosen, and the checksum is computed. */
const PHLIN = '$PHLIN,0.02,-0.01,0.03*4C'

describe('all nine parse, with the vendor as the protocol', () => {
  test.for([
    ['PRDID', EXAMPLES.PRDID, 'TELEDYNE RDI', 3],
    ['PASHR', EXAMPLES.PASHR, 'ASHTECH', 11],
    ['PSBGI', EXAMPLES.PSBGI, 'SBG NMEA', 8],
    ['PSBGB', EXAMPLES.PSBGB, 'SBG NMEA', 23],
    ['PHINF', EXAMPLES.PHINF, 'IXBLUE', 1],
    ['PHTRO', EXAMPLES.PHTRO, 'IXBLUE', 4],
    ['PHLIN', PHLIN, 'IXBLUE', 3],
    ['PHOCT', EXAMPLES.PHOCT, 'IXBLUE', 19],
    ['INDYN', EXAMPLES.INDYN, 'IXBLUE', 10],
  ] as const)('%s', ([id, raw, protocol, fields]) => {
    const sentence = one(raw)
    expect(sentence.id).toBe(id)
    expect(sentence.protocol.name).toBe(protocol)
    expect(sentence.payload).toHaveLength(fields)
    // The whole point of using the datasheet's example: it decodes CLEANLY.
    expect(sentence.errors).toBeUndefined()
    // Nothing was matched generically — every field carries its table's name.
    expect(sentence.payload.every((field) => field.name.length > 0)).toBe(true)
  })
})

describe('the two SBG sentences carry a TRAILING FIELD their tables do not list', () => {
  /* §3.3.4 lists 7 fields and §3.3.7 lists 22, but both printed examples end in a
     comma before the checksum — and the printed checksum only computes WITH that
     comma, in both sentences independently. Since definitions are matched by EXACT
     field count, a 7-field PSBGI definition would never match a real one, so this
     is the property the whole definition hinges on. */
  test('PSBGI is 8 fields, the last one empty', () => {
    const sentence = one(EXAMPLES.PSBGI)
    expect(sentence.payload).toHaveLength(8)
    expect(sentence.payload[7].name).toBe('reserved')
    expect(sentence.payload[7].raw).toBe('')
    expect(sentence.payload[7].value).toBeNull()
  })

  test('PSBGB is 23 fields, the last one empty', () => {
    const sentence = one(EXAMPLES.PSBGB)
    expect(sentence.payload).toHaveLength(23)
    expect(sentence.payload[22].name).toBe('reserved')
    expect(sentence.payload[22].value).toBeNull()
  })

  test('and dropping the trailing comma does NOT match the definition', () => {
    // Not a failure — the tier below it. The sentence still arrives, with its raw
    // and its values, just without the table's names. Nothing is silently lost.
    const sentence = one('$PSBGI,003944.74,-0.08,0.07,0.00,-0.02,0.06,-9.72*6C')
    expect(sentence.payload).toHaveLength(7)
    expect(sentence.protocol.name).not.toBe('SBG NMEA')
    expect(sentence.raw).toContain('$PSBGI')
  })
})

describe('PSBGI and PSBGB decode to the right quantities', () => {
  test('PSBGI reads the sensor frame, and Z accelerometer sees gravity', () => {
    const sentence = one(EXAMPLES.PSBGI)
    expect(sentence.payload[0].value).toBe('003944.74')
    expect(sentence.payload[1].value).toBeCloseTo(-0.08)
    expect(sentence.payload[4].value).toBeCloseTo(-0.02)
    // The physics check: a roughly level, stationary unit reads about -1 g on Z.
    expect(sentence.payload[6].value).toBeCloseTo(-9.72)
    expect(sentence.payload[6].units).toBe('m/s2')
  })

  test('PSBGB reads attitude, heave and velocity in order', () => {
    const sentence = one(EXAMPLES.PSBGB)
    const byName = (name: string) => sentence.payload.find((field) => field.name === name)?.value
    expect(byName('version')).toBe('1')
    expect(byName('roll')).toBeCloseTo(3.529)
    expect(byName('pitch')).toBeCloseTo(-12.821)
    expect(byName('heading')).toBeCloseTo(6.122)
    expect(byName('heave')).toBeCloseTo(0.004)
    // Fixed to 5 cm by the firmware, per §3.3.7 — and the example agrees.
    expect(byName('heave_standard_deviation')).toBeCloseTo(0.050)
    expect(byName('velocity_z')).toBeCloseTo(0.171)
    expect(byName('velocity_standard_deviation')).toBeCloseTo(866.025)
    expect(byName('velocity_status')).toBe(0)
  })
})

describe('PHINF — the 32-bit OCTANS status word', () => {
  /* 0x08030027 sets bits 0, 1, 2, 5, 16, 17 and 27, which is a coherent state:
     heading/roll/pitch not yet valid and HRP invalid WHILE still aligning, plus
     receive errors on serial ports A and B. */
  test('decodes to named flags at field AND payload level', () => {
    const sentence = one(EXAMPLES.PHINF)
    const field = sentence.payload[0]
    // The raw hex is what is on the wire, so it stays the value.
    expect(field.value).toBe('08030027')
    const status = field.metadata?.status as Record<string, boolean>
    expect(status.headingInvalid).toBe(true)
    expect(status.rollInvalid).toBe(true)
    expect(status.pitchInvalid).toBe(true)
    expect(status.alignment).toBe(true)
    expect(status.serialInAError).toBe(true)
    expect(status.serialInBError).toBe(true)
    expect(status.hrpInvalid).toBe(true)
    // Not set in this word.
    expect(status.heaveInitializing).toBe(false)
    expect(status.serialInCError).toBe(false)
    expect(status.sensorError).toBe(false)
    expect(status.restartSystem).toBe(false)
    // Mirrored at payload level, so device status has ONE read path.
    expect((sentence.metadata.payload as { status: unknown }).status).toEqual(status)
  })

  test('the undocumented bits are NOT invented', () => {
    // 4, 26, 28, 29 and 30 have no row in §3.3.8 (4 is explicitly reserved), so
    // 28 named flags is the whole set — a 29th would mean someone guessed one.
    const status = one(EXAMPLES.PHINF).payload[0].metadata?.status as Record<string, boolean>
    expect(Object.keys(status)).toHaveLength(27)
  })

  test('an all-ones word sets every flag it knows', () => {
    const status = one('$PHINF,FFFFFFFF*75').payload[0].metadata?.status as Record<string, boolean>
    expect(Object.values(status).every(Boolean)).toBe(true)
  })

  test('a short word still decodes — leading zeros are not required', () => {
    const status = one('$PHINF,0*45').payload[0].metadata?.status as Record<string, boolean>
    expect(Object.values(status).some(Boolean)).toBe(false)
  })

  test('a NON-HEX word is refused rather than decoded as NaN', () => {
    // The failure this guards: Number.parseInt('ZZZZ', 16) is NaN, and every
    // bitState(NaN, n) is false — a word of confidently wrong "all clear" flags.
    const sentence = one('$PHINF,ZZZZ*75')
    expect(sentence.payload[0].metadata?.status).toBeUndefined()
    expect(sentence.metadata.payload).toBeUndefined()
  })
})

describe('PASHR — one definition for two messages, by decision', () => {
  /* §3.3.5 (msg 02) and §3.3.6 (msg 12, "WASSP") are the same wire id with the same
     11 fields; only the heave SIGN differs, and nothing on the wire says which. cru's
     call, 2026-08-01: model it ONCE and state the ambiguity. These specs pin both
     halves of that — that both messages parse, and that the ambiguity is documented
     rather than silently resolved. */

  // §3.3.6's own populated example, verbatim. Same id, same field count, and its
  // heave is a THREE-decimal number where §3.3.5's is two — a formatting difference
  // that is deliberately NOT used to tell them apart, because it cannot be: both
  // null examples are byte-identical.
  const WASSP = '$PASHR,002258.15,320.99,T,+032.46,-008.15,-012.239,0.454,0.095,1.070,1,0*39'
  const NULL_EXAMPLE = '$PASHR,,,T,,,,,,,0,1*21'

  test('the PASHR example and the WASSP example both parse through it', () => {
    for (const raw of [EXAMPLES.PASHR, WASSP]) {
      const sentence = one(raw)
      expect(sentence.id).toBe('PASHR')
      expect(sentence.protocol.name).toBe('ASHTECH')
      expect(sentence.payload).toHaveLength(11)
      expect(sentence.errors).toBeUndefined()
    }
  })

  test('the null form is byte-identical between the two sections, and still parses', () => {
    // This IS the evidence that no resolver could separate them: the manual prints
    // this exact string, checksum included, under both §3.3.5 and §3.3.6.
    const sentence = one(NULL_EXAMPLE)
    expect(sentence.id).toBe('PASHR')
    expect(sentence.payload).toHaveLength(11)
    // Empty means "invalid", not zero — the distinction the field descriptions make.
    expect(sentence.payload[5].value).toBeNull()
    expect(sentence.payload[2].value).toBe('T')
    expect(sentence.payload[9].value).toBe(0)
    expect(sentence.payload[10].value).toBe(1)
  })

  test('the heave field DOCUMENTS the sign ambiguity instead of picking a side', () => {
    const heave = one(EXAMPLES.PASHR).payload[5]
    expect(heave.name).toBe('heave')
    expect(heave.value).toBeCloseTo(-0.01)
    expect(heave.units).toBe('m')
    // Both conventions named, both messages named, and the reason stated.
    expect(heave.description).toContain('CONFIGURATION-DEPENDENT')
    expect(heave.description).toContain('msg 02')
    expect(heave.description).toContain('msg 12')
    expect(heave.description).toMatch(/positive DOWN/i)
    expect(heave.description).toMatch(/positive UP/i)
  })

  test('the other attitude fields are NOT ambiguous', () => {
    // Only heave differs between the two messages; roll and pitch mean the same
    // thing in both, so their descriptions must not inherit the warning.
    const sentence = one(WASSP)
    const byName = (name: string) => sentence.payload.find((field) => field.name === name)
    expect(byName('roll')?.value).toBeCloseTo(32.46)
    expect(byName('pitch')?.value).toBeCloseTo(-8.15)
    expect(byName('roll')?.description).not.toContain('CONFIGURATION-DEPENDENT')
    expect(byName('pitch')?.description).not.toContain('CONFIGURATION-DEPENDENT')
  })
})

describe('the sign conventions that contradict SBG\'s own are in the descriptions', () => {
  /* Reading SBG's rendering beside norsub's is what found two wrong roll
     descriptions in the published norsub-emru@5.0.0, so these are pinned: a
     description silently reverting to the wrong axis is invisible to every other
     kind of test. */
  const description = (sentence: string, name: string): string => {
    const field = one(sentence).payload.find((candidate) => candidate.name === name)
    return field?.description ?? ''
  }

  test('PRDID roll is about the PORT side, not the bow', () => {
    expect(description(EXAMPLES.PRDID, 'roll')).toContain('PORT UP')
    expect(description(EXAMPLES.PRDID, 'pitch')).toContain('BOW UP')
  })

  test('PHTRO roll uses B/T and pitch uses M/P', () => {
    expect(description(EXAMPLES.PHTRO, 'roll_direction')).toContain('B: port down')
    expect(description(EXAMPLES.PHTRO, 'pitch_direction')).toContain('M: bow up')
  })

  test('PHLIN warns that sway and heave are reversed', () => {
    expect(description(PHLIN, 'sway')).toContain('REVERSED')
    expect(description(PHLIN, 'heave')).toContain('REVERSED')
    // Surge is NOT reversed — §3.3.10 names only the other two.
    expect(description(PHLIN, 'surge')).not.toContain('REVERSED')
  })

  test('PHOCT pitch is bow DOWN, the opposite of PSBGB and PRDID', () => {
    expect(description(EXAMPLES.PHOCT, 'pitch')).toContain('BOW DOWN')
    expect(description(EXAMPLES.PSBGB, 'pitch')).toContain('BOW UP')
  })

  test('INDYN pitch is reversed too, and its rates are not gyroscopes', () => {
    expect(description(EXAMPLES.INDYN, 'pitch')).toContain('REVERSED')
    expect(description(EXAMPLES.INDYN, 'heading_rate')).toContain('NOT a gyroscope')
  })
})

describe('two ids that could have gone wrong', () => {
  /* $INDYN has no `$P` prefix, and this device really does use the `IN` talker —
     the corpus contains $INGGA, $INHDT and $INZDA. So `INDYN` could plausibly be
     read as talker `IN` + sentence `DYN`. It is not, because the parser tries a
     DIRECT id lookup before stripping any talker; this pins that order. */
  test('INDYN is not mistaken for talker IN + DYN', () => {
    const sentence = one(EXAMPLES.INDYN)
    // THE id IS THE PROOF: a talker-stripped match would have produced `DYN`.
    expect(sentence.id).toBe('INDYN')
    expect(sentence.payload[0].name).toBe('latitude')
    expect(sentence.payload).toHaveLength(10)
    /* ⚠️ Pinned as a known ARTEFACT, not as desired behaviour: nmea-parser annotates
       `metadata.talker` from the first two characters of any id, so this sentence is
       labelled talker `IN` ("Integrated Navigation") even though its `IN` is part of
       the sentence name. Harmless — the definition matched directly and every field
       is correct — but a consumer switching on `metadata.talker` should know. That
       annotation is generic nmea-parser behaviour, so changing it is not this
       package's call. */
    expect(talker(sentence.metadata)).toBe('IN')
  })

  test('an IN-talker standard sentence still parses as itself', () => {
    // Proof the above is not achieved by breaking talker handling. Here the talker
    // IS a talker, so it is stripped from the id — which is why INDYN keeping its
    // full id above is meaningful.
    const sentence = one('$INHDT,182.28,T*23')
    expect(sentence.id).toBe('HDT')
    expect(talker(sentence.metadata)).toBe('IN')
  })

  /* §3.3.13 Trimble GGK is deliberately NOT defined here: nmea-parser already
     models it as PTNLGGK and resolves `$PTNL,GGK`. If that ever stops being true,
     this test says so rather than a user discovering an unparsed sentence. */
  test('GGK parses through nmea-parser, with no SBG definition of its own', () => {
    const sentence = one(EXAMPLES.GGK)
    expect(sentence.id).toBe('PTNLGGK')
    expect(sentence.protocol.name).not.toContain('SBG')
    expect(sentence.payload).toHaveLength(12)
    expect(sentence.errors).toBeUndefined()
    // The EHT prefix is why this field is a string in nmea-parser's table.
    expect(sentence.payload.find((field) => field.name === 'ellipsoidal_height')?.value).toBe('EHT140.509')
  })
})

describe('they arrive on the same wire as the binary frames', () => {
  test('a proprietary sentence between two eCom frames', () => {
    // §2.1.4: the NMEA half is NOT wrapped in eCom frames. A minimal EKF_EULER
    // frame either side of a $PSBGB proves the facade delimits text runs correctly
    // even when the text is one of the new definitions.
    const parser = new SBGParser()
    const frame = parser.getFakeSentence('0:6')
    expect(frame.success).toBe(true)
    if (!frame.success) return
    const bytes = frame.value
    const text = new TextEncoder().encode(`${EXAMPLES.PSBGB}\r\n`)
    const stream = concat(bytes, text, bytes)

    const sentences = parser.parseData(stream)
    expect(sentences).toHaveLength(3)
    expect(sentences[0].id).toBe('0:6')
    expect(sentences[1].id).toBe('PSBGB')
    expect(sentences[1].protocol.name).toBe('SBG NMEA')
    expect(sentences[2].id).toBe('0:6')
    expect(sentences.every((sentence) => sentence.errors === undefined)).toBe(true)
  })
})

describe('introspection covers the new sentences', () => {
  test('every new id is listed', () => {
    const ids = new SBGParser().sentenceIds
    for (const id of ['PRDID', 'PASHR', 'PSBGI', 'PSBGB', 'PHINF', 'PHTRO', 'PHLIN', 'PHOCT', 'INDYN']) {
      expect(ids).toContain(id)
    }
    /* PASHR appears ONCE. §3.3.6 WASSP is the same wire id with the same 11 fields,
       so a second definition would be a duplicate that no lookup could choose
       between — and `WASSP` is not an id, it is an sbgECom message name. */
    expect(ids.filter((id) => id === 'PASHR')).toHaveLength(1)
    expect(ids).not.toContain('WASSP')
  })

  test('a definition can be fetched and describes its fields', () => {
    const definition = new SBGParser().getSentenceDefinition('PHOCT')
    expect(definition.success).toBe(true)
    if (!definition.success) return
    // An ARRAY: one id can be defined by several protocols/revisions, so the shared
    // contract answers with every definition it has.
    expect(definition.value).toHaveLength(1)
    expect(definition.value[0].payload).toHaveLength(19)
    expect(definition.value[0].protocol.name).toBe('IXBLUE')
  })
})
