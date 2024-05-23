import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID = 01 -> SBG_ECOM_LOG_STATUS => Status general, clock, com aiding, solution, heave
 * Field          Offset  Size Format Unit Description
 * TIME STAMP          0     4 uint32   µs Time since sensor is powered up
 * GENERAL STATUS      4     2 uint16    - General status bitmask and enums
 * RESERVED 1          6     2 uint16    - Reserved status field for future use
 * COM STATUS          8     4 uint32    - Communication status bitmask and enums
 * AIDING STATUS      12     4 uint32    - Aiding equipment status bitmask and enums
 * RESERVED 2         16     4 uint32    - Reserved status field for future use
 * RESERVED 3         20     2 uint16    - Reserved field for future use
 * UP TIME            22     4 uint32    s System up time since the power on
 *         Total size 26
 *
 * GENERAL_STATUS definition -> Provides general device status and information such as the power supplies (main, IMU, GNSS), settings, temperature and data-logger.
 * Bit  Name                             Type  Description
 *  0   SBG_ECOM_GENERAL_MAIN_POWER_OK   Mask  Set to 1 when main power supply is OK.
 *  1   SBG_ECOM_GENERAL_IMU_POWER_OK    Mask  Set to 1 when IMU power supply is OK.
 *  2   SBG_ECOM_GENERAL_GPS_POWER_OK    Mask  Set to 1 when GPS power supply is OK.
 *  3   SBG_ECOM_GENERAL_SETTINGS_OK     Mask  Set to 1 if settings were correctly loaded
 *  4   SBG_ECOM_GENERAL_TEMPERATURE_OK  Mask  Set to 1 when temperature is within specified limits.
 *  5   SBG_ECOM_GENERAL_DATALOGGER_OK   Mask  Set to 1 when the data-logger is working correctly.
 *  6   SBG_ECOM_GENERAL_CPU_OK          Mask  Set to 1 if the CPU headroom is correct.
 *
 * COM_STATUS definition -> Provide information on ports, tells is they are valid or saturated.
 * Bit    Name                   Type  Description
 *  0     SBG_ECOM_PORTA_VALID   Mask  Set to 0 in case of low level communication error.
 *  1     SBG_ECOM_PORTB_VALID   Mask  Set to 0 in case of low level communication error.
 *  2     SBG_ECOM_PORTC_VALID   Mask  Set to 0 in case of low level communication error.
 *  3     SBG_ECOM_PORTD_VALID   Mask  Set to 0 in case of low level communication error.
 *  4     SBG_ECOM_PORTE_VALID   Mask  Set to 0 in case of low level communication error.
 *  5     SBG_ECOM_PORTA_RX_OK   Mask  Set to 0 in case of saturation on PORT A input
 *  6     SBG_ECOM_PORTA_TX_OK   Mask  Set to 0 in case of saturation on PORT A output
 *  7     SBG_ECOM_PORTB_RX_OK   Mask  Set to 0 in case of saturation on PORT B input
 *  8     SBG_ECOM_PORTB_TX_OK   Mask  Set to 0 in case of saturation on PORT B output
 *  9     SBG_ECOM_PORTC_RX_OK   Mask  Set to 0 in case of saturation on PORT C input
 * 10     SBG_ECOM_PORTC_TX_OK   Mask  Set to 0 in case of saturation on PORT C output
 * 11     SBG_ECOM_PORTD_RX_OK   Mask  Set to 0 in case of saturation on PORT D input
 * 12     SBG_ECOM_PORTD_TX_OK   Mask  Set to 0 in case of saturation on PORT D output
 * 13     SBG_ECOM_PORTE_RX_OK   Mask  Set to 0 in case of saturation on PORT E input
 * 14     SBG_ECOM_PORTE_TX_OK   Mask  Set to 0 in case of saturation on PORT E output
 * 15     SBG_ECOM_ETH0_VALID    Mask  Set to 0 in case of saturation on PORT ETH0
 * 16     SBG_ECOM_ETH1_VALID    Mask  Set to 0 in case of saturation on PORT ETH1
 * 17     SBG_ECOM_ETH2_VALID    Mask  Set to 0 in case of saturation on PORT ETH2
 * 18     SBG_ECOM_ETH3_VALID    Mask  Set to 0 in case of saturation on PORT ETH3
 * 19     SBG_ECOM_ETH4_VALID    Mask  Set to 0 in case of saturation on PORT ETH4
 * 25     SBG_ECOM_CAN_VALID     Mask  Set to 0 in case of low level communication error.
 * 26     SBG_ECOM_CAN_RX_OK     Mask  Set to 0 in case of saturation on CAN Bus input buffer
 * 27     SBG_ECOM_CAN_TX_OK     Mask  Set to 0 in case of saturation on CAN Bus output buffer
 * 28-30  SBG_ECOM_CAN_BUS       Enum  Define the CAN Bus status
 *
 * CAN Bus status enumeration
 * Value  Name                        Description
 *     0  SBG_ECOM_CAN_BUS_OFF        Bus OFF operation due to too much errors.
 *     1  SBG_ECOM_CAN_BUS_TX_RX_ERR  Transmit or received error.
 *     2  SBG_ECOM_CAN_BUS_OK         The CAN bus is working correctly.
 *     3  SBG_ECOM_CAN_BUS_ERROR      A general error has occurred on the CAN bus.
 *
 * AIDING_STATUS definition -> Tells which aiding data is received.
 * Bit  Name                           Type  Description
 *  0   SBG_ECOM_AIDING_GPS1_POS_RECV  Mask  Set to 1 when valid GPS 1 position data is received
 *  1   SBG_ECOM_AIDING_GPS1_VEL_RECV  Mask  Set to 1 when valid GPS 1 velocity data is received
 *  2   SBG_ECOM_AIDING_GPS1_HDT_RECV  Mask  Set to 1 when valid GPS 1 true heading data is received
 *  3   SBG_ECOM_AIDING_GPS1_UTC_RECV  Mask  Set to 1 when valid GPS 1 UTC time data is received
 *  4   SBG_ECOM_AIDING_GPS2_POS_RECV  Mask  Set to 1 when valid GPS 2 position data is received
 *  5   SBG_ECOM_AIDING_GPS2_VEL_RECV  Mask  Set to 1 when valid GPS 2 velocity data is received
 *  6   SBG_ECOM_AIDING_GPS2_HDT_RECV  Mask  Set to 1 when valid GPS 2 true heading data is received
 *  7   SBG_ECOM_AIDING_GPS2_UTC_RECV  Mask  Set to 1 when valid GPS 2 UTC time data is received
 *  8   SBG_ECOM_AIDING_MAG_RECV       Mask  Set to 1 when valid Magnetometer data is received
 *  9   SBG_ECOM_AIDING_ODO_RECV       Mask  Set to 1 when Odometer pulse is received
 * 10   SBG_ECOM_AIDING_DVL_RECV       Mask  Set to 1 when valid DVL data is received
 * 11   SBG_ECOM_AIDING_USBL_RECV      Mask  Set to 1 when valid USBL data is received
 * 12   SBG_ECOM_AIDING_DEPTH_RECV     Mask  Set to 1 when valid Depth sensor data is received
 * 13   SBG_ECOM_AIDING_AIR_DATA_RECV  Mask  Set to 1 when valid altitude and/or airspeed is received
 */
