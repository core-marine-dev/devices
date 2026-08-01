// installed
import { BinaryParser, gpsWeekTimeToUnix, toBase64, UNKNOWN } from '@coremarine/protocol-core'
import type { CMA, DraftCMA, ExtractedSentences, Field, GarbageSentence, Metadata, Result, Timestamp } from '@coremarine/protocol-core'
import crc16xmodem from 'crc/calculators/crc16xmodem'

// coded
import {
  BLOCK_NUMBER_MASK,
  BLOCK_REVISION_SHIFT,
  BODY_INDEX,
  CRC_INDEX,
  DEFAULT_FIRMWARE,
  DELTA_LS_FIELD,
  DO_NOT_USE_DELTA_LS,
  DO_NOT_USE_TOW,
  DO_NOT_USE_WNC,
  RECEIVER_SETUP_NUMBER,
  RX_VERSION_FIELD,
  ID_INDEX,
  LENGTH_INDEX,
  LENGTH_MULTIPLE,
  MAXIMAL_BLOCK_LENGTH,
  MINIMAL_BLOCK_LENGTH,
  PROTOCOL_NAME,
  RECEIVER_TIME_NUMBER,
  SYNC_1,
  SYNC_2,
  TOW_INDEX,
  UNKNOWN_BLOCK,
  WNC_INDEX,
} from './constants'
import { decodeBody } from './engine'
import { createFakeSentence } from './fake'
import { blocksFor, firmwares, isFirmware } from './firmware'
import { describeSentence } from './introspect'
import type { BlockDefinition, BlockRegistry, FakeOptions, SBFError, SBFParserOptions, SBFSentenceDefinition } from './types'

// The SBF protocol parser. Framing is length-prefixed with a CRC (§4.1.1), so
// unlike the text protocols there is no terminator to look for: find the sync,
// trust the Length field, verify the CRC.
//
// Nothing is dropped silently, the same contract as the text parsers, with one
// tier they cannot have:
//
//   decoded   — CRC valid, block modelled: full payload
//   identified— CRC valid, block number NOT in this firmware's knowledge base:
//               real `id`, real timestamp, the body in `raw`, `payload: []`,
//               metadata.name 'unknown'. NOT an error — every block of 4.10.1 is
//               modelled, so this is what a NEWER firmware's blocks land in, and
//               it is what makes the parser forward-safe instead of lossy.
//   failed    — CRC mismatch or a body shorter than its own definition: decoded
//               as far as possible, with `errors`
//   garbage   — bytes that cannot start a block at all: coalesced, reported
//               with the junk in `raw`
//
// Every emitted CMA carries the block's own GPS time at
// metadata.timestamp.sentence, and for receiver- and external-stamped blocks
// that value also becomes cma.timestamp — a GNSS receiver's clock is
// disciplined to atomic time, so it beats the host's. See addData.

// What `blockAt` reports instead of a length. Both are impossible lengths for a
// real block (the minimum is 14), so they cannot be confused with one.
const PENDING = 0
const NOT_A_BLOCK = -1

const isSync = (buffer: Uint8Array, index: number): boolean =>
  buffer[index] === SYNC_1 && buffer[index + 1] === SYNC_2

// A metadata entry shaped like a CMA Field: the header and time-stamp values
// are not payload (they are not part of the SBF body), but a consumer still
// wants the raw bytes next to the parsed value.
const metadataField = (raw: Uint8Array, name: string, type: Field['type'], value: Field['value'], units?: string, description?: string): Field => {
  const field: Field = { raw: toBase64(raw), name, type, value }
  if (units !== undefined) field.units = units
  if (description !== undefined) field.description = description
  return field
}

const garbageSentence = (bytes: Uint8Array, error: string): GarbageSentence => ({
  raw: toBase64(bytes),
  timestamp: Date.now(),
  id: UNKNOWN,
  protocol: { name: UNKNOWN, version: UNKNOWN },
  payload: [],
  errors: [error],
})

// A metadata entry's numeric value, or undefined if it is absent or null.
const metadataValue = (entry: unknown): number | undefined => {
  if (typeof entry !== 'object' || entry === null) return undefined
  const value = (entry as { value?: unknown }).value
  return (typeof value === 'number') ? value : undefined
}

export class SBFParser extends BinaryParser {
  protected _firmware: string = DEFAULT_FIRMWARE
  protected _blocks: BlockRegistry = blocksFor(DEFAULT_FIRMWARE)
  // The receiver's own GPS-UTC offset, learned from ReceiverTime.DeltaLS.
  // Undefined until a ReceiverTime block arrives (or forever, if that block is
  // not enabled in the receiver's output), in which case the core's
  // leap-second table is used instead.
  protected _leapSeconds: number | undefined = undefined
  // What the receiver SAYS its firmware is (ReceiverSetup.RxVersion), which is
  // not necessarily one we have a knowledge base for.
  protected _reportedFirmware: string | undefined = undefined

