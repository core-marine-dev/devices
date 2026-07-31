// coded
import { bitState } from '../../utils'

/* §4.1.10 — GNSS signal numbers.

  Several blocks carry a SignalInfo bit field: if bit i is set, the signal type
  having index i was used. Bit 0 (GPS-C/A) is the LSB.

  Signal Number | Signal Type | Constellation | Carrier frequency (MHz)   | RINEX V3.04 obs code
   0            | L1CA        | GPS           | 1575.42                   | 1C
   1            | L1P         | GPS           | 1575.42                   | 1W
   2            | L2P         | GPS           | 1227.60                   | 2W
   3            | L2C         | GPS           | 1227.60                   | 2L
   4            | L5          | GPS           | 1176.45                   | 5Q
   5            | L1C         | GPS           | 1575.42                   | 1L
   6            | L1CA        | QZSS          | 1575.42                   | 1C
   7            | L2C         | QZSS          | 1227.60                   | 2L
   8            | L1CA        | GLONASS       | 1602.00+(FreqNr-8)*9/16   | 1C
   9            | L1P         | GLONASS       | 1602.00+(FreqNr-8)*9/16   | 1P
  10            | L2P         | GLONASS       | 1246.00+(FreqNr-8)*7/16   | 2P
  11            | L2CA        | GLONASS       | 1246.00+(FreqNr-8)*7/16   | 2C
  12            | L3          | GLONASS       | 1202.025                  | 3Q
  13            | B1C         | BeiDou        | 1575.42                   | 1P
  14            | B2a         | BeiDou        | 1176.45                   | 5P
  15            | L5          | NavIC/IRNSS   | 1176.45                   | 5A
  16            | Reserved    |               |                           |
  17            | E1 (L1BC)   | Galileo       | 1575.42                   | 1C
  18            | Reserved    |               |                           |
  19            | E6 (E6BC)   | Galileo       | 1278.75                   | 6C
  20            | E5a         | Galileo       | 1176.45                   | 5Q
  21            | E5b         | Galileo       | 1207.14                   | 7Q
  22            | E5 AltBoc   | Galileo       | 1191.795                  | 8Q
  23            | LBand       | MSS           | L-band beam specific      | NA
  24            | L1CA        | SBAS          | 1575.42                   | 1C
  25            | L5          | SBAS          | 1176.45                   | 5I
  26            | L5          | QZSS          | 1176.45                   | 5Q
  27            | L6          | QZSS          | 1278.75                   |
  28            | B1I         | BeiDou        | 1561.098                  | 2I
  29            | B2I         | BeiDou        | 1207.14                   | 7I
  30            | B3I         | BeiDou        | 1268.52                   | 6I
  31            | Reserved    |               |                           |
  32            | L1C         | QZSS          | 1575.42                   | 1L
  33            | L1S         | QZSS          | 1575.42                   | 1Z
  34            | B2b         | BeiDou        | 1207.14                   | 7D
  35            | Reserved    |               |                           |

  The GLONASS carrier frequencies depend on that satellite's FreqNr, which is
  NOT part of a SignalInfo bit field — so the nominal centre frequency is
  reported here and the per-satellite offset is left to the blocks that carry
  FreqNr (MeasEpoch, ChannelStatus).
*/
export interface GNSSSignal {
  signal: string
  constellation?: string
  carrierFrequency?: number
  rinexCode?: string
}