const getGeneralStatus = (generalStatus: number): object => {
  return {
    mainPowerOK: bitStatus(generalStatus, 0),
    imuPowerOK: bitStatus(generalStatus, 1),
    gpsPowerOK: bitStatus(generalStatus, 2),
    settingsOK: bitStatus(generalStatus, 3),
    temperatureOK: bitStatus(generalStatus, 4),
    dataloggerOK: bitStatus(generalStatus, 5),
    cpuOK: bitStatus(generalStatus, 6)
  }
}

const CANBUS_STATUSES = [
  'SBG_ECOM_CAN_BUS_OFF',
  'SBG_ECOM_CAN_BUS_TX_RX_ERR',
  'SBG_ECOM_CAN_BUS_OK',
  'SBG_ECOM_CAN_BUS_ERROR',
  'UNKNOWN'
] as const
type CANBusStatus = typeof CANBUS_STATUSES[number]

const getCANBusStatus = (comstatus: number): CANBusStatus => {
  /** Value  Bit 30 Bit 29 Bit 28  State
   *    0       0      0      0    SBG_ECOM_CAN_BUS_OFF
   *    1       0      0      1    SBG_ECOM_CAN_BUS_TX_RX_ERR
   *    2       0      1      0    SBG_ECOM_CAN_BUS_OK
   *    3       1      0      0    SBG_ECOM_CAN_BUS_ERROR
   *  other     x      y      z    UNKNOWN
   */
  const mask = 0b0011_1100_0000_0000_0000_0000_0000_0000
  const num = (mask & comstatus) >>> 28
  return CANBUS_STATUSES[num] ?? 'UNKOWN'
}

