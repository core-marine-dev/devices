// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, scaled, UNKNOWN_LABEL } from '../../../utils'
import { RF_ANTENNA } from '../Status/RFStatus'

/* BBSamples -> Number: 4040 => "OnChange" interval: block generated each time new
   baseband samples are ready (typically at 2Hz)

  The BBSamples block contains a series of successive complex baseband samples.
  These samples can be used for signal monitoring and for spectral analysis of the
  GNSS bands supported by the receiver.

  BBSamples ------------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  N                uint16                    Number of complex baseband samples contained in this block
  Info              uint8                    Bit field as follows:
                                               Bits 0-2: Antenna ID: antenna from which the samples have been taken:
                                                         0 for main, 1 for Aux1 and 2 for Aux2.
                                               Bits 3-7: Reserved
  Reserved       uint8[3]                    Reserved for future use, to be ignored by decoding software
  SampleFreq     uint32   1 Hz               Sampling frequency in Hz
  LOFreq         uint32   1 Hz               Frequency of the local oscillator (LO) used to down-convert the RF
                                             signal to baseband
  Samples      uint16[N]                     N successive complex baseband samples (I+jQ), coded as follows:
                                               Bits 0-7:  8-bit Q component, two's complement
                                               Bits 8-15: 8-bit I component, two's complement
  Padding            uint                    Padding bytes

  ⚠️ Note the time stamp: Appendix B marks this block EXTERNAL, not receiver — the
  samples are taken by the front-end, not at a PVT epoch — so its TOW/WNc is not
  promoted to cma.timestamp.

  Each sample is ONE uint16 carrying two signed 8-bit components, so the payload
  is N fields and the I/Q pair lands in each field's metadata. That is a lot of
  fields for a block that can be thousands of samples long, which is exactly why
  it is off by default; nothing here decides for the user.
*/
const SAMPLE: readonly FieldDefinition[] = [
  { name: 'Sample', type: 'uint16', description: 'One complex baseband sample: bits 0-7 the Q component, bits 8-15 the I component, both two\'s complement' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint16', description: 'Number of complex baseband samples in this block' },
  { name: 'Info', type: 'uint8', description: 'Bit field: bits 0-2 the antenna the samples were taken from' },
  { name: 'Reserved', type: 'string', length: 3, reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'SampleFreq', type: 'uint32', units: 'Hz', description: 'Sampling frequency' },
  { name: 'LOFreq', type: 'uint32', units: 'Hz', description: 'Frequency of the local oscillator used to down-convert the RF signal to baseband' },
  { name: 'Samples', count: 'N', fields: SAMPLE, description: 'N successive complex baseband samples (I+jQ)' },
]

const SIGN_LIMIT = 128
const SIGN_RANGE = 256
const HERTZ_PER_MEGAHERTZ = 1_000_000

// Two's complement in 8 bits: the components are packed into a uint16, so the
// sign has to be restored by hand — DataView cannot help with half a field.
const signed8 = (value: number): number => (value >= SIGN_LIMIT) ? value - SIGN_RANGE : value

const decoders: Readonly<Record<string, Decoder>> = {
  Info: (value) => ({ antenna: RF_ANTENNA[bits(value, 0, 2)] ?? UNKNOWN_LABEL }),
  SampleFreq: (value) => scaled(value, HERTZ_PER_MEGAHERTZ, 'MHz'),
  LOFreq: (value) => scaled(value, HERTZ_PER_MEGAHERTZ, 'MHz'),
  Sample: (value) => ({ i: signed8(bits(value, 8, 15)), q: signed8(bits(value, 0, 7)) }),
}

export const bbSamples: BlockDefinition = {
  name: 'BBSamples',
  number: 4040,
  description: 'A run of complex baseband samples from one antenna, for signal monitoring and spectral analysis of the GNSS bands',
  timestamp: 'external',
  revisions: [FIELDS],
  decoders,
  // The band these samples describe: the LO frequency plus the sampling
  // frequency is what a spectrum plot needs before it can label an axis.
  payloadMetadata: ({ LOFreq, N, SampleFreq }) => {
    if (typeof LOFreq !== 'number' || typeof SampleFreq !== 'number') return {}
    return {
      baseband: {
        samples: Number(N ?? 0),
        centre: { value: LOFreq / HERTZ_PER_MEGAHERTZ, units: 'MHz' },
        bandwidth: { value: SampleFreq / HERTZ_PER_MEGAHERTZ, units: 'MHz' },
      },
    }
  },
}
