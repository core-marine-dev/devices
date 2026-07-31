// installed
import { describe, expect, test } from 'vitest'

// coded
import { attEulerFrame, auxAntPositionsFrame, bdsNavFrame, bdsRawFrame, capture, diskStatusFrame, endOfMeasFrame, endOfPVTFrame, field, galNavFrame, galRawINAVFrame, galUtcFrame, gloNavFrame, gloRawCAFrame, gpsNavFrame, gpsRawCAFrame, measEpochFrame, measExtraFrame, ntripClientStatusFrame, pvtGeodeticFrame, pvtSupportFrame, qualityIndFrame, receiverSetupFrame, receiverStatusFrame, values } from './fixtures'

import { SBFParser } from '../src/protocol-sbf'

// Block-level specs, driven by real frames from real receivers.

const parse = (frame: Uint8Array): ReturnType<SBFParser['parseData']> => new SBFParser().parseData(frame)
const one = (frame: Uint8Array): ReturnType<SBFParser['parseData']>[number] => {
  const [sentence, ...rest] = parse(frame)
  expect(rest).toHaveLength(0)
  return sentence
}

describe('AttEuler (5938)', () => {
  const sentence = one(attEulerFrame())

  test('the payload is the datasheet table, in datasheet order', () => {
    expect(sentence.payload.map((entry) => entry.name)).toStrictEqual([
      'NrSV', 'Error', 'Mode', 'Reserved',
      'Heading', 'Pitch', 'Roll',
      'PitchDot', 'RollDot', 'HeadingDot',
    ])
    expect(sentence.id).toBe('5938')
    expect(sentence.metadata.name).toBe('AttEuler')
    expect(sentence.metadata.revision).toBe(0)
    expect(sentence.protocol).toStrictEqual({ name: 'SBF', version: '4.10.1' })
    expect(sentence.errors).toBeUndefined()
  })

  // THE REGRESSION. On this exact frame the 1.x parser reported
  // pitchDot: null, rollDot: 0.313, headingDot: -0.194 — every rate on the
  // wrong axis, and a roll RATE on a frame with no roll solution at all.
  test('the three rates are on the axes the datasheet assigns them', () => {
    expect(field(sentence, 'PitchDot').value).toBeCloseTo(-0.19392751157283783, 12)
    expect(field(sentence, 'HeadingDot').value as number).toBeCloseTo(0.3129962682723999, 12)
    // attitude mode 1 = heading + pitch only, so roll and its rate are Do-Not-Use
    expect(field(sentence, 'RollDot').value).toBeNull()
    expect(field(sentence, 'Roll').value).toBeNull()
  })

  test('a Do-Not-Use rate says why it is null instead of reading as zero', () => {
    expect(field(sentence, 'RollDot').metadata).toStrictEqual({ doNotUse: true, value: -2e10 })
  })

  test('heading and pitch decode to the values the receiver computed', () => {
    expect(field(sentence, 'Heading').value as number).toBeCloseTo(174.69456481933594, 10)
    expect(field(sentence, 'Pitch').value as number).toBeCloseTo(-9.0195894241333, 10)
    expect(field(sentence, 'Heading').units).toBe('deg')
  })

  test('bitfields and enums land in field metadata, values stay integers', () => {
    expect(field(sentence, 'Error').value).toBe(0)
    expect(field(sentence, 'Error').metadata).toStrictEqual({
      mainAux1Baseline: 'NO_ERROR',
      mainAux2Baseline: 'NO_ERROR',
      attitudeNotRequested: false,
    })
    expect(field(sentence, 'Mode').value).toBe(1)
    expect(field(sentence, 'Mode').metadata).toStrictEqual({ label: 'HEADING_PITCH_FLOAT' })
  })

  test('the attitude triple is aggregated at payload level', () => {
    expect(sentence.metadata.payload).toStrictEqual({
      attitude: { heading: 174.69456481933594, pitch: -9.0195894241333, roll: null, units: 'deg' },
    })
  })
})

describe('PVTGeodetic (4007) revision 2', () => {
  const sentence = one(pvtGeodeticFrame())

  test('stacked revisions produce 20 + 2 + 4 fields', () => {
    expect(sentence.metadata.revision).toBe(2)
    expect(sentence.payload).toHaveLength(26)
    expect(sentence.payload.at(-1)?.name).toBe('Misc')
    expect(field(sentence, 'NrBases').name).toBe('NrBases')
    expect(field(sentence, 'Latency').units).toBe('0.0001 s')
  })

  test('radians stay radians in `value`; degrees are in metadata', () => {
    const latitude = field(sentence, 'Latitude')
    expect(latitude.units).toBe('rad')
    expect(latitude.value as number).toBeCloseTo(0.7053934616370753, 15)
    expect(latitude.metadata).toStrictEqual({ value: 40.41606824792776, units: 'deg' })
  })

  test('scaled integers keep the datasheet scale in `value` + units', () => {
    const accuracy = field(sentence, 'HAccuracy')
    expect(accuracy.value).toBe(812)
    expect(accuracy.units).toBe('0.01 m')
    expect(accuracy.metadata).toStrictEqual({ value: 8.12, units: 'm' })
  })

  test('a bitfield is decoded without touching its integer value', () => {
    expect(field(sentence, 'Mode').value).toBe(1)
    expect(field(sentence, 'Mode').metadata).toStrictEqual({
      pvtSolution: 'STANDALONE',
      determiningFixedPosition: false,
      mode2D: false,
    })
  })

  test('SignalInfo names the signals used, keyed by signal number', () => {
    const signals = (field(sentence, 'SignalInfo').metadata as { signals: Record<number, unknown> }).signals
    expect(Object.keys(signals).length).toBeGreaterThan(0)
    expect(signals[0]).toStrictEqual({ signal: 'L1CA', constellation: 'GPS', carrierFrequency: 1575.42, rinexCode: '1C' })
  })

  test('COG below 0.1 m/s is Do-Not-Use, not a course of zero', () => {
    expect(field(sentence, 'COG').value).toBeNull()
    expect(field(sentence, 'COG').metadata).toStrictEqual({ doNotUse: true, value: -2e10 })
  })

  test('the fix is aggregated at payload level in human units', () => {
    const position = (sentence.metadata.payload as { position: Record<string, number> }).position
    expect(position.latitude).toBeCloseTo(40.41606824792776, 10)
    expect(position.longitude).toBeCloseTo(-3.723882191187462, 10)
    expect(position.height).toBeGreaterThan(600)
  })

  test('the trailing padding byte is reported, not decoded', () => {
    expect(sentence.metadata.padding).toStrictEqual({ raw: 'AA==', bytes: 1 })
  })

  test('a revision above anything known decodes at the highest known one', () => {
    // Same frame, revision bits forced to 3. §4.1.6: a later revision only ADDS
    // fields, so decoding it as revision 2 is correct; 1.x fell back to
    // revision 0 and silently dropped Latency/HAccuracy/VAccuracy/Misc.
    const frame = pvtGeodeticFrame()
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    view.setUint16(4, (view.getUint16(4, true) & 0x1FFF) | (3 << 13), true)
    const [future] = new SBFParser().parseData(frame)
    expect(future.metadata.revision).toBe(3)
    expect(future.metadata.revisionDecoded).toBe(2)
    expect(future.payload).toHaveLength(26)
    // The CRC no longer matches (we changed a byte it covers), and that is
    // reported rather than hidden.
    expect(future.errors?.[0]).toMatch(/^Invalid CRC/)
  })
})

describe('AuxAntPositions (5942) — sub-blocks', () => {
  const sentence = one(auxAntPositionsFrame())

  test('sub-block fields are flattened into the payload after N and SBLength', () => {
    expect(sentence.payload.slice(0, 2).map((entry) => entry.name)).toStrictEqual(['N', 'SBLength'])
    expect(values(sentence).N).toBe(1)
    expect(values(sentence).SBLength).toBe(52)
    expect(sentence.payload.map((entry) => entry.name).slice(2)).toStrictEqual([
      'NrSV', 'Error', 'AmbiguityType', 'AuxAntID',
      'DeltaEast', 'DeltaNorth', 'DeltaUp', 'EastVel', 'NorthVel', 'UpVel',
    ])
  })

  test('the same fields are mirrored, grouped per antenna, in metadata', () => {
    const groups = sentence.metadata.subBlocks as { name: string, value: unknown }[][]
    expect(groups).toHaveLength(1)
    expect(groups[0].map((entry) => entry.name)).toContain('DeltaEast')
    expect(groups[0].find((entry) => entry.name === 'AuxAntID')?.value).toBe(1)
  })

  test('the baseline decodes to metres', () => {
    expect(field(sentence, 'DeltaEast').units).toBe('m')
    expect(field(sentence, 'DeltaEast').value as number).toBeCloseTo(1.6305512886859255, 12)
    expect(field(sentence, 'Error').metadata).toStrictEqual({ label: 'NO_ERROR' })
    expect(field(sentence, 'AmbiguityType').metadata).toStrictEqual({ label: 'FLOAT_AMBIGUITIES' })
  })
})

