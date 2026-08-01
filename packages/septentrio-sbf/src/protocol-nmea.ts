// installed
import { NMEAParser } from '@coremarine/nmea-parser'
import type { CMA, DraftCMA, Field, ProtocolsFileContent, SentenceResolvers } from '@coremarine/nmea-parser'
import type { DeviceParser, ParserError, Result, SentenceDefinition } from '@coremarine/protocol-core'

// coded
import { DEFAULT_FIRMWARE } from './constants'
import { isFirmware } from './firmware'
import { SEPTENTRIO_SENTENCES } from './septentrio-nmea'
import type { SBFParserOptions } from './types'
import { asText, toBytes } from './utils'

// The NMEA protocol layer of a Septentrio receiver. A box configured for NMEA
// output emits the standard sentences (already built into nmea-parser) plus the
// proprietary `$PSSN` family documented in Appendix C.1 of the 4.10.1 reference
// guide.
//
// Two things make this more than "instantiate NMEAParser":
//
//  1. Every $PSSN sentence carries its subtype in the FIRST FIELD, not in the id —
//     the same trap as Kongsberg's $PSXN and Trimble's $PTNL — so the ids have to
//     be resolved before the knowledge base is consulted.
//  2. `SNC` cannot be described by the knowledge base at all: its payload is
//     bracket-nested with one group per NTRIP connection, so its field count
//     changes from message to message while definitions are matched by EXACT field
//     count. It is decoded here instead.
//
// NMEAParser is a StringParser, so this class adapts rather than extends. TEXT is
// the natural input here and is what the README and the examples use; bytes are
// accepted as well, because a Septentrio port is a byte stream and a serial node
// hands you a Buffer whichever protocol the receiver is emitting. The conversion is
// byte-per-character: NMEA 0183 is ASCII, so there is no multi-byte sequence that
// could be split across chunks.

// $PSSN resolvers. Keyed `${id}:${payloadLength}` on the id AS RECEIVED, so the
// key is the field count INCLUDING the subtype field. Counted from Appendix C.1:
// HRP 13, RBD 11, RBP 12, RBV 12, TFM 6 — RBP and RBV share a length and are told
// apart by the subtype, which is exactly what a resolver is for.
//
// SNC is DELIBERATELY ABSENT. Its comma-split length collides with the fixed-shape
// sentences (a 2-connection SNC splits into 12 fields, the same as RBP/RBV), so if
// the resolver renamed it here it would be renamed BEFORE `enrichSNC` could
// recognise it — and then arrive with a resolved id but an undecoded bracket
// payload. It gets its id in `enrichSNC`, where the structure is parsed anyway.
const PSSN_SUBMESSAGES: Record<string, string> = {
  HRP: 'PSSNHRP',
  RBD: 'PSSNRBD',
  RBP: 'PSSNRBP',
  RBV: 'PSSNRBV',
  TFM: 'PSSNTFM',
}

// Read from `raw`, not `value`: at resolution time every field is still an
// unparsed string. An unknown subtype leaves the id alone rather than inventing one.
const resolvePSSN = (sentence: DraftCMA): string | null =>
  PSSN_SUBMESSAGES[sentence.payload[0]?.raw.trim().toUpperCase() ?? ''] ?? null

// SNC's length varies with the number of NTRIP connections, so it gets no fixed
// key. The lengths below are the FIXED-shape sentences; SNC is resolved in
// `enrichSNC` instead, where the bracket structure is parsed anyway.
const PSSN_RESOLVERS: SentenceResolvers = {
  'PSSN:6': resolvePSSN,
  'PSSN:11': resolvePSSN,
  'PSSN:12': resolvePSSN,
  'PSSN:13': resolvePSSN,
}

// SNC — BRACKET-NESTED PAYLOAD ----------------------------------------------------------------------------------------
// `$PSSN,SNC,[0,379359000,1840,[1,2,0,0]]*68` (Appendix C.1.5): an outer group of
// three scalars followed by one `[...]` sub-message per NTRIP connection.
//
// The structure is parsed from the RAW text, not from the comma split, and that is
// the whole trick: the guide never says whether consecutive sub-messages are
// separated by a comma, and a depth-aware scan does not need to know. `],[` and
// `][` produce the same tree because empty tokens are dropped.
const SNC_SUBMESSAGE = 'SNC,'

