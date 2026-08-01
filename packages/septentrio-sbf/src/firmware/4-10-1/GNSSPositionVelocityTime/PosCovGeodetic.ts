// coded
import { pvtError, pvtMode } from './common'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'

/* PosCovGeodetic -> Number: 5906 => "OnChange" interval: default PVT output rate
  This block contains the elements of the symmetric variance-covariance matrix of
  the position expressed in the geodetic coordinates in the datum requested by
  the user:

    ( σ²φ   σφλ   σφh   σφb )
    ( σλφ   σ²λ   σλh   σλb )
    ( σhφ   σhλ   σ²h   σhb )
    ( σbφ   σbλ   σbh   σ²b )

  Please refer to the PosCovCartesian block description for a general explanation
  of the contents.

  Note that the units of measure for all the variances and covariances, for
  height as well as for latitude and longitude, are m² for ease of
  interpretation.

  If the ellipsoidal height is not estimated (2D-mode), all height related
  components of the variance-covariance matrix are undefined and set to their
  Do-Not-Use value.

  PosCovGeodetic -------------------------------------------------------------
  Block fields     Type  Units Do-Not-Use  Description
  Mode            uint8                    Bit field indicating the GNSS PVT mode (see PVTGeodetic)
  Error           uint8                    PVT error code (see PVTGeodetic)
  Cov_latlat    float32   1 m²  -2 * 10¹⁰  Variance of the latitude estimate
  Cov_lonlon    float32   1 m²  -2 * 10¹⁰  Variance of the longitude estimate
  Cov_hgthgt    float32   1 m²  -2 * 10¹⁰  Variance of the height estimate
  Cov_bb        float32   1 m²  -2 * 10¹⁰  Variance of the clock-bias estimate
  Cov_latlon    float32   1 m²  -2 * 10¹⁰  Covariance between the latitude and longitude estimates
  Cov_lathgt    float32   1 m²  -2 * 10¹⁰  Covariance between the latitude and height estimates
  Cov_latb      float32   1 m²  -2 * 10¹⁰  Covariance between the latitude and clock-bias estimates
  Cov_lonhgt    float32   1 m²  -2 * 10¹⁰  Covariance between the longitude and height estimates
  Cov_lonb      float32   1 m²  -2 * 10¹⁰  Covariance between the longitude and clock-bias estimates
  Cov_hb        float32   1 m²  -2 * 10¹⁰  Covariance between the height and clock-bias estimates
  Padding          uint                    Padding bytes
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
  { name: 'Error', type: 'uint8', description: 'PVT error code; 0 means no error' },
  { name: 'Cov_latlat', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the latitude estimate' },
  { name: 'Cov_lonlon', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the longitude estimate' },
  { name: 'Cov_hgthgt', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the height estimate' },
  { name: 'Cov_bb', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the clock-bias estimate' },
  { name: 'Cov_latlon', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between the latitude and longitude estimates' },
  { name: 'Cov_lathgt', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between the latitude and height estimates' },
  { name: 'Cov_latb', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between the latitude and clock-bias estimates' },
  { name: 'Cov_lonhgt', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between the longitude and height estimates' },
  { name: 'Cov_lonb', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between the longitude and clock-bias estimates' },
  { name: 'Cov_hb', type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between the height and clock-bias estimates' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  Mode: pvtMode,
  Error: pvtError,
}

export const posCovGeodetic: BlockDefinition = {
  name: 'PosCovGeodetic',
  number: 5906,
  description: 'Variance-covariance matrix of the position in geodetic coordinates (latitude, longitude, height, clock bias), in m²',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
