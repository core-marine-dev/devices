import { UNKNOWN_SBG_FRAME_DATA } from '../../../constants'
import { SBGDataParser, SBGFrameNameData } from '../../../types'
import { SBG_ECOM_LOG_DEPTH } from './depth-sensor'
import { SBG_ECOM_LOG_DVL_BOTTOM_TRACK, SBG_ECOM_LOG_DVL_WATER_TRACK } from './doppler-velocity'
import { SBG_ECOM_LOG_EKF_EULER } from './ekf-euler'
import { SBG_ECOM_LOG_EKF_NAV } from './ekf-nav'
import { SBG_ECOM_LOG_EKF_QUAT } from './ekf-quat'
import { SBG_ECOM_LOG_GPS1_HDT, SBG_ECOM_LOG_GPS2_HDT } from './gps-heading'
import { SBG_ECOM_LOG_GPS1_POS, SBG_ECOM_LOG_GPS2_POS } from './gps-position'
import { SBG_ECOM_LOG_GPS1_RAW, SBG_ECOM_LOG_GPS2_RAW } from './gps-raw'
import { SBG_ECOM_LOG_GPS1_VEL, SBG_ECOM_LOG_GPS2_VEL } from './gps-velocity'
import { SBG_ECOM_LOG_IMU_DATA } from './imu-data'
import { SBG_ECOM_LOG_IMU_SHORT } from './imu-short'
import { SBG_ECOM_LOG_MAG } from './magnetometer'
import { SBG_ECOM_LOG_MAG_CALIB } from './magnetometer-calibration'
import { SBG_ECOM_LOG_AIR_DATA } from './odometer-airdata'
import { SBG_ECOM_LOG_ODO_VEL } from './odometer-velocity'
import { SBG_ECOM_LOG_SHIP_MOTION, SBG_ECOM_LOG_SHIP_MOTION_HP } from './ship-motion'
import { SBG_ECOM_LOG_STATUS } from './status'
import { SBG_ECOM_LOG_USBL } from './usbl-position'
import { SBG_ECOM_LOG_UTC_TIME } from './utc-time'

