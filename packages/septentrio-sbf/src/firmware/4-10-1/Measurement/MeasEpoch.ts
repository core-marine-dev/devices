// installed
import type { Metadata, Value } from '@coremarine/protocol-core'

// coded
import {
  carrierToNoise,
  numeric,
  observationInfo,
  signalNumber,
  typeField,
  unavailable,
  wavelength,
} from './observables'

import { DO_NOT_USE_INT32, DO_NOT_USE_UINT8, DO_NOT_USE_UINT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, signedBits } from '../../../utils'
import { satelliteId } from '../satellites'

/* MeasEpoch -> Number: 4027 => "OnChange" interval: internal measurement rate
  (receiver-type dependent)

  This block contains all the GNSS measurements (observables) taken at the time
  given by the TOW and WNc fields.

  For each tracked signal, the following measurement set is available:
    - the pseudorange
    - the carrier phase
    - the Doppler
    - the C/N0
    - the lock-time.

  To decrease the block size, all the measurements from a given satellite are
  referenced to one master measurement set. For instance, the L2 pseudorange (C2)
  is not much different from the L1 pseudorange (C1), such that the difference
  between C2 and C1 is encoded, instead of the absolute value of C2.

  This is done by using a two-level sub-block structure. All the measurements from
  a given satellite are stored in a MeasEpochChannelType1 sub-block. The first part
  of this sub-block contains the master measurements, encoded as absolute values.
  The second part contains slave measurements, for which only the delta values are
  encoded in smaller MeasEpochChannelType2 sub-blocks.

  Every MeasEpochChannelType1 sub-block contains a field "N2", which gives the
  number of nested MeasEpochChannelType2 sub-blocks. If there is only one signal
  tracked for a given satellite, there are no slave measurements and N2 is set to 0.

  Decoding is done as follows:
    1. Decode the master measurements and the N2 value from the
       MeasEpochChannelType1 sub-block.
    2. If N2 is not 0, decode the N2 nested MeasEpochChannelType2 sub-blocks.
    3. Go back to 1 till the N1 MeasEpochChannelType1 sub-blocks have been decoded.

  Note that measurements in this block are scrambled if the "Measurement
  Availability" permission is not granted on your receiver. See also bit 7 of the
  CommonFlags field.

  MeasEpoch -----------------------------------------------------------------
  Block fields    Type  Units   Do-Not-Use  Description
  N1             uint8                      Number of MeasEpochChannelType1 sub-blocks in this MeasEpoch block.
  SB1Length      uint8  1 byte              Length of a MeasEpochChannelType1 sub-block, EXCLUDING the nested
                                            MeasEpochChannelType2 sub-blocks
  SB2Length      uint8  1 byte              Length of a MeasEpochChannelType2 sub-block
  CommonFlags    uint8                      Bit field containing flags common to all measurements.
                                              Bit 0: Multipath mitigation: if set, multipath mitigation is enabled
                                                     (see the setMultipathMitigation command).
                                              Bit 1: Smoothing of code: if set, at least one of the code
                                                     measurements are smoothed values (see
                                                     setSmoothingInterval command).
                                              Bit 2: Carrier phase align: if set, the fractional part of the carrier
                                                     phase measurements from different modulations on the same
                                                     carrier frequency (e.g. GPS L2C and L2P) are aligned, i.e.
                                                     multiplexing biases (0.25 or 0.5 cycles) are corrected. Aligned
                                                     carrier phase measurements can be directly included in RINEX
                                                     files. If unset, this block contains raw carrier phase
                                                     measurements. This bit is always set in the current firmware.
                                              Bit 3: Clock steering: set if clock steering is active (see
                                                     setClockSyncThreshold command).
                                              Bit 4: Not applicable.
                                              Bit 5: High dynamics: set when the receiver is in high-dynamics mode
                                                     (see the setReceiverDynamics command).
                                              Bit 6: Reserved
                                              Bit 7: Scrambling: set when the measurements are scrambled.
                                                     Scrambling is applied when the "Measurement Availability"
                                                     permission is not granted (see the lif,Permissions command).
Rev 1 CumClkJumps uint8 0.001 s             Cumulative millisecond clock jumps since start-up, with an ambiguity of
                                            k*256 ms. For example, if two clock jumps of -1 ms have occurred since
                                            startup, this field contains the value 254.
  Reserved       uint8                      Reserved for future use, to be ignored by decoding software
  Type1                                     A succession of N1 MeasEpochChannelType1 sub-blocks
  Padding         uint                      Padding bytes, see 4.1.5

  MeasEpochChannelType1 sub-block definition --------------------------------
  Block fields    Type  Units          Do-Not-Use  Description
  RxChannel      uint8                             Receiver channel on which this satellite is currently tracked
                                                   (see 4.1.11).
  Type           uint8                             Bit field indicating the signal type and antenna ID:
                                                     Bits 0-4: SigIdxLo: if not 31, this is the signal number (see
                                                               4.1.10), otherwise the signal number can be found in
                                                               the ObsInfo field below.
                                                     Bits 5-7: Antenna ID: 0 for main, 1 for Aux1 and 2 for Aux2
  SVID           uint8                             Satellite ID, see 4.1.9
  Misc           uint8                             Bit field containing the MSB of the pseudorange.
                        4294967.296 m   0 (1)        Bits 0-3: CodeMSB: MSB of the pseudorange (unsigned value).
                                                     Bits 4-7: Reserved
  CodeLSB       uint32   0.001 m        0 (1)      LSB of the pseudorange. The pseudorange in metres is
                                                   PRtype1 [m] = (CodeMSB*4294967296+CodeLSB)*0.001,
                                                   where CodeMSB is part of the Misc field.
  Doppler        int32   0.0001 Hz  -2147483648    Carrier Doppler (positive for approaching satellites).
                                                   Dtype1 [Hz] = Doppler*0.0001
  CarrierLSB    uint16   0.001 cycles   0 (2)      LSB of the carrier phase relative to the pseudorange
  CarrierMSB      int8   65.536 cycles -128 (2)    MSB of the carrier phase relative to the pseudorange. The full
                                                   carrier phase can be computed by:
                                                   L[cycles] = PRtype1 [m]/λ
                                                             +(CarrierMSB*65536+CarrierLSB)*0.001
                                                   where λ is the carrier wavelength corresponding to the frequency
                                                   of the signal type in the Type field above:
                                                   λ=299792458/fL m, with fL the carrier frequency as listed in
                                                   section 4.1.10.
  CN0            uint8   0.25 dB-Hz      255       The C/N0 in dB-Hz is computed as follows, depending on the
                                                   signal type in the Type field:
                                                     C/N0 [dB-Hz] = CN0*0.25 if the signal number is 1 or 2
                                                     C/N0 [dB-Hz] = CN0*0.25+10 otherwise
                                                   Users requiring a higher C/N0 resolution can use the MeasExtra
                                                   SBF block. The Misc field of that block allows to extend the
                                                   resolution to 0.03125dB-Hz.
  LockTime      uint16   1 s              65535    Duration of continuous carrier phase. The lock-time is reset at
                                                   the initial lock of the phase-locked-loop, and whenever a loss of
                                                   lock condition occurs. If the lock-time is longer than 65534s, it
                                                   is clipped to 65534s. If the carrier phase measurement is not
                                                   available, this field is set to its Do-Not-Use value.
  ObsInfo        uint8                             Bit field:
                                                     Bit 0:    if set, the pseudorange measurement is smoothed
                                                     Bit 1:    Reserved
                                                     Bit 2:    set when the carrier phase (L) has a half-cycle
                                                               ambiguity
                                                     Bits 3-7: The interpretation of these bits depends on the value
                                                               of SigIdxLo from the Type field.
                                                               If SigIdxLo equals 31, these bits contain the signal
                                                               number with an offset of 32 (see 4.1.10). For example,
                                                               a value of 1 corresponds to signal number 33 (QZSS
                                                               L1S).
                                                               If SigIdxLo is 8, 9, 10 or 11, these bits contain the
                                                               GLONASS frequency number with an offset of 8. For
                                                               example, a value of 1 corresponds to frequency
                                                               number -7.
                                                               Otherwise, these bits are reserved.
  N2             uint8                             Number of MeasEpochChannelType2 sub-blocks contained in this
                                                   MeasEpochChannelType1 sub-block.
  Padding         uint                             Padding bytes, see 4.1.5
  Type2                                            A succession of N2 MeasEpochChannelType2 sub-blocks

  (1) The pseudorange is invalid if both CodeMSB is 0 and CodeLSB is 0.
  (2) The carrier phase is invalid if both CarrierMSB is -128 and CarrierLSB is 0.

  MeasEpochChannelType2 sub-block definition --------------------------------
  Block fields      Type  Units          Do-Not-Use  Description
  Type             uint8                             Bit field indicating the signal type and antenna ID:
                                                       Bits 0-4: SigIdxLo: if not 31, this is the signal number (see
                                                                 4.1.10), otherwise the signal number can be found in
                                                                 the ObsInfo field below.
                                                       Bits 5-7: Antenna ID: 0 for main, 1 for Aux1, 2 for Aux2
  LockTime         uint8   1 s              255      See the corresponding field in the MeasEpochChannelType1
                                                     sub-block above, except that the value is clipped to 254
                                                     instead of 65534.
  CN0              uint8   0.25 dB-Hz       255      See the corresponding field in the MeasEpochChannelType1
                                                     sub-block above.
  OffsetsMSB       uint8                             Bit field containing the MSB of the code and of the Doppler
                                                     offsets with respect to the MeasEpochChannelType1 sub-block.
                           65.536 m         -4 (3)     Bits 0-2: CodeOffsetMSB: MSB of the code offset.
                           6.5536 Hz       -16 (4)     Bits 3-7: DopplerOffsetMSB: MSB of the Doppler offset.
                                                     CodeOffsetMSB and DopplerOffsetMSB are coded as two's
                                                     complement. Refer to the CodeOffsetLSB and DopplerOffsetLSB
                                                     fields to see how to use this field.
  CarrierMSB        int8   65.536 cycles  -128 (5)    MSB of the carrier phase relative to the pseudorange.
  ObsInfo          uint8                             Bit field:
                                                       Bit 0:    if set, the pseudorange measurement is smoothed
                                                       Bit 1:    Reserved
                                                       Bit 2:    set when the carrier phase (L) has a half-cycle
                                                                 ambiguity
                                                       Bits 3-7: If SigIdxLo from the Type field of this sub-block
                                                                 equals 31, these bits contain the signal number with
                                                                 an offset of 32 (see 4.1.10), e.g. 1 corresponds to
                                                                 signal number 33 (QZSS L1S). Otherwise they are
                                                                 reserved and must be ignored by the decoding
                                                                 software.
  CodeOffsetLSB   uint16   0.001 m          0 (3)    LSB of the code offset with respect to the pseudorange in the
                                                     MeasEpochChannelType1 sub-block. To compute the pseudorange:
                                                     PRtype2 [m] = PRtype1 [m]
                                                             + (CodeOffsetMSB*65536+CodeOffsetLSB)*0.001
  CarrierLSB      uint16   0.001 cycles     0 (5)    LSB of the carrier phase relative to the pseudorange. The full
                                                     carrier phase can be computed by:
                                                     L[cycles] = PRtype2 [m]/λ
                                                             +(CarrierMSB*65536+CarrierLSB)*0.001
                                                     where λ is the carrier wavelength corresponding to the signal
                                                     type in the Type field.
  DopplerOffsetLSB uint16  0.0001 Hz        0 (4)    LSB of the Doppler offset relative to the Doppler in the
                                                     MeasEpochChannelType1 sub-block. To compute the Doppler:
                                                     Dtype2 [Hz] = Dtype1 [Hz]*α
                                                             +(DopplerOffsetMSB*65536+DopplerOffsetLSB)*1e-4,
                                                     where α is the ratio of the carrier frequency corresponding to
                                                     the observable type in this MeasEpochChannelType2 sub-block,
                                                     and that of the master observable type in the parent
                                                     MeasEpochChannelType1 sub-block (see section 4.1.10 for a list
                                                     of all carrier frequencies).
  Padding           uint                             Padding bytes, see 4.1.5

  (3) The pseudorange is invalid if both CodeOffsetMSB is -4 and CodeOffsetLSB is 0.
  (4) The Doppler is invalid if both DopplerOffsetMSB is -16 and DopplerOffsetLSB is 0.
  (5) The carrier phase is invalid if both CarrierMSB is -128 and CarrierLSB is 0.

  ---------------------------------------------------------------------------
  THREE THINGS THIS BLOCK IS THE FIRST TO NEED, all verified against a real
  frame from cru's own receiver (2023_06_23_test1.sbf, revision 1: N1 = 14,
  SB1Length = 20, SB2Length = 12, 29 Type2 sub-blocks, and the two-level walk
  lands on byte 648 of a 648-byte block with nothing left over):

  1. A REVISION THAT NAMES A BYTE IN THE MIDDLE. Every other block modelled so
     far grows at the end. Here rev 1 introduces `CumClkJumps` BEFORE `Reserved`,
     and §4.1.6 is explicit that a backwards-compatible change "consists of
     adding one or more fields in the padding bytes, or in the fields marked as
     reserved" — so that byte must already exist at revision 0, unnamed.
     Modelling rev 0 with five header bytes instead of six would shift the whole
     Type1 run by one byte and break exactly the compatibility §4.1.6 promises.
     Hence the explicit reserved placeholder.

  2. SUB-BLOCK-SCOPED DECODERS. `CarrierLSB`, `CN0`, `LockTime`, `Type` and
     `ObsInfo` all appear in BOTH sub-blocks, and `CarrierLSB` does not mean the
     same thing twice: absolute carrier phase in a Type1, phase relative to the
     master measurement in a Type2. Decoders are keyed by field name, so the two
     are declared on their own sub-blocks and the engine layers them over the
     block's.

  3. PAIR-CONDITIONED INVALID MARKERS. Four of the five footnotes above make a
     measurement invalid only when TWO fields hold a specific value together.
     `doNotUse` marks a single field, so it cannot express any of them — and
     using it anyway would be actively wrong: CodeLSB is 0 in plenty of valid
     frames, as long as CodeMSB is not. The pairs are therefore checked in the
     decoders, which see both fields, and the derived quantity is published as
     `{ value: null, doNotUse: true }` while the raw field keeps its real 0.

  WHAT IS DELIBERATELY NOT COMPUTED. A Type2's absolute Doppler needs α, the
  ratio between its own carrier frequency and the MASTER observable's — and the
  master's signal type lives in the parent's `Type`, which a Type2 occurrence
  cannot see (both sub-blocks call the field `Type`, so the child's read has
  already replaced the parent's by the time the child decodes). The Doppler
  OFFSET is published, the absolute Doppler is not, and this comment is the
  reason. Inventing α from the child's own frequency would produce a number that
  looks like a Doppler and is not one.

  The pseudorange is a different story and IS resolved: `CodeLSB`/`Misc` exist
  only in Type1, so a Type2 occurrence still sees its parent's — the master
  measurement it is defined relative to, exactly as the datasheet intends.
*/

