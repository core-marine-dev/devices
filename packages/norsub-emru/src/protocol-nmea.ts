// installed
import type { ProtocolsFileContent } from '@coremarine/nmea-parser'
import { NMEAParser, ProtocolsFileContentSchema } from '@coremarine/nmea-parser'

// coded
import { NORSUB_METADATA_AGGREGATORS } from './metadata'
import { NORSUB_SENTENCES } from './norsub'
import type { ProtocolParserOptions } from './types'

// The NMEA protocol layer of a NorSub eMRU: everything `NMEAParser` already does
// (standard NMEA built-ins, generic decode, checksum, Result-based knowledge feed)
// plus the NorSub proprietary sentences and the metadata derived from them.
//
// This is a SUBCLASS rather than a decorator wrapping finished CMAs, deliberately:
// `metadata.timestamp` may only ever be stamped by the core base, and derived
// metadata belongs to the aggregator model. Both therefore have to happen INSIDE
// the protocol parser — never in the `NorsubParser` facade in front of it.
export class NorsubNMEAParser extends NMEAParser {
  constructor(options: ProtocolParserOptions = {}) {
    super(options)
    // Bundled and pre-generated from `protocols/norsub.yml`, registered internally:
    // no runtime YAML parse and no `fs`, so the parser stays cross-runtime (node,
    // deno, bun, web). `addSentences(yaml)` remains the PUBLIC path, for a user's
    // own extra sentences.
    const builtin = ProtocolsFileContentSchema.safeParse(NORSUB_SENTENCES)
    if (builtin.success) this.registerProtocols(builtin.value as ProtocolsFileContent)
    this.registerAggregators(NORSUB_METADATA_AGGREGATORS)
  }
}
