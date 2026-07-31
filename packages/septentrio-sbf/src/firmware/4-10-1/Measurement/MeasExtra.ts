// coded
import { numeric, SIG_IDX_ESCAPE, signalNumber, typeField } from './observables'

import { DO_NOT_USE_UINT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, scaled } from '../../../utils'

/* MeasExtra -> Number: 4000 => "OnChange" interval: internal measurement rate
  (receiver-type dependent)

  This block contains extra information associated with the measurements contained
  in the MeasEpoch block, such as the internal corrections parameters applied
  during the measurement pre-processing, and the noise variances.

  MeasExtra -----------------------------------------------------------------
  Block fields      Type  Units             Do-Not-Use  Description
  N                uint8                                Number of sub-blocks in this MeasExtra block.
  SBLength         uint8  1 byte                         Length of a sub-block
  DopplerVarFactor float32 1 Hz2 / cycle2                Factor to be used to compute the Doppler variance from the
                                                         carrier phase variance. More specifically, the Doppler
                                                         variance in mHz2 can be computed by:
                                                         σ²Doppler [mHz2] = CarrierVariance * DopplerVarFactor,
                                                         where CarrierVariance can be found for each measurement
                                                         type in the MeasExtraChannelSub sub-blocks.
  ChannelSub                                             A succession of N MeasExtraChannelSub sub-blocks
  Padding           uint                                 Padding bytes, see 4.1.5

  MeasExtraChannelSub sub-block definition ----------------------------------
  Block fields      Type  Units            Do-Not-Use  Description
  RxChannel        uint8                               Receiver channel on which this satellite is currently tracked
                                                       (see 4.1.11).
  Type             uint8                               Bit field indicating the signal type and antenna ID:
                                                         Bits 0-4: SigIdxLo: if not 31, this is the signal number
                                                                   (see 4.1.10), otherwise the signal number can be
                                                                   found in the Misc field below. A value of 31 can
                                                                   only happen on block revision 3 or above.
                                                         Bits 5-7: Antenna ID: 0 for main, 1 for Aux1 and 2 for Aux2
  MPCorrection     int16   0.001 m                     Multipath correction applied to the pseudorange. This number
                                                       has to be added to the pseudorange to recover the raw
                                                       pseudorange as it would be if multipath mitigation was not
                                                       used.
  SmoothingCorr    int16   0.001 m                     Smoothing correction applied to the pseudorange. This number
                                                       has to be added to the pseudorange to recover the raw
                                                       pseudorange as it would be if smoothing was disabled.
  CodeVar         uint16   0.0001 m2           65535   Estimated code tracking noise variance. If the variance is
                                                       larger than 65534 cm2, it is clipped to 65534 cm2.
  CarrierVar      uint16   1 mcycle2           65535   Estimated carrier tracking noise variance. This value can be
                                                       multiplied by DopplerVarFactor to compute the Doppler
                                                       measurement variance. If the variance is larger than 65534
                                                       mcycles2, it is clipped to 65534 mcycles2.
  LockTime        uint16   1 s                 65535   Duration of continuous carrier phase. The lock-time is reset
                                                       at the initial lock after a signal (re)acquisition. If the
                                                       lock-time is longer than 65534s, it is clipped to 65534s. If
                                                       the carrier phase measurement is not available, this field is
                                                       set to its Do-Not-Use value.
  CumLossCont      uint8                               Carrier phase cumulative loss-of-continuity counter (modulo
                                                       256) for the signal type, antenna and satellite this
                                                       sub-block refers to. This counter starts at zero at receiver
                                                       start-up, and is incremented at each initial lock after
                                                       signal (re)acquisition, or when a cycle slip is detected.
Rev 1 CarMPCorr    int8   1.953125 mcycle              Multipath correction applied to the carrier phase, in units
                                                       of 1/512 cycles. This number has to be added to the carrier
                                                       phase to recover the raw phase as it would be if multipath
                                                       mitigation was not used.
Rev 2 Info         uint8                               Bit field:
                                                         Bits 0-3: Reserved.
                                                         Bits 4-7: Reserved.
Rev 3 Misc         uint8                               Bit field:
                           0.03125 dB-Hz                 Bits 0-2: CN0HighRes: high-resolution extension of the C/N0
                                                                   (unsigned value from 0 to 7). The C/N0 value in
                                                                   the MeasEpoch SBF block has a resolution of
                                                                   0.25dB-Hz. CN0HighRes can be used to extend the
                                                                   resolution to 0.03125dB-Hz. The high-resolution
                                                                   C/N0, in dB-Hz, is computed as follows:
                                                                   C/N0,HighRes = C/N0,MeasEpoch + CN0HighRes*0.03125
                                                                   where C/N0,MeasEpoch is the C/N0 value coming from
                                                                   the MeasEpoch SBF block.
                                                         Bits 3-7: If SigIdxLo from the Type field equals 31, these
                                                                   bits contain the signal number with an offset of
                                                                   32 (see 4.1.10). Otherwise they are reserved.
  Padding           uint                               Padding bytes, see 4.1.5

  ---------------------------------------------------------------------------
  FOUR STACKED REVISIONS, ALL INSIDE THE SUB-BLOCK. Unlike MeasEpoch — where rev 1
  names a byte in the fixed header — every MeasExtra revision APPENDS to
  MeasExtraChannelSub, so each one makes the sub-block one byte longer:

    rev 0  13 bytes    rev 1  14 (CarMPCorr)    rev 2  15 (Info)    rev 3  16 (Misc)

  That is safe because the stride comes from `SBLength`, not from the table's own
  size, so a rev-0 decoder walking a rev-3 stream skips the three extra bytes
  cleanly. CONFIRMED against cru's receiver, which emits revision 3: the frame
  reports SBLength = 16 and N = 43, and 6 header bytes + 43*16 = 708 is exactly
  the block's own Length. That arithmetic is also what settles WHICH revision each
  field belongs to — the datasheet prints the three "Rev" markers in a margin, and
  the assignment above is the only one that makes 16 the rev-3 size.

  A second, independent confirmation of the same assignment: the datasheet says a
  SigIdxLo of 31 "can only happen on block revision 3 or above", and 31 means the
  signal number lives in `Misc` — a field that therefore has to exist at rev 3.

  `Info` is documented as reserved in both nibbles at revision 2, so it is carried
  as a reserved field: present, flagged, not interpreted. Naming bits nobody has
  defined would be inventing a decode.
*/
const CN0_HIGH_RES_STEP_DB = 0.03125
const CARRIER_MP_STEP_MCYCLE = 512
const CODE_VAR_SCALE = 10_000
const MILLI = 1000
// mcycles² -> cycles²: milli squared.
const MICRO = 1_000_000

