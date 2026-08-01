// coded
import { DO_NOT_USE_INT16, DO_NOT_USE_UINT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label, scaled } from '../../../utils'
import { satelliteId } from '../satellites'

/* SatVisibility -> Number: 4012 => "OnChange" interval: 1s
  This block contains the azimuth and elevation of all the satellites above the
  horizon for which the ephemeris or almanac is available.

  SatVisibility --------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  N              uint8                    Number of satellites for which information is provided in this SBF block,
                                          i.e. number of SatInfo sub-blocks.
  SBLength       uint8  1 byte            Length of one SatInfo sub-block
  SatInfo                                 A succession of N SatInfo sub-blocks
  Padding         uint                    Padding bytes

  SatInfo --------------------------------------------------------------------
  Block fields    Type       Units  Do-Not-Use  Description
  SVID           uint8                          Satellite ID, see §4.1.9
  FreqNr         uint8                      0   For GLONASS FDMA signals, the frequency number with an offset of 8,
                                                ranging 1 (actual -7) to 21 (actual 13). Otherwise reserved.
  Azimuth       uint16  0.01 degrees    65535   Azimuth. 0 is North, and azimuth increases towards East.
  Elevation      int16  0.01 degrees   -32768   Elevation relative to local horizontal plane.
  RiseSet        uint8                          Rise/set indicator:
                                                  0:   satellite setting
                                                  1:   satellite rising
                                                  255: elevation rate unknown
  SatelliteInfo  uint8                          Satellite visibility info based on:
                                                  1:   almanac
                                                  2:   ephemeris
                                                  255: unknown
  Padding         uint                          Padding bytes

  Note the difference from ChannelStatus: there the azimuth is a 9-bit field inside
  a bit field and whole degrees; here it is a full uint16 in hundredths. Same
  quantity, two encodings, one datasheet.
*/
const SAT_INFO: readonly FieldDefinition[] = [
  { name: 'SVID', type: 'uint8', description: 'Satellite ID (§4.1.9)' },
  { name: 'FreqNr', type: 'uint8', doNotUse: 0, description: 'GLONASS FDMA frequency number with an offset of 8 (1 means -7, 21 means 13); reserved for other constellations' },
  { name: 'Azimuth', type: 'uint16', units: '0.01 deg', doNotUse: DO_NOT_USE_UINT16, description: 'Azimuth; 0 is North, increasing towards East' },
  { name: 'Elevation', type: 'int16', units: '0.01 deg', doNotUse: DO_NOT_USE_INT16, description: 'Elevation relative to the local horizontal plane' },
  { name: 'RiseSet', type: 'uint8', description: 'Rise/set indicator: 0 setting, 1 rising, 255 elevation rate unknown' },
  { name: 'SatelliteInfo', type: 'uint8', description: 'What the visibility is based on: 1 almanac, 2 ephemeris, 255 unknown' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of satellites reported in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one SatInfo sub-block' },
  { name: 'SatInfo', count: 'N', length: 'SBLength', fields: SAT_INFO, description: 'A succession of N SatInfo sub-blocks, one per visible satellite' },
]

export const SAT_RISE_SET: Readonly<Record<number, string>> = {
  0: 'SETTING',
  1: 'RISING',
  255: 'ELEVATION_RATE_UNKNOWN',
}

export const SATELLITE_INFO_SOURCE: Readonly<Record<number, string>> = {
  1: 'ALMANAC',
  2: 'EPHEMERIS',
  255: 'UNKNOWN',
}

const decoders: Readonly<Record<string, Decoder>> = {
  // §4.1.9: SVID -> constellation + RINEX name, the form a human reads.
  SVID: satelliteId,
  Azimuth: (value) => scaled(value, 100, 'deg'),
  Elevation: (value) => scaled(value, 100, 'deg'),
  RiseSet: (value) => label(SAT_RISE_SET, value),
  SatelliteInfo: (value) => label(SATELLITE_INFO_SOURCE, value),
}

export const satVisibility: BlockDefinition = {
  name: 'SatVisibility',
  number: 4012,
  description: 'Azimuth and elevation of every satellite above the horizon for which an ephemeris or almanac is available',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  payloadMetadata: ({ N }) => (typeof N === 'number') ? { satellites: { visible: N } } : {},
}
