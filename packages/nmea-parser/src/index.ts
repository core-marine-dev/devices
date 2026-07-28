export { NMEAParser } from './parser'
export * from './constants'
export * from './schemas'
export * from './types'
// Extension surface for device parsers built on top of NMEA (proprietary
// sentences + their derived metadata) — see the README "Extending" section.
export { BUILTIN_METADATA_AGGREGATORS } from './metadata'
export type { MetadataAggregator, MetadataAggregators } from './metadata'