const CHANNEL_SUB_REVISION_0: readonly FieldDefinition[] = [
  { name: 'RxChannel', type: 'uint8', description: 'Receiver channel this satellite is tracked on (§4.1.11)' },
  { name: 'Type', type: 'uint8', description: 'Bit field: bits 0-4 signal number (31, only from revision 3, means it is in Misc bits 3-7 with an offset of 32), bits 5-7 antenna ID' },
  { name: 'MPCorrection', type: 'int16', units: '0.001 m', description: 'Multipath correction applied to the pseudorange; add it back to recover the unmitigated pseudorange' },
  { name: 'SmoothingCorr', type: 'int16', units: '0.001 m', description: 'Smoothing correction applied to the pseudorange; add it back to recover the unsmoothed pseudorange' },
  { name: 'CodeVar', type: 'uint16', units: '0.0001 m2', doNotUse: DO_NOT_USE_UINT16, description: 'Estimated code tracking noise variance, clipped at 65534' },
  { name: 'CarrierVar', type: 'uint16', units: 'mcycles2', doNotUse: DO_NOT_USE_UINT16, description: 'Estimated carrier tracking noise variance, clipped at 65534; multiply by DopplerVarFactor for the Doppler variance' },
  { name: 'LockTime', type: 'uint16', units: 's', doNotUse: DO_NOT_USE_UINT16, description: 'Duration of continuous carrier phase since the last (re)acquisition, clipped at 65534 s' },
  { name: 'CumLossCont', type: 'uint8', description: 'Carrier phase cumulative loss-of-continuity counter, modulo 256; incremented on every re-lock and every detected cycle slip' },
]

