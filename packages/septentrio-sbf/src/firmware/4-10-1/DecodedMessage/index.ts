// coded
import { bdsAlm, bdsIon, bdsNav, bdsUtc } from './BeiDou'
import { galAlm, galGstGps, galIon, galNav, galSARRLM, galUtc } from './Galileo'
import { gloAlm, gloNav, gloTime } from './GLONASS'
import { gpsAlm, gpsIon, gpsNav, gpsUtc } from './GPS'
import { qzsAlm, qzsNav } from './QZSS'
import {
  geoAlm,
  geoClockEphCovMatrix,
  geoDegrFactors,
  geoFastCorr,
  geoFastCorrDegr,
  geoIGPMask,
  geoIntegrity,
  geoIonoDelay,
  geoLongTermCorr,
  geoMT00,
  geoNav,
  geoNetworkTime,
  geoPRNMask,
  geoServiceLevel,
} from './SBAS'

import type { BlockDefinition } from '../../../types'

// §4.2.3 GPS · §4.2.4 GLONASS · §4.2.5 Galileo · §4.2.6 BeiDou · §4.2.7 QZSS ·
// §4.2.8 SBAS L1 — the DECODED navigation messages.
//
// COMPLETE for firmware 4.10.1: all 33 blocks across the six categories.
//
// These are the interpreted contents of the broadcasts whose raw bits §4.2.2
// carries, one block per satellite per data set, and every one of them is stamped
// with SIS time — so none is promoted to `cma.timestamp`.
//
// The four Keplerian constellations (GPS, QZSS, Galileo, BeiDou) share their
// orbital and clock rows through `keplerian.ts`, because they share the GPS ICD's
// parameterisation. The two that do NOT are worth knowing about: GLONASS
// broadcasts a PZ-90.02 state vector, and SBAS broadcasts a geostationary state
// vector plus a whole correction/integrity protocol of numbered message types.
export const blocks: readonly BlockDefinition[] = [
  // §4.2.3 GPS
  gpsNav,
  gpsAlm,
  gpsIon,
  gpsUtc,
  // §4.2.4 GLONASS
  gloNav,
  gloAlm,
  gloTime,
  // §4.2.5 Galileo
  galNav,
  galAlm,
  galIon,
  galUtc,
  galGstGps,
  galSARRLM,
  // §4.2.6 BeiDou
  bdsNav,
  bdsAlm,
  bdsIon,
  bdsUtc,
  // §4.2.7 QZSS
  qzsNav,
  qzsAlm,
  // §4.2.8 SBAS L1
  geoMT00,
  geoPRNMask,
  geoFastCorr,
  geoIntegrity,
  geoFastCorrDegr,
  geoNav,
  geoDegrFactors,
  geoNetworkTime,
  geoAlm,
  geoIGPMask,
  geoLongTermCorr,
  geoIonoDelay,
  geoServiceLevel,
  geoClockEphCovMatrix,
]
