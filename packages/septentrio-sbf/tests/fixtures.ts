// built-in
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// installed
import type { CMA, Field } from '@coremarine/protocol-core'

// Real bytes from real Septentrio receivers. `node:fs` is fine HERE — the specs
// run on node; the library itself must never touch it.
//
//   gnss.bin               10 296 B, 195 blocks over 39 epochs (ReceiverTime,
//                          PVTGeodetic rev 2, DOP, AuxAntPositions, AttEuler).
//                          Its ReceiverTime blocks report UTC 2023-02-20
//                          07:41:48 with DeltaLS 18, which is the independent
//                          check on the whole timestamp chain.
//   att-euler-attitude.bin one AttEuler with a real heading and pitch, in
//                          attitude mode 1 — so Roll and RollDot are
//                          Do-Not-Use while PitchDot and HeadingDot are not.
//                          The frame that proves the 1.x axis rotation.
//   pvt-geodetic-rev2.bin  one PVTGeodetic revision 2 with a real fix, from a
//                          capture whose file name (2023_06_23) independently
//                          dates it.
//   aux-ant-positions.bin  one AuxAntPositions with N = 1, SBLength = 52 and a
//                          real baseline — the sub-block case.
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

export const fixture = (name: string): Uint8Array => new Uint8Array(readFileSync(join(FIXTURES, name)))

export const capture = (): Uint8Array => fixture('gnss.bin')
export const attEulerFrame = (): Uint8Array => fixture('att-euler-attitude.bin')
export const pvtGeodeticFrame = (): Uint8Array => fixture('pvt-geodetic-rev2.bin')
export const auxAntPositionsFrame = (): Uint8Array => fixture('aux-ant-positions.bin')
// Two blocks gnss.bin does not contain: a padding-only body, and an opaque one.
export const endOfPVTFrame = (): Uint8Array => fixture('end-of-pvt.bin')
export const pvtSupportFrame = (): Uint8Array => fixture('pvt-support.bin')
// Phase B blocks, from 2023_06_23_test1.sbf. ReceiverStatus is a revision-1
// frame with 14 AGC sub-blocks; QualityInd carries 7 indicators.
export const receiverStatusFrame = (): Uint8Array => fixture('receiver-status.bin')
export const qualityIndFrame = (): Uint8Array => fixture('quality-ind.bin')
// The block that identifies the box: cru's receiver reports itself as an
// `AsteRx SB3 Pro+` on firmware `4.10.1` — the very reference guide this
// knowledge base was transcribed from.
export const receiverSetupFrame = (): Uint8Array => fixture('receiver-setup.bin')
export const diskStatusFrame = (): Uint8Array => fixture('disk-status.bin')
// This one carries a real fault: the receiver could not resolve its NTRIP
// caster's hostname, which is WHY the PVT in the same capture is STANDALONE.
export const ntripClientStatusFrame = (): Uint8Array => fixture('ntrip-client-status.bin')
// The two-level measurement blocks, from the SAME EPOCH of 2023_06_23_test1.sbf
// (both stamped 2023-06-23T09:44:52Z), which is what makes them checkable against
// each other: MeasEpoch carries 14 satellites with 29 nested slave measurements
// = 43 signals, and MeasExtra carries exactly 43 sub-blocks in the same order.
//   meas-epoch.bin  648 B, revision 1, SB1Length 20 / SB2Length 12
//   meas-extra.bin  708 B, revision 3, SBLength 16 (the rev-3 sub-block size)
export const measEpochFrame = (): Uint8Array => fixture('meas-epoch.bin')
export const measExtraFrame = (): Uint8Array => fixture('meas-extra.bin')
// The epoch marker from that same epoch — a 16-byte block with no body at all.
export const endOfMeasFrame = (): Uint8Array => fixture('end-of-meas.bin')
// §4.2.2 raw navigation pages, one per header VARIANT, all from
// 2023_06_23_test1.sbf. Between them they cover every shape the category has:
//   gps-raw-ca.bin    60 B, G27 on L1CA — ViterbiCnt and FreqNr both "not applicable"
//   glo-raw-ca.bin    32 B, R09 — the ONLY block where FreqNr is real (-2 here)
//   gal-raw-inav.bin  52 B, E14 on E5b — the Source bit-5 concatenation flag
//   bds-raw.bin       60 B, C28 on B1I — plain Source, Reserved fifth byte
export const gpsRawCAFrame = (): Uint8Array => fixture('gps-raw-ca.bin')
export const gloRawCAFrame = (): Uint8Array => fixture('glo-raw-ca.bin')
export const galRawINAVFrame = (): Uint8Array => fixture('gal-raw-inav.bin')
export const bdsRawFrame = (): Uint8Array => fixture('bds-raw.bin')
// §4.2.3-4.2.8 decoded navigation messages, also from 2023_06_23_test1.sbf. These
// are the ones whose decoded ORBITS can be checked against published constellation
// constants, which is the strongest check available on a field-order transcription:
//   gps-nav.bin  140 B, G10 — semi-major axis must come out near 26 560 km
//   gal-nav.bin  152 B, E13 — near 29 600 km, and Source 2 (I/NAV) must make the
//                E5a health and SISA unavailable while E5b's are present
//   glo-nav.bin   96 B, R03 — a state vector whose norm must be near 25 510 km
//   bds-nav.bin  140 B, C28 — near 27 906 km, with times in BeiDou system time
//   gal-utc.bin   40 B, E13 — broadcasts DEL_t_LS 18, which ReceiverTime confirms
export const gpsNavFrame = (): Uint8Array => fixture('gps-nav.bin')
export const galNavFrame = (): Uint8Array => fixture('gal-nav.bin')
export const gloNavFrame = (): Uint8Array => fixture('glo-nav.bin')
export const bdsNavFrame = (): Uint8Array => fixture('bds-nav.bin')
export const galUtcFrame = (): Uint8Array => fixture('gal-utc.bin')

export const field = (sentence: CMA, name: string): Field => {
  const found = sentence.payload.find((entry) => entry.name === name)
  if (found === undefined) throw new Error(`no field ${name} in block ${sentence.id}`)
  return found
}

export const values = (sentence: CMA): Record<string, Field['value']> =>
  Object.fromEntries(sentence.payload.map((entry) => [entry.name, entry.value]))

// The largest block in cru's captures: a 1052-byte `Commands` (4015). Kept as a
// fixture because it is the one that proves the buffer limit has to fit a WHOLE
// block — under the core's generic 1024-byte binary default this block was
// destroyed into garbage whenever it arrived in small enough chunks.
export const largeCommandsBlock = (): Uint8Array => fixture('commands-large.bin')