const logs = new Map<number, SBGDataParser>()
//  Message ID  LOG => Message CLASS = 0       Description
// General Information and Time
//      01      SBG_ECOM_LOG_STATUS            Status general, clock, com aiding, solution, heave
logs.set(1, SBG_ECOM_LOG_STATUS)
//      02      SBG_ECOM_LOG_UTC_TIME          Provides UTC time reference
logs.set(2, SBG_ECOM_LOG_UTC_TIME)
// Inertial Sensor Data
//      03      SBG_ECOM_LOG_IMU_DATA          Includes IMU status, acc., gyro, temp delta speeds and delta angles values
logs.set(3, SBG_ECOM_LOG_IMU_DATA)
//      44      SBG_ECOM_LOG_IMU_SHORT         Asynchronous delta angles and delta velocities values from IMU directly
logs.set(44, SBG_ECOM_LOG_IMU_SHORT)
// EKF Output Logs
//      06      SBG_ECOM_LOG_EKF_EULER         Includes roll, pitch, yaw and their accuracies on each axis
logs.set(6, SBG_ECOM_LOG_EKF_EULER)
//      07      SBG_ECOM_LOG_EKF_QUAT          Includes the 4 quaternions values
logs.set(7, SBG_ECOM_LOG_EKF_QUAT)
//      08      SBG_ECOM_LOG_EKF_NAV           Position and velocities in NED coordinates with the accuracies on each axis
logs.set(8, SBG_ECOM_LOG_EKF_NAV)
//      09      SBG_ECOM_LOG_SHIP_MOTION       Real time heave, surge, sway, accelerations and velocity
logs.set(9, SBG_ECOM_LOG_SHIP_MOTION)
//      32      SBG_ECOM_LOG_SHIP_MOTION_HP    Delayed heave, surge, sway, accelerations and velocity
logs.set(32, SBG_ECOM_LOG_SHIP_MOTION_HP)
// Aiding Sensor Outputs
//      04      SBG_ECOM_LOG_MAG               Magnetic data with associated accelerometer on each axis
logs.set(4, SBG_ECOM_LOG_MAG)
//      05      SBG_ECOM_LOG_MAG_CALIB         Magnetometer calibration data(raw buffer)
logs.set(5, SBG_ECOM_LOG_MAG_CALIB)
//      13      SBG_ECOM_LOG_GPS1_VEL          GNSS velocity from primary receiver
logs.set(13, SBG_ECOM_LOG_GPS1_VEL)
//      14      SBG_ECOM_LOG_GPS1_POS          GNSS position from primary receiver
logs.set(14, SBG_ECOM_LOG_GPS1_POS)
//      15      SBG_ECOM_LOG_GPS1_HDT          GNSS true heading from primary receiver
logs.set(15, SBG_ECOM_LOG_GPS1_HDT)
//      31      SBG_ECOM_LOG_GPS1_RAW          GNSS raw data from primary receiver
logs.set(31, SBG_ECOM_LOG_GPS1_RAW)
//      16      SBG_ECOM_LOG_GPS2_VEL          GNSS velocity from secondary receiver
logs.set(16, SBG_ECOM_LOG_GPS2_VEL)
//      17      SBG_ECOM_LOG_GPS2_POS          GNSS position from secondary receiver
logs.set(17, SBG_ECOM_LOG_GPS2_POS)
//      18      SBG_ECOM_LOG_GPS2_HDT          GNSS true heading from secondary receiver
logs.set(18, SBG_ECOM_LOG_GPS2_HDT)
//      38      SBG_ECOM_LOG_GPS2_RAW          GNSS raw data from secondary receiver
logs.set(38, SBG_ECOM_LOG_GPS2_RAW)
//      19      SBG_ECOM_LOG_ODO_VEL           Provides odometer velocity measured by the device
logs.set(19, SBG_ECOM_LOG_ODO_VEL)
//      36      SBG_ECOM_LOG_AIR_DATA          Barometric altimeter input / output for airdata support
logs.set(36, SBG_ECOM_LOG_AIR_DATA)
//      29      SBG_ECOM_LOG_DVL_BOTTOM_TRACK  Doppler Velocity Log for bottom tracking data
logs.set(29, SBG_ECOM_LOG_DVL_BOTTOM_TRACK)
//      30      SBG_ECOM_LOG_DVL_WATER_TRACK   Doppler Velocity log for water layer data
logs.set(30, SBG_ECOM_LOG_DVL_WATER_TRACK)
//      47      SBG_ECOM_LOG_DEPTH             Depth sensor measurement log used for subsea navigation
logs.set(47, SBG_ECOM_LOG_DEPTH)
//      37      SBG_ECOM_LOG_USBL              Raw USBL position data for subsea navigation
logs.set(37, SBG_ECOM_LOG_USBL)
// Miscellaneous Logs
//      24      SBG_ECOM_LOG_EVENT_A           Event marker sent when a signal is detected on Sync In A pin
//      25      SBG_ECOM_LOG_EVENT_B           Event marker sent when a signal is detected on Sync In B pin
//      26      SBG_ECOM_LOG_EVENT_C           Event marker sent when a signal is detected on Sync In C pin
//      27      SBG_ECOM_LOG_EVENT_D           Event marker sent when a signal is detected on Sync In D pin
//      28      SBG_ECOM_LOG_EVENT_E           Event marker sent when a signal is detected on Sync In E pin
//      45      SBG_ECOM_LOG_EVENT_OUT_A       Event marker used to time stamp each generated Sync Out A signal
//      46      SBG_ECOM_LOG_EVENT_OUT_B       Event marker used to time stamp each generated Sync Out B signal
//      48      SBG_ECOM_LOG_DIAG              Returns error, warning, info and debug messages
//      49      SBG_ECOM_LOG_RTCM_RAW          RTCM / NTRIP RAW data stream that can be used in post - processing

export const getSBGFrameData = (messageID: number, payload: Buffer): SBGFrameNameData => {
  const parser = logs.get(messageID)
  if (parser != null) return parser(payload)
  return {
    name: UNKNOWN_SBG_FRAME_DATA.name,
    data: UNKNOWN_SBG_FRAME_DATA.data
  }
}
