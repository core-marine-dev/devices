// installed
import type { DraftCMA } from '@coremarine/protocol-core'

// SENTENCE RESOLVERS — id disambiguation for sentences that share an id.
//
// Some proprietary formats put the real sentence type in a FIELD instead of in
// the id: Kongsberg Seatex sends both variants as `$PSXN,...` with the SAME
// number of fields, and only the first field (20 | 23) says which one it is.
// The knowledge base keys definitions by `id + payload length`, so such
// sentences are indistinguishable there — no YAML can express them.
//
// A resolver runs BEFORE the knowledge-base lookup and returns the id the
// sentence should be looked up under (or `null` to keep the one it has). That
// keeps everything else pure data: the variants are ordinary definitions in the
// YAML, and names/types/units/descriptions/metadata come from the normal
// machinery. Same model as `MetadataAggregators` — dev-authored, known-only,
// keyed by `${id}:${payloadLength}` — but one step earlier in the pipeline.
//
// `raw` is NEVER rewritten: it keeps the sentence exactly as it arrived, so the
// checksum still verifies against it. Only `id` changes.
export type SentenceResolver = (sentence: DraftCMA) => string | null

// Keyed `${id}:${payloadLength}` — the id AS RECEIVED, before resolution.
export type SentenceResolvers = Record<string, SentenceResolver>

// PSXN (Kongsberg Seatex) ---------------------------------------------------------------------------------------------
// `$PSXN,20,x,x,x,x*hh`         -> PSXN20 (quality indicators)
// `$PSXN,23,x.x,x.x,x.x,x.x*hh` -> PSXN23 (attitude + heave)
// Both are 5 fields with id `PSXN`; field 0 is the message number.
// Source: MGC COMPASS Installation Manual Rev. 15, pages 108-109.
const PSXN_MESSAGE_IDS: Record<string, string> = {
  20: 'PSXN20',
  23: 'PSXN23',
}

// The message number is read from `raw`, not `value`: at this point the sentence
// is still generic (every field is an unparsed string). An unknown message
// number leaves the id alone rather than inventing a definition.
const resolvePSXN: SentenceResolver = (sentence) => PSXN_MESSAGE_IDS[sentence.payload[0].raw.trim()] ?? null

// PTNL (Trimble) ------------------------------------------------------------------------------------------------------
// `$PTNL,AVR,...` -> PTNLAVR (yaw/tilt from the moving-baseline vector)
// `$PTNL,GGK,...` -> PTNLGGK (position fix with an ellipsoidal height)
// Both are 12 fields with id `PTNL`, and field 0 is the message type — the same
// trap as $PSXN, which is why this mechanism is reusable rather than one-off.
// These are Trimble formats that OTHER receivers emit for compatibility; Septentrio
// lists both in Appendix C of the AsteRx SB3 Pro+ 4.10.1 reference guide.
const PTNL_MESSAGE_IDS: Record<string, string> = {
  AVR: 'PTNLAVR',
  GGK: 'PTNLGGK',
}

// Read from `raw` for the same reason as PSXN: at this point every field is still
// an unparsed string. Upper-cased because the type is a text mnemonic here, not a
// number — an unknown one leaves the id alone.
const resolvePTNL: SentenceResolver = (sentence) => PTNL_MESSAGE_IDS[sentence.payload[0].raw.trim().toUpperCase()] ?? null

// REGISTRY -----------------------------------------------------------------------------------------------------------
// The built-ins every parser starts with. A parser copies these into its OWN
// registry (see `NMEAParser._resolvers`), so a subclass — or anyone feeding
// proprietary sentences via `addSentences` — can register more with
// `registerResolvers` without touching this module.
export const BUILTIN_SENTENCE_RESOLVERS: SentenceResolvers = {
  'PSXN:5': resolvePSXN,
  'PTNL:12': resolvePTNL,
}

// Resolution is deliberately independent of the checksum: the message number is
// right there in the payload, and any checksum problem is already reported in
// `errors`. A corrupted PSXN is far more useful as a flagged PSXN23 than as an
// unrecognised generic sentence.
export const resolveSentenceId = (sentence: DraftCMA, resolvers: SentenceResolvers = BUILTIN_SENTENCE_RESOLVERS): DraftCMA => {
  const key = `${sentence.id}:${sentence.payload.length}`
  if (!(key in resolvers)) return sentence
  const resolved = resolvers[key](sentence)
  return (resolved === null || resolved === sentence.id) ? sentence : { ...sentence, id: resolved }
}
