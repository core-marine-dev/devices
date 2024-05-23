import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 36 -> SBG_ECOM_LOG_AIR_DATA => Barometric altimeter input / output for airdata support
 * Field               Offset  Size  Format    Unit  Description
 * TIME_STAMP / DELAY       0     4  uint32      μs  Time since sensor is powered up or measurement delay
 * AIRDATA_STATUS           4     2  uint16       -  Airdata information status
 * PRESSURE_ABS             6     4   float      Pa  Raw absolute pressure measured by the barometer sensor
 * ALTITUDE                10     4   float       m  Altitude computed from barometric altimeter
 * PRESSURE_DIFF           14     4   float      Pa  Raw differential pressure measured by the pitot tube
 * TRUE_AIRSPEED           18     4   float  m.s^-1  True airspeed measured by the pitot tube
 * AIR_TEMPERATURE         22     4   float      °C  Outside air temperature used for airspeed computations
 *              Total size 26
 *
 * AIRDATA_STATUS definition
 * Bit       Type  Name Description
 *  0 (LSB)  Mask  SBG_ECOM_AIR_DATA_TIME_IS_DELAY        Set to 1 if the TIME_STAMP field is a measurement delay instead of an absolute time stamping information.
 *  1        Mask  SBG_ECOM_AIR_DATA_PRESSURE_ABS_VALID   Set to 1 if the absolute pressure field is filled and valid.
 *  2        Mask  SBG_ECOM_AIR_DATA_ALTITUDE_VALID       Set to 1 if the barometric altitude field is filled and valid.
 *  3        Mask  SBG_ECOM_AIR_DATA_PRESSURE_DIFF_VALID  Set to 1 if the differential pressure field is filled and valid.
 *  4        Mask  SBG_ECOM_AIR_DATA_AIRSPEED_VALID       Set to 1 if the true airspeed field is filled and valid.
 *  5        Mask  SBG_ECOM_AIR_DATA_TEMPERATURE_VALID    Set to 1 if the output air temperature field is filled and valid.
*/
interface AirDataStatus {
  SBG_ECOM_AIR_DATA_TIME_IS_DELAY: boolean
  SBG_ECOM_AIR_DATA_PRESSURE_ABS_VALID: boolean
  SBG_ECOM_AIR_DATA_ALTITUDE_VALID: boolean
  SBG_ECOM_AIR_DATA_PRESSURE_DIFF_VALID: boolean
  SBG_ECOM_AIR_DATA_AIRSPEED_VALID: boolean
  SBG_ECOM_AIR_DATA_TEMPERATURE_VALID: boolean
}

const getAirDataStatus = (airdataStatus: number): AirDataStatus => ({
  SBG_ECOM_AIR_DATA_TIME_IS_DELAY: bitStatus(airdataStatus, 0),
  SBG_ECOM_AIR_DATA_PRESSURE_ABS_VALID: bitStatus(airdataStatus, 1),
  SBG_ECOM_AIR_DATA_ALTITUDE_VALID: bitStatus(airdataStatus, 2),
  SBG_ECOM_AIR_DATA_PRESSURE_DIFF_VALID: bitStatus(airdataStatus, 3),
  SBG_ECOM_AIR_DATA_AIRSPEED_VALID: bitStatus(airdataStatus, 4),
  SBG_ECOM_AIR_DATA_TEMPERATURE_VALID: bitStatus(airdataStatus, 5)
})

const getData = (payload: Buffer): object => {
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    airdataStatus: payload.readUIntLE(4, 2),
    pressureAbsolute: payload.readFloatLE(6),
    altitude: payload.readFloatLE(10),
    pressureDifferential: payload.readFloatLE(14),
    trueAirspeed: payload.readFloatLE(18),
    airTemperature: payload.readFloatLE(22),
    metadata: {}
  }
  data.metadata = {
    heaveStatus: getAirDataStatus(data.airdataStatus)
  }
  return data
}

export const SBG_ECOM_LOG_AIR_DATA = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_AIR_DATA'
  const data = getData(payload)
  return { name, data }
}