const CHANNEL_SUB_REVISION_1: readonly FieldDefinition[] = [
  ...CHANNEL_SUB_REVISION_0,
  { name: 'CarMPCorr', type: 'int8', units: '1.953125 mcycles', description: 'Multipath correction applied to the carrier phase, in 1/512 cycles; add it back to recover the unmitigated phase' },
]

const CHANNEL_SUB_REVISION_2: readonly FieldDefinition[] = [
  ...CHANNEL_SUB_REVISION_1,
  { name: 'Info', type: 'uint8', reserved: true, description: 'Bit field; both nibbles are documented as reserved at revision 2' },
]

const CHANNEL_SUB_REVISION_3: readonly FieldDefinition[] = [
  ...CHANNEL_SUB_REVISION_2,
  { name: 'Misc', type: 'uint8', description: 'Bit field: bits 0-2 CN0HighRes, the 0.03125 dB-Hz extension of the MeasEpoch C/N0; bits 3-7 the extended signal number when SigIdxLo is 31' },
]

const channelDecoders: Readonly<Record<string, Decoder>> = {
  // The signal number can live in `Misc` from revision 3 onward, so that is the
  // extension field here — MeasEpoch uses `ObsInfo` for the same job.
  Type: typeField('Misc'),
  MPCorrection: (value) => scaled(value, MILLI, 'm'),
  SmoothingCorr: (value) => scaled(value, MILLI, 'm'),
  CodeVar: (value) => scaled(value, CODE_VAR_SCALE, 'm2'),
  // The DOPPLER variance is the documented reason DopplerVarFactor exists:
  // σ²Doppler [mHz²] = CarrierVar * DopplerVarFactor. The factor sits in the
  // block header, which a sub-block decoder can still see, so the consumer does
  // not have to carry it down and multiply by hand.
  CarrierVar: (value, values) => {
    const metadata: Record<string, unknown> = { value: value / MICRO, units: 'cycles2' }
    const factor = numeric(values.DopplerVarFactor)
    if (factor !== undefined) metadata.dopplerVariance = { value: value * factor, units: 'mHz2' }
    return metadata
  },
  CarMPCorr: (value) => scaled(value, CARRIER_MP_STEP_MCYCLE, 'cycles'),
  Misc: (value, values) => {
    const type = numeric(values.Type)
    const metadata: Record<string, unknown> = { cn0HighRes: { value: bits(value, 0, 2) * CN0_HIGH_RES_STEP_DB, units: 'dB-Hz' } }
    // Bits 3-7 are the extended signal number ONLY when SigIdxLo is the escape;
    // otherwise the datasheet reserves them, so they are not reported at all.
    if (type !== undefined && bits(type, 0, 4) === SIG_IDX_ESCAPE) {
      const extended = signalNumber(type, value)
      if (extended !== undefined) metadata.signalNumber = extended
    }
    return metadata
  },
}

const CHANNEL_SUB = (fields: readonly FieldDefinition[]): FieldDefinition => ({
  name: 'ChannelSub',
  count: 'N',
  length: 'SBLength',
  fields,
  decoders: channelDecoders,
  description: 'A succession of N MeasExtraChannelSub sub-blocks, one per tracked signal, matching the measurements of the MeasEpoch block of the same epoch',
})

const revision = (fields: readonly FieldDefinition[]): readonly FieldDefinition[] => [
  { name: 'N', type: 'uint8', description: 'Number of MeasExtraChannelSub sub-blocks in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one MeasExtraChannelSub sub-block' },
  { name: 'DopplerVarFactor', type: 'float32', units: 'Hz2/cycles2', description: 'Multiply a sub-block CarrierVar by this to obtain the Doppler variance of that measurement, in mHz2' },
  CHANNEL_SUB(fields),
]

export const measExtra: BlockDefinition = {
  name: 'MeasExtra',
  number: 4000,
  description: 'Per-measurement noise variances, lock times and the multipath and smoothing corrections the receiver applied, companion to MeasEpoch',
  timestamp: 'receiver',
  revisions: [
    revision(CHANNEL_SUB_REVISION_0),
    revision(CHANNEL_SUB_REVISION_1),
    revision(CHANNEL_SUB_REVISION_2),
    revision(CHANNEL_SUB_REVISION_3),
  ],
  payloadMetadata: ({ N }) => (typeof N === 'number') ? { measurements: { signals: N } } : {},
}
