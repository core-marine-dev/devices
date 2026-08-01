// installed
import type { ProtocolsFileContent } from '@coremarine/nmea-parser'

// coded
import { DEFAULT_FIRMWARE, NMEA_PROTOCOL_NAME } from './constants'

/* The proprietary NMEA sentences of §3.3, firmware reference manual SBGFWM.2.3.
   These live HERE and not in nmea-parser because each one is THIS DEVICE's
   rendering of another vendor's sentence, and two renderings of the same sentence
   can legitimately differ — reading SBG's §3.3.9 PHTRO beside norsub's found two
   wrong descriptions in norsub's published tables, so the difference is not
   hypothetical.

   `protocol` names the VENDOR whose format is being imitated, following the MIROS
   precedent in nmea-parser: a vendor sentence carries the vendor, not `NMEA`. Only
   SBG's own two sentences get `SBG NMEA`.

   §3.3.13 Trimble GGK IS DELIBERATELY ABSENT. It is `$PTNL,GGK,...` with 12
   fields, which nmea-parser already models as `PTNLGGK` and already resolves via
   its `PTNL:12` resolver — field for field, including the `EHT`-prefixed
   ellipsoidal height that is a string for exactly that reason. Its quality enum
   agrees too: SBG's §3.2.1 GGK column maps 0/1/2/3/4 to invalid, standalone,
   floating RTK, fixed RTK and DGPS, which is Trimble's own numbering. Defining it
   again here would fork a table that matches.

   §3.3.5 PASHR AND §3.3.6 WASSP ARE ONE DEFINITION, and that is a decision (cru,
   2026-08-01), not an oversight. WASSP goes out under the SAME wire id with the
   SAME 11 fields, differing ONLY in the heave sign — msg 02 positive down, msg 12
   positive up. The distinguishing number is the sbgECom message id, which never
   reaches the wire, because the NMEA half of the stream is not wrapped in eCom
   frames (§2.1.4). No resolver can separate them either: a resolver reads the
   payload, and the payload is identical in shape — the manual's own null examples
   for the two messages are byte-identical, checksum included. So the sentence is
   modelled ONCE and the ambiguity is stated in the heave field's description, which
   is the honest option: inventing a distinction the wire does not carry would be
   worse than documenting the one it does not.

   EVERY field count below was verified by computing the checksum of the manual's
   own printed example and counting its commas. All thirteen §3.3 examples verify,
   unlike §3.2 where three do not.

   ⚠️ SBG's OWN TWO SENTENCES EMIT A TRAILING COMMA, so they carry ONE MORE FIELD
   than their tables list — PSBGI 8 where §3.3.4 lists 7, PSBGB 23 where §3.3.7
   lists 22. This is not a transcription slip: the printed checksum verifies over
   the string INCLUDING that comma, in both sentences independently, and none of
   the nine sentences SBG renders for OTHER vendors has one. It reads as a shared
   formatter path in the firmware. It matters because definitions are matched by
   EXACT field count, so a 7-field PSBGI definition would never match a real one.
   The shorter, table-documented forms are NOT defined here: no capture in the
   corpus contains either sentence, so the examples are the only witness and
   inventing a second definition from the table alone would be guessing. A device
   emitting the short form falls through as a generic sentence — visible, with its
   `raw` and its fields intact, never silently dropped. */

// Reused by both SBG sentences: see the trailing-comma note above.
const TRAILING_FIELD = {
  name: 'reserved',
  type: 'string',
  description: 'ALWAYS EMPTY. SBG\'s own formatter emits a trailing comma before the checksum, so the sentence carries one more field than §3.3 lists. Verified by computing the checksum of the manual\'s printed example, which only matches WITH the comma.',
} as const

