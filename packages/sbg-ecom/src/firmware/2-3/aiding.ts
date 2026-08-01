// coded
import { TIME_STAMP, metres } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState } from '../../utils'

/* The remaining aiding-sensor logs: odometer, air data, DVL, depth and USBL
   (§2.3.6.7 to §2.3.6.11).

   Two of them redefine TIME_STAMP conditionally — AIR_DATA and DEPTH can carry a
   measurement DELAY there instead of an uptime, flagged by bit 0 of their status
   word. That is decoded, because reading a delay as an uptime would place the
   sample at the dawn of the device's life. */

/* SBG_ECOM_LOG_ODO_VEL (19) — §2.3.6.7 "Odometer velocity"
  TIME_STAMP µs uint32 4 @0 · ODO_STATUS - uint16 2 @4 · ODO_VEL m/s float 4 @6
                                                            Total size 10 */
const odometerStatus: Decoder = (value) => ({
  // A false here means the log came from a TIMEOUT, not from a pulse — i.e. the
  // zero velocity is an assumption, not a measurement.
  realMeasurement: bitState(value, 0),
  timeSynchronised: bitState(value, 1),
})

export const odometerVelocity: LogDefinition = {
  name: 'SBG_ECOM_LOG_ODO_VEL',
  message: 19,
  description: 'External velocity aiding along the IMU X axis (direction of travel), from a pulse odometer or a vehicle CAN bus. Asynchronous: sent when a new pulse arrives.',
  fields: [
    TIME_STAMP,
    { name: 'ODO_STATUS', type: 'uint16', description: 'Bit 0 is set when this log comes from a real pulse measurement rather than a timeout; bit 1 when the velocity is correctly time synchronised' },
    { name: 'ODO_VEL', type: 'float32', units: 'm/s', description: 'Velocity in the odometer direction' },
  ],
  decoders: { ODO_STATUS: odometerStatus },
}

/* SBG_ECOM_LOG_AIR_DATA (36) — §2.3.6.8 "Airdata, altitude and true airspeed"
  TIME_STAMP/DELAY µs uint32 4 @0 · AIRDATA_STATUS - uint16 2 @4
  PRESSURE_ABS Pa float 4 @6 · ALTITUDE m float 4 @10 · PRESSURE_DIFF Pa float 4 @14
  TRUE_AIRSPEED m/s float 4 @18 · AIR_TEMPERATURE °C float 4 @22
                                                  Total size 26  <- MEASURED

  Unusually, this log is BOTH an output and an input: the same shape injects an
  external altitude/airspeed aiding measurement into the INS. Which is why its
  first field may be a delay — on the input path the sender knows the measurement
  latency, not the device's uptime. */
const airDataStatus: Decoder = (value) => ({
  timeIsDelay: bitState(value, 0),
  pressureAbsoluteValid: bitState(value, 1),
  altitudeValid: bitState(value, 2),
  pressureDifferentialValid: bitState(value, 3),
  airspeedValid: bitState(value, 4),
  temperatureValid: bitState(value, 5),
})

export const airData: LogDefinition = {
  name: 'SBG_ECOM_LOG_AIR_DATA',
  message: 36,
  description: 'Barometric altitude and true airspeed. Used as an output AND as an input for external aiding, which is why its first field may carry a measurement delay instead of an uptime — see AIRDATA_STATUS bit 0.',
  fields: [
    { ...TIME_STAMP, name: 'TIME_STAMP', description: 'Uptime since power on, OR a measurement delay when AIRDATA_STATUS reports timeIsDelay. Check that flag before treating this as an uptime.' },
    { name: 'AIRDATA_STATUS', type: 'uint16', description: 'Which fields of this log are filled and valid, and whether TIME_STAMP is a delay rather than an uptime' },
    { name: 'PRESSURE_ABS', type: 'float32', units: 'Pa', description: 'Raw absolute pressure from the barometer' },
    metres('ALTITUDE', 'Altitude computed from the barometric altimeter, referenced by default to a standard 1013.25 hPa zero level'),
    { name: 'PRESSURE_DIFF', type: 'float32', units: 'Pa', description: 'Raw differential pressure from the pitot tube' },
    { name: 'TRUE_AIRSPEED', type: 'float32', units: 'm/s', description: 'True airspeed from the pitot tube' },
    { name: 'AIR_TEMPERATURE', type: 'float32', units: 'degC', description: 'Outside air temperature used for the airspeed computation' },
  ],
  decoders: { AIRDATA_STATUS: airDataStatus },
}

/* SBG_ECOM_LOG_DVL_BOTTOM_TRACK (29) / DVL_WATER_TRACK (30) — §2.3.6.9
  TIME_STAMP µs uint32 4 @0 · DVL_STATUS - uint16 2 @4
  VELOCITY_X/Y/Z m/s float 4 @6/10/14 · VELOCITY_QUALITY_X/Y/Z m/s float 4 @18/22/26
                                                            Total size 30 */
const dvlStatus: Decoder = (value) => ({
  velocityValid: bitState(value, 0),
  timeSynchronised: bitState(value, 1),
})