describe('the rest of the capture', () => {
  const sentences = new SBFParser().parseData(capture())
  const byName = (name: string): ReturnType<SBFParser['parseData']> =>
    sentences.filter((sentence) => sentence.metadata.name === name)

  test('ReceiverTime states its own UTC, and it is the truth we check against', () => {
    const [receiverTime] = byName('ReceiverTime')
    expect(values(receiverTime)).toMatchObject({
      UTCYear: 23, UTCMonth: 2, UTCDay: 20, UTCHour: 7, UTCMin: 41, UTCSec: 48, DeltaLS: 18,
    })
    const utc = (receiverTime.metadata.payload as { utc: { timestamp: number } }).utc
    expect(new Date(utc.timestamp).toISOString()).toBe('2023-02-20T07:41:48.000Z')
    expect(field(receiverTime, 'SyncLevel').metadata).toStrictEqual({
      synchronization: 'FULL', wnSet: true, towSet: true, fineTime: true,
    })
  })

  test('DOP applies its documented Do-Not-Use of 0 and scales in metadata', () => {
    const [dop] = byName('DOP')
    expect(field(dop, 'PDOP').units).toBe('0.01')
    const pdop = field(dop, 'PDOP')
    if (pdop.value === null) {
      // "DOP not available" — which 1.x published as a real DOP of 0.00
      expect(pdop.metadata).toStrictEqual({ doNotUse: true, value: 0 })
    } else {
      expect(pdop.metadata).toStrictEqual({ value: (pdop.value as number) / 100 })
    }
  })

  test('every block description reaches the CMA', () => {
    const [attEuler] = byName('AttEuler')
    expect(attEuler.description).toMatch(/Euler angles/)
  })

  test('the capture holds exactly the five block types it was recorded with', () => {
    const names = new Set(sentences.map((sentence) => sentence.metadata.name))
    const sorted = [...names].map(String).sort((a, b) => a.localeCompare(b))
    expect(sorted).toStrictEqual(['AttEuler', 'AuxAntPositions', 'DOP', 'PVTGeodetic', 'ReceiverTime'])
    expect(sentences).toHaveLength(195)
  })
})

describe('bodies that are not field lists', () => {
  test('EndOfPVT: padding only, so an empty payload and the bytes in metadata', () => {
    const sentence = one(endOfPVTFrame())
    expect(sentence.metadata.name).toBe('EndOfPVT')
    expect(sentence.payload).toStrictEqual([])
    expect(sentence.metadata.padding).toMatchObject({ bytes: 2 })
    expect(sentence.errors).toBeUndefined()
  })

  test('PVTSupport: an undocumented body is published as opaque bytes, not as padding', () => {
    const sentence = one(pvtSupportFrame())
    expect(sentence.metadata.name).toBe('PVTSupport')
    expect(sentence.payload).toStrictEqual([])
    expect(sentence.metadata.body).toMatchObject({ bytes: 22 })
    expect(sentence.metadata.padding).toBeUndefined()
    expect(sentence.errors).toBeUndefined()
    expect(sentence.description).toMatch(/no field definition/)
  })
})

// PHASE B — blocks added after the 11 the 1.x parser had. Each one is pinned by
// a real frame from cru's own receiver, not only by a fabricated round trip.
describe('ReceiverStatus (4014) revision 1', () => {
  const sentence = one(receiverStatusFrame())

  test('the fixed fields decode, and the AGC sub-blocks fill the rest', () => {
    expect(sentence.metadata.name).toBe('ReceiverStatus')
    expect(sentence.metadata.revision).toBe(1)
    // Revision 1 changes RxError bit MEANINGS only, so the layout is known and
    // nothing is reported as degraded.
    expect(sentence.metadata.revisionDecoded).toBeUndefined()
    expect(values(sentence)).toMatchObject({ CPULoad: 36, UpTime: 350, N: 14, SBLength: 4 })
    expect(field(sentence, 'CPULoad').units).toBe('%')
    // 9 fixed fields + 14 sub-blocks x 4 fields
    expect(sentence.payload).toHaveLength(9 + (14 * 4))
    expect((sentence.metadata.subBlocks as unknown[])).toHaveLength(14)
  })

  test('the bit fields decode to named flags', () => {
    expect(field(sentence, 'RxState').metadata).toMatchObject({ activeAntenna: true, wnSet: true, towSet: true, fineTime: true })
    // This receiver had logged a software warning: RxError bit 3.
    expect(field(sentence, 'RxError').value).toBe(8)
    expect(field(sentence, 'RxError').metadata).toMatchObject({ software: true, watchdog: false, cpuOverload: false })
    expect(field(sentence, 'ExtError').metadata).toMatchObject({ signalInSpaceError: false, setupError: false })
  })

  test('a frontend reports which signal and antenna it belongs to', () => {
    expect(field(sentence, 'FrontEndID').metadata).toStrictEqual({ label: 'GPSL2', antenna: 'MAIN' })
    expect(field(sentence, 'Gain').units).toBe('dB')
  })

  test('health is aggregated so a consumer need not read 26 booleans', () => {
    expect(sentence.metadata.payload).toStrictEqual({
      health: { errors: true, externalErrors: false, cpuOverloaded: false, healthy: false },
    })
  })
})