export const SBG_SENTENCES: ProtocolsFileContent = {
  protocols: [
    {
      protocol: NMEA_PROTOCOL_NAME,
      version: DEFAULT_FIRMWARE,
      standard: false,
      sentences: [
        {
          id: 'PSBGI',
          description: 'SBG Systems proprietary — rotation rates and accelerations in the SENSOR frame, with accurate UTC time stamping. The raw inertial quantities, not a navigation solution. §3.3.4.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'Current UTC time (hhmmss.sss). A string: leading zeros and the fractional part do not survive a numeric type.',
            },
            {
              name: 'gyroscope_x',
              type: 'float64',
              units: 'deg/s',
              description: 'X rotation rate, -999.999 to +999.999',
            },
            {
              name: 'gyroscope_y',
              type: 'float64',
              units: 'deg/s',
              description: 'Y rotation rate, -999.999 to +999.999',
            },
            {
              name: 'gyroscope_z',
              type: 'float64',
              units: 'deg/s',
              description: 'Z rotation rate, -999.999 to +999.999',
            },
            {
              name: 'acceleration_x',
              type: 'float64',
              units: 'm/s2',
              description: 'X acceleration, -999.999 to +999.999',
            },
            {
              name: 'acceleration_y',
              type: 'float64',
              units: 'm/s2',
              description: 'Y acceleration, -999.999 to +999.999',
            },
            {
              name: 'acceleration_z',
              type: 'float64',
              units: 'm/s2',
              description: 'Z acceleration, -999.999 to +999.999. A STATIONARY, LEVEL unit reads about -9.81 here, which is the cheapest sanity check on this sentence.',
            },
            TRAILING_FIELD,
          ],
        },
        {
          id: 'PSBGB',
          description: 'SBG Systems proprietary — the full attitude and motion solution: UTC time, attitude with per-axis standard deviations and validity flags, heave, angular rates and body velocities. The richest of the proprietary sentences. §3.3.7.',
          payload: [
            {
              name: 'version',
              type: 'string',
              description: 'Version of this message — 1. A string: it is a format tag, not a quantity.',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'Current UTC time (hhmmss.sss)',
            },
            {
              name: 'utc_status',
              type: 'uint8',
              description: '0: Invalid\n 1: Valid and PPS synchronized\n 2: Valid but no PPS synchronized\n 3: Unknown leap second and PPS synchronized\n 4: Unknown leap second and no PPS synchronized',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll angle, POSITIVE PORT SIDE UP, -180 to 180',
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Pitch angle, POSITIVE BOW UP, -90 to 90',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'True heading angle, 0 to 360',
            },
            {
              name: 'roll_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'pitch_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'heading_standard_deviation',
              type: 'float64',
              units: 'deg',
              description: 'True heading standard deviation, 0 to 180',
            },
            {
              name: 'roll_pitch_status',
              type: 'uint8',
              description: '0: Invalid (standard deviation above threshold)\n 1: Optimal accuracy\n 2: Degraded accuracy, alignment in progress',
            },
            {
              name: 'heading_status',
              type: 'uint8',
              description: '0: Invalid (standard deviation above threshold)\n 1: Optimal accuracy\n 2: Degraded accuracy, alignment in progress',
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'Heave, POSITIVE DOWN — SBG\'s own convention, and the same sign as the PASHR of §3.3.5 rather than the WASSP of §3.3.6.',
            },
            {
              name: 'heave_standard_deviation',
              type: 'float64',
              units: 'm',
              description: 'Heave standard deviation. FIXED TO 5 cm by the firmware, so it is a constant and not an estimate — do not read a change in solution quality into it.',
            },
            {
              name: 'heave_status',
              type: 'uint8',
              description: '0: Invalid or initializing\n 1: Valid and velocity aided\n 2: Valid, standalone',
            },
            {
              name: 'roll_rate',
              type: 'float64',
              units: 'deg/s',
              description: 'Roll angular rate, positive port side up',
            },
            {
              name: 'pitch_rate',
              type: 'float64',
              units: 'deg/s',
              description: 'Pitch angular rate, positive bow up',
            },
            {
              name: 'yaw_rate',
              type: 'float64',
              units: 'deg/s',
              description: 'Yaw angular rate, positive clockwise',
            },
            {
              name: 'velocity_x',
              type: 'float64',
              units: 'm/s',
              description: 'Velocity in the X body axis, positive forward',
            },
            {
              name: 'velocity_y',
              type: 'float64',
              units: 'm/s',
              description: 'Velocity in the Y body axis, positive starboard',
            },
            {
              name: 'velocity_z',
              type: 'float64',
              units: 'm/s',
              description: 'Velocity in the Z body axis, positive down',
            },
            {
              name: 'velocity_standard_deviation',
              type: 'float64',
              units: 'm/s',
              description: 'NORM of the X, Y and Z velocity standard deviations — one number for all three axes, not the X component.',
            },
            {
              name: 'velocity_status',
              type: 'uint8',
              description: '0: Invalid (standard deviation above threshold)\n 1: Optimal accuracy\n 2: Degraded accuracy, alignment in progress',
            },
            TRAILING_FIELD,
          ],
        },
      ],
    },
    {
      protocol: 'TELEDYNE RDI',
      version: DEFAULT_FIRMWARE,
      standard: false,
      sentences: [
        {
          id: 'PRDID',
          description: 'Teledyne RDI proprietary — vessel pitch, roll and true heading. The same three fields norsub-emru defines under its own `RDI ADCP` block; reading the two side by side is what found norsub\'s roll description bug. §3.3.3.',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Signed vessel pitch, POSITIVE BOW UP',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Signed vessel roll, POSITIVE PORT UP',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'Vessel true heading, 0 to 360',
            },
          ],
        },
      ],
    },
    {
      protocol: 'IXBLUE',
      version: DEFAULT_FIRMWARE,
      standard: false,
      sentences: [
        {
          id: 'PHINF',
          description: 'Ixblue proprietary — the general system status, as one 32-bit word. The decoded bits are in the field metadata; the raw hex is the field value. §3.3.8. ⚠️ These are OCTANS status definitions, and SBG warns that "some status couldn\'t be directly translated" to an SBG AHRS/INS — so a set bit names the OCTANS condition, not necessarily the same condition on this device.',
          payload: [
            {
              name: 'status',
              type: 'string',
              description: 'INS status as 8 hexadecimal characters (hhhhhhhh). A STRING because that is what is on the wire; the 28 named bits are decoded into this field\'s metadata. Bits 4, 26 and 28-30 are undefined.',
            },
          ],
        },
        {
          id: 'PHTRO',
          description: 'Ixblue proprietary — unit pitch and roll, each as a magnitude followed by a LETTER giving its direction. §3.3.9. The letters differ per axis, which is exactly the trap that put a pitch description on norsub\'s roll field.',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Pitch angle magnitude; the SIGN is the next field',
            },
            {
              name: 'pitch_direction',
              type: 'string',
              description: 'M: bow up\n P: bow down',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll angle magnitude; the SIGN is the next field',
            },
            {
              name: 'roll_direction',
              type: 'string',
              description: 'B: port down\n T: port up. NOTE the letters are B/T here, NOT the M/P of pitch.',
            },
          ],
        },
        {
          id: 'PHLIN',
          description: 'Ixblue proprietary — surge, sway and heave. §3.3.10. ⚠️ SBG\'s own warning: "both sway and heave values are reversed compared to SBG Systems conventions". §3.3.10 also prints the PHTRO example by mistake, so this sentence has NO valid printed example in the manual.',
          payload: [
            {
              name: 'surge',
              type: 'float64',
              units: 'm',
              description: 'Signed surge, positive FORWARD',
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm',
              description: 'Signed sway, positive LEFT — ⚠️ REVERSED relative to SBG\'s own convention (§3.3.10)',
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'Signed heave, positive UP — ⚠️ REVERSED relative to SBG\'s own convention (§3.3.10), and the opposite of PSBGB\'s heave, which is positive down',
            },
          ],
        },
        {
          id: 'PHOCT',
          description: 'Ixblue proprietary — time, attitude, heading and ship motion, each quantity followed by its own validity letter. The largest of the proprietary sentences at 19 fields. §3.3.11. ⚠️ Sway and heave are REVERSED relative to SBG\'s convention, and pitch is positive BOW DOWN here — the opposite of PSBGB and PRDID.',
          payload: [
            {
              name: 'protocol_version',
              type: 'string',
              description: 'Protocol version identifier — 01',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'Current UTC time (hhmmss.ss)',
            },
            {
              name: 'utc_status',
              type: 'string',
              description: 'T: valid\n E: invalid',
            },
            {
              name: 'latency',
              type: 'uint8',
              description: 'INS latency for heading, roll and pitch. NOT IMPLEMENTED — always 0, so it carries no information on this device.',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'True heading, 000.000 to 359.999',
            },
            {
              name: 'heading_status',
              type: 'string',
              description: 'T: valid\n E: invalid\n I: initializing',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll, POSITIVE PORT SIDE UP, -180.000 to +180.000',
            },
            {
              name: 'roll_status',
              type: 'string',
              description: 'T: valid\n E: invalid\n I: initializing',
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Pitch, POSITIVE BOW DOWN, -90.000 to +90.000 — ⚠️ the OPPOSITE sign convention to PSBGB and PRDID, which are positive bow up',
            },
            {
              name: 'pitch_status',
              type: 'string',
              description: 'T: valid\n E: invalid\n I: initializing',
            },
            {
              name: 'primary_heave',
              type: 'float64',
              units: 'm',
              description: 'Heave at the PRIMARY lever arm, positive up, -99.999 to +99.999',
            },
            {
              name: 'heave_status',
              type: 'string',
              description: 'T: valid\n E: invalid\n I: initializing. This ONE flag covers heave, surge, sway AND the three speeds — there is no per-quantity status for them.',
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'Heave at the DESIRED lever arm, positive up — ⚠️ REVERSED relative to SBG\'s own convention (§3.3.11)',
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm',
              description: 'Surge with lever arms applied, positive forward',
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm',
              description: 'Sway at the desired lever arm, positive LEFT — ⚠️ REVERSED relative to SBG\'s own convention (§3.3.11)',
            },
            {
              name: 'heave_speed',
              type: 'float64',
              units: 'm/s',
              description: 'Heave speed at the desired lever arm, positive up',
            },
            {
              name: 'surge_speed',
              type: 'float64',
              units: 'm/s',
              description: 'Surge speed at the desired lever arm, positive forward',
            },
            {
              name: 'sway_speed',
              type: 'float64',
              units: 'm/s',
              description: 'Sway speed at the desired lever arm, positive left',
            },
            {
              name: 'heading_rate',
              type: 'float64',
              units: 'deg/min',
              description: 'Heading rate of turn, positive clockwise, -9999.99 to +9999.99. NOTE the unit is degrees per MINUTE here, while PSBGB\'s rates are per second.',
            },
          ],
        },
        {
          id: 'INDYN',
          description: 'Ixblue proprietary — position, heading, attitude, attitude rates and speed. §3.3.12. ⚠️ Pitch is REVERSED relative to SBG\'s convention. Its wire id has NO `$P` prefix, unlike every other proprietary sentence here.',
          payload: [
            {
              name: 'latitude',
              type: 'float64',
              units: 'deg',
              description: 'INS latitude in DECIMAL DEGREES with 8 decimals — not the degrees-and-minutes form GGA uses',
            },
            {
              name: 'longitude',
              type: 'float64',
              units: 'deg',
              description: 'INS longitude in DECIMAL DEGREES with 8 decimals',
            },
            {
              name: 'altitude',
              type: 'float64',
              units: 'm',
              description: 'INS altitude above MEAN SEA LEVEL, positive upward',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'True heading, 0.000 to 359.999',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll angle, POSITIVE PORT SIDE UP, -180.000 to +180.000',
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Pitch angle, POSITIVE BOW DOWN, -90.000 to +90.000 — ⚠️ REVERSED relative to SBG\'s own convention (§3.3.12)',
            },
            {
              name: 'heading_rate',
              type: 'float64',
              units: 'deg/s',
              description: 'Heading rate, positive when heading increases. ⚠️ NOT a gyroscope reading: §3.3.12 says these three rates are navigation-frame and unbiased, while the gyroscopes of PSBGI are body-frame (X,Y,Z) and biased.',
            },
            {
              name: 'roll_rate',
              type: 'float64',
              units: 'deg/s',
              description: 'Roll rate, positive when roll increases. Not a gyroscope reading — see heading_rate.',
            },
            {
              name: 'pitch_rate',
              type: 'float64',
              units: 'deg/s',
              description: 'Pitch rate, positive when pitch increases. Not a gyroscope reading — see heading_rate.',
            },
            {
              name: 'ground_speed',
              type: 'float64',
              units: 'm/s',
              description: 'Horizontal speed, positive toward the bow',
            },
          ],
        },
      ],
    },
    {
      protocol: 'ASHTECH',
      version: DEFAULT_FIRMWARE,
      standard: false,
      sentences: [
        {
          id: 'PASHR',
          description: 'Ashtech-style proprietary — heading, roll, pitch and heave with a standard deviation per attitude axis. §3.3.5, and ALSO §3.3.6 (WASSP): both sbgECom messages emit this one sentence, and the ONLY difference between them is the heave sign. See the heave field.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'Current UTC time (hhmmss.ss). EMPTY if invalid.',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'Heading angle, 0 to 360. Empty if invalid.',
            },
            {
              name: 'true',
              type: 'string',
              description: 'T = True heading',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll, -180 to 180. Empty if invalid.',
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Pitch, -90 to 90. Empty if invalid.',
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              /* THE ONE AMBIGUOUS FIELD IN THIS PACKAGE. Stated rather than resolved,
                 by decision: the sign depends on which sbgECom message the device was
                 configured to emit, and that number is not on the wire. */
              description: '⚠️ HEAVE SIGN IS CONFIGURATION-DEPENDENT AND CANNOT BE DETERMINED FROM THIS SENTENCE. Positive DOWN when the device emits SBG_ECOM_LOG_NMEA_1_PASHR (msg 02, §3.3.5); positive UP when it emits SBG_ECOM_LOG_NMEA_1_WASSP (msg 12, §3.3.6). Both go out as $PASHR with these same 11 fields, and nothing in the sentence records which — so the consumer must know how the device is configured. Empty if invalid.',
            },
            {
              name: 'roll_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'pitch_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'heading_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'position_status',
              type: 'uint8',
              description: '0: No position\n 1: All non-RTK fixed integer positions\n 2: RTK fixed integer position',
            },
            {
              name: 'imu_status',
              type: 'uint8',
              description: '0: IMU is working correctly\n 1: IMU sensor error',
            },
          ],
        },
      ],
    },
  ],
}
