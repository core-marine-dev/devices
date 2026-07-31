// coded
import { pvtError, pvtMode } from './common'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { degrees } from '../../../utils'

/* PosLocal (4052) and PosProjected (4094), §4.2.9.

  Both report the position in a LOCAL datum, transformed with parameters the RTK
  service provider sends in RTCM MT1021-MT1027, and both point at the RTCMDatum
  block whose `Datum` field matches theirs for the datum name, the height
  interpretation and the transformation quality.

  PosLocal reports (Lat, Lon, Alt) relative to the local datum; PosProjected
  reports (Northing, Easting, Alt) in the plane grid. Everything else about them is
  identical, including the extra error code 17.

  ⚠️ ERROR CODE 17 EXISTS ONLY IN THESE TWO BLOCKS: "Datum transformation
  parameters unknown". It means the receiver has not (yet) received the MT1021+
  messages, so the local position simply cannot be computed — a configuration or
  service state, not a GNSS failure. It is worth distinguishing, because everything
  else in the stream can look perfectly healthy while these blocks stay empty.

  PosLocal / PosProjected ----------------------------------------------------
  Block fields   Type  Units Do-Not-Use  Description
  Mode          uint8                    Bit field indicating the GNSS PVT mode (see PVTGeodetic)
  Error         uint8                    PVT error code, plus 17: Datum transformation parameters unknown
  <coordinates: Lat/Lon/Alt or Northing/Easting/Alt, all float64, Do-Not-Use -2 * 10¹⁰>
  Datum         uint8                    Reference frame the position relates to. A value in the 20 to 24 range means
                                         the parameters are in the RTCMDatum block with a matching Datum field. Value
                                         25 is the local coordinate reference system selected with setLocalCoordOperation.
  Padding        uint                    Padding bytes
*/
const LOCAL_ERROR_DESCRIPTION = 'PVT error code; 0 means no error, and 17 means the datum transformation parameters are not known yet (no MT1021+ received)'

const DATUM_DESCRIPTION = 'Reference frame the position relates to; 20-24 point at the RTCMDatum block with the same Datum, and 25 is the local CRS set with setLocalCoordOperation'

const head: readonly FieldDefinition[] = [
  { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
  { name: 'Error', type: 'uint8', description: LOCAL_ERROR_DESCRIPTION },
]

const coordinate = (name: string, units: string, description: string): FieldDefinition =>
  ({ name, type: 'float64', units, doNotUse: DO_NOT_USE_FLOAT, description })

// Error 17 is documented only for these two blocks, so it is added on top of the
// shared PVT error table rather than in it.
const DATUM_TRANSFORMATION_UNKNOWN = 17

const localError: Decoder = (value, values) => (value === DATUM_TRANSFORMATION_UNKNOWN)
  ? { label: 'DATUM_TRANSFORMATION_PARAMETERS_UNKNOWN' }
  : pvtError(value, values)

const decoders: Readonly<Record<string, Decoder>> = {
  Mode: pvtMode,
  Error: localError,
}

export const posLocal: BlockDefinition = {
  name: 'PosLocal',
  number: 4052,
  description: 'Position in a local datum (latitude, longitude, altitude), transformed with the parameters the RTK service provider transmits',
  timestamp: 'receiver',
  revisions: [[
    ...head,
    coordinate('Lat', 'rad', 'Latitude in the local datum, from -π/2 to +π/2, positive North of the Equator'),
    coordinate('Lon', 'rad', 'Longitude in the local datum, from -π to +π, positive East of Greenwich'),
    coordinate('Alt', 'm', 'Height; see the HeightType field of the corresponding RTCMDatum block for how to interpret it'),
    { name: 'Datum', type: 'uint8', description: DATUM_DESCRIPTION },
  ]],
  decoders: { ...decoders, Lat: (value) => degrees(value), Lon: (value) => degrees(value) },
  payloadMetadata: ({ Lat, Lon, Alt }) => {
    if (typeof Lat !== 'number' || typeof Lon !== 'number') return {}
    return {
      position: {
        latitude: (degrees(Lat).value as number),
        longitude: (degrees(Lon).value as number),
        altitude: Alt,
      },
    }
  },
}

export const posProjected: BlockDefinition = {
  name: 'PosProjected',
  number: 4094,
  description: 'Projected coordinates (northing, easting, altitude) in the plane grid of a local datum',
  timestamp: 'receiver',
  revisions: [[
    ...head,
    coordinate('Northing', 'm', 'Northing coordinate in the plane grid representation'),
    coordinate('Easting', 'm', 'Easting coordinate in the plane grid representation'),
    coordinate('Alt', 'm', 'Height; see the HeightType field of the corresponding RTCMDatum block for how to interpret it'),
    { name: 'Datum', type: 'uint8', description: DATUM_DESCRIPTION },
  ]],
  decoders,
  payloadMetadata: ({ Northing, Easting, Alt }) => {
    if (typeof Northing !== 'number' || typeof Easting !== 'number') return {}
    return { position: { northing: Northing, easting: Easting, altitude: Alt, units: 'm' } }
  },
}