// §4.2.1 footnote (1): CodeMSB and CodeLSB both 0.
const CODE_MSB_SCALE = 4_294_967_296
const CODE_SCALE_M = 0.001
// §4.2.1 footnotes (2) and (5): CarrierMSB -128 with CarrierLSB 0.
const CARRIER_MSB_INVALID = -128
const CARRIER_MSB_SCALE = 65_536
const CARRIER_SCALE_CYCLES = 0.001
// §4.2.1 footnote (3): CodeOffsetMSB -4 with CodeOffsetLSB 0.
const CODE_OFFSET_MSB_INVALID = -4
const CODE_OFFSET_MSB_SCALE = 65_536
// §4.2.1 footnote (4): DopplerOffsetMSB -16 with DopplerOffsetLSB 0.
const DOPPLER_OFFSET_MSB_INVALID = -16
const DOPPLER_OFFSET_MSB_SCALE = 65_536
const DOPPLER_SCALE_HZ = 1e-4
// CumClkJumps is a cumulative count modulo 256, so a value above half the range
// is a NEGATIVE cumulative jump (the datasheet's own example: 254 means -2 ms).
const CLOCK_JUMP_MODULO = 256
const CLOCK_JUMP_HALF = 128

const TYPE_1_FIELDS: readonly FieldDefinition[] = [
  { name: 'RxChannel', type: 'uint8', description: 'Receiver channel this satellite is tracked on (§4.1.11)' },
  { name: 'Type', type: 'uint8', description: 'Bit field: bits 0-4 signal number (31 means it is in ObsInfo bits 3-7 with an offset of 32), bits 5-7 antenna ID' },
  { name: 'SVID', type: 'uint8', description: 'Satellite ID (§4.1.9)' },
  { name: 'Misc', type: 'uint8', units: '4294967.296 m', description: 'Bit field: bits 0-3 CodeMSB, the unsigned most-significant bits of the pseudorange' },
  { name: 'CodeLSB', type: 'uint32', units: '0.001 m', description: 'Least-significant bits of the pseudorange; the full value is (CodeMSB*4294967296+CodeLSB)*0.001 m' },
  { name: 'Doppler', type: 'int32', units: '0.0001 Hz', doNotUse: DO_NOT_USE_INT32, description: 'Carrier Doppler, positive for approaching satellites' },
  { name: 'CarrierLSB', type: 'uint16', units: '0.001 cycles', description: 'Least-significant bits of the carrier phase relative to the pseudorange' },
  { name: 'CarrierMSB', type: 'int8', units: '65.536 cycles', description: 'Most-significant bits of the carrier phase relative to the pseudorange' },
  { name: 'CN0', type: 'uint8', units: '0.25 dB-Hz', doNotUse: DO_NOT_USE_UINT8, description: 'Carrier-to-noise density ratio; the dB-Hz value is CN0*0.25, plus 10 unless the signal number is 1 or 2' },
  { name: 'LockTime', type: 'uint16', units: 's', doNotUse: DO_NOT_USE_UINT16, description: 'Duration of continuous carrier phase, clipped at 65534 s; Do-Not-Use when the carrier phase is unavailable' },
  { name: 'ObsInfo', type: 'uint8', description: 'Bit field: bit 0 smoothed pseudorange, bit 2 half-cycle ambiguity, bits 3-7 the extended signal number or the GLONASS frequency number depending on SigIdxLo' },
  { name: 'N2', type: 'uint8', description: 'Number of MeasEpochChannelType2 sub-blocks nested in this sub-block; 0 when this satellite has only one tracked signal' },
]

