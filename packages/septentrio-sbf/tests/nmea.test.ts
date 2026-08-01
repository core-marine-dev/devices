// installed
import { CMASchema } from '@coremarine/protocol-core'
import type { CMA, Field } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { SeptentrioParser } from '../src/parser'
import { SeptentrioNMEAParser } from '../src/protocol-nmea'

// The NMEA protocol layer: the six proprietary `$PSSN` sentences from Appendix C.1
// of the 4.10.1 reference guide, plus the standard sentences that come free from
// nmea-parser.
//
// FIVE of the six are ordinary comma-delimited NMEA and are plain YAML definitions.
// `SNC` is not: its payload is bracket-nested with one group per NTRIP connection,
// so its field count changes per message while definitions are matched by EXACT
// field count. It is decoded in code, and that is what most of this file tests.

// A correct NMEA checksum, so a failing decode is never a bad fixture.
const sentence = (body: string): string => {
  let checksum = 0
  for (const character of body) checksum ^= character.charCodeAt(0)
  return `$${body}*${checksum.toString(16).toUpperCase().padStart(2, '0')}\r\n`
}

const bytes = (text: string): Uint8Array => {
  const out = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index++) out[index] = text.charCodeAt(index)
  return out
}

const parse = (body: string): CMA => {
  const parser = new SeptentrioNMEAParser()
  const [cma] = parser.parseData(bytes(sentence(body)))
  return cma
}

const field = (cma: CMA, name: string): Field => {
  const found = cma.payload.find((entry) => entry.name === name)
  expect(found, `field ${name} exists`).toBeDefined()
  return found as Field
}

// Every sentence this layer produces has to be a VALID CMA — that is the constraint
// the whole design was built around, so it is asserted, not assumed.
const expectValidCMA = (cma: CMA): void => {
  const parsed = CMASchema.safeParse(cma)
  expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.errors)).toBe(true)
}

