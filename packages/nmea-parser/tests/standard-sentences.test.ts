// installed
import { describe, expect, test } from 'vitest'

// coded
import { NMEAParser } from '../src/parser'
import type { CMA, Field } from '../src/types'

// The sentences added to the knowledge base for the Septentrio work: the standard
// NMEA ones its Appendix C lists that were missing, plus the two Trimble and one
// Leica proprietary formats other receivers emit for compatibility.
//
// Every sentence here has a VERIFIED checksum, so a decode failure is a decode
// failure and never a bad fixture. The three vendor examples are verbatim from the
// manufacturers' own documentation — they are the reason the field ORDER can be
// trusted, since a wrong order still parses and would pass a hand-made fixture.

const parse = (raw: string): CMA => {
  const parser = new NMEAParser()
  const [sentence] = parser.parseData(`${raw}\r\n`)
  return sentence
}

const field = (sentence: CMA, name: string): Field => {
  const found = sentence.payload.find((entry) => entry.name === name)
  expect(found, `field ${name} exists`).toBeDefined()
  return found as Field
}

// A definition matched means every field is NAMED. An unmatched sentence still
// decodes, but generically — which is exactly what these definitions remove.
const expectFullyNamed = (sentence: CMA, id: string, version: string, fields: number): void => {
  expect(sentence.id).toBe(id)
  expect(sentence.protocol.version).toBe(version)
  expect(sentence.payload).toHaveLength(fields)
  expect(sentence.payload.every((entry) => entry.name.length > 0 && entry.name !== 'unknown')).toBe(true)
  expect(sentence.errors).toBeUndefined()
}

describe('standard NMEA sentences added for Septentrio Appendix C', () => {
  // RMC/GLL/GNS/GBS/GRS grew fields across NMEA versions, and a definition is
  // matched by EXACT field count — so each length needs its own definition, and
  // `protocol.version` then tells a consumer which generation the device speaks.
  test('RMC decodes in all THREE lengths, and the version reports which', () => {
    const classic = parse('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A')
    expectFullyNamed(classic, 'RMC', '3.1', 11)
    expect(field(classic, 'speed_knots').value as number).toBeCloseTo(22.4)
    expect(field(classic, 'magnetic_variation_direction').value).toBe('W')
    // The date stays a STRING: ddmmyy with a 2-digit year is not a number.
    expect(field(classic, 'date').value).toBe('230394')

    const withMode = parse('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W,A*07')
    expectFullyNamed(withMode, 'RMC', '3.1', 12)
    expect(field(withMode, 'mode_indicator').value).toBe('A')

    // 13 fields ⇒ the device speaks NMEA 4.1+, and the version says so.
    const withStatus = parse('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W,A,V*7D')
    expectFullyNamed(withStatus, 'RMC', '4.11', 13)
    expect(field(withStatus, 'navigational_status').value).toBe('V')
  })

  test('GLL decodes with and without the NMEA 2.3 mode indicator', () => {
    expectFullyNamed(parse('$GPGLL,4916.45,N,12311.12,W,225444,A*31'), 'GLL', '3.1', 6)
    const withMode = parse('$GPGLL,4916.45,N,12311.12,W,225444,A,A*5C')
    expectFullyNamed(withMode, 'GLL', '3.1', 7)
    expect(field(withMode, 'mode_indicator').value).toBe('A')
  })

  test('GNS keeps its per-constellation mode string intact', () => {
    const gns = parse('$GNGNS,122310.2,3722.425671,N,12258.856215,W,DAA,14,0.9,1005.543,6.5,,*30')
    expectFullyNamed(gns, 'GNS', '3.1', 12)
    // ONE CHARACTER PER CONSTELLATION — it must stay a string, not be coerced.
    expect(field(gns, 'mode_indicator').value).toBe('DAA')
    expect(field(gns, 'satellites').value).toBe(14)
    // A null field is null, not zero: no corrections received here.
    expect(field(gns, 'reference_station_id').value).toBeNull()

    const navStatus = parse('$GNGNS,122310.2,3722.425671,N,12258.856215,W,DAA,14,0.9,1005.543,6.5,,,V*4A')
    expectFullyNamed(navStatus, 'GNS', '4.11', 13)
    expect(field(navStatus, 'navigational_status').value).toBe('V')
  })

  test('GBS reports the failed satellite, and 4.11 adds system + signal', () => {
    const gbs = parse('$GPGBS,015509.00,-0.031,-0.186,0.219,,,,*4E')
    expectFullyNamed(gbs, 'GBS', '3.1', 8)
    expect(field(gbs, 'latitude_error').value as number).toBeCloseTo(-0.031)
    // No failure suspected ⇒ null, which must not read as satellite 0.
    expect(field(gbs, 'failed_satellite_id').value).toBeNull()

    const gbs411 = parse('$GPGBS,015509.00,-0.031,-0.186,0.219,,,,,1,1*4E')
    expectFullyNamed(gbs411, 'GBS', '4.11', 10)
    expect(field(gbs411, 'system_id').value).toBe(1)
  })

  test('GRS gives one residual per satellite, and 4.11 adds system + signal', () => {
    const grs = parse('$GNGRS,104148.00,1,2.6,2.2,-1.6,-1.1,-1.7,-1.5,5.8,1.7,,,,*52')
    expectFullyNamed(grs, 'GRS', '3.1', 14)
    expect(field(grs, 'residuals_mode').value).toBe(1)
    expect(field(grs, 'residual_1').value as number).toBeCloseTo(2.6)
    expect(field(grs, 'residual_12').value).toBeNull()

    const grs411 = parse('$GNGRS,104148.00,1,2.6,2.2,-1.6,-1.1,-1.7,-1.5,5.8,1.7,,,,,1,1*52')
    expectFullyNamed(grs411, 'GRS', '4.11', 16)
    expect(field(grs411, 'signal_id').value).toBe(1)
  })

  test('ROT keeps the sign that says which way the bow is turning', () => {
    const rot = parse('$GPROT,-35.6,A*2C')
    expect(rot.id).toBe('ROT')
    expect(field(rot, 'rate_of_turn').value as number).toBeCloseTo(-35.6)
    expect(field(rot, 'rate_of_turn').units).toBe('deg/min')
    expect(field(rot, 'status').value).toBe('A')
  })

  test('TXT carries the device text through', () => {
    const txt = parse('$GPTXT,01,01,02,ANTSTATUS=OK*3B')
    expectFullyNamed(txt, 'TXT', '4.11', 4)
    expect(field(txt, 'text_identifier').value).toBe(2)
    expect(field(txt, 'text').value).toBe('ANTSTATUS=OK')
  })
})