const TYPE_2_FIELDS: readonly FieldDefinition[] = [
  { name: 'Type', type: 'uint8', description: 'Bit field: bits 0-4 signal number (31 means it is in ObsInfo bits 3-7 with an offset of 32), bits 5-7 antenna ID' },
  { name: 'LockTime', type: 'uint8', units: 's', doNotUse: DO_NOT_USE_UINT8, description: 'Duration of continuous carrier phase, clipped at 254 s; Do-Not-Use when the carrier phase is unavailable' },
  { name: 'CN0', type: 'uint8', units: '0.25 dB-Hz', doNotUse: DO_NOT_USE_UINT8, description: 'Carrier-to-noise density ratio; the dB-Hz value is CN0*0.25, plus 10 unless the signal number is 1 or 2' },
  { name: 'OffsetsMSB', type: 'uint8', description: 'Bit field: bits 0-2 CodeOffsetMSB, bits 3-7 DopplerOffsetMSB, both two\'s complement' },
  { name: 'CarrierMSB', type: 'int8', units: '65.536 cycles', description: 'Most-significant bits of the carrier phase relative to the pseudorange' },
  { name: 'ObsInfo', type: 'uint8', description: 'Bit field: bit 0 smoothed pseudorange, bit 2 half-cycle ambiguity, bits 3-7 the extended signal number when SigIdxLo is 31' },
  { name: 'CodeOffsetLSB', type: 'uint16', units: '0.001 m', description: 'Least-significant bits of the code offset relative to the pseudorange of the parent Type1 sub-block' },
  { name: 'CarrierLSB', type: 'uint16', units: '0.001 cycles', description: 'Least-significant bits of the carrier phase relative to the pseudorange' },
  { name: 'DopplerOffsetLSB', type: 'uint16', units: '0.0001 Hz', description: 'Least-significant bits of the Doppler offset relative to the Doppler of the parent Type1 sub-block' },
]