describe('$PSSN — the five fixed-shape sentences', () => {
  test('HRP: attitude with a standard deviation per axis', () => {
    const hrp = parse('PSSN,HRP,152135.00,180725,304.12,-1.25,2.34,0.21,0.35,0.28,14,4,3.5,E')
    expect(hrp.id).toBe('PSSNHRP')
    expect(hrp.protocol).toStrictEqual({ name: 'SEPTENTRIO NMEA', version: '4.10.1' })
    expect(hrp.payload).toHaveLength(13)
    expect(field(hrp, 'submessage_id').value).toBe('HRP')
    expect(field(hrp, 'heading').value as number).toBeCloseTo(304.12)
    expect(field(hrp, 'roll').value as number).toBeCloseTo(-1.25)
    expect(field(hrp, 'pitch_standard_deviation').value as number).toBeCloseTo(0.28)
    expect(field(hrp, 'mode_indicator').value).toBe(4)
    expect(field(hrp, 'magnetic_variation_direction').value).toBe('E')
    expectValidCMA(hrp)
  })

  test('HRP: mode 1 carries NO roll, and an empty roll is null — never level', () => {
    // Modes 1, 2 and 5 are heading+pitch solutions. A 0.0 here would be a lie of
    // exactly the kind that bit thelmabiotel-tblive.
    const hrp = parse('PSSN,HRP,152135.00,180725,304.12,,2.34,0.21,,0.28,14,1,3.5,E')
    expect(field(hrp, 'mode_indicator').value).toBe(1)
    expect(field(hrp, 'roll').value).toBeNull()
    expect(field(hrp, 'roll_standard_deviation').value).toBeNull()
    expect(field(hrp, 'pitch').value as number).toBeCloseTo(2.34)
  })

  test('RBD: where the base is, seen from the rover', () => {
    const rbd = parse('PSSN,RBD,152135.00,180725,182.5,-2.1,12,4,0,1.5,3001234,0042')
    expect(rbd.id).toBe('PSSNRBD')
    expect(rbd.payload).toHaveLength(11)
    expect(field(rbd, 'base_azimuth').value as number).toBeCloseTo(182.5)
    expect(field(rbd, 'quality_indicator').value).toBe(4)
    expect(field(rbd, 'base_motion_indicator').value).toBe(0)
    // A serial number is an identifier: a string, so leading zeros and the
    // firmware's inconsistent padding survive.
    expect(field(rbd, 'rover_serial_number').value).toBe('3001234')
    expect(field(rbd, 'base_station_id').value).toBe(42)
    expectValidCMA(rbd)
  })

  test('RBP and RBV share a field COUNT and are told apart by the subtype', () => {
    const rbp = parse('PSSN,RBP,152135.00,180725,10.5,-3.25,0.75,12,4,0,1.5,3001234,0042')
    const rbv = parse('PSSN,RBV,152135.00,180725,0.05,-0.02,0.01,12,4,0,1.5,3001234,0042')
    // 12 fields each — the resolver, not the length, decides which is which.
    expect(rbp.payload).toHaveLength(12)
    expect(rbv.payload).toHaveLength(12)
    expect(rbp.id).toBe('PSSNRBP')
    expect(rbv.id).toBe('PSSNRBV')
    expect(field(rbp, 'baseline_north').value as number).toBeCloseTo(10.5)
    expect(field(rbp, 'baseline_north').units).toBe('m')
    expect(field(rbv, 'baseline_north_rate').value as number).toBeCloseTo(0.05)
    expect(field(rbv, 'baseline_north_rate').units).toBe('m/s')
    expectValidCMA(rbp)
    expectValidCMA(rbv)
  })

  test('TFM: the values ARE RTCM message numbers, and null means "none used"', () => {
    // Appendix C.1.6's own example, checksum and all.
    const parser = new SeptentrioNMEAParser()
    const [tfm] = parser.parseData(bytes('$PSSN,TFM,104751.00,2,1021,1023,1025*5F\r\n'))
    expect(tfm.id).toBe('PSSNTFM')
    expect(tfm.payload).toHaveLength(6)
    expect(tfm.errors).toBeUndefined()
    expect(field(tfm, 'height_indicator').value).toBe(2)
    expect(field(tfm, 'message_1021_1022').value).toBe(1021)
    expect(field(tfm, 'message_1025_1026_1027').value).toBe(1025)
    expectValidCMA(tfm)

    const none = parse('PSSN,TFM,104751.00,,,,')
    expect(field(none, 'message_1021_1022').value).toBeNull()
    expect(field(none, 'height_indicator').value).toBeNull()
  })

  test('an unknown $PSSN subtype keeps its id instead of inventing a definition', () => {
    const unknown = parse('PSSN,XYZ,1,2,3,4,5')
    expect(unknown.id).toBe('PSSN')
  })
})

