import type { SBGFrameNameData } from '../../../types'
import { getSolutionStatus } from './utils'
/* Message ID 08 -> SBG_ECOM_LOG_EKF_NAV => Position and velocities in NED coordinates with the accuracies on each axis
 * Field            Offset  Size  Format  Unit  Description
 * TIME_STAMP            0     4  uint32    µs  Time since sensor is powered up
 * VELOCITY_N            4     4   float   m/s  Velocity in North direction
 * VELOCITY_E            8     4   float   m/s  Velocity in East direction
 * VELOCITY_D           12     4   float   m/s  Velocity in Down direction
 * VELOCITY_N_ACC       16     4   float   m/s  1σ Velocity in North direction accuracy
 * VELOCITY_E_ACC       20     4   float   m/s  1σ Velocity in East direction accuracy
 * VELOCITY_D_ACC       24     4   float   m/s  1σ Velocity Down direction accuracy
 * LATITUDE             28     8  double     °  Latitude
 * LONGITUDE            36     8  double     °  Longitude
 * ALTITUDE             44     8  double     m  Altitude above Mean Sea Level
 * UNDULATION           52     4   float     m  Altitude difference between the geoid and the Ellipsoid. (WGS-84 Altitude = MSL Altitude + undulation)
 * LATITUDE_ACC         56     4   float     m  1σ Latitude accuracy
 * LONGITUDE_ACC        60     4   float     m  1σ Longitude accuracy
 * ALTITUDE_ACC         64     4   float     m  1σ Vertical Position accuracy
 * SOLUTION_STATUS      68     4  uint32     -  Global solution status
 *           Total size 72
 *
 * SOLUTION_STATUS definition -> Provide information on the internal Kalman filter status such as which aiding data is used to compute the solution and the provided solution mode.
 *  Bit  Type  Name                         Description
 * [0-3] Enum  SBG_ECOM_SOLUTION_MODE       Defines the Kalman filter computation mode (see the table 39 below)
 *   4   Mask  SBG_ECOM_SOL_ATTITUDE_VALID  Set to 1 if Attitude data is reliable (Roll/Pitch error < 0,5°)
 *   5   Mask  SBG_ECOM_SOL_HEADING_VALID   Set to 1 if Heading data is reliable (Heading error < 1°)
 *   6   Mask  SBG_ECOM_SOL_VELOCITY_VALID  Set to 1 if Velocity data is reliable (velocity error < 1.5 m/s)
 *   7   Mask  SBG_ECOM_SOL_POSITION_VALID  Set to 1 if Position data is reliable (Position error < 10m)
 *   8   Mask  SBG_ECOM_SOL_VERT_REF_USED   Set to 1 if vertical reference is used in solution
 *   9   Mask  SBG_ECOM_SOL_MAG_REF_USED    Set to 1 if magnetometer is used in solution
 *  10   Mask  SBG_ECOM_SOL_GPS1_VEL_USED   Set to 1 if GPS velocity is used in solution
 *  11   Mask  SBG_ECOM_SOL_GPS1_POS_USED   Set to 1 if GPS Position is used in solution
 *  13   Mask  SBG_ECOM_SOL_GPS1_HDT_USED   Set to 1 if GPS True Heading is used in solution
 *  14   Mask  SBG_ECOM_SOL_GPS2_VEL_USED   Set to 1 if GPS2 velocity is used in solution
 *  15   Mask  SBG_ECOM_SOL_GPS2_POS_USED   Set to 1 if GPS2 Position is used in solution
 *  17   Mask  SBG_ECOM_SOL_GPS2_HDT_USED   Set to 1 if GPS2 True Heading is used in solution
 *  18   Mask  SBG_ECOM_SOL_ODO_USED        Set to 1 if Odometer is used in solution
 *  19   Mask  SBG_ECOM_SOL_DVL_BT_USED     Set to 1 if DVL Bottom Tracking is used in solution
 *  20   Mask  SBG_ECOM_SOL_DVL_WT_USED     Set to 1 if DVL Water Layer is used in solution
 *  24   Mask  SBG_ECOM_SOL_USBL_USED       Set to 1 if USBL / LBL is used in solution.
 *  25   Mask  SBG_ECOM_SOL_AIR_DATA_USED   Set to 1 if an altitude or true airspeed is used in solution
 *  26   Mask  SBG_ECOM_SOL_ZUPT_USED       Set to 1 if a ZUPT is used in solution
 *  27   Mask  SBG_ECOM_SOL_ALIGN_VALID     Set to 1 if sensor alignment and calibration parameters are valid
 *  28   Mask  SBG_ECOM_SOL_DEPTH_USED      Set to 1 if Depth sensor (for subsea navigation) is used in solution
 *
 * SBG_ECOM_SOLUTION_MODE enumeration
 * Value Name                             Description
 *   0   SBG_ECOM_SOL_MODE_UNINITIALIZED  The Kalman filter is not initialized and the returned data are all invalid.
 *   1   SBG_ECOM_SOL_MODE_VERTICAL_GYRO  The Kalman filter only rely on a vertical reference to compute roll and pitch angles. Heading and navigation data drift freely.
 *   2   SBG_ECOM_SOL_MODE_AHRS           A heading reference is available, the Kalman filter provides full orientation but navigation data drift freely.
 *   3   SBG_ECOM_SOL_MODE_NAV_VELOCITY   The Kalman filter computes orientation and velocity. Position is freely integrated from velocity estimation.
 *   4   SBG_ECOM_SOL_MODE_NAV_POSITION   Nominal mode, the Kalman filter computes all parameters (attitude, velocity, position). Absolute position is provided.
*/
export const SBG_ECOM_LOG_EKF_NAV = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_EKF_NAV'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    velocityN: payload.readFloatLE(4),
    velocityE: payload.readFloatLE(8),
    velocityD: payload.readFloatLE(12),
    velocityAccuracyN: payload.readFloatLE(16),
    velocityAccuracyE: payload.readFloatLE(20),
    velocityAccuracyD: payload.readFloatLE(24),
    latitude: payload.readDoubleLE(28),
    longitude: payload.readDoubleLE(36),
    altitude: payload.readDoubleLE(44),
    undulation: payload.readFloatLE(52),
    latitudeAccuracy: payload.readFloatLE(56),
    longitudeAccuracy: payload.readFloatLE(60),
    altitudeAccuracy: payload.readFloatLE(64),
    solutionStatus: payload.readUIntLE(68, 4),
    metadata: {}
  }
  data.metadata = {
    solutionStatus: getSolutionStatus(data.solutionStatus)
  }
  return { name, data }
}
