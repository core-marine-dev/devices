// coded
import { DO_NOT_USE_UINT8 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, label, UNKNOWN_LABEL } from '../../../utils'

/* RTCMDatum -> Number: 4049 => "OnChange" interval: block generated each time a
   set of transformation parameters is received

  This block reports the source and target datum names as transmitted in RTCM 3.x
  message types 1021 or 1022. It also reports the corresponding height and quality
  indicators.

  If a service provider only sends out message types 1021 or 1022, this block is
  transmitted immediately after reception of MT1021 or MT1022. If message types
  1023 or 1024 are also sent out, this block is transmitted after the reception of
  these messages and the QualityInd field is set accordingly.

  RTCMDatum ------------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  SourceCRS      char[32]                    Name of the source Coordinate Reference System, right-padded with zeros.
  TargetCRS      char[32]                    Name of the target Coordinate Reference System, right-padded with zeros.
  Datum             uint8                    See the Datum field in the PosLocal and PosProjected SBF blocks.
                                             Datum is set to 255 if this SourceCRS/TargetCRS pair is currently not used
                                             by the receiver.
  HeightType        uint8                    Height Indicator field from MT1021 and MT1022. Indicates how to interpret
                                             the height reported in the PosLocal and PosProjected SBF blocks:
                                               0: Geometrical height
                                               1: Physical height (height definition in target CRS)
                                               2: Physical height (height definition in source CRS)
  QualityInd        uint8                    Bit field indicating the maximum approximation error after applying the
                                             transformation:
                                               Bits 0-3: horizontal quality indicator:
                                                 0: Unknown quality
                                                 1: better than 21 mm      (from MT1021/1022)
                                                 2: 21 to 50 mm            (from MT1021/1022)
                                                 3: 51 to 200 mm           (from MT1021/1022)
                                                 4: 201 to 500 mm          (from MT1021/1022)
                                                 5: 501 to 2000 mm         (from MT1021/1022)
                                                 6: 2001 to 5000 mm        (from MT1021/1022)
                                                 7: worse than 5001 mm     (from MT1021/1022)
                                                 9: 0 to 10 mm             (from MT1023/1024)
                                                10: 11 to 20 mm            (from MT1023/1024)
                                                11: 21 to 50 mm            (from MT1023/1024)
                                                12: 51 to 100 mm           (from MT1023/1024)
                                                13: 101 to 200 mm          (from MT1023/1024)
                                                14: 201 to 500 mm          (from MT1023/1024)
                                                15: worse than 501 mm      (from MT1023/1024)
                                               Bits 4-7: vertical quality indicator, same definition as bits 0-3.
  Padding            uint                    Padding bytes
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'SourceCRS', type: 'string', length: 32, description: 'Name of the source Coordinate Reference System' },
  { name: 'TargetCRS', type: 'string', length: 32, description: 'Name of the target Coordinate Reference System' },
  { name: 'Datum', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Datum index shared with PosLocal and PosProjected; 255 when this CRS pair is not in use' },
  { name: 'HeightType', type: 'uint8', description: 'How to interpret the height in PosLocal/PosProjected: 0 geometrical, 1 physical in the target CRS, 2 physical in the source CRS' },
  { name: 'QualityInd', type: 'uint8', description: 'Bit field: bits 0-3 horizontal, bits 4-7 vertical maximum approximation error after the transformation' },
]

export const HEIGHT_TYPE: Readonly<Record<number, string>> = {
  0: 'GEOMETRICAL',
  1: 'PHYSICAL_TARGET_CRS',
  2: 'PHYSICAL_SOURCE_CRS',
}

// The datasheet gives ranges in millimetres, so they are published as ranges
// rather than invented midpoints.
export const TRANSFORMATION_QUALITY: Readonly<Record<number, string>> = {
  0: 'UNKNOWN',
  1: 'BETTER_THAN_21_MM',
  2: '21_TO_50_MM',
  3: '51_TO_200_MM',
  4: '201_TO_500_MM',
  5: '501_TO_2000_MM',
  6: '2001_TO_5000_MM',
  7: 'WORSE_THAN_5001_MM',
  9: '0_TO_10_MM',
  10: '11_TO_20_MM',
  11: '21_TO_50_MM',
  12: '51_TO_100_MM',
  13: '101_TO_200_MM',
  14: '201_TO_500_MM',
  15: 'WORSE_THAN_501_MM',
}

const decoders: Readonly<Record<string, Decoder>> = {
  HeightType: (value) => label(HEIGHT_TYPE, value),
  QualityInd: (value) => ({
    horizontal: TRANSFORMATION_QUALITY[bits(value, 0, 3)] ?? UNKNOWN_LABEL,
    vertical: TRANSFORMATION_QUALITY[bits(value, 4, 7)] ?? UNKNOWN_LABEL,
  }),
}

export const rtcmDatum: BlockDefinition = {
  name: 'RTCMDatum',
  number: 4049,
  description: 'Source and target datum names from RTCM 3.x MT1021/1022, with the height type and the transformation quality',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