describe('$PSSN,SNC — the bracket-nested one', () => {
  // Appendix C.1.5's own example. Its printed checksum is WRONG (the guide says 68,
  // the sentence computes 4C), so the error is expected here — and the decode
  // happens anyway, exactly as it does for a corrupt PSXN.
  const GUIDE_EXAMPLE = '$PSSN,SNC,[0,379359000,1840,[1,2,0,0]]*68\r\n'

  const snc = (body: string): CMA => {
    const [cma] = new SeptentrioNMEAParser().parseData(bytes(sentence(body)))
    return cma
  }

  const submessages = (cma: CMA): Field[][] =>
    (cma.payload[1].metadata as { submessages: Field[][] }).submessages

  const scalars = (cma: CMA): Field[] =>
    (cma.payload[1].metadata as { fields: Field[] }).fields

  test('the guide example decodes, and the payload is TWO fields', () => {
    const [cma] = new SeptentrioNMEAParser().parseData(bytes(GUIDE_EXAMPLE))
    expect(cma.id).toBe('PSSNSNC')
    expect(cma.protocol).toStrictEqual({ name: 'SEPTENTRIO NMEA', version: '4.10.1' })
    expect(cma.payload).toHaveLength(2)
    expect(cma.payload[0].value).toBe('SNC')
    // Field 1 is the whole group, sliced from `raw` so the checksum still verifies
    // against it.
    expect(cma.payload[1].raw).toBe('[0,379359000,1840,[1,2,0,0]]')
    expect(cma.payload[1].type).toBe('string')
    expectValidCMA(cma)
  })

  test('the decoded values live in metadata, typed and named', () => {
    const [cma] = new SeptentrioNMEAParser().parseData(bytes(GUIDE_EXAMPLE))
    expect(scalars(cma)).toStrictEqual([
      { raw: '0', name: 'message_revision', type: 'uint8', value: 0 },
      { raw: '379359000', name: 'time_of_week', type: 'uint32', value: 379359000, units: 'ms' },
      { raw: '1840', name: 'week_number', type: 'uint16', value: 1840 },
    ])
    expect(submessages(cma)).toStrictEqual([[
      { raw: '1', name: 'cd_index', type: 'uint8', value: 1 },
      { raw: '2', name: 'status', type: 'uint8', value: 2 },
      { raw: '0', name: 'error_code', type: 'uint8', value: 0 },
      { raw: '0', name: 'info', type: 'uint8', value: 0 },
    ]])
  })

  // THE POINT OF THE WHOLE DESIGN: the payload shape does not move when the number
  // of NTRIP connections does.
  test('the payload stays TWO fields for 0, 1, 2 and 3 connections', () => {
    const counts = [
      ['PSSN,SNC,[0,379359000,1840]', 0],
      ['PSSN,SNC,[0,379359000,1840,[1,2,0,0]]', 1],
      ['PSSN,SNC,[0,379359000,1840,[1,2,0,0],[2,4,7,1]]', 2],
      ['PSSN,SNC,[0,379359000,1840,[1,2,0,0],[2,4,7,1],[3,1,0,0]]', 3],
    ] as const
    for (const [body, connections] of counts) {
      const cma = snc(body)
      expect(cma.payload, `${connections} connections`).toHaveLength(2)
      expect(submessages(cma)).toHaveLength(connections)
      expectValidCMA(cma)
    }
  })

  // The guide never says whether consecutive sub-messages are comma-separated, and
  // a depth-aware scan does not need to know — this is the test that makes the
  // undocumented separator a non-question.
  test('comma-separated, non-separated and MIXED sub-messages give the same result', () => {
    const withCommas = snc('PSSN,SNC,[0,379359000,1840,[1,2,0,0],[2,4,7,1],[3,1,0,0]]')
    const without = snc('PSSN,SNC,[0,379359000,1840,[1,2,0,0][2,4,7,1][3,1,0,0]]')
    const mixed = snc('PSSN,SNC,[0,379359000,1840,[1,2,0,0],[2,4,7,1][3,1,0,0]]')
    expect(submessages(without)).toStrictEqual(submessages(withCommas))
    expect(submessages(mixed)).toStrictEqual(submessages(withCommas))
    expect(scalars(without)).toStrictEqual(scalars(withCommas))
  })

  test('an unbalanced group is REFUSED — left generic, never half-decoded', () => {
    const truncated = snc('PSSN,SNC,[0,379359000,1840,[1,2')
    // Still the generic sentence: id unresolved, fields as split, nothing invented.
    expect(truncated.id).toBe('PSSN')
    expect(truncated.payload.length).toBeGreaterThan(2)
    expectValidCMA(truncated)
  })

  test('no brackets at all is refused too', () => {
    const flat = snc('PSSN,SNC,0,379359000,1840')
    expect(flat.id).toBe('PSSN')
  })

  test('a longer sub-message than documented is kept, not dropped', () => {
    // A future firmware adding a fifth field must not lose it silently.
    const extended = snc('PSSN,SNC,[0,379359000,1840,[1,2,0,0,99]]')
    const [first] = submessages(extended)
    expect(first).toHaveLength(5)
    expect(first[4]).toStrictEqual({ raw: '99', name: 'unknown_5', type: 'string', value: 99 })
  })
})