type Values = Readonly<Record<string, Value>>

// The pseudorange of a Type1 sub-block, in metres — or undefined when the
// CodeMSB/CodeLSB pair marks it invalid. Type2 needs this too, off its parent's
// still-visible fields, which is why it is a function of `values`.
const pseudorange = (values: Values): number | undefined => {
  const misc = numeric(values.Misc)
  const codeLSB = numeric(values.CodeLSB)
  if (misc === undefined || codeLSB === undefined) return undefined
  const codeMSB = bits(misc, 0, 3)
  if (codeMSB === 0 && codeLSB === 0) return undefined
  return ((codeMSB * CODE_MSB_SCALE) + codeLSB) * CODE_SCALE_M
}

// PRtype2 = PRtype1 + (CodeOffsetMSB*65536 + CodeOffsetLSB)*0.001, with both
// halves of the invalid pair honoured.
const type2Pseudorange = (values: Values): number | undefined => {
  const master = pseudorange(values)
  const offsets = numeric(values.OffsetsMSB)
  const lsb = numeric(values.CodeOffsetLSB)
  if (master === undefined || offsets === undefined || lsb === undefined) return undefined
  const msb = signedBits(offsets, 0, 2)
  if (msb === CODE_OFFSET_MSB_INVALID && lsb === 0) return undefined
  return master + (((msb * CODE_OFFSET_MSB_SCALE) + lsb) * CODE_SCALE_M)
}