const dvlAxis = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm/s', description })

const DVL_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'DVL_STATUS', type: 'uint16', description: 'Bit 0 is set when the DVL measured a valid velocity; bit 1 when the data is accurately time stamped from a Sync In or Sync Out' },
  dvlAxis('VELOCITY_X', 'Velocity X in the DVL instrument frame'),
  dvlAxis('VELOCITY_Y', 'Velocity Y in the DVL instrument frame'),
  dvlAxis('VELOCITY_Z', 'Velocity Z in the DVL instrument frame'),
  dvlAxis('VELOCITY_QUALITY_X', 'X velocity quality in the DVL instrument frame'),
  dvlAxis('VELOCITY_QUALITY_Y', 'Y velocity quality in the DVL instrument frame'),
  dvlAxis('VELOCITY_QUALITY_Z', 'Z velocity quality in the DVL instrument frame'),
]

const dvlLog = (name: string, message: number, what: string): LogDefinition => ({
  name,
  message,
  description: `Doppler Velocity Log ${what} velocity, in the DVL instrument frame. The time stamp dates the DVL measurement itself.`,
  fields: DVL_FIELDS,
  decoders: { DVL_STATUS: dvlStatus },
})

export const dvlBottomTrack = dvlLog('SBG_ECOM_LOG_DVL_BOTTOM_TRACK', 29, 'bottom-tracking')
export const dvlWaterTrack = dvlLog('SBG_ECOM_LOG_DVL_WATER_TRACK', 30, 'water-layer')

/* SBG_ECOM_LOG_DEPTH (47) — §2.3.6.10 "Depth Sensor"
  TIME_STAMP µs uint32 4 @0 · DEPTH_STATUS - uint16 2 @4
  PRESSURE_ABS Pa float 4 @6 · DEPTH m float 4 @10       Total size 14

  ⚠️ The datasheet's Unit column says `m/s` for DEPTH while its own description says
  "Underwater depth measurement, positive upward". A depth is not a speed; `m` is
  used here and the discrepancy is recorded rather than propagated. */
const depthStatus: Decoder = (value) => ({
  timeIsDelay: bitState(value, 0),
  pressureAbsoluteValid: bitState(value, 1),
  depthValid: bitState(value, 2),
})

export const depth: LogDefinition = {
  name: 'SBG_ECOM_LOG_DEPTH',
  message: 47,
  description: 'Pressure and depth from a subsea depth sensor, for underwater navigation. The time stamp dates the depth measurement itself, or is a delay when DEPTH_STATUS reports timeIsDelay.',
  fields: [
    { ...TIME_STAMP, description: 'Uptime since power on, OR a measurement delay when DEPTH_STATUS reports timeIsDelay' },
    { name: 'DEPTH_STATUS', type: 'uint16', description: 'Whether TIME_STAMP is a delay, and which of the pressure and depth fields are filled and valid' },
    { name: 'PRESSURE_ABS', type: 'float32', units: 'Pa', description: 'Absolute water pressure' },
    metres('DEPTH', 'Underwater depth measurement, positive UPWARD. (The datasheet\'s unit column says m/s for this field; it is a length.)'),
  ],
  decoders: { DEPTH_STATUS: depthStatus },
}

/* SBG_ECOM_LOG_USBL (37) — §2.3.6.11 "USBL position"
  TIME_STAMP µs uint32 4 @0 · USBL_STATUS - uint16 2 @4
  LATITUDE ° double 8 @6 · LONGITUDE ° double 8 @14 · DEPTH m float 4 @22
  LATITUDE_STD/LONGITUDE_STD/DEPTH_STD m float 4 @26/30/34   Total size 38

  Note DEPTH is positive DOWN here, the opposite of SBG_ECOM_LOG_DEPTH's positive
  UP. Both signs are the datasheet's; they are not reconciled, only documented. */
const usblStatus: Decoder = (value) => ({
  timeSynchronised: bitState(value, 0),
  positionValid: bitState(value, 1),
  depthValid: bitState(value, 2),
})

export const usbl: LogDefinition = {
  name: 'SBG_ECOM_LOG_USBL',
  message: 37,
  description: 'Position as returned by a USBL beacon, for subsea navigation. The time stamp dates the positioning data itself.',
  fields: [
    TIME_STAMP,
    { name: 'USBL_STATUS', type: 'uint16', description: 'Whether the USBL equipment initialised correctly, and whether the 2D position and the depth are valid' },
    { name: 'LATITUDE', type: 'float64', units: 'deg', description: 'Latitude, positive North' },
    { name: 'LONGITUDE', type: 'float64', units: 'deg', description: 'Longitude, positive East' },
    metres('DEPTH', 'Depth below mean sea level, positive DOWN — the opposite sign to SBG_ECOM_LOG_DEPTH, which is positive up'),
    metres('LATITUDE_STD', '1 sigma latitude accuracy'),
    metres('LONGITUDE_STD', '1 sigma longitude accuracy'),
    metres('DEPTH_STD', '1 sigma depth accuracy'),
  ],
  decoders: { USBL_STATUS: usblStatus },
}