  constructor({ firmware, ...options }: SBFParserOptions = {}) {
    super(options)
    if (firmware !== undefined) this.firmware = firmware
  }

  // A whole SBF block has to fit in the buffer, because a block only decodes once
  // its LAST byte has arrived (§4.1.1 framing is length-prefixed, not
  // terminated). `Length` is a uint16, so 65535 is the largest a block can be —
  // and the core's generic 1024-byte binary default is far too small: cru's own
  // receiver emits `Commands` blocks of 1052 and 1060 bytes and `ChannelStatus`
  // up to 988. MEASURED on the 1052-byte block from
  // `misc/parsers/septentrio/captures/2023_06_23_test1.sbf`: fed in 16-byte
  // chunks under a 1024-byte limit, the buffer overflowed 24 bytes before the
  // block completed and it was destroyed into garbage sentences — 28 of them at
  // one byte per chunk. Nothing was wrong with the data; the limit was.
  //
  // 1.x had this right ("65535 bytes which is more than enough to store an
  // incompleted frame"); the rewrite silently inherited the text-protocol figure.
  protected override defaultBufferLimit(): number { return MAXIMAL_BLOCK_LENGTH }

  get firmware(): string { return this._firmware }
  // Never throws: an unsupported firmware keeps the current one.
  set firmware(firmware: string) {
    if (!isFirmware(firmware)) return
    this._firmware = firmware
    this._blocks = blocksFor(firmware)
  }

  get leapSeconds(): number | undefined { return this._leapSeconds }

  // The firmware the RECEIVER reported, as opposed to the one whose knowledge
  // base is in use (`firmware`). They differ when the device runs a version this
  // build does not model — which is worth seeing rather than guessing about.
  get reportedFirmware(): string | undefined { return this._reportedFirmware }

  // Every block this parser can describe or fabricate, as the ids a CMA carries.
  get sentenceIds(): string[] { return [...this._blocks.keys()].map(String) }

  // What this parser believes a block looks like — one entry per revision, since
  // a receiver generation only sends the fields its revision defines. A
  // diagnostic tool: see src/introspect.ts.
  // `protocol` here is the FIRMWARE, because that is what selects the knowledge
  // base: block 4007 is described by whichever firmware's table is asked for.
  // Omitted, it is the firmware this parser is set to. An unsupported one is
  // refused rather than silently answered from the wrong table.
  getSentenceDefinition(id: number | string, protocol?: string): Result<SBFSentenceDefinition[], SBFError[]> {
    const firmware = protocol ?? this._firmware
    if (!isFirmware(firmware)) {
      return { success: false, error: [{ kind: 'unknown-firmware', message: `Firmware ${JSON.stringify(firmware)} is not supported; supported: ${firmwares().join(', ')}` }] }
    }
    return describeSentence(blocksFor(firmware), firmware, id)
  }

  // Fabricate a wire frame for tests, demos and example flows — deterministic,
  // with a real CRC and Length, so it parses straight back. Options override
  // individual fields by name (see src/fake.ts).
  getFakeSentence(id: number | string, protocol?: string, options?: FakeOptions): Result<Uint8Array, SBFError[]> {
    const firmware = protocol ?? this._firmware
    if (!isFirmware(firmware)) {
      return { success: false, error: [{ kind: 'unknown-firmware', message: `Firmware ${JSON.stringify(firmware)} is not supported; supported: ${firmwares().join(', ')}` }] }
    }
    return createFakeSentence(blocksFor(firmware), id, options)
  }

  // cru's final patch, and the whole reason SBF is special: overwrite
  // cma.timestamp with the sentence's own GNSS time. metadata.timestamp is left
  // exactly as the core stamped it, so `received` and `parsed` still mean what
  // they always meant and a consumer can always see the host-side timings.
  // Only receiver- and external-stamped blocks are promoted: an SIS timestamp
  // is when a satellite transmitted the bits, which can be an hour in the past
  // (§4.1.3), and an unmodelled block's kind is unknown, so neither is promoted.
  override addData(data: Uint8Array): void {
    super.addData(data)
    for (const [index, sentence] of this._sentences.entries()) {
      const own = sentence.metadata.timestamp.sentence
      if (own === undefined || !this.promotable(sentence)) continue
      this._sentences[index] = { ...sentence, timestamp: own }
    }
  }

  protected promotable(sentence: CMA): boolean {
    const definition = this._blocks.get(Number(sentence.id))
    return definition !== undefined && definition.timestamp !== 'sis'
  }

