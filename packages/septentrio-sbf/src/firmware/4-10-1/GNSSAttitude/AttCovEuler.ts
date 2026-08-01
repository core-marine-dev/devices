// coded
import { attitudeError } from './error'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'

/* AttCovEuler -> Number: 5939 => "OnChange" interval: default PVT output rate
  This block contains the elements of the symmetric variance-covariance matrix
  of the attitude angles reported in the AttEuler block.

  This variance-covariance matrix contains an indication of the accuracy of the
  estimated parameters (see diagonal elements) and the correlation between
  these estimates (see off-diagonal elements).

  In case the receiver is in heading and pitch mode only, only the heading and
  pitch variance values will be valid. All other components of the
  variance-covariance matrix are set to their Do-Not-Use value.

  AttCovEuler -------------------------------------------------------------
  Block fields           Type    Units  Do-Not-Use  Description
  Reserved              uint8                       Reserved for future use, to be ignored by decoding software
  Error                 uint8                       Bit field providing error information (same definition as AttEuler)
  Cov_HeadHead        float32  degree²   -2 * 10¹⁰  Variance of the heading estimate
  Cov_PitchPitch      float32  degree²   -2 * 10¹⁰  Variance of the pitch estimate
  Cov_RollRoll        float32  degree²   -2 * 10¹⁰  Variance of the roll estimate
  Cov_HeadPitch       float32  degree²   -2 * 10¹⁰  Covariance between Euler angle estimates.
                                                    Future functionality. The values are currently set to their Do-Not-Use values.
  Cov_HeadRoll        float32  degree²   -2 * 10¹⁰  Covariance between Euler angle estimates.
                                                    Future functionality. The values are currently set to their Do-Not-Use values.
  Cov_PitchRoll       float32  degree²   -2 * 10¹⁰  Covariance between Euler angle estimates.
                                                    Future functionality. The values are currently set to their Do-Not-Use values.
  Padding                uint                       Padding bytes
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'Error', type: 'uint8', description: 'Bit field: bits 0-1 Main-Aux1 baseline error code, bits 2-3 Main-Aux2, bit 7 set when GNSS-based attitude was not requested' },
  { name: 'Cov_HeadHead', type: 'float32', units: 'deg²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the heading estimate' },
  { name: 'Cov_PitchPitch', type: 'float32', units: 'deg²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the pitch estimate' },
  { name: 'Cov_RollRoll', type: 'float32', units: 'deg²', doNotUse: DO_NOT_USE_FLOAT, description: 'Variance of the roll estimate' },
  { name: 'Cov_HeadPitch', type: 'float32', units: 'deg²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between Euler angle estimates. Future functionality: currently always set to its Do-Not-Use value' },
  { name: 'Cov_HeadRoll', type: 'float32', units: 'deg²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between Euler angle estimates. Future functionality: currently always set to its Do-Not-Use value' },
  { name: 'Cov_PitchRoll', type: 'float32', units: 'deg²', doNotUse: DO_NOT_USE_FLOAT, description: 'Covariance between Euler angle estimates. Future functionality: currently always set to its Do-Not-Use value' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  Error: attitudeError,
}

export const attCovEuler: BlockDefinition = {
  name: 'AttCovEuler',
  number: 5939,
  description: 'Variance-covariance matrix of the attitude angles reported in AttEuler',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