describe('third-party proprietary sentences', () => {
  // $PTNL puts the message TYPE in field 0 with the same field count for both
  // variants — the $PSXN trap — so a resolver has to run before the lookup.
  test('Trimble $PTNL,AVR resolves to PTNLAVR (vendor example, verbatim)', () => {
    const avr = parse('$PTNL,AVR,212405.20,+52.1531,Yaw,-0.0806,Tilt,,,12.575,3,1.4,16*39')
    expectFullyNamed(avr, 'PTNLAVR', '1', 12)
    expect(avr.protocol.name).toBe('TRIMBLE')
    expect(field(avr, 'yaw').value as number).toBeCloseTo(52.1531)
    expect(field(avr, 'tilt').value as number).toBeCloseTo(-0.0806)
    expect(field(avr, 'range').value as number).toBeCloseTo(12.575)
    expect(field(avr, 'gps_quality').value).toBe(3)
    expect(field(avr, 'satellites').value).toBe(16)
    // Trimble documents no fields 7-8 and leaves them empty in its own example.
    // They pass through as named-but-undocumented rather than being invented.
    expect(field(avr, 'reserved_1').value).toBeNull()
  })

  test('Trimble $PTNL,GGK resolves to PTNLGGK, EHT height stays a string (vendor example)', () => {
    const ggk = parse('$PTNL,GGK,102939.00,051910,5000.97323841,N,00827.62010742,E,5,09,1.9,EHT150.790,M*73')
    expectFullyNamed(ggk, 'PTNLGGK', '1', 12)
    expect(ggk.protocol.name).toBe('TRIMBLE')
    // mmddyy, month FIRST — unlike RMC. A string, so nobody reads it as a number.
    expect(field(ggk, 'utc_date').value).toBe('051910')
    // The wire value carries an EHT prefix, so it cannot be a float.
    expect(field(ggk, 'ellipsoidal_height').value).toBe('EHT150.790')
    expect(field(ggk, 'gps_quality').value).toBe(5)
  })

  test('one resolver serves both $PTNL types, and an unknown type is left alone', () => {
    // Same id and same field count, different type field: the resolver is what
    // tells them apart, so this is the case that proves it works.
    expect(parse('$PTNL,AVR,212405.20,+52.1531,Yaw,-0.0806,Tilt,,,12.575,3,1.4,16*39').id).toBe('PTNLAVR')
    expect(parse('$PTNL,GGK,102939.00,051910,5000.97323841,N,00827.62010742,E,5,09,1.9,EHT150.790,M*73').id).toBe('PTNLGGK')
    // An unrecognised $PTNL variant keeps its id and decodes generically rather
    // than being forced into a definition that does not describe it.
    const unknown = parse('$PTNL,XYZ,1,2,3,4,5,6,7,8,9,10,11*3E')
    expect(unknown.id).toBe('PTNL')
  })

  test('Leica LLQ reports GRID coordinates, not latitude/longitude (vendor example)', () => {
    const llq = parse('$GPLLQ,034137.00,210712,,M,,M,3,15,0.011,,M*15')
    expectFullyNamed(llq, 'LLQ', '1', 11)
    expect(llq.protocol.name).toBe('LEICA')
    expect(field(llq, 'gps_quality').value).toBe(3)
    expect(field(llq, 'satellites').value).toBe(15)
    expect(field(llq, 'position_quality').value as number).toBeCloseTo(0.011)
    // Easting/northing are blank in the vendor's own example: null, not 0 metres.
    expect(field(llq, 'grid_easting').value).toBeNull()
  })
})

describe('the knowledge base still answers for itself', () => {
  test('getSentenceDefinition returns every length variant of RMC', () => {
    const parser = new NMEAParser()
    const found = parser.getSentenceDefinition('RMC')
    expect(found.success).toBe(true)
    if (!found.success) return
    expect(found.value.map((entry) => entry.payload.length).sort((a, b) => a - b)).toEqual([11, 12, 13])
  })

  test('a definition can be asked for by protocol name', () => {
    const parser = new NMEAParser()
    const found = parser.getSentenceDefinition('PTNLAVR', 'TRIMBLE')
    expect(found.success).toBe(true)
    if (!found.success) return
    expect(found.value).toHaveLength(1)
    expect(found.value[0].protocol.name).toBe('TRIMBLE')
  })
})