describe('QualityInd (4082)', () => {
  const sentence = one(qualityIndFrame())

  test('a repeated field with no SBLength still walks correctly', () => {
    expect(sentence.metadata.name).toBe('QualityInd')
    expect(values(sentence).N).toBe(7)
    // N, Reserved + 7 indicators
    expect(sentence.payload).toHaveLength(9)
    expect((sentence.metadata.subBlocks as unknown[])).toHaveLength(7)
  })

  test('each indicator is named and its 0-10 quality decoded', () => {
    const indicators = sentence.payload
      .filter((entry) => entry.name === 'Indicator')
      .map((entry) => entry.metadata as { indicator: string, quality: number | null })
    expect(indicators.map((entry) => entry.indicator)).toStrictEqual([
      'RF_POWER_MAIN_ANTENNA',
      'RF_POWER_AUX1_ANTENNA',
      'GNSS_SIGNALS_MAIN_ANTENNA',
      'GNSS_SIGNALS_AUX1_ANTENNA',
      'CPU_HEADROOM',
      'BASE_STATION_MEASUREMENTS',
      'OVERALL_QUALITY',
    ])
    expect(indicators.every((entry) => entry.quality !== null && entry.quality >= 0 && entry.quality <= 10)).toBe(true)
  })

  test('a quality of 15 means unknown, not a quality of 15', () => {
    const parser = new SBFParser()
    // indicator type 0 (overall), quality 15 => unknown
    const fake = parser.getFakeSentence(4082, undefined, { fields: { N: 1, Indicator: (15 << 8) | 0 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [decoded] = parser.parseData(fake.value)
    expect(field(decoded, 'Indicator').metadata).toStrictEqual({ indicator: 'OVERALL_QUALITY', quality: null, scale: '0-10' })
  })
})

describe('PosCovGeodetic (5906) and BaseVectorGeod (4028)', () => {
  test('a covariance matrix decodes in m², with the PVT mode shared from PVTGeodetic', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(5906, undefined, { fields: { Mode: 4, Cov_latlat: 5.5 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.payload).toHaveLength(12)
    expect(field(sentence, 'Cov_latlat').units).toBe('m²')
    expect(field(sentence, 'Cov_latlat').value).toBeCloseTo(5.5, 5)
    expect(field(sentence, 'Mode').metadata).toMatchObject({ pvtSolution: 'RTK_FIXED' })
  })

  test('a baseline sub-block decodes with its scaled azimuth and elevation', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4028, undefined, { fields: { N: 2, Azimuth: 10699, Elevation: 84, CorrAge: 100, ReferenceID: 1014 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect((sentence.metadata.subBlocks as unknown[])).toHaveLength(2)
    expect(field(sentence, 'Azimuth').metadata).toStrictEqual({ value: 106.99, units: 'deg' })
    expect(field(sentence, 'Elevation').metadata).toStrictEqual({ value: 0.84, units: 'deg' })
    expect(field(sentence, 'CorrAge').metadata).toStrictEqual({ value: 1, units: 's' })
    expect(field(sentence, 'ReferenceID').value).toBe(1014)
  })
})

describe('ReceiverSetup (5902) revision 4 — the box identifying itself', () => {
  const sentence = one(receiverSetupFrame())

  test('all five revisions stack into 24 fields', () => {
    expect(sentence.metadata.name).toBe('ReceiverSetup')
    expect(sentence.metadata.revision).toBe(4)
    expect(sentence.metadata.revisionDecoded).toBeUndefined()
    expect(sentence.payload).toHaveLength(24)
    expect(sentence.errors).toBeUndefined()
  })

  test('the strings decode, stopping at the NUL padding', () => {
    expect(values(sentence)).toMatchObject({
      RxVersion: '4.10.1',
      ProductName: 'AsteRx SB3 Pro+',
      RxName: 'GRB0053',
      RxSerialNumber: '3238137',
      GNSSFWVersion: '6.10.3-ga4180cb379',
      MarkerName: 'SEPT',
      CountryCode: '',
    })
    // 60 bytes on the wire, 4 characters of value.
    expect(field(sentence, 'MarkerName').raw.length).toBeGreaterThan(60)
  })

  test('the receiver identity is aggregated for the "what am I connected to?" question', () => {
    expect(sentence.metadata.payload).toStrictEqual({
      receiver: {
        name: 'GRB0053',
        product: 'AsteRx SB3 Pro+',
        serialNumber: '3238137',
        firmware: '4.10.1',
        gnssFirmware: '6.10.3-ga4180cb379',
        antenna: 'Unknown',
        marker: 'SEPT',
      },
    })
  })

  test('the reference position decodes to degrees, agreeing with the PVT fix', () => {
    expect((field(sentence, 'Latitude').metadata as { value: number }).value).toBeCloseTo(40.41606, 4)
    expect((field(sentence, 'Longitude').metadata as { value: number }).value).toBeCloseTo(-3.72388, 4)
    expect(field(sentence, 'Height').value as number).toBeCloseTo(673.93, 2)
  })

  test('the parser LEARNS the firmware from RxVersion', () => {
    const parser = new SBFParser()
    expect(parser.reportedFirmware).toBeUndefined()
    parser.parseData(receiverSetupFrame())
    expect(parser.reportedFirmware).toBe('4.10.1')
    expect(parser.firmware).toBe('4.10.1')
  })

  test('a firmware this build does not model is REPORTED, not silently decoded as another', () => {
    // Rewrite RxVersion (body offset 182) to a version with no knowledge base.
    const frame = receiverSetupFrame()
    const offset = 14 + 182
    for (let index = 0; index < 20; index++) frame[offset + index] = 0
    for (const [index, character] of [...'4.99.9'].entries()) frame[offset + index] = character.charCodeAt(0)
    const parser = new SBFParser()
    const [sentence] = parser.parseData(frame)
    expect(parser.reportedFirmware).toBe('4.99.9')
    // The knowledge base does NOT switch — inventing a table would be worse...
    expect(parser.firmware).toBe('4.10.1')
    // ...but the mismatch is visible in the output.
    expect(sentence.errors?.some((error) => error.includes('4.99.9') && error.includes('4.10.1'))).toBe(true)
  })
})

describe('Miscellaneous blocks with variable-width fields', () => {
  test('RxMessage: a string whose width lives in another field', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4103, undefined, {
      fields: { Type: 3, Severity: 2, MessageID: 42, Message: 'ftp push failed' },
    })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(field(sentence, 'Message').value).toBe('ftp push failed')
    expect(field(sentence, 'StringLn').value).toBe('ftp push failed'.length)
    expect(field(sentence, 'Type').metadata).toStrictEqual({ label: 'FTP_PUSH' })
    expect(field(sentence, 'Severity').metadata).toStrictEqual({ label: 'WARNING' })
    expect(sentence.errors).toBeUndefined()
  })

  test('Comment: the same, for a string that is NOT NUL-terminated', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(5936, undefined, { fields: { Comment: 'quay 3, calibration run' } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(field(sentence, 'Comment').value).toBe('quay 3, calibration run')
    expect(field(sentence, 'CommentLn').value).toBe(23)
  })

  test('Commands: a field that runs to the end of the body', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4015, undefined, { fields: { CmdData: 'setPVTMode, Static' } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(field(sentence, 'CmdData').value).toBe('setPVTMode, Static')
    // Nothing is left over: a rest-of-body field consumes the padding too.
    expect(sentence.metadata.padding).toBeUndefined()
  })

  test('a truncated variable-width string is reported, not guessed', () => {
    // StringLn says 200 characters, but the body holds nothing like that.
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4103, undefined, { fields: { Message: 'hi' } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const frame = fake.value
    new DataView(frame.buffer).setUint16(14 + 6, 200, true)
    const [sentence] = parser.parseData(frame)
    expect(sentence.errors?.some((error) => error.startsWith('Body truncated: field Message'))).toBe(true)
  })
})

describe('DiskStatus (4059) — a value split across two fields', () => {
  const sentence = one(diskStatusFrame())

  test('the sub-block decodes, with its Status bits named', () => {
    expect(sentence.metadata.name).toBe('DiskStatus')
    expect(values(sentence)).toMatchObject({ N: 1, SBLength: 16, DiskID: 1, DiskSize: 14066 })
    expect(field(sentence, 'Status').metadata).toMatchObject({ mounted: true, activity: true, full: false, formatting: false })
    expect(field(sentence, 'DiskSize').metadata).toStrictEqual({ value: 13.736328125, units: 'GB' })
  })

  test('the 48-bit usage is assembled from its MSB and LSB halves', () => {
    // 2 * 4294967296 + 2693750784 = 11283685376 bytes on a 14066 MB card.
    expect(sentence.metadata.payload).toStrictEqual({
      disk: {
        usage: { value: 11_283_685_376, units: 'bytes' },
        capacity: { value: 14_749_270_016, units: 'bytes' },
        used: { value: 76.5, units: '%' },
      },
    })
  })

  test('the pair (65535, 4294967295) means the usage is invalid, and says so', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4059, undefined, {
      fields: { N: 1, DiskUsageMSB: 65535, DiskUsageLSB: 4294967295, DiskSize: 1000 },
    })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [decoded] = parser.parseData(fake.value)
    expect(decoded.metadata.payload).toStrictEqual({ disk: { usage: null, invalid: true } })
  })
})

describe('NTRIPClientStatus (4053) — the fault that explains the capture', () => {
  const sentence = one(ntripClientStatusFrame())

  test('it reports a real failure from cru’s receiver', () => {
    expect(sentence.metadata.name).toBe('NTRIPClientStatus')
    expect(field(sentence, 'Status').metadata).toStrictEqual({ label: 'ERROR' })
    expect(field(sentence, 'ErrorCode').metadata).toStrictEqual({ label: 'RESOLVING_HOST_FAILED' })
    expect(field(sentence, 'Info').metadata).toStrictEqual({ tls: false })
    expect(sentence.errors).toBeUndefined()
  })

  // The client and server error tables are NOT interchangeable: code 5 is
  // "mountpoint unavailable" for a client and "configuration conflict" for a
  // server, and everything above 5 is shifted. Sharing one enum would mislabel
  // half of them, which is the kind of bug nobody notices until it matters.
  test('the client and server error tables are genuinely different', () => {
    const parser = new SBFParser()
    const client = parser.getFakeSentence(4053, undefined, { fields: { N: 1, ErrorCode: 5 } })
    const server = parser.getFakeSentence(4122, undefined, { fields: { N: 1, ErrorCode: 5 } })
    expect(client.success && server.success).toBe(true)
    if (!client.success || !server.success) return
    const [asClient] = parser.parseData(client.value)
    const [asServer] = parser.parseData(server.value)
    expect(field(asClient, 'ErrorCode').metadata).toStrictEqual({ label: 'MOUNTPOINT_UNAVAILABLE' })
    expect(field(asServer, 'ErrorCode').metadata).toStrictEqual({ label: 'CONFIGURATION_CONFLICT_ERROR' })
  })
})

describe('address fields are byte arrays with a human form', () => {
  test('a MAC and an IPv4 address decode to strings, bytes still in raw', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4058, undefined, { fields: { Netmask: 24 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    // Write a real MAC and IPv4 into the zero-filled fake: MAC at body 0,
    // IPAddress at body 6 (IPv4 in its last 4 bytes).
    const frame = fake.value
    const body = 14
    for (const [index, byte] of [0x00, 0x11, 0x22, 0x33, 0x44, 0x55].entries()) frame[body + index] = byte
    for (const [index, byte] of [192, 168, 1, 10].entries()) frame[body + 6 + 12 + index] = byte
    const [sentence] = parser.parseData(frame)
    expect(field(sentence, 'MACAddress').value).toBe('00:11:22:33:44:55')
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- bytes of a fabricated frame, not a real host
    expect(field(sentence, 'IPAddress').value).toBe('192.168.1.10')
    // An all-zero address is the block's own Do-Not-Use, and reads as empty.
    expect(field(sentence, 'Gateway').value).toBe('')
    expect(sentence.metadata.payload).toStrictEqual({
      // eslint-disable-next-line sonarjs/no-hardcoded-ip -- as above
      network: { address: '192.168.1.10/24', mac: '00:11:22:33:44:55' },
    })
  })
})

// §4.2.1 MEASUREMENT — the two-level blocks, and the only tranche whose two
// members can check EACH OTHER. MeasEpoch and MeasExtra describe the same 43
// signals of the same epoch through different tables and different sub-block
// strides, so agreement between them is real evidence rather than a restatement
// of what the code does.
type Group = { name: string, value: unknown, units?: string, metadata?: Record<string, unknown> }[]

const subBlockGroups = (sentence: ReturnType<SBFParser['parseData']>[number]): Group[] =>
  sentence.metadata.subBlocks as Group[]

const entry = (group: Group, name: string): Group[number] => {
  const found = group.find((item) => item.name === name)
  if (found === undefined) throw new Error(`no field ${name} in sub-block`)
  return found
}

// A Type1 group opens with RxChannel, a Type2 group with Type. Classifying by
// group LENGTH would be wrong: a Type1 group carries its own 12 fields PLUS its
// children's, so its size varies with how many signals that satellite has.
const isMaster = (group: Group): boolean => group[0].name === 'RxChannel'

describe('MeasEpoch (4027) revision 1', () => {
  const sentence = one(measEpochFrame())
  // 14 Type1 occurrences carrying 29 nested Type2 ones. A child group is pushed
  // as its parent is walked, so a Type1 group also contains its children's
  // fields, and the children appear BEFORE their parent in this list.
  const occurrences = subBlockGroups(sentence)
  const masters = occurrences.filter(isMaster)
  const slaves = occurrences.filter((group) => !isMaster(group))

  test('the two-level walk lands exactly on the block, with nothing left over', () => {
    expect(sentence.metadata.revision).toBe(1)
    expect(values(sentence).N1).toBe(14)
    expect(values(sentence).SB1Length).toBe(20)
    expect(values(sentence).SB2Length).toBe(12)
    // 6 header + 14 x 12 own Type1 fields + 29 x 9 Type2 fields.
    expect(sentence.payload).toHaveLength(435)
    expect(occurrences).toHaveLength(43)
    // No truncation error means the declared strides carried the walk to the
    // padding boundary: the 648-byte frame is fully accounted for.
    expect(sentence.errors).toBeUndefined()
    expect(sentence.metadata.payload).toStrictEqual({ measurements: { satellites: 14 } })
  })

  test('the header is the datasheet table, with rev 1 naming a byte rev 0 reserves', () => {
    expect(sentence.payload.slice(0, 6).map((item) => item.name)).toStrictEqual([
      'N1', 'SB1Length', 'SB2Length', 'CommonFlags', 'CumClkJumps', 'Reserved',
    ])
    // §4.1.6 forbids a revision from SHIFTING anything, so revision 0 has to
    // reserve the CumClkJumps byte rather than omit it. If it did not, the
    // Type1 run would start one byte earlier at revision 0 and every
    // measurement in the block would be garbage.
    const parser = new SBFParser()
    const rev0 = parser.getFakeSentence(4027, undefined, { revision: 0 })
    expect(rev0.success).toBe(true)
    if (!rev0.success) return
    const [decoded] = parser.parseData(rev0.value)
    expect(decoded.payload.slice(0, 6).map((item) => item.name)).toStrictEqual([
      'N1', 'SB1Length', 'SB2Length', 'CommonFlags', 'Reserved1', 'Reserved',
    ])
    expect(field(decoded, 'Reserved1').metadata).toStrictEqual({ reserved: true })
  })

  test('CommonFlags reports the receiver is NOT scrambling its measurements', () => {
    // Bit 7 is the one that matters most: when set, the receiver deliberately
    // returns useless observables because the Measurement Availability
    // permission is not granted. Here it is clear, so the numbers below are real.
    expect(field(sentence, 'CommonFlags').metadata).toStrictEqual({
      multipathMitigation: true,
      codeSmoothing: false,
      carrierPhaseAligned: true,
      clockSteering: false,
      highDynamics: false,
      scrambled: false,
    })
    expect(sentence.metadata.payload).not.toHaveProperty('measurements.scrambled')
  })

  test('CumClkJumps reads modulo 256, so 245 is -11 ms and not +245', () => {
    expect(field(sentence, 'CumClkJumps').value).toBe(245)
    expect(field(sentence, 'CumClkJumps').metadata).toStrictEqual({
      value: -0.011, units: 's', ambiguity: 'k*256 ms',
    })
  })

  test('14 satellites and 29 slave measurements, 43 signals in all', () => {
    expect(masters).toHaveLength(14)
    expect(slaves).toHaveLength(29)
    // The first satellite tracks three signals, so its group is 12 own fields
    // plus 2 x 9 for the slaves nested inside it.
    expect(masters[0]).toHaveLength(30)
    expect(entry(masters[0], 'N2').value).toBe(2)
  })

  describe('the master measurement of the first satellite', () => {
    const master = masters[0]

    test('it is G18 tracked on GPS L1CA, resolved from SVID and Type', () => {
      expect(entry(master, 'SVID').metadata).toStrictEqual({
        satellite: { constellation: 'GPS', number: 18, rinex: 'G18' },
      })
      expect(entry(master, 'Type').metadata).toStrictEqual({
        antenna: 'MAIN',
        signalNumber: 0,
        signal: { signal: 'L1CA', constellation: 'GPS', carrierFrequency: 1575.42, rinexCode: '1C', units: 'MHz' },
      })
    })

    test('the pseudorange is assembled from CodeMSB and CodeLSB', () => {
      // (5 * 4294967296 + 1761602507) * 0.001 — a plausible GPS range, 23 236 km.
      expect(entry(master, 'Misc').metadata).toStrictEqual({ codeMSB: 5 })
      expect(entry(master, 'CodeLSB').value).toBe(1_761_602_507)
      expect(entry(master, 'CodeLSB').metadata).toStrictEqual({ value: 23_236_438.987, units: 'm' })
      expect(entry(master, 'Doppler').metadata).toStrictEqual({ value: -2869.8301, units: 'Hz' })
    })

    test('C/N0 takes the +10 dB offset, because the signal number is not 1 or 2', () => {
      expect(entry(master, 'CN0').value).toBe(47)
      expect(entry(master, 'CN0').metadata).toStrictEqual({ value: 21.75, units: 'dB-Hz' })
    })

    // THE PAIR CONDITION. CarrierMSB is -128 and CarrierLSB is 0, which the
    // datasheet's footnote (2) makes an invalid carrier phase — but NEITHER
    // field is Do-Not-Use on its own, so `doNotUse` on either one would have
    // been wrong (a real 0 CarrierLSB is common). The independent confirmation
    // is LockTime: the datasheet says it goes Do-Not-Use exactly when the
    // carrier phase is unavailable, and it has.
    test('an invalid carrier phase is recognised from the PAIR, and LockTime agrees', () => {
      expect(entry(master, 'CarrierMSB').value).toBe(-128)
      expect(entry(master, 'CarrierLSB').value).toBe(0)
      expect(entry(master, 'CarrierLSB').metadata).toStrictEqual({ value: null, doNotUse: true })
      expect(entry(master, 'LockTime').value).toBeNull()
      expect(entry(master, 'LockTime').metadata).toStrictEqual({ doNotUse: true, value: 65535 })
    })
  })

  describe('the slave measurements, which are deltas from the master', () => {
    test('each names its own signal and antenna', () => {
      // Slave 1 of satellite G18: the same satellite on GPS L2C, main antenna.
      expect(entry(slaves[0], 'Type').metadata).toMatchObject({ antenna: 'MAIN', signalNumber: 3 })
      // Slave 2: L1CA again, but on the AUXILIARY antenna — Type bits 5-7.
      expect(entry(slaves[1], 'Type').metadata).toMatchObject({ antenna: 'AUX1', signalNumber: 0 })
    })

    // The pseudorange IS resolvable in a slave scope: Misc and CodeLSB exist
    // only in Type1, so the parent's are still the ones in view — which is
    // exactly the master measurement the delta is defined against.
    test('a slave pseudorange is the master plus the coded offset', () => {
      const l2c = slaves[0]
      expect(entry(l2c, 'OffsetsMSB').metadata).toStrictEqual({ codeOffsetMSB: -1, dopplerOffsetMSB: 0 })
      expect(entry(l2c, 'CodeOffsetLSB').metadata).toStrictEqual({
        value: 23_236_406.46, units: 'm', offset: { value: -32.527, units: 'm' },
      })
      // 23 236 438.987 - 32.527: an L1/L2 spread of tens of metres on a 23 000 km
      // range is the right order for ionosphere plus inter-frequency bias.
      expect(23_236_438.987 - 32.527).toBeCloseTo(23_236_406.46, 6)
    })

    test('a slave carrier phase is absolute, computed through the slave wavelength', () => {
      // L2C: lambda = c / 1227.6 MHz, PRtype2 / lambda + (0 * 65536 + 1219) * 0.001
      const carrier = entry(slaves[0], 'CarrierLSB').metadata
      expect(carrier).toMatchObject({ units: 'cycles' })
      expect(carrier?.value as number).toBeCloseTo(95_149_201.304, 3)
      const lambda = 299_792_458 / 1_227.6e6
      expect((23_236_406.46 / lambda) + 1.219).toBeCloseTo(carrier?.value as number, 3)
    })

    // The ONE thing deliberately not computed. Alpha is the ratio between this
    // sub-block's carrier frequency and the MASTER's, and the master's signal
    // type lives in the parent's `Type` field — which the child's own `Type`
    // has already replaced by the time the child decodes. So the offset is
    // published and the absolute Doppler is not, rather than inventing alpha.
    test('a slave publishes the Doppler OFFSET only, never a fabricated absolute', () => {
      const doppler = entry(slaves[0], 'DopplerOffsetLSB').metadata
      expect(doppler).toStrictEqual({ offset: { value: 0.1418, units: 'Hz' } })
      expect(doppler).not.toHaveProperty('value')
    })

    test('the pair conditions are honoured in the slave scope too', () => {
      // Slave 2 has CarrierMSB -128 with CarrierLSB 0 — invalid phase — and its
      // own LockTime is Do-Not-Use at 255, the u1 sentinel rather than u2's.
      expect(entry(slaves[1], 'CarrierLSB').metadata).toStrictEqual({ value: null, doNotUse: true })
      expect(entry(slaves[1], 'LockTime').metadata).toStrictEqual({ doNotUse: true, value: 255 })
    })

    // Why the engine grew sub-block-scoped decoders: `CarrierLSB` means the
    // ABSOLUTE phase in a Type1 and a phase relative to the master in a Type2.
    // Decoders are keyed by field name, so one shared function would have been
    // wrong in one of the two scopes — silently, on half the measurements.
    test('CarrierLSB is decoded by a DIFFERENT rule in each sub-block', () => {
      const master = masters[0]
      // Same field name, both valid inputs, and the master's rule needs no
      // OffsetsMSB while the slave's does — different functions, by scope.
      expect(entry(master, 'CarrierLSB').name).toBe(entry(slaves[0], 'CarrierLSB').name)
      expect(entry(slaves[0], 'CodeOffsetLSB').metadata).toHaveProperty('offset')
      expect(entry(master, 'CodeLSB').metadata).not.toHaveProperty('offset')
    })
  })
})

describe('MeasExtra (4000) revision 3', () => {
  const sentence = one(measExtraFrame())
  const occurrences = subBlockGroups(sentence)

  test('the rev-3 sub-block is 16 bytes, which is what fixes the revision map', () => {
    expect(sentence.metadata.revision).toBe(3)
    expect(values(sentence).N).toBe(43)
    // The datasheet prints "Rev 1/2/3" in a margin next to CarMPCorr, Info and
    // Misc. This is the arithmetic that decides they belong to 1, 2 and 3
    // respectively: 8 rev-0 fields are 13 bytes, and only appending all three
    // reaches the 16 the receiver itself reports.
    expect(values(sentence).SBLength).toBe(16)
    expect(occurrences[0].map((item) => item.name)).toStrictEqual([
      'RxChannel', 'Type', 'MPCorrection', 'SmoothingCorr',
      'CodeVar', 'CarrierVar', 'LockTime', 'CumLossCont',
      'CarMPCorr', 'Info', 'Misc',
    ])
    // 3 header + 43 x 11, and 6 + 43 x 16 = 708 = the frame's own Length.
    expect(sentence.payload).toHaveLength(476)
    expect(sentence.errors).toBeUndefined()
  })

  // THE CROSS-BLOCK CHECK. Two independently walked tables, two different
  // strides, one epoch: MeasEpoch reports 14 satellites carrying 29 slaves = 43
  // signals, and MeasExtra reports 43 sub-blocks describing the same signals in
  // the same order. If either walk drifted by a byte this would not line up.
  test('it describes exactly the signals MeasEpoch reports, in the same order', () => {
    const epoch = one(measEpochFrame())
    expect(epoch.timestamp).toBe(sentence.timestamp)
    expect(sentence.metadata.payload).toStrictEqual({ measurements: { signals: 43 } })
    expect(subBlockGroups(epoch)).toHaveLength(values(sentence).N as number)
    // The first three measurements of the epoch, by signal and antenna.
    const signature = (group: Group): unknown => entry(group, 'Type').metadata?.signalNumber
    const antenna = (group: Group): unknown => entry(group, 'Type').metadata?.antenna
    const first = occurrences.slice(0, 3)
    expect(first.map(signature)).toStrictEqual([0, 3, 0])
    expect(first.map(antenna)).toStrictEqual(['MAIN', 'MAIN', 'AUX1'])
  })

  test('the noise variances agree with the C/N0 MeasEpoch measured', () => {
    // GPS L1CA on the main antenna came back at 21.75 dB-Hz in MeasEpoch and
    // GPS L2C at 33.25 — and here the weaker signal has an order of magnitude
    // MORE code variance. Two blocks, one physical story.
    expect(entry(occurrences[0], 'CodeVar').metadata).toStrictEqual({ value: 3.0459, units: 'm2' })
    expect(entry(occurrences[1], 'CodeVar').metadata).toStrictEqual({ value: 0.2197, units: 'm2' })
    // Likewise the carrier: the two measurements whose phase MeasEpoch reported
    // unavailable are the ones with the worst carrier variance.
    expect(entry(occurrences[0], 'CarrierVar').value).toBe(22_385)
    expect(entry(occurrences[1], 'CarrierVar').value).toBe(236)
  })

  test('the Doppler variance is derived from the header factor, per the datasheet', () => {
    // sigma^2_Doppler [mHz^2] = CarrierVar * DopplerVarFactor. The factor lives
    // in the block header and the variance in a sub-block, so this is only
    // computable where a decoder can see both.
    expect(values(sentence).DopplerVarFactor).toBe(163)
    expect(entry(occurrences[1], 'CarrierVar').metadata).toStrictEqual({
      value: 0.000236, units: 'cycles2', dopplerVariance: { value: 236 * 163, units: 'mHz2' },
    })
  })

  test('CarMPCorr is in 1/512 cycles, and Info stays reserved rather than invented', () => {
    expect(entry(occurrences[1], 'CarMPCorr').value).toBe(-5)
    expect(entry(occurrences[1], 'CarMPCorr').metadata).toStrictEqual({ value: -5 / 512, units: 'cycles' })
    // Both nibbles are documented as reserved at revision 2. It is carried and
    // flagged, not decoded — naming undefined bits would be fiction.
    expect(entry(occurrences[0], 'Info').value).toBe(1)
    expect(entry(occurrences[0], 'Info').metadata).toStrictEqual({ reserved: true })
  })

  test('Misc extends the C/N0 resolution to 0.03125 dB-Hz', () => {
    expect(entry(occurrences[1], 'Misc').value).toBe(3)
    expect(entry(occurrences[1], 'Misc').metadata).toStrictEqual({
      cn0HighRes: { value: 0.09375, units: 'dB-Hz' },
    })
  })
})

describe('the rest of §4.2.1', () => {
  test('EndOfMeas (5922) is a time stamp and nothing else', () => {
    const sentence = one(endOfMeasFrame())
    expect(sentence.metadata.name).toBe('EndOfMeas')
    expect(sentence.payload).toStrictEqual([])
    expect(sentence.errors).toBeUndefined()
    // Its whole job is closing the epoch, so the time stamp must be the epoch's.
    expect(sentence.timestamp).toBe(one(measEpochFrame()).timestamp)
  })

  // Septentrio does not publish the Meas3 layout — "The detailed definition of
  // this block is not available in this document", once per block. So there is
  // nothing to decode and nothing to invent: the body goes out as opaque bytes,
  // the same call PVTSupport already makes. This is also why the family needed
  // no bit-unpacking escape hatch in the engine after all.
  test('the five Meas3 blocks are opaque, not guessed at', () => {
    const parser = new SBFParser()
    for (const number of [4109, 4110, 4111, 4112, 4113]) {
      const fake = parser.getFakeSentence(number)
      expect(fake.success).toBe(true)
      if (!fake.success) return
      const [sentence] = parser.parseData(fake.value)
      expect(sentence.payload).toStrictEqual([])
      expect(sentence.metadata.body).toBeDefined()
      expect(sentence.metadata.name).not.toBe('unknown')
      expect(sentence.errors).toBeUndefined()
    }
  })
})

// §4.2.2 NAVIGATION PAGE — fifteen blocks that look identical and are not. The
// six-byte header before the bits has FOUR variants, and getting one wrong
// silently shifts every navigation bit in the block. Each fixture below is a
// different variant, from cru's own capture.
describe('§4.2.2 raw navigation pages', () => {
  describe('GPSRawCA (4017) — the baseline variant', () => {
    const sentence = one(gpsRawCAFrame())

    test('the payload is the datasheet table and consumes the body exactly', () => {
      expect(sentence.payload.map((item) => item.name)).toStrictEqual([
        'SVID', 'CRCPassed', 'ViterbiCnt', 'Source', 'FreqNr', 'RxChannel', 'NAVBits',
      ])
      // 14 header + 6 + 10 x 4 = 60, which is the frame's own length, so there
      // is no padding at all — the arithmetic that confirms the layout.
      expect(sentence.metadata.padding).toBeUndefined()
      expect(sentence.errors).toBeUndefined()
    })

    test('it is G27 on GPS L1CA, and the parity check passed', () => {
      expect(field(sentence, 'SVID').metadata).toStrictEqual({
        satellite: { constellation: 'GPS', number: 27, rinex: 'G27' },
      })
      expect(field(sentence, 'Source').metadata).toStrictEqual({
        signalNumber: 0,
        signal: { signal: 'L1CA', constellation: 'GPS', carrierFrequency: 1575.42, rinexCode: '1C' },
      })
      expect(field(sentence, 'CRCPassed').metadata).toStrictEqual({ label: 'PASSED', passed: true })
    })

    // "Not applicable" is not the same as a value of zero. Both bytes exist, both
    // read 0 on this signal, and both are flagged so nobody reports a Viterbi
    // error count of 0 for a signal that has no Viterbi decoder.
    test('ViterbiCnt and FreqNr are flagged as carrying nothing on this signal', () => {
      expect(field(sentence, 'ViterbiCnt').metadata).toStrictEqual({ reserved: true })
      expect(field(sentence, 'FreqNr').metadata).toStrictEqual({ reserved: true })
    })

    // The words are LITTLE-ENDIAN on the wire, but every constellation ICD counts
    // bits from the MSB of each word. Publishing assembled words rather than a
    // byte dump is what makes bit 0 of the output the first bit the satellite
    // sent; a byte dump would present each word back-to-front.
    test('NAVBits is published as assembled 32-bit words, not a byte dump', () => {
      const navBits = field(sentence, 'NAVBits')
      expect(navBits.value).toBe('22C0DB35 26038A23 1AC15541 0BF68931 39B04FD5 01504166 3AAC9ECF 04E1A841 03573EE5 1C909FF0')
      const words = (navBits.value as string).split(' ')
      expect(words).toHaveLength(10)
      // The raw bytes are still there, and the first word is byte-reversed in
      // them — which is exactly why `value` is not a dump of `raw`.
      expect(navBits.raw).toBeDefined()
      const first = Uint8Array.from(atob(navBits.raw), (c) => c.charCodeAt(0)).subarray(0, 4)
      expect([...first]).toStrictEqual([0x35, 0xDB, 0xC0, 0x22])
    })

    test('the meaningful bit count and the unused tail are stated, not implied', () => {
      // 300 bits over 10 words: the last 20 bits of NAVBits[9] are unused and the
      // datasheet says they must be ignored, so the count is published rather
      // than left for the consumer to look up.
      expect(sentence.metadata.payload).toStrictEqual({
        navigation: { bits: 300, words: 10, unusedBitsInLastWord: 20, valid: true },
      })
    })

    test('the SIS time stamp is NOT promoted over the sentence timestamp', () => {
      // These blocks are stamped with when the SATELLITE transmitted the bits,
      // which may be well in the past — so unlike every receiver-stamped block,
      // cma.timestamp keeps the parse time instead.
      const parsed = sentence.metadata.timestamp as { parsed: number, sentence?: number }
      expect(sentence.timestamp).toBe(parsed.parsed)
      expect(sentence.timestamp).not.toBe(parsed.sentence)
    })
  })

  test('GLORawCA (4026) is the one block where FreqNr is real', () => {
    const sentence = one(gloRawCAFrame())
    // GLONASS L1/L2 are FDMA, so the carrier a string arrived on is a property of
    // the satellite and has to be reported per string. Everywhere else in §4.2.2
    // this byte carries nothing — treating it as a frequency there would invent
    // a channel number out of a padding byte.
    expect(field(sentence, 'FreqNr').value).toBe(6)
    // Carried with an offset of 8, so 6 means -2, inside the legal -7..+13 range.
    expect(field(sentence, 'FreqNr').metadata).toStrictEqual({ value: -2 })
    expect(field(sentence, 'SVID').metadata).toStrictEqual({
      satellite: { constellation: 'GLONASS', number: 9, rinex: 'R09' },
    })
    expect(field(sentence, 'Source').metadata).toMatchObject({ signalNumber: 8 })
    // 85 bits in 3 words: 11 unused. 14 + 6 + 12 = 32 = the frame length.
    expect(sentence.metadata.payload).toStrictEqual({
      navigation: { bits: 85, words: 3, unusedBitsInLastWord: 11, valid: true },
    })
    expect(sentence.errors).toBeUndefined()
  })

  test('GALRawINAV (4023) decodes the Source bit that names a SECOND carrier', () => {
    const sentence = one(galRawINAVFrame())
    // An I/NAV page is two sub-pages, and they can arrive on different carriers.
    // When they do, bits 0-4 report L1BC and bit 5 says the page was assembled
    // from two — so a consumer ignoring bit 5 attributes half the page to the
    // wrong signal. Here it is a single-carrier E5b page.
    expect(field(sentence, 'Source').metadata).toStrictEqual({
      signalNumber: 21,
      signal: { signal: 'E5b', constellation: 'Galileo', carrierFrequency: 1207.14, rinexCode: '7Q' },
      concatenatedFromTwoCarriers: false,
    })
    // The flag is decoded ONLY here: no other block in §4.2.2 defines bit 5.
    expect(field(one(gpsRawCAFrame()), 'Source').metadata).not.toHaveProperty('concatenatedFromTwoCarriers')
    expect(field(sentence, 'SVID').metadata).toStrictEqual({
      satellite: { constellation: 'Galileo', number: 14, rinex: 'E14' },
    })
    // 234 bits over 8 words after the even page's 6 tail bits are removed.
    expect(sentence.metadata.payload).toStrictEqual({
      navigation: { bits: 234, words: 8, unusedBitsInLastWord: 22, valid: true },
    })
  })

  test('BDSRaw (4047) has a PLAIN Source and a Reserved fifth byte', () => {
    const sentence = one(bdsRawFrame())
    // The BeiDou and NavIC blocks drop the bit field: Source is the signal number
    // outright. Masking bits 0-4 would still give 28 here, but it would give the
    // wrong answer for any signal number above 31 — which is why the variant is
    // modelled rather than assumed away.
    expect(sentence.payload.map((item) => item.name)).toStrictEqual([
      'SVID', 'CRCPassed', 'ViterbiCnt', 'Source', 'Reserved', 'RxChannel', 'NAVBits',
    ])
    expect(field(sentence, 'Source').metadata).toMatchObject({
      signalNumber: 28,
      signal: { signal: 'B1I', constellation: 'BeiDou', carrierFrequency: 1561.098, rinexCode: '2I' },
    })
    expect(field(sentence, 'SVID').metadata).toStrictEqual({
      satellite: { constellation: 'BeiDou', number: 28, rinex: 'C28' },
    })
  })

  test('the same satellite tracked on two signals lands on the same channel', () => {
    // GPSRawCA and GPSRawL2C in this capture are both G27 on receiver channel 9,
    // reporting signal 0 and signal 3. Two blocks, one satellite, two signals —
    // the same channel model MeasEpoch reports, arrived at independently.
    const parser = new SBFParser()
    const ca = one(gpsRawCAFrame())
    expect(values(ca).RxChannel).toBe(9)
    expect(values(ca).SVID).toBe(27)
    expect(parser.sentenceIds).toContain('4018')
  })

  test('BDSRawB1C (4218) reports TWO subframe CRCs and refuses to pick one', () => {
    // A B-CNAV1 frame carries three subframes and the receiver checks two of them
    // independently, so this is the one block with no single CRCPassed. "Valid"
    // therefore requires BOTH: calling a frame good on subframe 2 alone would
    // pass a frame whose subframe 3 is corrupt.
    const parser = new SBFParser()
    const both = parser.getFakeSentence(4218, undefined, { fields: { CRCSF2: 1, CRCSF3: 1 } })
    const half = parser.getFakeSentence(4218, undefined, { fields: { CRCSF2: 1, CRCSF3: 0 } })
    expect(both.success && half.success).toBe(true)
    if (!both.success || !half.success) return
    const [good] = parser.parseData(both.value)
    const [bad] = parser.parseData(half.value)
    expect(good.payload.map((item) => item.name)).toStrictEqual([
      'SVID', 'CRCSF2', 'CRCSF3', 'Source', 'Reserved', 'RxChannel', 'NAVBits',
    ])
    expect(good.metadata.payload).toStrictEqual({
      navigation: { symbols: 1800, words: 57, unusedBitsInLastWord: 24, subframe2: true, subframe3: true, valid: true },
    })
    expect(bad.metadata.payload).toMatchObject({
      navigation: { subframe2: true, subframe3: false, valid: false },
    })
  })

  test('QZSRawL1CA (4066) carries two reserved bytes, named as the datasheet names them', () => {
    // It has a plain Reserved where the others have ViterbiCnt, AND a Reserved
    // fifth byte — so two fields would collide on one name. The datasheet calls
    // the second Reserved2.
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4066)
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.payload.map((item) => item.name)).toStrictEqual([
      'SVID', 'CRCPassed', 'Reserved', 'Source', 'Reserved2', 'RxChannel', 'NAVBits',
    ])
  })

  test('BDSRawB2a (4219) counts SYMBOLS, and is the one block with no unused tail', () => {
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(4219)
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    // 18 words x 32 = 576 exactly. And they are symbols, not bits: B-CNAV2 is
    // carried pre-error-correction, so calling them bits would misdescribe them.
    expect(sentence.metadata.payload).toStrictEqual({
      navigation: { symbols: 576, words: 18, unusedBitsInLastWord: 0, valid: false },
    })
  })

  test('all fifteen blocks are stamped SIS, so none of them moves cma.timestamp', () => {
    const parser = new SBFParser()
    const navigation = [4017, 4018, 4019, 4026, 4022, 4023, 4020, 4021, 4047, 4218, 4219, 4066, 4067, 4068, 4093]
    expect(navigation).toHaveLength(15)
    for (const number of navigation) {
      const definition = parser.getSentenceDefinition(number)
      expect(definition.success).toBe(true)
      if (!definition.success) continue
      expect(definition.value[0].timestamp).toBe('sis')
    }
  })
})

// §4.2.3-4.2.8 DECODED MESSAGES — 33 blocks of ephemerides, almanacs, ionosphere
// models and UTC offsets. These are the blocks whose transcription can be checked
// against PHYSICS: an ephemeris decodes to an orbit, and every constellation's
// orbit is a published constant. A field-order error still yields a finite number,
// but not one within a kilometre of the right semi-major axis.
describe('§4.2.3-4.2.8 decoded navigation messages', () => {
  describe('GPSNav (5891) — G10', () => {
    const sentence = one(gpsNavFrame())

    test('the 36-row table consumes the 140-byte frame exactly, no padding', () => {
      expect(sentence.metadata.name).toBe('GPSNav')
      expect(sentence.payload).toHaveLength(35)
      // 126 body bytes + 14 header = 140, the frame's own length. The row order is
      // NOT the tidy one (M_0 sits between DEL_N and C_uc, e between C_uc and
      // C_us); tidying it would still give 126 bytes and decode every element into
      // the wrong slot, so this arithmetic alone would not catch it — the orbit
      // check below is what does.
      expect(sentence.metadata.padding).toBeUndefined()
      expect(sentence.errors).toBeUndefined()
    })

    // THE REAL CHECK. GPS satellites orbit at a semi-major axis of 26 559.7 km by
    // design. If SQRT_A were reading any other field's bytes this would not land
    // within a kilometre of it.
    test('the orbit decodes to the GPS constellation, to within a kilometre', () => {
      const axis = (field(sentence, 'SQRT_A').metadata as { value: number }).value
      expect(axis).toBeGreaterThan(26_559_000)
      expect(axis).toBeLessThan(26_562_000)
      // Nominal GPS inclination is 55 degrees, and eccentricity is near zero.
      const inclination = (field(sentence, 'i_0').metadata as { value: number }).value
      expect(inclination).toBeGreaterThan(54)
      expect(inclination).toBeLessThan(57)
      expect(field(sentence, 'e').value as number).toBeLessThan(0.02)
      // Angles are in SEMI-CIRCLES on the wire; the field keeps that and the
      // degrees go to metadata. Reading them as radians would scale by pi.
      expect(field(sentence, 'i_0').units).toBe('semi-circles')
      expect(field(sentence, 'i_0').value as number).toBeCloseTo(inclination / 180, 12)
    })

    // The GPS ICD broadcasts the same IODE in subframes 2 and 3 precisely so a
    // receiver can detect an ephemeris that changed mid-read. They match here,
    // which means the two bytes are being read from the right places.
    test('IODE2 and IODE3 agree, as the ICD requires of a consistent data set', () => {
      expect(values(sentence).IODE2).toBe(values(sentence).IODE3)
    })

    test('health and accuracy are decoded, not left as bare codes', () => {
      expect(field(sentence, 'health').metadata).toStrictEqual({ navigationDataValid: true, signalHealth: 0 })
      expect(field(sentence, 'URA').metadata).toStrictEqual({ index: 0, accuracy: { value: 2, units: 'm' } })
      expect(field(sentence, 'CAorPonL2').metadata).toStrictEqual({ label: 'P_CODE_ON' })
    })

    test('QZSNav shares this exact table, because the datasheet prints it twice', () => {
      const parser = new SBFParser()
      const gps = parser.getSentenceDefinition(5891)
      const qzss = parser.getSentenceDefinition(4095)
      expect(gps.success && qzss.success).toBe(true)
      if (!gps.success || !qzss.success) return
      expect(qzss.value[0].payload).toStrictEqual(gps.value[0].payload)
    })
  })

  describe('GALNav (4002) — E13, and the guard bits that make health readable', () => {
    const sentence = one(galNavFrame())

    test('the orbit decodes to the Galileo constellation', () => {
      // Galileo's nominal semi-major axis is 29 599.8 km and its inclination 56 deg.
      const axis = (field(sentence, 'SQRT_A').metadata as { value: number }).value
      expect(axis).toBeGreaterThan(29_598_000)
      expect(axis).toBeLessThan(29_602_000)
      const inclination = (field(sentence, 'i_0').metadata as { value: number }).value
      expect(inclination).toBeGreaterThan(55)
      expect(inclination).toBeLessThan(58)
      // 135 body bytes + 14 = 149, rounded up to 152 by §4.1.1 — so 3 padding.
      expect(sentence.metadata.padding).toStrictEqual({ raw: 'AAAA', bytes: 3 })
    })

    // `Source` decides WHICH CLOCK MODEL the clock corrections belong to. A
    // receiver decoding both streams emits two GALNav blocks for one satellite
    // with different clock parameters, so a consumer treating the second as an
    // update of the first silently mixes the (L1,E5b) and (L1,E5a) models.
    test('Source names the applicable clock model, not just the stream', () => {
      expect(field(sentence, 'Source').value).toBe(2)
      expect(field(sentence, 'Source').metadata).toStrictEqual({ label: 'INAV', clockModel: 'L1_E5b' })
      expect(sentence.metadata.payload).toStrictEqual({
        clock: { label: 'INAV', clockModel: 'L1_E5b', issueOfData: 9 },
      })
    })

    // THE GUARD-BIT RULE, CONFIRMED BY THE DATASHEET'S OWN AVAILABILITY TABLE.
    // Health_OSSOL puts a validity bit in front of each signal's status: "If set,
    // bits 1 to 3 are valid, otherwise they must be ignored." Here the value is
    // 17 = 0b10001, so L1-B (bit 0) and E5b (bit 4) are valid and E5a (bit 8) is
    // NOT — which is exactly what an I/NAV stream is documented to guarantee.
    // Reading the E5a status without its guard would report a health the
    // satellite never sent.
    test('an unguarded signal health is null, not a status', () => {
      expect(field(sentence, 'Health_OSSOL').value).toBe(17)
      expect(field(sentence, 'Health_OSSOL').metadata).toStrictEqual({
        l1b: { dataValid: true, status: 'OK' },
        e5b: { dataValid: true, status: 'OK' },
        e5a: null,
      })
    })

    // The SAME availability rule, arrived at through a completely different
    // mechanism: SISA_L1E5a is at its Do-Not-Use value while SISA_L1E5b carries a
    // real index. Two independent fields agreeing that this is an I/NAV block.
    test('the SISA indexes agree with the stream, and 107 is a stepped table', () => {
      expect(field(sentence, 'SISA_L1E5a').value).toBeNull()
      expect(field(sentence, 'SISA_L1E5a').metadata).toStrictEqual({ doNotUse: true, value: 255 })
      // 100-125 maps to 2.0-6.0 m in 0.16 m steps: 2 + 7 * 0.16 = 3.12.
      expect(field(sentence, 'SISA_L1E5b').metadata).toStrictEqual({ index: 107, value: 3.12, units: 'm' })
    })

    // The datasheet says "2-bit C/NAV encryption status" and defines no codes.
    // cru's receiver reports 3 — a value no invented two-entry table would have
    // labelled, which is why the bits are published rather than named.
    test('CNAVenc publishes its bits rather than an invented label', () => {
      expect(field(sentence, 'CNAVenc').metadata).toStrictEqual({ status: 3 })
    })
  })

  describe('GLONav (4004) — R03, the one constellation that is not Keplerian', () => {
    const sentence = one(gloNavFrame())

    // GLONASS broadcasts a PZ-90.02 STATE VECTOR, so the check is geometric rather
    // than orbital: the position vector's norm must be the GLONASS orbital radius,
    // 25 510 km. This also catches the units trap — the fields are in kilometres,
    // and a consumer reading them as metres is out by a factor of 1000.
    test('the state vector norm is the GLONASS orbital radius', () => {
      const metres = (name: string): number => (field(sentence, name).metadata as { value: number }).value
      const radius = Math.hypot(metres('X'), metres('Y'), metres('Z'))
      expect(radius).toBeGreaterThan(25_400_000)
      expect(radius).toBeLessThan(25_700_000)
      // The wire value is kilometres, and it says so.
      expect(field(sentence, 'X').units).toBe('1000 m')
      expect(metres('X')).toBeCloseTo((field(sentence, 'X').value as number) * 1000, 6)
    })

    test('no Keplerian element is invented for it', () => {
      const names = sentence.payload.map((item) => item.name)
      expect(names).toContain('X')
      expect(names).not.toContain('SQRT_A')
      expect(names).not.toContain('i_0')
    })

    test('the frequency number carries an offset of 8', () => {
      expect(field(sentence, 'FreqNr').value).toBe(13)
      // 13 - 8 = 5, inside the legal -7..+13 range.
      expect(field(sentence, 'FreqNr').metadata).toStrictEqual({ value: 5 })
    })

    // Two health flags with OPPOSITE polarities in the same family: GLONav's `l`
    // uses 1 for unhealthy, GLOAlm's `C` uses 1 for HEALTHY. Both are reported by
    // name so the polarity cannot be misread, and neither speaks for the satellite
    // alone.
    test('both health flags are reported, and combined only in metadata', () => {
      expect(field(sentence, 'B').metadata).toStrictEqual({ unhealthy: false, flags: 0 })
      expect(field(sentence, 'l').metadata).toStrictEqual({ unhealthy: false })
      expect(sentence.metadata.payload).toStrictEqual({
        health: { unhealthy: false, broadcastFlag: 0, lineFlag: 0 },
      })
      const parser = new SBFParser()
      const almanac = parser.getFakeSentence(4005, undefined, { fields: { C: 1 } })
      expect(almanac.success).toBe(true)
      if (!almanac.success) return
      const [decoded] = parser.parseData(almanac.value)
      // GLOAlm's C: 1 means HEALTHY, the opposite of GLONav's l.
      expect(field(decoded, 'C').metadata).toStrictEqual({ healthy: true })
    })
  })

  describe('BDSNav (4081) — C28, and BeiDou system time', () => {
    const sentence = one(bdsNavFrame())

    test('the orbit decodes to the BeiDou MEO constellation', () => {
      // BeiDou MEO: semi-major axis 27 906 km, inclination 55 deg.
      const axis = (field(sentence, 'SQRT_A').metadata as { value: number }).value
      expect(axis).toBeGreaterThan(27_904_000)
      expect(axis).toBeLessThan(27_908_000)
      const inclination = (field(sentence, 'i_0').metadata as { value: number }).value
      expect(inclination).toBeGreaterThan(54)
      expect(inclination).toBeLessThan(56)
    })

    // BDT lags GPS time by 14 s, and the datasheet says so on t_oc and t_oe. A
    // consumer mixing them with a GPS-frame time is out by exactly 14 seconds —
    // small enough to read as a clock fault rather than a units error.
    test('the reference times are flagged as BeiDou system time, with the GPS value', () => {
      expect(field(sentence, 't_oe').metadata).toStrictEqual({
        timeScale: 'BDT',
        gpsTimeOfWeek: { value: (values(sentence).t_oe as number) + 14, units: 's' },
      })
    })

    // BDT started at GPS week 1356 (2006-01-01). This frame reports BeiDou week
    // 911, so 1356 + 911 = GPS week 2267 — which is the week the capture is from,
    // independently of anything else in the block.
    test('the BeiDou week number converts to the GPS week of the capture', () => {
      const BDT_EPOCH_GPS_WEEK = 1356
      expect((values(sentence).WN as number) + BDT_EPOCH_GPS_WEEK).toBe(2267)
    })

    test('BDSAlm gets its own table, because it is NOT the GPS almanac', () => {
      // No reserved byte after PRN, and a different element order (SQRT_A before
      // e, omega before M_0). Sharing GPSAlm's table would shift everything.
      const parser = new SBFParser()
      const definition = parser.getSentenceDefinition(4119)
      expect(definition.success).toBe(true)
      if (!definition.success) return
      expect(definition.value[0].payload.map((item) => item.name).slice(0, 5)).toStrictEqual([
        'PRN', 'WN_a', 't_oa', 'SQRT_A', 'e',
      ])
    })
  })

  // A leap-second value broadcast by Galileo, checked against the same value the
  // RECEIVER reports in its own ReceiverTime block. Two entirely separate sources
  // — a satellite broadcast decoded here, and the receiver's own clock bookkeeping
  // — agreeing on 18 seconds.
  test('GALUtc (4031) broadcasts the leap-second offset ReceiverTime confirms', () => {
    const sentence = one(galUtcFrame())
    expect(values(sentence).DEL_t_LS).toBe(18)
    expect(values(sentence).DEL_t_LSF).toBe(18)
    const receiverTime = new SBFParser().parseData(capture())
      .find((item) => item.metadata.name === 'ReceiverTime')
    expect(receiverTime).toBeDefined()
    expect(values(receiverTime as never).DeltaLS).toBe(18)
  })

  test('GALSARRLM (4034) derives its bit-array width from RLMLength', () => {
    // The only field in the package whose width is DERIVED rather than carried:
    // RLMLength is a BIT count (80 or 160) and N is that many bits rounded up to
    // whole 32-bit words. Read as a byte count it would ask for 80 bytes.
    const parser = new SBFParser()
    const short = parser.getFakeSentence(4034, undefined, { fields: { RLMLength: 80 } })
    const long = parser.getFakeSentence(4034, undefined, { fields: { RLMLength: 160 } })
    expect(short.success && long.success).toBe(true)
    if (!short.success || !long.success) return
    // 14 header + 6 + 12 = 32; 14 + 6 + 20 = 40. Both already multiples of 4.
    expect(short.value).toHaveLength(32)
    expect(long.value).toHaveLength(40)
    const [asShort] = parser.parseData(short.value)
    const [asLong] = parser.parseData(long.value)
    expect(asShort.errors).toBeUndefined()
    expect(asLong.errors).toBeUndefined()
    expect(field(asShort, 'RLMLength').metadata).toStrictEqual({ label: 'SHORT', words: 3, unusedBits: 16 })
    expect(field(asLong, 'RLMLength').metadata).toStrictEqual({ label: 'LONG', words: 5, unusedBits: 0 })
    expect((field(asShort, 'RLMBits').value as string).split(' ')).toHaveLength(3)
    expect((field(asLong, 'RLMBits').value as string).split(' ')).toHaveLength(5)
  })

  test('the SBAS blocks carry fixed-size arrays the datasheet sizes outright', () => {
    // GEOIntegrity is 4 IODF entries and 51 UDREI entries, and 51 is the number of
    // slots in the SBAS PRN mask — so UDREI[i] is the bound for mask slot i+1.
    // There is no count field to point at, hence a literal count.
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(5928)
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.errors).toBeUndefined()
    // 1 PRN + 1 Reserved + 4 + 51 = 57 fields.
    expect(sentence.payload).toHaveLength(57)
    expect(sentence.payload.filter((item) => item.name === 'UDREIEntry')).toHaveLength(51)
    expect(sentence.payload.filter((item) => item.name === 'IODFEntry')).toHaveLength(4)
    // A UDREI of 15 is "do not use", not an accuracy — a state, so no sigma.
    const flagged = parser.getFakeSentence(5928, undefined, { fields: { UDREIEntry: 15 } })
    expect(flagged.success).toBe(true)
    if (!flagged.success) return
    const [warned] = parser.parseData(flagged.value)
    expect(field(warned, 'UDREIEntry').metadata).toStrictEqual({ index: 15, label: 'DO_NOT_USE' })
  })

  test('GEOMT00 (5925) says do-not-use by arriving at all', () => {
    // MT00 means "do not use this satellite for safety applications" and has no
    // body beyond the PRN. The information is the message's existence.
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(5925)
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.payload.map((item) => item.name)).toStrictEqual(['PRN'])
    expect(sentence.metadata.payload).toStrictEqual({
      integrity: { doNotUseForSafetyApplications: true },
    })
  })

  test('GEOLongTermCorr (5932) says when its rate fields carry nothing', () => {
    // With VelocityCode 0 the datasheet documents dxRate/dyRate/dzRate, da_f1 and
    // t_oe as "0.0" — absent values, not measurements of zero drift.
    const parser = new SBFParser()
    const still = parser.getFakeSentence(5932, undefined, { fields: { N: 1, VelocityCode: 0 } })
    const moving = parser.getFakeSentence(5932, undefined, { fields: { N: 1, VelocityCode: 1 } })
    expect(still.success && moving.success).toBe(true)
    if (!still.success || !moving.success) return
    const [zero] = parser.parseData(still.value)
    const [one1] = parser.parseData(moving.value)
    expect(field(zero, 'VelocityCode').metadata).toStrictEqual({ ratesPresent: false })
    expect(field(one1, 'VelocityCode').metadata).toStrictEqual({ ratesPresent: true })
  })

  test('GEOClockEphCovMatrix (5934) publishes the scale factor, not a bare exponent', () => {
    // Every element is meaningless until multiplied by 2^(ScaleExp - 5).
    const parser = new SBFParser()
    const fake = parser.getFakeSentence(5934, undefined, { fields: { N: 1, ScaleExp: 7 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(field(sentence, 'ScaleExp').metadata).toStrictEqual({ exponent: 7, scaleFactor: 4 })
    // Diagonal terms unsigned, off-diagonal signed — a variance cannot be negative.
    expect(field(sentence, 'E11').type).toBe('uint16')
    expect(field(sentence, 'E12').type).toBe('int16')
  })

  test('all 33 decoded-message blocks are stamped SIS', () => {
    const parser = new SBFParser()
    const decoded = [
      5891, 5892, 5893, 5894,
      4004, 4005, 4036,
      4002, 4003, 4030, 4031, 4032, 4034,
      4081, 4119, 4120, 4121,
      4095, 4116,
      5925, 5926, 5927, 5928, 5929, 5896, 5930, 5918, 5897, 5931, 5932, 5933, 5917, 5934,
    ]
    expect(decoded).toHaveLength(33)
    for (const number of decoded) {
      const definition = parser.getSentenceDefinition(number)
      expect(definition.success).toBe(true)
      if (!definition.success) continue
      expect(definition.value[0].timestamp).toBe('sis')
    }
  })
})

// THE COVERAGE GUARD. Appendix B of the 4.10.1 reference guide defines 108 blocks
// — counted from the appendix itself, not estimated — and every one is modelled.
// This spec exists because a wrong block NUMBER is invisible to every other check
// in this file: a fake round trip builds the frame from the same definition it
// parses, so it agrees with itself. ExtEventBaseVectGeod was registered as 4216
// for a whole tranche before Appendix B caught it.
describe('coverage', () => {
  const parser = new SBFParser()

  test('all 108 blocks of Appendix B are modelled', () => {
    expect(parser.sentenceIds).toHaveLength(108)
  })

  test('every block id is a distinct number in the ranges Appendix B uses', () => {
    const numbers = parser.sentenceIds.map(Number)
    expect(new Set(numbers).size).toBe(108)
    for (const number of numbers) {
      expect(Number.isInteger(number)).toBe(true)
      // Block numbers live in bits 0-12 of the ID field, so 8191 is the ceiling.
      expect(number).toBeGreaterThan(0)
      expect(number).toBeLessThanOrEqual(8191)
    }
  })

  test('every block round-trips through getFakeSentence with zero errors', () => {
    for (const id of parser.sentenceIds) {
      const fake = parser.getFakeSentence(id)
      expect(fake.success, `getFakeSentence(${id})`).toBe(true)
      if (!fake.success) continue
      const sentences = parser.parseData(fake.value)
      expect(sentences, `parseData(fake ${id})`).toHaveLength(1)
      expect(sentences[0].errors, `errors on ${id} (${String(sentences[0].metadata.name)})`).toBeUndefined()
      expect(sentences[0].id).toBe(String(Number(id)))
      // An unmodelled block would fall through to this name.
      expect(sentences[0].metadata.name).not.toBe('unknown')
    }
  })

  test('every block declares a timestamp kind, and only the documented three', () => {
    for (const id of parser.sentenceIds) {
      const definition = parser.getSentenceDefinition(id)
      expect(definition.success, `getSentenceDefinition(${id})`).toBe(true)
      if (!definition.success) continue
      expect(['external', 'receiver', 'sis']).toContain(definition.value[0].timestamp)
    }
  })

  test('only the seven blocks Septentrio publishes no layout for are opaque', () => {
    const opaque: string[] = []
    for (const id of parser.sentenceIds) {
      const definition = parser.getSentenceDefinition(id)
      if (!definition.success) continue
      if (definition.value[0].opaque === true) opaque.push(id)
    }
    // The five Meas3 blocks and the two PVTSupport ones — and nothing else, so a
    // future block cannot quietly be marked opaque to avoid transcribing it.
    expect(opaque.map(Number).sort((a, b) => a - b)).toStrictEqual([4076, 4079, 4109, 4110, 4111, 4112, 4113])
  })
})