  // The block's own time (§4.1.3), converted from the GPS scale to a Unix epoch
  // in ms. Absent while the receiver has not set its clock, which is normal for
  // a few seconds after start-up (TOW usually becomes valid before WNc).
  protected override sentenceTimestamp(sentence: DraftCMA): Timestamp | undefined {
    const tow = metadataValue(sentence.metadata?.tow)
    const wnc = metadataValue(sentence.metadata?.wnc)
    if (tow === undefined || wnc === undefined) return undefined
    return gpsWeekTimeToUnix(wnc, tow, this._leapSeconds)
  }

  protected extractSentences(buffer: Uint8Array): ExtractedSentences<Uint8Array> {
    const sentences: DraftCMA[] = []
    let junk = -1
    let index = 0
    while (index < buffer.length) {
      const length = this.blockAt(buffer, index)
      if (length === PENDING) break
      if (length === NOT_A_BLOCK) {
        if (junk === -1) junk = index
        index += 1
        continue
      }
      // Adjacent junk is coalesced into ONE report, so a noisy line does not
      // produce a flood of garbage sentences.
      if (junk !== -1) sentences.push(garbageSentence(buffer.subarray(junk, index), `Unparseable data: ${index - junk} byte(s) before a valid block`))
      junk = -1
      sentences.push(this.decodeFrame(buffer.subarray(index, index + length)))
      index += length
    }
    if (junk !== -1) sentences.push(garbageSentence(buffer.subarray(junk, index), `Unparseable data: ${index - junk} byte(s) before a valid block`))
    return this.withBufferLimit(sentences, buffer.subarray(index))
  }

  // What starts at `index`: a block of the returned length, PENDING (a block
  // that needs more bytes — never junk, or a block split across two chunks
  // would be corrupted), or NOT_A_BLOCK. §4.1.1: Length is the TOTAL size
  // including the header, and is always a multiple of 4.
  protected blockAt(buffer: Uint8Array, index: number): number {
    // A lone trailing 0x24 may be the first half of a sync split across chunks.
    if (buffer[index] === SYNC_1 && index + 1 >= buffer.length) return PENDING
    if (!isSync(buffer, index)) return NOT_A_BLOCK
    if (index + MINIMAL_BLOCK_LENGTH > buffer.length) return PENDING
    const view = new DataView(buffer.buffer, buffer.byteOffset + index, MINIMAL_BLOCK_LENGTH)
    const length = view.getUint16(LENGTH_INDEX, true)
    if (length < MINIMAL_BLOCK_LENGTH || length > MAXIMAL_BLOCK_LENGTH) return NOT_A_BLOCK
    if ((length % LENGTH_MULTIPLE) !== 0) return NOT_A_BLOCK
    return (index + length > buffer.length) ? PENDING : length
  }

  // Binary protocols routinely contain 0x24 0x40 inside a body, so a wrong
  // device on the line can open a "block" that never completes. Without this,
  // the buffer would grow forever and the problem would stay invisible.
  protected withBufferLimit(sentences: DraftCMA[], remainder: Uint8Array): ExtractedSentences<Uint8Array> {
    if (remainder.byteLength <= this._bufferLimit) return { sentences, remainder }
    sentences.push(garbageSentence(remainder, `Buffer limit exceeded: ${remainder.byteLength} pending byte(s) over a limit of ${this._bufferLimit}`))
    return { sentences, remainder: new Uint8Array(0) }
  }

  protected decodeFrame(frame: Uint8Array): DraftCMA {
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    const id = view.getUint16(ID_INDEX, true)
    const number = id & BLOCK_NUMBER_MASK
    const revision = id >>> BLOCK_REVISION_SHIFT
    const receivedCRC = view.getUint16(CRC_INDEX, true)
    const computedCRC = crc16xmodem(frame.subarray(ID_INDEX)) >>> 0
    const errors: string[] = []
    if (computedCRC !== receivedCRC) {
      // Reported, not dropped: the payload is usually still readable, and a
      // silent drop is exactly what this refactor removes.
      errors.push(`Invalid CRC: computed ${computedCRC}, received ${receivedCRC}`)
    }
    const definition = this._blocks.get(number)
    const metadata = this.frameMetadata(frame, view, definition, revision)
    const body = frame.subarray(BODY_INDEX)
    const sentence: DraftCMA = {
      raw: toBase64(frame),
      timestamp: Date.now(),
      id: String(number),
      protocol: { name: PROTOCOL_NAME, version: this._firmware },
      payload: [],
      metadata,
    }
    if (definition !== undefined) {
      this.decodeKnownBody(sentence, metadata, definition, revision, body, errors)
    } else if (body.byteLength > 0) {
      // Identified but not modelled: publish the bytes, claim nothing about them.
      metadata.body = { raw: toBase64(body), bytes: body.byteLength }
    }
    if (definition?.description !== undefined) sentence.description = definition.description
    if (errors.length > 0) sentence.errors = errors
    return sentence
  }