type Token = string | Token[]

// Split on commas at the CURRENT depth; `[` opens a level, `]` closes it. Returns
// null on unbalanced brackets — a corrupt sentence is refused, never half-decoded.
const tokenise = (text: string): Token[] | null => {
  const root: Token[] = []
  const stack: Token[][] = [root]
  let token = ''
  const flush = (): void => {
    const trimmed = token.trim()
    if (trimmed.length > 0) stack[stack.length - 1].push(trimmed)
    token = ''
  }
  for (const character of text) {
    if (character === '[') {
      flush()
      const nested: Token[] = []
      stack[stack.length - 1].push(nested)
      stack.push(nested)
    } else if (character === ']') {
      flush()
      if (stack.length === 1) return null
      stack.pop()
    } else if (character === ',') {
      flush()
    } else {
      token += character
    }
  }
  flush()
  return (stack.length === 1) ? root : null
}

// The outer scalars and the SNCSub layout, both from Appendix C.1.5. These live in
// METADATA rather than in the payload, which is why they can carry honest numeric
// types while `payload[1]` stays the string it truthfully is.
const SNC_OUTER: readonly [string, string, string?][] = [
  ['message_revision', 'uint8'],
  ['time_of_week', 'uint32', 'ms'],
  ['week_number', 'uint16'],
]
const SNC_SUB: readonly [string, string][] = [
  ['cd_index', 'uint8'],
  ['status', 'uint8'],
  ['error_code', 'uint8'],
  ['info', 'uint8'],
]

const metadataField = (raw: string, name: string, type: string, units?: string): Field => {
  const field = { raw, name, type, value: Number(raw) } as Field
  return (units === undefined) ? field : { ...field, units }
}

const decodeTokens = (tokens: Token[], layout: readonly (readonly [string, string, string?])[]): Field[] =>
  tokens.map((token, index) => {
    const [name, type, units] = layout[index] ?? [`unknown_${index + 1}`, 'string']
    return metadataField(token as string, name, type, units)
  })

// Rebuild the sentence as: [0] the subtype, [1] the whole bracket group with the
// decoded tree in its metadata. The payload is therefore ALWAYS TWO FIELDS however
// many connections arrive — the variable part lives in metadata, where nothing is
// keyed by field count. `payload[1].raw` is sliced from the sentence's own `raw`,
// so it is byte-faithful and the checksum still verifies against it.
const enrichSNC = (sentence: CMA): CMA => {
  const start = sentence.raw.indexOf(SNC_SUBMESSAGE)
  if (start === -1) return sentence
  const group = sentence.raw.slice(start + SNC_SUBMESSAGE.length).split('*')[0].trim()
  const tokens = tokenise(group)
  const outer = tokens?.find((token) => Array.isArray(token))
  // Unbalanced or bracket-less: leave the generic sentence exactly as it is. It
  // still carries `raw` and every split field, so nothing is lost or invented.
  if (outer === undefined || !Array.isArray(outer)) return sentence

  const scalars = outer.filter((token): token is string => !Array.isArray(token))
  const submessages = outer.filter((token): token is Token[] => Array.isArray(token))

  return {
    ...sentence,
    id: 'PSSNSNC',
    protocol: { name: PSSN_PROTOCOL, version: PSSN_VERSION },
    payload: [
      { raw: SNC_SUBMESSAGE.slice(0, -1), name: 'submessage_id', type: 'string', value: SNC_SUBMESSAGE.slice(0, -1) },
      {
        raw: group,
        name: 'ntrip_client_status',
        type: 'string',
        value: group,
        description: 'Bracket-nested group: three scalars, then one sub-message per NTRIP connection. The field count on the wire changes with the number of connections, so the decoded values live in metadata.fields and metadata.submessages instead of in the payload.',
        metadata: {
          fields: decodeTokens(scalars, SNC_OUTER),
          submessages: submessages.map((sub) => decodeTokens(sub, SNC_SUB)),
        },
      },
    ],
  }
}