// The signal a sub-block's own Type/ObsInfo pair names, for the wavelength.
const signalOf = (values: Values): number | undefined => {
  const type = numeric(values.Type)
  return (type === undefined) ? undefined : signalNumber(type, numeric(values.ObsInfo))
}

const wavelengthOf = (values: Values): number | undefined => {
  const signal = signalOf(values)
  const obsInfo = numeric(values.ObsInfo)
  const freqNr = (signal === undefined || obsInfo === undefined) ? undefined : bits(obsInfo, 3, 7)
  return wavelength(signal, freqNr)
}

// The (MSB*65536 + LSB)*0.001 carrier term both sub-blocks share, in cycles.
const carrierTerm = (msb: number, lsb: number): number =>
  ((msb * CARRIER_MSB_SCALE) + lsb) * CARRIER_SCALE_CYCLES

// Shared by both sub-blocks: the fields whose meaning does not change.
const commonDecoders: Readonly<Record<string, Decoder>> = {
  Type: typeField('ObsInfo'),
  ObsInfo: observationInfo,
  CN0: (value, values) => ({ value: carrierToNoise(value, signalOf(values)), units: 'dB-Hz' }),
}

const type1Decoders: Readonly<Record<string, Decoder>> = {
  SVID: satelliteId,
  Misc: (value) => ({ codeMSB: bits(value, 0, 3) }),
  Doppler: (value) => ({ value: value * DOPPLER_SCALE_HZ, units: 'Hz' }),
  // The absolute pseudorange, which is what this field's datasheet row defines.
  CodeLSB: (_value, values) => {
    const range = pseudorange(values)
    return (range === undefined) ? unavailable : { value: range, units: 'm' }
  },
  // The ABSOLUTE carrier phase: PR/λ plus the carrier term.
  CarrierLSB: (value, values) => {
    const msb = numeric(values.CarrierMSB)
    if (msb === undefined) return {}
    if (msb === CARRIER_MSB_INVALID && value === 0) return unavailable
    const range = pseudorange(values)
    const lambda = wavelengthOf(values)
    // The carrier term alone is real and known; the absolute phase needs both a
    // pseudorange and a wavelength, so it is null rather than half-computed.
    if (range === undefined || lambda === undefined) {
      return { value: null, relative: { value: carrierTerm(msb, value), units: 'cycles' } }
    }
    return { value: (range / lambda) + carrierTerm(msb, value), units: 'cycles' }
  },
}