describe('the NMEA protocol through the device facade', () => {
  test('the facade parses NMEA when that protocol is selected', () => {
    const parser = new SeptentrioParser({ protocol: 'nmea' })
    const cma = parser.parseData(bytes(sentence('PSSN,HRP,152135.00,180725,304.12,-1.25,2.34,0.21,0.35,0.28,14,4,3.5,E')))
    expect(cma).toHaveLength(1)
    expect(cma[0].id).toBe('PSSNHRP')
  })

  test('the standard NMEA sentences come free with it', () => {
    const parser = new SeptentrioParser({ protocol: 'nmea' })
    // GGA and RMC are nmea-parser built-ins; a Septentrio box emits both.
    const cma = parser.parseData(bytes('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W,A*07\r\n'))
    expect(cma[0].id).toBe('RMC')
    expect(cma[0].payload).toHaveLength(12)
  })

  test('the introspection surface answers for the NMEA side too', () => {
    const parser = new SeptentrioParser({ protocol: 'nmea' })
    expect(parser.sentenceIds).toContain('PSSNHRP')
    expect(parser.sentenceIds).toContain('GGA')
    const definition = parser.getSentenceDefinition('PSSNHRP')
    expect(definition.success).toBe(true)
    if (!definition.success) return
    expect(definition.value[0].protocol.name).toBe('SEPTENTRIO NMEA')
  })

  test('a fake NMEA sentence comes back as BYTES, like the SBF side', () => {
    const parser = new SeptentrioParser({ protocol: 'nmea' })
    const fake = parser.getFakeSentence('PSSNHRP')
    expect(fake.success).toBe(true)
    if (!fake.success) return
    expect(fake.value).toBeInstanceOf(Uint8Array)
    // And it round-trips: what it fabricates, it can parse.
    const [reparsed] = parser.parseData(fake.value)
    expect(reparsed.id).toBe('PSSNHRP')
  })

  test('a sentence split across two chunks is carried by memory', () => {
    const parser = new SeptentrioParser({ protocol: 'nmea' })
    const whole = sentence('PSSN,TFM,104751.00,2,1021,1023,1025')
    expect(parser.parseData(bytes(whole.slice(0, 15)))).toStrictEqual([])
    const [cma] = parser.parseData(bytes(whole.slice(15)))
    expect(cma.id).toBe('PSSNTFM')
  })
})

