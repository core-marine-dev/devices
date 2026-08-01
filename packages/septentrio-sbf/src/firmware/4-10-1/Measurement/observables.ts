// installed
import type { Metadata, Value } from '@coremarine/protocol-core'

// coded
import type { Decoder } from '../../../types'
import { bits, bitState, UNKNOWN_LABEL } from '../../../utils'
import { glonassCarrier, glonassFrequencyNumber } from '../satellites'
import { GNSS_SIGNALS } from '../signals'

/* What every measurement sub-block shares, §4.2.1.

  MeasEpoch and MeasExtra both identify a measurement by the same two-part trick,
  and both blocks repeat it in every sub-block they define, so it lives here once.

  `Type` bit field (identical in MeasEpoch's Type1 and Type2 and in MeasExtra's
  ChannelSub):

    Bits 0-4: SigIdxLo — if not 31, this IS the signal number (§4.1.10).
              If 31, the signal number is elsewhere, with an offset of 32.
    Bits 5-7: Antenna ID — 0 main, 1 Aux1, 2 Aux2.

  The "elsewhere" differs per block: MeasEpoch keeps it in `ObsInfo` bits 3-7,
  MeasExtra in `Misc` bits 3-7. Both are an offset of 32, so a value of 1 means
  signal number 33 (QZSS L1S). Hence `extendedFrom` — the decoder is told which
  sibling field carries the extension rather than guessing.

  The same bits 3-7 have a SECOND meaning in MeasEpoch's Type1 `ObsInfo`: when
  SigIdxLo is 8, 9, 10 or 11 — the four GLONASS FDMA signals — they carry that
  satellite's frequency number with an offset of 8. Those are the only signals
  whose carrier frequency is per-SATELLITE rather than per-signal (§4.1.10), so
  this is what makes a GLONASS wavelength — and therefore a GLONASS carrier
  phase in cycles — computable at all.
*/
export const SIG_IDX_ESCAPE = 31
const SIGNAL_NUMBER_OFFSET = 32
// Signal numbers 8-11: GLONASS L1CA, L1P, L2P, L2CA — the FDMA bands.
const GLONASS_FDMA_SIGNALS = [8, 9, 10, 11]

export const ANTENNAS: Readonly<Record<number, string>> = { 0: 'MAIN', 1: 'AUX1', 2: 'AUX2' }

export const numeric = (value: Value | undefined): number | undefined =>
  (typeof value === 'number') ? value : undefined

// The signal number a `Type` field names. `undefined` when SigIdxLo is the 31
// escape and the field carrying the extension is unavailable — the signal is
// then genuinely unknown, and §4.1.9 says to ignore what is not defined rather
// than fall back to 31 (which is itself a reserved signal number).
export const signalNumber = (type: number, extended: number | undefined): number | undefined => {
  const low = bits(type, 0, 4)
  if (low !== SIG_IDX_ESCAPE) return low
  return (extended === undefined) ? undefined : bits(extended, 3, 7) + SIGNAL_NUMBER_OFFSET
}

// The GLONASS frequency number carried in ObsInfo bits 3-7, offset by 8 — only
// meaningful for the FDMA signals, reserved for everything else.
export const fdmaFrequencyNumber = (signal: number | undefined, obsInfo: number | undefined): number | undefined =>
  (signal !== undefined && obsInfo !== undefined && GLONASS_FDMA_SIGNALS.includes(signal)) ? bits(obsInfo, 3, 7) : undefined

const SPEED_OF_LIGHT_M_S = 299_792_458
const MHZ = 1e6

// The carrier frequency in MHz for a signal, taking the per-satellite GLONASS
// offset when the frequency number is known. Without it a GLONASS signal falls
// back to the band's nominal centre, which is what §4.1.10 tabulates.
export const carrierFrequency = (signal: number | undefined, freqNr: number | undefined): number | undefined => {
  if (signal === undefined) return undefined
  const fdma = (freqNr === undefined) ? undefined : glonassCarrier(signal, freqNr)
  return fdma ?? GNSS_SIGNALS[signal]?.carrierFrequency
}

// λ = 299792458 / fL metres, with fL the carrier frequency of §4.1.10.
export const wavelength = (signal: number | undefined, freqNr: number | undefined): number | undefined => {
  const frequency = carrierFrequency(signal, freqNr)
  return (frequency === undefined || frequency === 0) ? undefined : SPEED_OF_LIGHT_M_S / (frequency * MHZ)
}

// C/N0 [dB-Hz] = CN0 * 0.25, and +10 UNLESS the signal number is 1 or 2 (the two
// GPS P-code signals). Getting the exception backwards would put every other
// signal 10 dB out, which still looks like a plausible C/N0 — so it is spec'd.
const CN0_SCALE = 0.25
const CN0_OFFSET_DB = 10
const CN0_NO_OFFSET_SIGNALS = [1, 2]

export const carrierToNoise = (raw: number, signal: number | undefined): number => {
  const offset = (signal !== undefined && CN0_NO_OFFSET_SIGNALS.includes(signal)) ? 0 : CN0_OFFSET_DB
  return (raw * CN0_SCALE) + offset
}

// The `Type` decoder, shared by all three measurement sub-blocks. Publishes the
// resolved signal rather than the raw index: "GPS L1CA on the main antenna" is
// what a human is after, and 0 tells them nothing.
export const typeField = (extendedFrom: string): Decoder => (value, values): Metadata => {
  const extended = numeric(values[extendedFrom])
  const number = signalNumber(value, extended)
  const freqNr = fdmaFrequencyNumber(number, extended)
  const signal = (number === undefined) ? undefined : GNSS_SIGNALS[number]
  const metadata: Metadata = {
    antenna: ANTENNAS[bits(value, 5, 7)] ?? UNKNOWN_LABEL,
    signalNumber: number ?? null,
    signal: (signal === undefined) ? null : { ...signal, carrierFrequency: carrierFrequency(number, freqNr) ?? null, units: 'MHz' },
  }
  // Only for the two GLONASS FDMA bands, where it is what makes the carrier
  // frequency above per-satellite instead of nominal.
  if (freqNr !== undefined) metadata.glonassFrequencyNumber = glonassFrequencyNumber(freqNr)
  return metadata
}

// `ObsInfo` bits 0-2, identical in Type1 and Type2. Bits 3-7 are handled by the
// `Type` decoder, which is where they are actually interpretable.
export const observationInfo: Decoder = (value): Metadata => ({
  smoothed: bitState(value, 0),
  halfCycleAmbiguity: bitState(value, 2),
})

// A derived observable that the receiver has marked unavailable. The field's own
// `value` is a legitimate number (0, or -128) — it is the QUANTITY COMPUTED FROM
// THE PAIR that does not exist, which is why this cannot be the engine's
// single-field `doNotUse`.
export const unavailable: Metadata = { value: null, doNotUse: true }