// Matches `protocol: SEPTENTRIO NMEA` in protocols/septentrio.yml — the name is
// also the lookup key for getSentenceDefinition/getFakeSentence, so the two must
// stay identical. See PROTOCOL_NAME in src/constants.ts for why both are qualified.
const PSSN_PROTOCOL = 'SEPTENTRIO NMEA'
const PSSN_VERSION = '4.10.1'
const SNC_ID = 'SNC'
const PSSN_ID = 'PSSN'

// The knowledge layer: NMEAParser plus the $PSSN definitions and resolvers. Kept
// private to this module — consumers reach it through `SeptentrioNMEAParser.parser`.
class PSSNParser extends NMEAParser {
  constructor(options: SBFParserOptions = {}) {
    super(options)
    this.registerProtocols(SEPTENTRIO_SENTENCES as ProtocolsFileContent)
    this.registerResolvers(PSSN_RESOLVERS)
  }
}

export class SeptentrioNMEAParser implements DeviceParser<Uint8Array> {
  private readonly _parser: PSSNParser
  private _firmware: string

  constructor({ firmware, ...options }: SBFParserOptions = {}) {
    this._parser = new PSSNParser(options)
    this._firmware = isFirmware(firmware) ? firmware : DEFAULT_FIRMWARE
  }

  // Carried for the same reason SBF has it: the $PSSN definitions belong to a
  // firmware's documentation, so a future firmware can register different ones —
  // and the facade hands the value across when the protocol is switched. An
  // unmodelled firmware is IGNORED rather than throwing, the setter precedent
  // everywhere in this repo.
  get firmware(): string { return this._firmware }
  set firmware(firmware: string) {
    if (isFirmware(firmware)) this._firmware = firmware
  }

  // The NMEA parser itself, for everything protocol-specific: `addSentences(yaml)`
  // for a user's own sentences, `getSentencesByProtocol()`, and so on.
  get parser(): NMEAParser { return this._parser }

  get memory(): boolean { return this._parser.memory }
  set memory(memory: boolean) { this._parser.memory = memory }

  get bufferLimit(): number { return this._parser.bufferLimit }
  set bufferLimit(bufferLimit: number) { this._parser.bufferLimit = bufferLimit }

  // The pending remainder, back as bytes so this parser is interchangeable with the
  // SBF one at the facade.
  get buffer(): Uint8Array { return toBytes(this._parser.buffer) }

  // TEXT is the natural form here — this class composes nmea-parser, a
  // StringParser, and NMEA 0183 is ASCII. Bytes are accepted too and converted at
  // the door, because that is what a serial port delivers whichever protocol the
  // receiver is emitting. Declared wider than `DeviceParser<Uint8Array>` asks for,
  // which still satisfies it: a function taking more is usable where one taking
  // less is expected.
  addData(data: string | Uint8Array): void { this._parser.addData(asText(data)) }

  parseData(data?: string | Uint8Array): CMA[] {
    const sentences = (data === undefined) ? this._parser.parseData() : this._parser.parseData(asText(data))
    // SNC is finished HERE, inside the protocol parser, never in the facade: the
    // base has already stamped the timestamps, and derived data belongs to the
    // layer that understands the protocol.
    return sentences.map((sentence) => (isSNC(sentence) ? enrichSNC(sentence) : sentence))
  }

  get sentenceIds(): string[] { return this._parser.sentenceIds }

  getSentenceDefinition(id: string, protocol?: string): Result<SentenceDefinition[], ParserError[]> {
    return this._parser.getSentenceDefinition(id, protocol)
  }

  getFakeSentence(id: string, protocol?: string): Result<Uint8Array, ParserError[]> {
    const fake = this._parser.getFakeSentence(id, protocol)
    return fake.success ? { success: true, value: toBytes(fake.value) } : fake
  }
}

// Recognised by its SUBTYPE FIELD, not by its id: the id is whatever the generic
// parse produced (`PSSN`), and keying on that would break the moment a future
// firmware documented a fixed-length SNC that the resolver could rename.
const isSNC = (sentence: CMA): boolean =>
  sentence.raw.startsWith(`$${PSSN_ID},`) && sentence.payload[0]?.raw.trim().toUpperCase() === SNC_ID