const type2Decoders: Readonly<Record<string, Decoder>> = {
  OffsetsMSB: (value) => ({
    codeOffsetMSB: signedBits(value, 0, 2),
    dopplerOffsetMSB: signedBits(value, 3, 7),
  }),
  // PRtype2 = PRtype1 + offset. The parent's Misc/CodeLSB are still in scope —
  // Type2 defines neither — so the absolute pseudorange IS available here.
  CodeOffsetLSB: (value, values) => {
    const offsets = numeric(values.OffsetsMSB)
    if (offsets === undefined) return {}
    const msb = signedBits(offsets, 0, 2)
    if (msb === CODE_OFFSET_MSB_INVALID && value === 0) return unavailable
    const offset = ((msb * CODE_OFFSET_MSB_SCALE) + value) * CODE_SCALE_M
    const master = pseudorange(values)
    return (master === undefined)
      ? { value: null, offset: { value: offset, units: 'm' } }
      : { value: master + offset, units: 'm', offset: { value: offset, units: 'm' } }
  },
  // Only the OFFSET. The absolute Doppler needs α, the frequency ratio to the
  // master observable, whose signal type this scope cannot see — see the header
  // comment. A plausible-looking wrong Doppler is worse than an honest gap.
  DopplerOffsetLSB: (value, values) => {
    const offsets = numeric(values.OffsetsMSB)
    if (offsets === undefined) return {}
    const msb = signedBits(offsets, 3, 7)
    if (msb === DOPPLER_OFFSET_MSB_INVALID && value === 0) return unavailable
    return { offset: { value: ((msb * DOPPLER_OFFSET_MSB_SCALE) + value) * DOPPLER_SCALE_HZ, units: 'Hz' } }
  },
  // L = PRtype2/λ + carrier term, with PRtype2 assembled from the parent's
  // pseudorange and this sub-block's own code offset.
  CarrierLSB: (value, values) => {
    const msb = numeric(values.CarrierMSB)
    if (msb === undefined) return {}
    if (msb === CARRIER_MSB_INVALID && value === 0) return unavailable
    const range = type2Pseudorange(values)
    const lambda = wavelengthOf(values)
    if (range === undefined || lambda === undefined) {
      return { value: null, relative: { value: carrierTerm(msb, value), units: 'cycles' } }
    }
    return { value: (range / lambda) + carrierTerm(msb, value), units: 'cycles' }
  },
}

