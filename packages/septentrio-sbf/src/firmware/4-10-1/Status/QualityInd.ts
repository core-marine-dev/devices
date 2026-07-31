// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, UNKNOWN_LABEL } from '../../../utils'

/* QualityInd -> Number: 4082 => "OnChange" interval: 1s
  The QualityInd block contains quality indicators for the main functions of the
  receiver. Each quality indicator is a value from 0 to 10, 0 corresponding to
  poor quality and 10 to very high quality.

  QualityInd -----------------------------------------------------------------
  Block fields    Type  Units    Do-Not-Use  Description
  N              uint8                       Number of quality indicators contained in this block
  Reserved       uint8                       Reserved for future use, to be ignored by decoding software
  Indicators  uint16[N]     All elements set to 15  N successive quality indicators, coded as follows:
                                               Bits 0-7: Quality indicator type:
                                                 0: Overall quality
                                                 1: GNSS signals from main antenna
                                                 2: GNSS signals from aux1 antenna
                                                11: RF power level from the main antenna
                                                12: RF power level from the aux1 antenna
                                                21: CPU headroom
                                                25: OCXO stability (only available on PolaRx5S receivers)
                                                30: Base station measurements. This indicator is only available in RTK
                                                    mode. A low value could for example hint at severe multipath or
                                                    interference at the base station, or also at ionospheric scintillation.
                                                31: RTK post-processing. This indicator is only available when the
                                                    position mode is not RTK. It indicates the likelihood of getting a
                                                    cm-accurate RTK position when post-processing the current data.
                                               Bits 8-11: Value of this quality indicator (from 0 for low quality to 10
                                                          for high quality, or 15 if unknown)
                                               Bits 12-15: Reserved for future use, to be ignored by decoding software
  Padding         uint                        Padding bytes

  `Indicators` is a plain array of uint16 with NO SBLength field, so the
  sub-block definition omits `length` and the element size comes from the table.
*/
const INDICATOR: readonly FieldDefinition[] = [
  { name: 'Indicator', type: 'uint16', description: 'Bits 0-7 indicator type, bits 8-11 its value from 0 (poor) to 10 (very high), or 15 when unknown' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of quality indicators in this block' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'Indicators', count: 'N', fields: INDICATOR, description: 'N successive quality indicators' },
]

export const QUALITY_INDICATOR: Readonly<Record<number, string>> = {
  0: 'OVERALL_QUALITY',
  1: 'GNSS_SIGNALS_MAIN_ANTENNA',
  2: 'GNSS_SIGNALS_AUX1_ANTENNA',
  11: 'RF_POWER_MAIN_ANTENNA',
  12: 'RF_POWER_AUX1_ANTENNA',
  21: 'CPU_HEADROOM',
  25: 'OCXO_STABILITY',
  30: 'BASE_STATION_MEASUREMENTS',
  31: 'RTK_POST_PROCESSING',
}

// 15 means "unknown", which is NOT a quality of 15 — reporting it as a number
// would put an out-of-range value on a 0-10 scale.
const UNKNOWN_QUALITY = 15

const decoders: Readonly<Record<string, Decoder>> = {
  Indicator: (value) => {
    const quality = bits(value, 8, 11)
    return {
      indicator: QUALITY_INDICATOR[bits(value, 0, 7)] ?? UNKNOWN_LABEL,
      quality: (quality === UNKNOWN_QUALITY) ? null : quality,
      scale: '0-10',
    }
  },
}

export const qualityInd: BlockDefinition = {
  name: 'QualityInd',
  number: 4082,
  description: 'Quality indicators for the main receiver functions, each from 0 (poor) to 10 (very high)',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
