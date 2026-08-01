// coded
import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { scaled } from '../../../utils'

/* DOP -> Number: 4001 => "OnChange" interval: default PVT output rate
  This block contains both Dilution of Precision (DOP) values and SBAS
  protection levels. The DOP values result from a trace of the unit position
  variance-covariance matrices:

    Position Dilution of Precision:   PDOP = sqrt(Qxx + Qyy + Qzz)
    Time Dilution of Precision:       TDOP = sqrt(Qbb)
    Horizontal Dilution of Precision: HDOP = sqrt(Qλλ + Qφφ)
    Vertical Dilution of Precision:   VDOP = sqrt(Qhh)

  In these equations, the matrix Q is the inverse of the unweighted normal
  matrix used for the computation of the position. The normal matrix equals the
  product of the geometry matrix A with its transpose (At A). The term
  "unweighted" implies that the DOP factor only addresses the effect of the
  geometric factors on the quality of the position.

  The DOP values can be used to interpret the current constellation geometry.
  This is an important parameter for the quality of the position fix: the DOP
  parameter is the propagation factor of the pseudorange variance. For example,
  if an error of 5 m is present in the pseudorange, it will propagate into the
  horizontal plane with a factor expressed by the HDOP. Hence a low DOP value
  indicates that the satellites used for the position fix result in a low
  multiplication of the systematic ranging errors. A value of six (6) for the
  PDOP is generally considered as the maximum value allowed for an acceptable
  position computation.

  The horizontal and vertical protection levels (HPL and VPL) indicate the
  integrity of the computed horizontal and vertical position components as per
  the DO 229 specification. In SBAS-aided PVT mode (see the Mode field of the
  PVTCartesian SBF block), HPL and VPL are based upon the error estimates
  provided by SBAS. Otherwise they are based upon internal position-mode
  dependent error estimates.

  DOP -------------------------------------------------------------
  Block fields     Type  Units Do-Not-Use  Description
  NrSV            uint8                 0  Total number of satellites used in the DOP computation,
                                           or 0 if the DOP information is not available
                                           (in that case, the xDOP fields are all set to 0)
  Reserved        uint8                    Reserved for future use, to be ignored by decoding software
  PDOP           uint16   0.01          0  If 0, PDOP not available, otherwise divide by 100 to obtain PDOP.
  TDOP           uint16   0.01          0  If 0, TDOP not available, otherwise divide by 100 to obtain TDOP.
  HDOP           uint16   0.01          0  If 0, HDOP not available, otherwise divide by 100 to obtain HDOP.
  VDOP           uint16   0.01          0  If 0, VDOP not available, otherwise divide by 100 to obtain VDOP.
  HPL           float32    1 m  -2 * 10¹⁰  Horizontal Protection Level (see the DO 229 standard).
  VPL           float32    1 m  -2 * 10¹⁰  Vertical   Protection Level (see the DO 229 standard).
  Padding          uint                    Padding bytes

  Two things the 1.x parser got wrong here, both fixed by the table:
   - the documented Do-Not-Use of 0 was never applied, so "DOP unavailable" was
     published as a real DOP of 0 — the most optimistic value possible;
   - the /100 scale was applied to `value` itself, contradicting §4.1.7 (a
     Do-Not-Use value refers to the RAW field, before the scale factor). The raw
     integer now stays in `value` with `units: '0.01'`, and the human number is
     in that field's metadata as { value }.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'NrSV', type: 'uint8', doNotUse: 0, description: 'Total number of satellites used in the DOP computation; 0 means the DOP information is not available' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'PDOP', type: 'uint16', units: '0.01', doNotUse: 0, description: 'Position dilution of precision; 0 means not available' },
  { name: 'TDOP', type: 'uint16', units: '0.01', doNotUse: 0, description: 'Time dilution of precision; 0 means not available' },
  { name: 'HDOP', type: 'uint16', units: '0.01', doNotUse: 0, description: 'Horizontal dilution of precision; 0 means not available' },
  { name: 'VDOP', type: 'uint16', units: '0.01', doNotUse: 0, description: 'Vertical dilution of precision; 0 means not available' },
  { name: 'HPL', type: 'float32', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Horizontal protection level (DO 229)' },
  { name: 'VPL', type: 'float32', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Vertical protection level (DO 229)' },
]

// Dimensionless, so the converted value carries no `units`.
const dilution: Decoder = (value) => scaled(value, 100)

const decoders: Readonly<Record<string, Decoder>> = {
  PDOP: dilution,
  TDOP: dilution,
  HDOP: dilution,
  VDOP: dilution,
}

export const dop: BlockDefinition = {
  name: 'DOP',
  number: 4001,
  description: 'Dilution of precision values and SBAS protection levels',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