const TYPE_2_RUN: FieldDefinition = {
  name: 'Type2',
  count: 'N2',
  length: 'SB2Length',
  fields: TYPE_2_FIELDS,
  decoders: type2Decoders,
  description: 'A succession of N2 MeasEpochChannelType2 sub-blocks — the slave measurements, encoded as deltas from this satellite\'s master measurement',
}

const TYPE_1_RUN: FieldDefinition = {
  name: 'Type1',
  count: 'N1',
  length: 'SB1Length',
  fields: [...TYPE_1_FIELDS, TYPE_2_RUN],
  decoders: type1Decoders,
  description: 'A succession of N1 MeasEpochChannelType1 sub-blocks — one per satellite, carrying its master measurement set',
}

// Rev 0 reserves the byte rev 1 names CumClkJumps: §4.1.6 only permits a new
// field to occupy padding or reserved space, so the Type1 run must start at the
// same offset in both revisions.
const REVISION_0: readonly FieldDefinition[] = [
  { name: 'N1', type: 'uint8', description: 'Number of MeasEpochChannelType1 sub-blocks in this block' },
  { name: 'SB1Length', type: 'uint8', units: 'bytes', description: 'Length of a MeasEpochChannelType1 sub-block, excluding its nested MeasEpochChannelType2 sub-blocks' },
  { name: 'SB2Length', type: 'uint8', units: 'bytes', description: 'Length of one MeasEpochChannelType2 sub-block' },
  { name: 'CommonFlags', type: 'uint8', description: 'Bit field: bit 0 multipath mitigation, bit 1 code smoothing, bit 2 carrier-phase alignment, bit 3 clock steering, bit 5 high dynamics, bit 7 measurements scrambled' },
  { name: 'Reserved1', type: 'uint8', reserved: true, description: 'Reserved at revision 0; revision 1 names this byte CumClkJumps' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  TYPE_1_RUN,
]

const REVISION_1: readonly FieldDefinition[] = [
  ...REVISION_0.slice(0, 4),
  { name: 'CumClkJumps', type: 'uint8', units: '0.001 s', description: 'Cumulative millisecond clock jumps since start-up, ambiguous by k*256 ms' },
  ...REVISION_0.slice(5),
]

const decoders: Readonly<Record<string, Decoder>> = {
  ...commonDecoders,
  CommonFlags: (value) => ({
    multipathMitigation: bitState(value, 0),
    codeSmoothing: bitState(value, 1),
    carrierPhaseAligned: bitState(value, 2),
    clockSteering: bitState(value, 3),
    highDynamics: bitState(value, 5),
    // Not a flag to skip past: when it is set the receiver is deliberately
    // returning useless measurements, because the "Measurement Availability"
    // permission is not granted. Every observable in the block is then fiction.
    scrambled: bitState(value, 7),
  }),
  CumClkJumps: (value): Metadata => {
    const signed = (value >= CLOCK_JUMP_HALF) ? value - CLOCK_JUMP_MODULO : value
    return { value: signed * CODE_SCALE_M, units: 's', ambiguity: 'k*256 ms' }
  },
}

export const measEpoch: BlockDefinition = {
  name: 'MeasEpoch',
  number: 4027,
  description: 'All GNSS observables — pseudorange, carrier phase, Doppler, C/N0 and lock-time — for every signal tracked at one measurement epoch',
  timestamp: 'receiver',
  revisions: [REVISION_0, REVISION_1],
  decoders,
  payloadMetadata: ({ N1, CommonFlags }) => {
    if (typeof N1 !== 'number') return {}
    const measurements: Record<string, unknown> = { satellites: N1 }
    // Worth restating at block level: it makes every observable in the payload
    // meaningless, and a consumer should not have to find the flag field first.
    if (typeof CommonFlags === 'number' && bitState(CommonFlags, 7)) measurements.scrambled = true
    return { measurements }
  },
}