// Typed with `| undefined` deliberately: signal numbers are sparse in future
// firmwares, and §4.1.9 says a decoder must ignore the ones it does not know.
export const GNSS_SIGNALS: Readonly<Record<number, GNSSSignal | undefined>> = {
  0: { signal: 'L1CA', constellation: 'GPS', carrierFrequency: 1575.42, rinexCode: '1C' },
  1: { signal: 'L1P', constellation: 'GPS', carrierFrequency: 1575.42, rinexCode: '1W' },
  2: { signal: 'L2P', constellation: 'GPS', carrierFrequency: 1227.60, rinexCode: '2W' },
  3: { signal: 'L2C', constellation: 'GPS', carrierFrequency: 1227.60, rinexCode: '2L' },
  4: { signal: 'L5', constellation: 'GPS', carrierFrequency: 1176.45, rinexCode: '5Q' },
  5: { signal: 'L1C', constellation: 'GPS', carrierFrequency: 1575.42, rinexCode: '1L' },
  6: { signal: 'L1CA', constellation: 'QZSS', carrierFrequency: 1575.42, rinexCode: '1C' },
  7: { signal: 'L2C', constellation: 'QZSS', carrierFrequency: 1227.60, rinexCode: '2L' },
  8: { signal: 'L1CA', constellation: 'GLONASS', carrierFrequency: 1602.00, rinexCode: '1C' },
  9: { signal: 'L1P', constellation: 'GLONASS', carrierFrequency: 1602.00, rinexCode: '1P' },
  10: { signal: 'L2P', constellation: 'GLONASS', carrierFrequency: 1246.00, rinexCode: '2P' },
  11: { signal: 'L2CA', constellation: 'GLONASS', carrierFrequency: 1246.00, rinexCode: '2C' },
  12: { signal: 'L3', constellation: 'GLONASS', carrierFrequency: 1202.025, rinexCode: '3Q' },
  13: { signal: 'B1C', constellation: 'BeiDou', carrierFrequency: 1575.42, rinexCode: '1P' },
  14: { signal: 'B2a', constellation: 'BeiDou', carrierFrequency: 1176.45, rinexCode: '5P' },
  15: { signal: 'L5', constellation: 'NavIC/IRNSS', carrierFrequency: 1176.45, rinexCode: '5A' },
  16: { signal: 'RESERVED' },
  17: { signal: 'E1 (L1BC)', constellation: 'Galileo', carrierFrequency: 1575.42, rinexCode: '1C' },
  18: { signal: 'RESERVED' },
  19: { signal: 'E6 (E6BC)', constellation: 'Galileo', carrierFrequency: 1278.75, rinexCode: '6C' },
  20: { signal: 'E5a', constellation: 'Galileo', carrierFrequency: 1176.45, rinexCode: '5Q' },
  21: { signal: 'E5b', constellation: 'Galileo', carrierFrequency: 1207.14, rinexCode: '7Q' },
  22: { signal: 'E5 AltBoc', constellation: 'Galileo', carrierFrequency: 1191.795, rinexCode: '8Q' },
  23: { signal: 'LBand', constellation: 'MSS', rinexCode: 'NA' },
  24: { signal: 'L1CA', constellation: 'SBAS', carrierFrequency: 1575.42, rinexCode: '1C' },
  25: { signal: 'L5', constellation: 'SBAS', carrierFrequency: 1176.45, rinexCode: '5I' },
  26: { signal: 'L5', constellation: 'QZSS', carrierFrequency: 1176.45, rinexCode: '5Q' },
  27: { signal: 'L6', constellation: 'QZSS', carrierFrequency: 1278.75 },
  28: { signal: 'B1I', constellation: 'BeiDou', carrierFrequency: 1561.098, rinexCode: '2I' },
  29: { signal: 'B2I', constellation: 'BeiDou', carrierFrequency: 1207.14, rinexCode: '7I' },
  30: { signal: 'B3I', constellation: 'BeiDou', carrierFrequency: 1268.52, rinexCode: '6I' },
  31: { signal: 'RESERVED' },
  32: { signal: 'L1C', constellation: 'QZSS', carrierFrequency: 1575.42, rinexCode: '1L' },
  33: { signal: 'L1S', constellation: 'QZSS', carrierFrequency: 1575.42, rinexCode: '1Z' },
  34: { signal: 'B2b', constellation: 'BeiDou', carrierFrequency: 1207.14, rinexCode: '7D' },
  35: { signal: 'RESERVED' },
}

// A SignalInfo mask -> the signals it names, keyed by signal number so the
// index and the datasheet table line up. Bits with no documented signal are
// skipped (§4.1.9: ignore undefined signal numbers).
export const signalInfo = (mask: number): Record<number, GNSSSignal> => {
  const signals: Record<number, GNSSSignal> = {}
  for (let bit = 0; bit < 32; bit++) {
    if (!bitState(mask, bit)) continue
    const signal = GNSS_SIGNALS[bit]
    if (signal !== undefined) signals[bit] = signal
  }
  return signals
}
