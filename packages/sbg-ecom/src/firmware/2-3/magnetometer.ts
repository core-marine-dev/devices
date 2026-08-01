// coded
import { TIME_STAMP } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState } from '../../utils'

/* SBG_ECOM_LOG_MAG (04) — §2.3.6.1 "Magnetometer"

  Field       Unit  Format  Size  Offset
  TIME_STAMP  µs    uint32     4       0
  MAG_STATUS  -     uint16     2       4
  MAG_X       a.u   float      4       6   Magnetometer output, X axis
  MAG_Y       a.u   float      4      10
  MAG_Z       a.u   float      4      14
  ACCEL_X     m/s²  float      4      18   Accelerometer output, X axis
  ACCEL_Y     m/s²  float      4      22
  ACCEL_Z     m/s²  float      4      26
                          Total size 30    <- MEASURED: LEN 30 in the corpus

  The magnetometer unit really is `a.u` — arbitrary units. The device reports a
  normalised field strength, not teslas, so the value is only meaningful relative
  to itself and to the calibration.
*/
const magneticStatus: Decoder = (value) => ({
  magnetometerXOk: bitState(value, 0),
  magnetometerYOk: bitState(value, 1),
  magnetometerZOk: bitState(value, 2),
  accelerometerXOk: bitState(value, 3),
  accelerometerYOk: bitState(value, 4),
  accelerometerZOk: bitState(value, 5),
  magnetometersInRange: bitState(value, 6),
  accelerometersInRange: bitState(value, 7),
  calibrationOk: bitState(value, 8),
})

const axis = (name: string, units: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units, description })

const MAG_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'MAG_STATUS', type: 'uint16', description: 'Magnetometer status: per-axis self test for the magnetometer and its companion accelerometer, saturation, and whether the magnetometer appears calibrated' },
  axis('MAG_X', 'a.u', 'Magnetometer output, X axis, in arbitrary units — a normalised field strength, not teslas'),
  axis('MAG_Y', 'a.u', 'Magnetometer output, Y axis'),
  axis('MAG_Z', 'a.u', 'Magnetometer output, Z axis'),
  axis('ACCEL_X', 'm/s2', 'Companion accelerometer output, X axis'),
  axis('ACCEL_Y', 'm/s2', 'Companion accelerometer output, Y axis'),
  axis('ACCEL_Z', 'm/s2', 'Companion accelerometer output, Z axis'),
]

export const magnetometer: LogDefinition = {
  name: 'SBG_ECOM_LOG_MAG',
  message: 4,
  description: 'Magnetometer data with the associated accelerometer readings, as used by the magnetic heading solution',
  fields: MAG_FIELDS,
  decoders: { MAG_STATUS: magneticStatus },
}

/* SBG_ECOM_LOG_MAG_CALIB (05) — §2.3.6.2 "Magnetometer calibration data"

  Field       Unit  Format    Size  Offset
  TIME_STAMP  µs    uint32       4       0
  RESERVED    -     uint16       2       4
  BUFFER      -     16 bytes    16       6   Raw magnetic calibration buffer
                             Total size 22

  BUFFER has no published layout — §2.3.6.2 calls the whole log "a RAW buffer for
  magnetic calibration procedure", and it is consumed by SBG's own calibration
  tool, not by a telemetry pipeline. The two header fields ARE documented, so they
  are decoded; the 16 bytes land in metadata.trailing as base64 rather than being
  split into invented fields. */
const CALIB_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'RESERVED', type: 'uint16', reserved: true, description: 'Reserved for future use' },
]

export const magnetometerCalibration: LogDefinition = {
  name: 'SBG_ECOM_LOG_MAG_CALIB',
  message: 5,
  description: 'Magnetometer calibration data. The 16-byte calibration buffer has no published layout and is emitted as opaque bytes at metadata.trailing — it is input for SBG\'s calibration tool, not telemetry.',
  fields: CALIB_FIELDS,
}
