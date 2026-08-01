// coded
import { TIME_STAMP } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState, enumBits, scaled } from '../../utils'

/* SBG_ECOM_LOG_STATUS (01) — §2.3.3.1 "Device status"

  Field           Unit  Format  Size  Offset  Description
  TIME STAMP      µs    uint32     4       0  Time since sensor is powered up
  GENERAL STATUS  -     uint16     2       4  General status bitmask and enums
  RESERVED 1      -     uint16     2       6  Reserved status field for future use
  COM STATUS      -     uint32     4       8  Communication status bitmask and enums
  AIDING STATUS   -     uint32     4      12  Aiding equipment status bitmask and enums
  RESERVED 2      -     uint32     4      16  Reserved status field for future use
  RESERVED 3      -     uint16     2      20  Reserved field for future use
  UP TIME         s     uint32     4      22  System up time since the power on
                                Total size 26   <- MEASURED: every STATUS frame in
                                                   the committed corpus has LEN 26
*/

// §2.3.3.1 GENERAL_STATUS: seven mask bits, 7-15 undefined.
const generalStatus: Decoder = (value) => ({
  mainPowerOk: bitState(value, 0),
  imuPowerOk: bitState(value, 1),
  gpsPowerOk: bitState(value, 2),
  settingsOk: bitState(value, 3),
  temperatureOk: bitState(value, 4),
  dataloggerOk: bitState(value, 5),
  cpuOk: bitState(value, 6),
})

export const CAN_BUS_STATUSES: Readonly<Record<number, string>> = {
  0: 'SBG_ECOM_CAN_BUS_OFF',
  1: 'SBG_ECOM_CAN_BUS_TX_RX_ERR',
  2: 'SBG_ECOM_CAN_BUS_OK',
  3: 'SBG_ECOM_CAN_BUS_ERROR',
}

/* §2.3.3.1 COM_STATUS. Note the gap: bits 20-24 are not defined, and the CAN bus
   enum occupies bits 28-30 — THREE bits, not four.

   ⚠️ The 0.0.x decoder masked it with `0b0011_1100_…_0000 >>> 28`, a four-bit
   window, so a set bit 31 turned a working bus into an undefined code. Deriving
   the window from the documented range (28, 30) is why that cannot recur. */
const comStatus: Decoder = (value) => ({
  portAValid: bitState(value, 0),
  portBValid: bitState(value, 1),
  portCValid: bitState(value, 2),
  portDValid: bitState(value, 3),
  portEValid: bitState(value, 4),
  portARxOk: bitState(value, 5),
  portATxOk: bitState(value, 6),
  portBRxOk: bitState(value, 7),
  portBTxOk: bitState(value, 8),
  portCRxOk: bitState(value, 9),
  portCTxOk: bitState(value, 10),
  portDRxOk: bitState(value, 11),
  portDTxOk: bitState(value, 12),
  portERxOk: bitState(value, 13),
  portETxOk: bitState(value, 14),
  eth0Valid: bitState(value, 15),
  eth1Valid: bitState(value, 16),
  eth2Valid: bitState(value, 17),
  eth3Valid: bitState(value, 18),
  eth4Valid: bitState(value, 19),
  canValid: bitState(value, 25),
  canRxOk: bitState(value, 26),
  canTxOk: bitState(value, 27),
  canBus: enumBits(CAN_BUS_STATUSES, value, 28, 30).label,
})

// §2.3.3.1 AIDING_STATUS: which aiding data the device is receiving.
const aidingStatus: Decoder = (value) => ({
  gps1Position: bitState(value, 0),
  gps1Velocity: bitState(value, 1),
  gps1Heading: bitState(value, 2),
  gps1UtcTime: bitState(value, 3),
  gps2Position: bitState(value, 4),
  gps2Velocity: bitState(value, 5),
  gps2Heading: bitState(value, 6),
  gps2UtcTime: bitState(value, 7),
  magnetometer: bitState(value, 8),
  odometer: bitState(value, 9),
  dvl: bitState(value, 10),
  usbl: bitState(value, 11),
  depthSensor: bitState(value, 12),
  airData: bitState(value, 13),
})

const RESERVED = (name: string, type: 'uint16' | 'uint32'): FieldDefinition => ({
  name,
  type,
  reserved: true,
  description: 'Reserved for future use — a later firmware may repurpose it, so its contents must not be read',
})

const FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'GENERAL_STATUS', type: 'uint16', description: 'General status bitmask: main/IMU/GPS power supplies, settings, temperature, data-logger and CPU headroom' },
  RESERVED('RESERVED_1', 'uint16'),
  { name: 'COM_STATUS', type: 'uint32', description: 'Communication status: per-port validity and saturation, plus the CAN bus state in bits 28-30' },
  { name: 'AIDING_STATUS', type: 'uint32', description: 'Which aiding data is being received: GNSS position/velocity/heading/UTC, magnetometer, odometer, DVL, USBL, depth, air data' },
  RESERVED('RESERVED_2', 'uint32'),
  RESERVED('RESERVED_3', 'uint16'),
  { name: 'UP_TIME', type: 'uint32', units: 's', description: 'System up time since power on' },
]

export const status: LogDefinition = {
  name: 'SBG_ECOM_LOG_STATUS',
  message: 1,
  description: 'Device status: general (power supplies, settings, temperature), communications (per-port validity and saturation, CAN bus) and which aiding equipment is delivering data',
  fields: FIELDS,
  decoders: {
    GENERAL_STATUS: generalStatus,
    COM_STATUS: comStatus,
    AIDING_STATUS: aidingStatus,
    // Seconds are the datasheet's unit; hours is what a human reads an uptime in.
    UP_TIME: (value) => scaled(value, 3600, 'h'),
  },
}