// THE ONLY EVIDENCE THAT CAN CATCH A WRONG FIELD ORDER.
//
// A definition transcribed from a datasheet table parses a real sentence CLEANLY
// even when the order is wrong — right field count, right checksum, values simply
// landing under the wrong names. A fake round trip cannot catch it either, because
// it builds the frame from the same table it is checking. Only output from a real
// receiver can, so these fixtures are copied VERBATIM (checksum included, which is
// why `sentence()` is not used here — a fixture that had been retyped would not
// verify) from public captures found 2026-08-01:
//
//   * semuconsulting/pynmeagps  tests/septentriox5_nmea.log     — a Septentrio X5
//   * dup06087/autonomous_ship_controller  GNSS_processing/*    — a vessel, mode 2
//   * Jailander/localisation-1  mel_amcl/gps_logs/norway/*      — no attitude fix
//   * Team-Abhiyaan/mosaic_gnss_driver  test/data/nmea/*        — a mosaic
//
// Their checksums verifying against OUR computation is itself the cross-check:
// four unrelated receivers, one field order.
describe('real receiver output — captures, not datasheet tables', () => {
  const real = (raw: string): CMA => {
    const parser = new SeptentrioNMEAParser()
    const [cma] = parser.parseData(bytes(`${raw}\r\n`))
    expect(cma.errors, `${raw} decodes without error`).toBeUndefined()
    expectValidCMA(cma)
    return cma
  }

  test('HRP with every axis populated (Septentrio X5)', () => {
    const hrp = real('$PSSN,HRP,104751.00,230324,23.455,1.954,0.0125,0.123,0.0234,0.03765,11,0,4.56453,W*20')
    expect(hrp.id).toBe('PSSNHRP')
    expect(field(hrp, 'heading').value as number).toBeCloseTo(23.455)
    expect(field(hrp, 'roll').value as number).toBeCloseTo(1.954)
    expect(field(hrp, 'pitch').value as number).toBeCloseTo(0.0125)
    expect(field(hrp, 'heading_standard_deviation').value as number).toBeCloseTo(0.123)
    expect(field(hrp, 'roll_standard_deviation').value as number).toBeCloseTo(0.0234)
    expect(field(hrp, 'pitch_standard_deviation').value as number).toBeCloseTo(0.03765)
    expect(field(hrp, 'satellites').value).toBe(11)
    expect(field(hrp, 'magnetic_variation').value as number).toBeCloseTo(4.56453)
    expect(field(hrp, 'magnetic_variation_direction').value).toBe('W')
  })

  // The one that proves the ORDER rather than just the count: this receiver was in
  // mode 2, and it is the ROLL and the ROLL standard deviation that are empty —
  // fields 5 and 8. Had roll and pitch been swapped in the table, the gap would sit
  // on the wrong pair here.
  test('HRP in mode 2 leaves roll — and only roll — empty (vessel capture)', () => {
    const hrp = real('$PSSN,HRP,060851.00,110324,189.972,,0.135,0.495,,0.561,23,2,8.835,W*14')
    expect(field(hrp, 'mode_indicator').value).toBe(2)
    expect(field(hrp, 'roll').value).toBeNull()
    expect(field(hrp, 'roll_standard_deviation').value).toBeNull()
    expect(field(hrp, 'heading').value as number).toBeCloseTo(189.972)
    expect(field(hrp, 'pitch').value as number).toBeCloseTo(0.135)
    expect(field(hrp, 'pitch_standard_deviation').value as number).toBeCloseTo(0.561)
  })

  test('HRP with no attitude solution is all-null, never zeroes (Norway log)', () => {
    const hrp = real('$PSSN,HRP,151647.00,270519,,,,,,,00,0,,E*2B')
    for (const name of ['heading', 'roll', 'pitch', 'magnetic_variation']) {
      expect(field(hrp, name).value, `${name} is null`).toBeNull()
    }
    // Reported as 0 satellites on the wire — a real zero, unlike the nulls above.
    expect(field(hrp, 'satellites').value).toBe(0)
  })

  test('TFM, populated and empty (X5 and mosaic captures)', () => {
    const tfm = real('$PSSN,TFM,104751.00,2,1021,1023,1025*5F')
    expect(tfm.id).toBe('PSSNTFM')
    expect(field(tfm, 'height_indicator').value).toBe(2)
    expect(field(tfm, 'message_1021_1022').value).toBe(1021)
    expect(field(tfm, 'message_1025_1026_1027').value).toBe(1025)
    // No transformation in use: null per group, NOT message number zero.
    const none = real('$PSSN,TFM,123138.00,,,,*65')
    expect(field(none, 'message_1021_1022').value).toBeNull()
  })

  // Appendix C.1.5 prints checksum 68 for its own SNC example where the sentence
  // computes 4C. This capture ends *4C — the datasheet has the typo, not us.
  test('SNC with one and two NTRIP connections (X5 capture)', () => {
    const one = real('$PSSN,SNC,[0,379359000,1840,[1,2,0,0]]*4C')
    expect(one.id).toBe('PSSNSNC')
    expect(one.payload[1].metadata?.submessages as unknown[]).toHaveLength(1)
    const two = real('$PSSN,SNC,[0,379359123,1841,[1,2,0,0],[2,3,0,0]]*4A')
    expect(two.payload[1].metadata?.submessages as unknown[]).toHaveLength(2)
  })
})