const getComStatus = (comStatus: number): object => {
  return {
    portAValid: bitStatus(comStatus, 0),
    portBValid: bitStatus(comStatus, 1),
    portCValid: bitStatus(comStatus, 2),
    portDValid: bitStatus(comStatus, 3),
    portEValid: bitStatus(comStatus, 4),
    portARXOK: bitStatus(comStatus, 5),
    portATXOK: bitStatus(comStatus, 6),
    portBRXOK: bitStatus(comStatus, 7),
    portBTXOK: bitStatus(comStatus, 8),
    portCRXOK: bitStatus(comStatus, 9),
    portCTXOK: bitStatus(comStatus, 10),
    portDRXOK: bitStatus(comStatus, 11),
    portDTXOK: bitStatus(comStatus, 12),
    portERXOK: bitStatus(comStatus, 13),
    portETXOK: bitStatus(comStatus, 14),
    eth0Valid: bitStatus(comStatus, 15),
    eth1Valid: bitStatus(comStatus, 16),
    eth2Valid: bitStatus(comStatus, 17),
    eth3Valid: bitStatus(comStatus, 18),
    eth4Valid: bitStatus(comStatus, 19),
    canValid: bitStatus(comStatus, 25),
    canRXOK: bitStatus(comStatus, 26),
    canTXOK: bitStatus(comStatus, 27),
    canBus: getCANBusStatus(comStatus)
  }
}

const getAidingStatus = (aidingStatus: number): object => {
  return {
    gps1Position: bitStatus(aidingStatus, 0),
    gps1Velocity: bitStatus(aidingStatus, 1),
    gps1Heading: bitStatus(aidingStatus, 2),
    gps1UTCTime: bitStatus(aidingStatus, 3),
    gps2Position: bitStatus(aidingStatus, 4),
    gps2Velocity: bitStatus(aidingStatus, 5),
    gps2Heading: bitStatus(aidingStatus, 6),
    gps2UTCTime: bitStatus(aidingStatus, 7),
    magnetometer: bitStatus(aidingStatus, 8),
    odometer: bitStatus(aidingStatus, 9),
    dvl: bitStatus(aidingStatus, 10),
    usbl: bitStatus(aidingStatus, 11),
    depthSensor: bitStatus(aidingStatus, 12),
    airData: bitStatus(aidingStatus, 13)
  }
}

export const SBG_ECOM_LOG_STATUS = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_STATUS'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    generalStatus: payload.readUIntLE(4, 2),
    reserved1: payload.readUIntLE(6, 2),
    comStatus: payload.readUIntLE(8, 4),
    aidingStatus: payload.readUIntLE(12, 4),
    reserved2: payload.readUIntLE(16, 4),
    reserved3: payload.readUIntLE(20, 2),
    uptime: payload.readUIntLE(22, 4),
    metadata: {
      generalStatus: {},
      comStatus: {},
      aidingStatus: {}
    }
  }
  data.metadata = {
    generalStatus: getGeneralStatus(data.generalStatus),
    comStatus: getComStatus(data.comStatus),
    aidingStatus: getAidingStatus(data.aidingStatus)
  }
  return { name, data }
}
