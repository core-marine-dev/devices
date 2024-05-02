import { Uint16, Uint32 } from "@coremarine/nmea-parser/lib/types"

export const getUint32 = (lsb: Uint16, msb: Uint16): Uint32 => Uint32Array.from([(msb << 16) | lsb])[0]

export const getBit = (num: number, bit: number): boolean => (num >>> bit) % 2 != 0
