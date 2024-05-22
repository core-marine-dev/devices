import { SBGFrameNameData } from '../../../types'
import { getSolutionStatus } from './utils'
/* Message ID 07 -> SBG_ECOM_LOG_EKF_QUAT => Includes the 4 quaternions values
 * Field            Offset  Size  Format  Unit  Description
 * TIME_STAMP            0     4  uint32    µs  Time since sensor is powered up
 * Q0                    4     4   float     -  First quaternion parameter (W)
 * Q1                    8     4   float     -  Second quaternion parameter (X)
 * Q2                   12     4   float     -  Third quaternion parameter (Y)
 * Q3                   16     4   float     -  Forth quaternion parameter (Z)
 * ROLL_ACC             20     4   float   rad  1σ Roll angle accuracy
 * PITCH_ACC            24     4   float   rad  1σ Pitch angle accuracy
 * YAW_ACC              28     4   float   rad  1σ Yaw angle accuracy
 * SOLUTION_STATUS      32     4  uint32     -  Global solution status
 *           Total size 36
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
export const SBG_ECOM_LOG_EKF_QUAT = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_EKF_QUAT'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    q0: payload.readFloatLE(4),
    q1: payload.readFloatLE(8),
    q2: payload.readFloatLE(12),
    q3: payload.readFloatLE(16),
    rollAcceleration: payload.readFloatLE(20),
    pitchAcceleration: payload.readFloatLE(24),
    yawAcceleration: payload.readFloatLE(28),
    solutionStatus: payload.readUIntLE(32, 4),
    metadata: {}
  }
  data.metadata = {
    solutionStatus: getSolutionStatus(data.solutionStatus)
  }
  return { name, data }
}