  protected decodeKnownBody(sentence: DraftCMA, metadata: Metadata, definition: BlockDefinition, revision: number, body: Uint8Array, errors: string[]): void {
    if (definition.opaque === true) {
      metadata.body = { raw: toBase64(body), bytes: body.byteLength }
      return
    }
    // §4.1.6: revisions only ADD fields, so an unknown-but-higher revision is a
    // superset of the newest one we know — decode it as that, never as revision 0.
    const index = Math.min(revision, definition.revisions.length - 1)
    if (index !== revision) metadata.revisionDecoded = index
    const decoded = decodeBody(body, definition.revisions[index], definition.decoders)
    sentence.payload = decoded.payload
    errors.push(...decoded.errors)
    if (decoded.subBlocks.length > 0) metadata.subBlocks = decoded.subBlocks
    if (decoded.padding.byteLength > 0) {
      // §4.1.5: the VALUE of a padding byte is undefined and must not be looked
      // at — so it is reported as bytes, never decoded into a field.
      metadata.padding = { raw: toBase64(decoded.padding), bytes: decoded.padding.byteLength }
    }
    const aggregated = definition.payloadMetadata?.(decoded.values)
    if (aggregated !== undefined && Object.keys(aggregated).length > 0) metadata.payload = aggregated
    if (definition.number === RECEIVER_TIME_NUMBER) this.learnLeapSeconds(decoded.values[DELTA_LS_FIELD])
    if (definition.number === RECEIVER_SETUP_NUMBER) this.learnFirmware(decoded.values[RX_VERSION_FIELD], errors)
  }

  // The header and time stamp are NOT payload — they are not part of the SBF
  // body — so they live in sentence metadata, each as a Field-shaped entry with
  // its own raw bytes. `sync` is omitted (always 0x24 0x40) and `id` too (it is
  // the sentence's own identity). The core adds `timestamp` on top of this.
  protected frameMetadata(frame: Uint8Array, view: DataView, definition: BlockDefinition | undefined, revision: number): Metadata {
    const tow = view.getUint32(TOW_INDEX, true)
    const wnc = view.getUint16(WNC_INDEX, true)
    return {
      name: definition?.name ?? UNKNOWN_BLOCK,
      revision,
      crc: metadataField(frame.subarray(CRC_INDEX, ID_INDEX), 'CRC', 'uint16', view.getUint16(CRC_INDEX, true), undefined, 'CRC-CCITT of every byte from the ID field to the end of the block'),
      length: metadataField(frame.subarray(LENGTH_INDEX, TOW_INDEX), 'Length', 'uint16', view.getUint16(LENGTH_INDEX, true), 'bytes', 'Total block size including the header; always a multiple of 4'),
      tow: metadataField(frame.subarray(TOW_INDEX, WNC_INDEX), 'TOW', 'uint32', (tow === DO_NOT_USE_TOW) ? null : tow, '0.001 s', 'Time-of-week in whole milliseconds from the start of the current GPS week'),
      wnc: metadataField(frame.subarray(WNC_INDEX, BODY_INDEX), 'WNc', 'uint16', (wnc === DO_NOT_USE_WNC) ? null : wnc, 'week', 'Continuous GPS week count, not affected by the 1024-week rollover'),
    }
  }

  // The receiver is the authority on its own clock: DeltaLS is the GPS-UTC
  // offset it is using, so once seen it replaces the table lookup. Blocks
  // decoded before the first ReceiverTime of a batch keep the table value.
  protected learnLeapSeconds(deltaLS: unknown): void {
    if (typeof deltaLS !== 'number' || deltaLS === DO_NOT_USE_DELTA_LS) return
    this._leapSeconds = deltaLS
  }

  // ...and the authority on its own firmware. ReceiverSetup.RxVersion is what the
  // box says it is running, so:
  //
  //   - a version we HAVE a knowledge base for is adopted, and `protocol.version`
  //     becomes the device's own truth instead of a constructor argument (the same
  //     move tblive makes with its `FV=` response);
  //   - one we do NOT have is kept out of the decoding path — inventing a table
  //     would be worse — but reported on that sentence's `errors`, because
  //     decoding a 4.14 receiver with a 4.10.1 table is exactly the kind of
  //     silent wrongness this refactor exists to remove.
  //
  // Blocks decoded before the first ReceiverSetup of a batch keep the previous
  // firmware, the same caveat as the leap seconds.
  protected learnFirmware(reported: unknown, errors: string[]): void {
    if (typeof reported !== 'string' || reported === '') return
    const version = reported.trim()
    this._reportedFirmware = version
    if (version === this._firmware) return
    if (isFirmware(version)) {
      this.firmware = version
      return
    }
    errors.push(`Receiver reports firmware ${JSON.stringify(version)}, which this build does not model; decoding with ${this._firmware}`)
  }
}
