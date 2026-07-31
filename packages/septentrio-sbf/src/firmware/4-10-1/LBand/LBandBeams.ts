// coded
import { DO_NOT_USE_INT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { scaled } from '../../../utils'
import { satelliteId } from '../satellites'

/* LBandBeams -> Number: 4204 => "OnChange" interval: block generated each time
   beam status data is decoded

  This block contains the name, longitude and beam frequency of the L-band
  geostationary satellites known by the receiver.

  LBandBeams -----------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  N              uint8                    Number of L-band beams for which data is provided in this SBF block, i.e.
                                          number of BeamInfo sub-blocks.
  SBLength       uint8  1 byte            Length of one sub-block
  BeamInfo                                A succession of N BeamInfo sub-blocks
  Padding         uint                    Padding bytes

  BeamInfo -------------------------------------------------------------------
  Block fields       Type         Units  Do-Not-Use  Description
  SVID              uint8                            SVID associated to the satellite for which information is provided in
                                                     this sub-block. SVID ranges from 107 to 119. See also §4.1.9.
  SatName         char[9]                            Satellite Name, right padded with zeros
  SatLongitude      int16  0.01 degrees      -32768   Satellite Longitude (positive east of Greenwich)
  BeamFreq         uint32          1 Hz           0   L-band beam center frequency
  Padding            uint                            Padding bytes
*/
const BEAM_INFO: readonly FieldDefinition[] = [
  { name: 'SVID', type: 'uint8', description: 'Satellite ID of the geostationary L-band satellite, 107 to 119 (§4.1.9)' },
  { name: 'SatName', type: 'string', length: 9, description: 'Satellite name, right-padded with zeros' },
  { name: 'SatLongitude', type: 'int16', units: '0.01 deg', doNotUse: DO_NOT_USE_INT16, description: 'Satellite longitude, positive east of Greenwich' },
  { name: 'BeamFreq', type: 'uint32', units: 'Hz', doNotUse: 0, description: 'Centre frequency of the L-band beam' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of L-band beams reported in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one BeamInfo sub-block' },
  { name: 'BeamInfo', count: 'N', length: 'SBLength', fields: BEAM_INFO, description: 'A succession of N BeamInfo sub-blocks, one per known beam' },
]

const HERTZ_PER_MEGAHERTZ = 1_000_000

const decoders: Readonly<Record<string, Decoder>> = {
  // §4.1.9: SVID -> constellation + RINEX name, the form a human reads.
  SVID: satelliteId,
  SatLongitude: (value) => scaled(value, 100, 'deg'),
  BeamFreq: (value) => scaled(value, HERTZ_PER_MEGAHERTZ, 'MHz'),
}

export const lBandBeams: BlockDefinition = {
  name: 'LBandBeams',
  number: 4204,
  description: 'Name, longitude and beam frequency of the L-band geostationary satellites the receiver knows about',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
