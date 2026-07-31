// coded
import type { Decoder } from '../../../types'
import { bitState, bits, UNKNOWN_LABEL } from '../../../utils'

/* The attitude Error bit field, shared verbatim by AttEuler and AttCovEuler:

  Bits 0-1: Error code for the Main-Aux1 baseline:
              0: No error
              1: Not enough measurements
              2: Reserved
              3: Reserved
  Bits 2-3: Error code for the Main-Aux2 baseline, same definition as bits 0-1
  Bits 4-6: Reserved
  Bit    7: Set when GNSS-based attitude was not requested by the user. In that
            case, the other bits are all zero.
*/
export const ATTITUDE_ERROR_CODE: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'NOT_ENOUGH_MEASUREMENTS',
  2: 'RESERVED',
  3: 'RESERVED',
}

export const attitudeError: Decoder = (value) => ({
  mainAux1Baseline: ATTITUDE_ERROR_CODE[bits(value, 0, 1)] ?? UNKNOWN_LABEL,
  mainAux2Baseline: ATTITUDE_ERROR_CODE[bits(value, 2, 3)] ?? UNKNOWN_LABEL,
  attitudeNotRequested: bitState(value, 7),
})
