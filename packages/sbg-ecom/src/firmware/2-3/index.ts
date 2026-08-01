// coded
import { airData, depth, dvlBottomTrack, dvlWaterTrack, odometerVelocity, usbl } from './aiding'
import { ekfEuler, ekfNav, ekfQuat } from './ekf'
import {
  gps1Heading,
  gps1Position,
  gps1Raw,
  gps1Velocity,
  gps2Heading,
  gps2Position,
  gps2Raw,
  gps2Velocity,
} from './gnss'
import { imuData, imuShort } from './imu'
import { magnetometer, magnetometerCalibration } from './magnetometer'
import {
  diagnostic,
  eventA,
  eventB,
  eventC,
  eventD,
  eventE,
  eventOutA,
  eventOutB,
  rtcmRaw,
} from './misc'
import { shipMotion, shipMotionHP } from './ship-motion'
import { status } from './status'
import { utcTime } from './time'

import { CLASS_LOG_ECOM_0 } from '../../constants'
import type { ClassRegistry, LogDefinition, LogRegistry } from '../../types'

/* The firmware 2.3 knowledge base. ALL 33 logs of SBG_ECOM_CLASS_LOG_ECOM_0
   (§2.3.1 "Binary Output Logs Overview") are modelled — the 24 the 0.0.x parser
   had, plus the nine it was missing (the seven event markers, DIAG and RTCM_RAW).

   The other classes (§2.1.4) are deliberately EMPTY in 1.0.0, not absent: a frame
   from CMD, ECOM_1, the NMEA identifier classes or THIRD_PARTY is recognised by its
   class and emitted as an IDENTIFIED frame with its bytes intact, rather than being
   called garbage. Adding one is a new registry here and nothing else.

   Counts, by §2.3 subsection:
     §2.3.3 general information and time   2   STATUS UTC_TIME
     §2.3.4 inertial sensor data           2   IMU_DATA IMU_SHORT
     §2.3.5 EKF output logs                5   EKF_EULER EKF_QUAT EKF_NAV
                                               SHIP_MOTION SHIP_MOTION_HP
     §2.3.6 aiding sensors outputs        14   MAG MAG_CALIB GPS1/2_VEL GPS1/2_POS
                                               GPS1/2_HDT GPS1/2_RAW ODO_VEL
                                               AIR_DATA DVL_BOTTOM_TRACK
                                               DVL_WATER_TRACK DEPTH USBL
     §2.3.7 miscellaneous logs            10   EVENT_A..E EVENT_OUT_A/B DIAG RTCM_RAW
                                         ---
                                          33
*/
const LOGS: readonly LogDefinition[] = [
  // §2.3.3 General information and time
  status,
  utcTime,
  // §2.3.4 Inertial sensor data
  imuData,
  imuShort,
  // §2.3.5 EKF output logs
  ekfEuler,
  ekfQuat,
  ekfNav,
  shipMotion,
  shipMotionHP,
  // §2.3.6 Aiding sensors outputs
  magnetometer,
  magnetometerCalibration,
  gps1Velocity,
  gps1Position,
  gps1Heading,
  gps1Raw,
  gps2Velocity,
  gps2Position,
  gps2Heading,
  gps2Raw,
  odometerVelocity,
  airData,
  dvlBottomTrack,
  dvlWaterTrack,
  depth,
  usbl,
  // §2.3.7 Miscellaneous logs
  eventA,
  eventB,
  eventC,
  eventD,
  eventE,
  eventOutA,
  eventOutB,
  diagnostic,
  rtcmRaw,
]

// Built from the list rather than written twice, so a log cannot be defined with
// one message id and registered under another.
const ecom0: LogRegistry = new Map(LOGS.map((log) => [log.message, log]))

export const classes: ClassRegistry = new Map([[CLASS_LOG_ECOM_0, ecom0]])
