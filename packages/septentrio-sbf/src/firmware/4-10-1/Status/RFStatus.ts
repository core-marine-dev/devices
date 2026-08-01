// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, scaled, UNKNOWN_LABEL } from '../../../utils'

/* RFStatus -> Number: 4092 => "OnChange" interval: 1s
  The RFStatus block provides information on the radio-frequency (RF) bands where
  interferences have been detected and/or notch filters have been applied.

  RFStatus -------------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  N                 uint8                     Number of RF bands for which data is provided in this SBF block, i.e.
                                              number of RFBand sub-blocks.
  SBLength          uint8  1 byte             Length of one sub-block
  Flags             uint8                     Bit field:
                                                Bit 0: Set when a spoofing suspicion is determined.
                                                Bits 1-7: Reserved
  Reserved       uint8[3]                     Reserved for future use, to be ignored by decoding software.
  RFBand                                      A succession of N RFBand sub-blocks
  Padding            uint                     Padding bytes

  RFBand ---------------------------------------------------------------------
  Block fields       Type  Units  Description
  Frequency        uint32   1 Hz  Center frequency of the RF band addressed by this sub-block.
  Bandwidth        uint16  1 kHz  Bandwidth of the RF band.
  Info              uint8         Info on this RF band:
                                    Bits 0-3: Mode:
                                      1: This RF band is suppressed by a notch filter set manually with the
                                         command setNotchFiltering.
                                      2: The receiver detected interference in this band, and successfully
                                         cancelled it.
                                      8: The receiver detected interference in this band. No mitigation applied.
                                    Bits 4-5: Reserved
                                    Bits 6-7: Antenna ID: 0 for main, 1 for Aux1 and 2 for Aux2
  Padding            uint         Padding bytes

  ⚠️ Worth knowing what this block means operationally: mode 8 is "interference
  detected and NOT mitigated", and `Flags` bit 0 is a spoofing suspicion. On a
  vessel those are the two states someone wants to be told about, which is why
  they are summarised at payload level.
*/
const RF_BAND: readonly FieldDefinition[] = [
  { name: 'Frequency', type: 'uint32', units: 'Hz', description: 'Centre frequency of the RF band this sub-block addresses' },
  { name: 'Bandwidth', type: 'uint16', units: 'kHz', description: 'Bandwidth of the RF band' },
  { name: 'Info', type: 'uint8', description: 'Bit field: bits 0-3 mode (1 notch filter set manually, 2 interference detected and cancelled, 8 interference detected with no mitigation), bits 6-7 antenna ID' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of RFBand sub-blocks in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one RFBand sub-block' },
  { name: 'Flags', type: 'uint8', description: 'Bit field: bit 0 set when a spoofing suspicion is determined' },
  { name: 'Reserved', type: 'string', length: 3, reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'RFBand', count: 'N', length: 'SBLength', fields: RF_BAND, description: 'A succession of N RFBand sub-blocks' },
]

export const RF_MODE: Readonly<Record<number, string>> = {
  1: 'NOTCH_FILTER_MANUAL',
  2: 'INTERFERENCE_CANCELLED',
  8: 'INTERFERENCE_NOT_MITIGATED',
}

export const RF_ANTENNA: Readonly<Record<number, string>> = {
  0: 'MAIN',
  1: 'AUX1',
  2: 'AUX2',
}

const HERTZ_PER_MEGAHERTZ = 1_000_000
const NOT_MITIGATED = 8

const decoders: Readonly<Record<string, Decoder>> = {
  Flags: (value) => ({ spoofingSuspicion: bitState(value, 0) }),
  Frequency: (value) => scaled(value, HERTZ_PER_MEGAHERTZ, 'MHz'),
  Info: (value) => ({
    mode: RF_MODE[bits(value, 0, 3)] ?? UNKNOWN_LABEL,
    antenna: RF_ANTENNA[bits(value, 6, 7)] ?? UNKNOWN_LABEL,
  }),
}

export const rfStatus: BlockDefinition = {
  name: 'RFStatus',
  number: 4092,
  description: 'RF bands where interference was detected and/or a notch filter was applied, plus any spoofing suspicion',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  // The two facts an operator acts on, without reading N sub-blocks.
  payloadMetadata: ({ Flags, Info, N }) => {
    if (typeof Flags !== 'number') return {}
    const interference: Record<string, unknown> = {
      spoofingSuspicion: bitState(Flags, 0),
      bands: Number(N ?? 0),
    }
    // `Info` here is the LAST sub-block's value (they collapse by name), so this
    // says "at least one band is unmitigated", not "which".
    if (typeof Info === 'number') interference.unmitigated = bits(Info, 0, 3) === NOT_MITIGATED
    return { interference }
  },
}
