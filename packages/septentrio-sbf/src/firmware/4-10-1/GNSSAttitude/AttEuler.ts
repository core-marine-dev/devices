// coded
import { attitudeError } from './error'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* AttEuler -> Number: 5938 => "OnChange" interval: default PVT output rate
  The AttEuler block contains the Euler angles (pitch, roll and heading)
  at the time specified in the TOW and WNc fields (in the receiver time frame).

  AttEuler -------------------------------------------------------------
  Block fields           Type    Units Do-Not-Use  Description
  NrSV                  uint8                 255  The average over all antennas of the number of satellites currently included in the attitude calculations.
  Error                 uint8                      Bit field providing error information. For each antenna baseline, two bits are used to provide error information:
                                                     Bits 0-1: Error code for Main-Aux1 baseline:
                                                       0: No error
                                                       1: Not enough measurements
                                                       2: Reserved
                                                       3: Reserved
                                                     Bits 2-3: Error code for Main-Aux2 baseline, same definition as bit 0-1:
                                                       0: No error
                                                       1: Not enough measurements
                                                       2: Reserved
                                                       3: Reserved
                                                     Bits 4-6: Reserved
                                                     Bit    7: Set when GNSS-based attitude not requested by user. In that case, the other bits are all zero.
  Mode                 uint16                      Attitude mode code:
                                                     0: No attitude
                                                     1: Heading, pitch (roll = 0), aux antenna positions obtained with float ambiguities
                                                     2: Heading, pitch (roll = 0), aux antenna positions obtained with fixed ambiguities
                                                     3: Heading, pitch, roll, aux antenna positions obtained with float ambiguities
                                                     4: Heading, pitch, roll, aux antenna positions obtained with fixed ambiguities
  Reserved             uint16                      Reserved for future use, to be ignored by decoding software
  Heading               float      deg  -2 * 10¹⁰  Heading
  Pitch                 float      deg  -2 * 10¹⁰  Pitch
  Roll                  float      deg  -2 * 10¹⁰  Roll
  PitchDot              float  deg/sec  -2 * 10¹⁰  Rate of change of the pitch angle
  RollDot               float  deg/sec  -2 * 10¹⁰  Rate of change of the roll angle
  HeadingDot            float  deg/sec  -2 * 10¹⁰  Rate of change of the heading angle
  Padding                uint                      Padding bytes

  ⚠️ THE ORDER OF THE LAST THREE FIELDS IS PitchDot, RollDot, HeadingDot.
  The 1.x parser laid them out HeadingDot, PitchDot, RollDot, so all three rates
  came back on the wrong axis — and its unit test built its buffer in the same
  wrong order, so the suite agreed with the bug. On a real captured frame it
  reported a roll rate of 0.313 deg/s for a frame whose roll was Do-Not-Use.
  This table IS the layout now: there is no second list to disagree with it.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'NrSV', type: 'uint8', doNotUse: 255, description: 'The average over all antennas of the number of satellites currently included in the attitude calculations' },
  { name: 'Error', type: 'uint8', description: 'Bit field: bits 0-1 Main-Aux1 baseline error code, bits 2-3 Main-Aux2, bit 7 set when GNSS-based attitude was not requested' },
  { name: 'Mode', type: 'uint16', description: 'Attitude mode code: 0 no attitude, 1-2 heading and pitch (roll = 0) with float/fixed ambiguities, 3-4 heading, pitch and roll with float/fixed ambiguities' },
  { name: 'Reserved', type: 'uint16', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'Heading', type: 'float32', units: 'deg', doNotUse: DO_NOT_USE_FLOAT, description: 'Heading' },
  { name: 'Pitch', type: 'float32', units: 'deg', doNotUse: DO_NOT_USE_FLOAT, description: 'Pitch' },
  { name: 'Roll', type: 'float32', units: 'deg', doNotUse: DO_NOT_USE_FLOAT, description: 'Roll' },
  { name: 'PitchDot', type: 'float32', units: 'deg/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Rate of change of the pitch angle' },
  { name: 'RollDot', type: 'float32', units: 'deg/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Rate of change of the roll angle' },
  { name: 'HeadingDot', type: 'float32', units: 'deg/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Rate of change of the heading angle' },
]

export const ATTITUDE_MODE: Readonly<Record<number, string>> = {
  0: 'NO_ATTITUDE',
  1: 'HEADING_PITCH_FLOAT',
  2: 'HEADING_PITCH_FIXED',
  3: 'HEADING_PITCH_ROLL_FLOAT',
  4: 'HEADING_PITCH_ROLL_FIXED',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Error: attitudeError,
  Mode: (value) => label(ATTITUDE_MODE, value),
}

export const attEuler: BlockDefinition = {
  name: 'AttEuler',
  number: 5938,
  description: 'GNSS attitude expressed as Euler angles at the time given by TOW and WNc, in the receiver time frame',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  // Attitude is only meaningful as a triple, and Tracker reads it as one thing.
  payloadMetadata: ({ Heading, Pitch, Roll }) => {
    if (typeof Heading !== 'number' && typeof Pitch !== 'number') return {}
    return { attitude: { heading: Heading, pitch: Pitch, roll: Roll, units: 'deg' } }
  },
}
