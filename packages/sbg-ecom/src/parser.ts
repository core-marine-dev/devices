// installed
import type { NMEAParser } from '@coremarine/nmea-parser'
import { BinaryParser, UNKNOWN, toBase64 } from '@coremarine/protocol-core'
import type { CMA, DraftCMA, ExtractedSentences, GarbageSentence, ParserError, Result, SentenceDefinition, Timestamp } from '@coremarine/protocol-core'

// coded
import {
  DEFAULT_FIRMWARE,
  LENGTH_INDEX,
  MAXIMAL_DATA_LENGTH,
  MAXIMAL_FRAME_LENGTH,
  MINIMAL_FRAME_LENGTH,
  SYNC_1,
  SYNC_2,
  TIME_STAMP_FIELD,
  UTC_TIME_MESSAGE,
} from './constants'
import { createFakeSentence } from './fake'
import { firmwares, isFirmware, logsFor } from './firmware'
import { utcEpoch } from './firmware/2-3/time'
import { describeSentence, sentenceIdsFor } from './introspect'
import { decodeFrame, readHeader } from './protocol-ecom'
import { createNMEAParser, parseRun } from './protocol-nmea'
import type { FakeOptions, SBGError, SBGParserOptions, SBGSentenceDefinition } from './types'
import { asBytes, isLineFeed, isTextByte, toText } from './utils'

/* THE sbgECom PARSER.

   Framing is length-prefixed with a CRC and an end flag (§2.1.1), so unlike a text
   protocol there is no terminator to search for: find the sync, trust LEN, verify
   the CRC and the ETX.

   What makes this device different from every other parser in the repo is that ONE
   stream carries TWO framings at once — binary eCom frames and plain-ASCII NMEA
   sentences, interleaved (see src/protocol-nmea.ts for the evidence). So there is no
   "select a protocol" setting: both are always looked for, and the output is CMA
   either way, which is why a mixed batch needs no special handling downstream.

   THERE IS EXACTLY ONE BUFFER — this class's, inherited from BinaryParser. The eCom
   side is a pure function (src/protocol-ecom.ts) and the NMEA side runs with
   `memory: false` on runs already delimited here, so neither can hold a tail that
   this buffer also holds. */

/* What `frameAt` and `textRunAt` report instead of a length. Both are impossible
   lengths for a real frame or sentence, so they cannot be confused with one.

   ⚠️ THE TWO MUST BE DISTINCT VALUES, and the first version of this file learned it
   the hard way: with PENDING and "nothing here" both 0, every byte of ordinary binary
   junk read as "wait for more input" and the scan stopped dead at the first one — a
   whole 11,776-byte capture came out as a single buffer-overflow report. */
const PENDING = 0
const NOT_A_FRAME = -1
const NOT_A_RUN = -1

// The NMEA address field: '$' then five characters of talker + type ('$GPGGA',
// '$PSBGI'). Requiring it is what stops a stray 0x24 inside binary junk from being
// offered to the NMEA parser and coming back as an "incomplete sentence" — junk is
// junk, and it belongs in a coalesced garbage report with its bytes in base64.
const DOLLAR = 0x24
const ADDRESS_LENGTH = 5

const isAddressByte = (byte: number): boolean =>
  (byte >= 0x41 && byte <= 0x5A) || (byte >= 0x30 && byte <= 0x39)

const isSentenceStart = (buffer: Uint8Array, index: number): boolean => {
  if (buffer[index] !== DOLLAR) return false
  // Not yet decidable: the address may still be arriving. Treated as a start so the
  // run goes PENDING rather than being called junk and consumed.
  if (index + ADDRESS_LENGTH >= buffer.length) return true
  for (let offset = 1; offset <= ADDRESS_LENGTH; offset++) {
    if (!isAddressByte(buffer[index + offset])) return false
  }
  return true
}

const isSync = (buffer: Uint8Array, index: number): boolean =>
  buffer[index] === SYNC_1 && buffer[index + 1] === SYNC_2

const garbageSentence = (bytes: Uint8Array, error: string): GarbageSentence => ({
  raw: toBase64(bytes),
  timestamp: Date.now(),
  id: UNKNOWN,
  protocol: { name: UNKNOWN, version: UNKNOWN },
  payload: [],
  errors: [error],
})

// The sentence time nmea-parser already derived, if this draft came from it.
const inheritedSentenceTime = (draft: DraftCMA): Timestamp | undefined => {
  const timestamp = draft.metadata?.timestamp
  if (typeof timestamp !== 'object' || timestamp === null) return undefined
  const sentence = (timestamp as { sentence?: unknown }).sentence
  return (typeof sentence === 'number') ? sentence : undefined
}

// One learned correspondence between the device's uptime counter and real UTC.
interface Clock {
  uptime: number
  utc: Timestamp
}

export class SBGParser extends BinaryParser {
  protected _firmware: string = DEFAULT_FIRMWARE
  // The NMEA side, created once. Never holds a tail — see src/protocol-nmea.ts.
  protected readonly _nmea: NMEAParser = createNMEAParser()
  /* The uptime -> UTC correspondence learned from SBG_ECOM_LOG_UTC_TIME. Undefined
     until such a log arrives with a valid clock, in which case no log gets a
     sentence timestamp at all — an uptime is not a clock (decision D6). */
  protected _clock: Clock | undefined = undefined

  constructor({ firmware, ...options }: SBGParserOptions = {}) {
    super(options)
    if (firmware !== undefined) this.firmware = firmware
  }

  /* A whole frame has to fit in the buffer, because a frame only decodes once its
     LAST byte has arrived. §2.1.1 Note 1 caps DATA at 4086 bytes, so 4095 is the
     largest a frame can be — and the core's generic 1024-byte binary default would
     be too small for one. That mistake cost a session on septentrio, where the
     1024-byte default destroyed 1052-byte blocks into garbage; the ceiling here is
     derived from the datasheet's own maximum instead of inherited. */
  protected override defaultBufferLimit(): number { return MAXIMAL_FRAME_LENGTH }

  get firmware(): string { return this._firmware }
  // Never throws (the 0.0.x setter did): an unsupported firmware keeps the current one.
  set firmware(firmware: string) {
    if (isFirmware(firmware)) this._firmware = firmware
  }

  // The uptime -> UTC correspondence in use, or undefined while the device has not
  // published a valid one. Exposed because "does this parser know what time it is,
  // and from what" is exactly the question a remote install needs to answer.
  get clock(): Readonly<Clock> | undefined { return this._clock }

  // The NMEA parser, for its own extension points (`addSentences` for a user's own
  // sentences, `getSentencesByProtocol`). Exposed as one getter rather than
  // delegating method by method.
  get nmea(): NMEAParser { return this._nmea }

  // Every sentence this parser can describe or fabricate: the eCom ids as
  // '<class>:<message>', plus everything nmea-parser knows.
  get sentenceIds(): string[] {
    return [...sentenceIdsFor(this._firmware), ...this._nmea.sentenceIds]
  }

  /* Per decision D9 there is NO protocol selector: an eCom id always contains a
     colon and an NMEA id never does, so both introspection calls dispatch on the id
     itself. `protocol` here keeps the meaning the shared contract gives it — the
     FIRMWARE — because that is what selects the knowledge base.

     TYPED BY THE SHARED CONTRACT, not by the eCom shape: this parser fronts two
     knowledge bases, and a facade can only promise what both can deliver — nmea's
     error `kind` union and definition shape are its own. The richer eCom answer
     (`name`, `opaque`, an `SBGError` kind) is `getLogDefinition` below, the same
     split septentrio makes between its facade and `.parser`. */
  getSentenceDefinition(id: string, protocol?: string): Result<SentenceDefinition[], ParserError[]> {
    if (!id.includes(':')) return this._nmea.getSentenceDefinition(id, protocol)
    return this.getLogDefinition(id, protocol)
  }

  // The eCom knowledge base with its own richer shape. eCom ids only.
  getLogDefinition(id: string, firmware?: string): Result<SBGSentenceDefinition[], SBGError[]> {
    const version = firmware ?? this._firmware
    if (!isFirmware(version)) return this.unknownFirmware(version)
    return describeSentence(version, id)
  }

  getFakeSentence(id: string, protocol?: string, options?: FakeOptions): Result<Uint8Array, ParserError[]> {
    if (!id.includes(':')) {
      const fake = this._nmea.getFakeSentence(id, protocol)
      return fake.success ? { success: true, value: asBytes(fake.value) } : fake
    }
    const firmware = protocol ?? this._firmware
    if (!isFirmware(firmware)) return this.unknownFirmware(firmware)
    return createFakeSentence(firmware, id, options)
  }

  protected unknownFirmware(firmware: string): { success: false, error: SBGError[] } {
    return { success: false, error: [{ kind: 'unknown-firmware', message: `Firmware ${JSON.stringify(firmware)} is not supported; supported: ${firmwares().join(', ')}` }] }
  }

  /* Input is accepted as bytes OR as a string, always — the accepted type never
     depends on a setting, because a flow fed by a serial node must keep working
     whichever framing the device happens to emit. A string is read one byte per
     character (see `asBytes`). */
  override addData(data: string | Uint8Array): void {
    super.addData(asBytes(data))
    this.promoteTimestamps()
  }

  override parseData(data?: string | Uint8Array): CMA[] {
    return super.parseData((data === undefined) ? undefined : asBytes(data))
  }

  /* D6: uptime is not a timestamp, but a device that tells us the time is trusted.
     Once SBG_ECOM_LOG_UTC_TIME has published a valid correspondence, every sentence
     carrying one gets its own absolute time promoted to `cma.timestamp`, exactly as
     nmea-parser does with GGA and septentrio with GNSS time. metadata.timestamp is
     left as the core stamped it, so `received` and `parsed` still mean what they
     always meant. */
  protected promoteTimestamps(): void {
    for (const [index, sentence] of this._sentences.entries()) {
      const own = sentence.metadata.timestamp.sentence
      if (own === undefined) continue
      this._sentences[index] = { ...sentence, timestamp: own }
    }
  }

  /* The sentence's own time, or undefined when there is none to be had.

     Two sources, and the order matters: a draft that came from nmea-parser already
     has one (GGA's UTC), and the core is about to overwrite the whole timestamp
     block — so it is read back here rather than lost. An eCom frame has only its
     uptime counter, which becomes a time only through the learned correspondence. */
  protected override sentenceTimestamp(draft: DraftCMA): Timestamp | undefined {
    const inherited = inheritedSentenceTime(draft)
    if (inherited !== undefined) return inherited
    if (this._clock === undefined) return undefined
    const uptime = this.uptimeOf(draft)
    if (uptime === undefined) return undefined
    // The counter is microseconds; CMA timestamps are epoch milliseconds.
    return Math.round(this._clock.utc + ((uptime - this._clock.uptime) / 1000))
  }

  // TIME_STAMP is payload[0] of every log that has one, but it is read BY NAME:
  // the two raw-buffer logs have no such field, and an index would silently pick up
  // whatever sat first in those.
  protected uptimeOf(draft: DraftCMA): number | undefined {
    const field = draft.payload.find((entry) => entry.name === TIME_STAMP_FIELD)
    return (typeof field?.value === 'number') ? field.value : undefined
  }

  /* Learned from SBG_ECOM_LOG_UTC_TIME, which publishes BOTH the uptime counter and
     the matching UTC — §2.3.3.2 says outright that this is the frame to use "if you
     would like to time stamp all data to an absolute UTC or GPS time reference".

     A correspondence is only taken when the device reports SBG_ECOM_UTC_VALID;
     anything less means it is propagating a guess internally, and a guessed clock is
     worse than an honest absence. Logs decoded BEFORE the first UTC_TIME of a batch
     keep no sentence timestamp — the same caveat septentrio has with its leap
     seconds. */
  protected learnClock(draft: DraftCMA): void {
    const uptime = this.uptimeOf(draft)
    if (uptime === undefined) return
    const values: Record<string, number | string | boolean | null> = {}
    for (const field of draft.payload) values[field.name] = field.value
    const utc = utcEpoch(values)
    if (utc === undefined) return
    this._clock = { uptime, utc }
  }

  protected extractSentences(buffer: Uint8Array): ExtractedSentences<Uint8Array> {
    const sentences: DraftCMA[] = []
    let junk = -1
    let index = 0
    const flushJunk = (until: number): void => {
      if (junk === -1) return
      sentences.push(garbageSentence(buffer.subarray(junk, until), `Unparseable data: ${until - junk} byte(s) before a valid frame`))
      junk = -1
    }
    while (index < buffer.length) {
      const length = this.frameAt(buffer, index)
      if (length === PENDING) break
      if (length !== NOT_A_FRAME) {
        flushJunk(index)
        index += this.pushFrame(sentences, buffer.subarray(index, index + length))
        continue
      }
      const run = this.textRunAt(buffer, index)
      if (run === PENDING) break
      if (run !== NOT_A_RUN) {
        flushJunk(index)
        this.pushTextRun(sentences, buffer.subarray(index, index + run))
        index += run
        continue
      }
      // Adjacent junk is coalesced into ONE report, so a noisy line does not
      // produce a flood of garbage sentences.
      if (junk === -1) junk = index
      index += 1
    }
    flushJunk(index)
    return this.withBufferLimit(sentences, buffer.subarray(index))
  }

  // Decodes one frame, learns the clock from it if it is UTC_TIME, and reports how
  // many bytes it consumed.
  protected pushFrame(sentences: DraftCMA[], frame: Uint8Array): number {
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    const { message, messageClass } = readHeader(view)
    const logs = logsFor(this._firmware, messageClass)
    const draft = decodeFrame(frame, logs, this._firmware)
    // Learned BEFORE the draft is stamped, so a UTC_TIME frame time-stamps itself
    // rather than waiting for the next one.
    if (messageClass === 0 && message === UTC_TIME_MESSAGE && draft.errors === undefined) this.learnClock(draft)
    sentences.push(draft)
    return frame.byteLength
  }

  /* Hands one delimited ASCII run to nmea-parser. Anything it could not finish is
     reported as garbage rather than dropped: the run was bounded by a frame or by a
     line feed, so a leftover can never be completed by later input. */
  protected pushTextRun(sentences: DraftCMA[], bytes: Uint8Array): void {
    const { sentences: parsed, leftover } = parseRun(this._nmea, toText(bytes))
    sentences.push(...parsed)
    if (leftover.length > 0) {
      sentences.push(garbageSentence(asBytes(leftover), `Incomplete NMEA sentence: ${leftover.length} character(s) that no later input can complete`))
    }
  }

  /* What starts at `index`: a frame of the returned length, PENDING (a frame needing
     more bytes — never junk, or a frame split across two chunks would be
     corrupted), or NOT_A_FRAME. */
  protected frameAt(buffer: Uint8Array, index: number): number {
    // A lone trailing 0xFF may be the first half of a sync split across chunks.
    // `stream-logs.bin` ends with exactly that byte, which is why it is a fixture.
    if (buffer[index] === SYNC_1 && index + 1 >= buffer.length) return PENDING
    if (!isSync(buffer, index)) return NOT_A_FRAME
    if (index + MINIMAL_FRAME_LENGTH > buffer.length) return PENDING
    const view = new DataView(buffer.buffer, buffer.byteOffset + index, MINIMAL_FRAME_LENGTH)
    const dataLength = view.getUint16(LENGTH_INDEX, true)
    // §2.1.1 Note 1: LEN is a uint16 but the maximum is 4086, so a larger value
    // cannot be a frame — it is a sync pattern occurring inside junk.
    if (dataLength > MAXIMAL_DATA_LENGTH) return NOT_A_FRAME
    const total = MINIMAL_FRAME_LENGTH + dataLength
    return (index + total > buffer.length) ? PENDING : total
  }

  /* A run of NMEA text starting at `index`: its length, NOT_A_RUN, or PENDING if it
     might still be completed by later input.

     A run must start with a full NMEA address — `$` plus five address characters —
     which is what keeps the two framings from guessing about each other: binary junk
     and base64 do not look like that. It then extends over printable ASCII and ends
     after the first line feed.

     A run that ends WITHOUT a terminator because a non-text byte follows is handed
     over anyway: that byte is the start of a frame, which proves the sentence will
     never be completed, and nmea-parser reports it as a missing end flag — which is
     exactly what it is. Only a run that reaches the end of the buffer with no
     terminator is PENDING, and that never blocks a later frame because such a run is
     by definition the last thing in the buffer. */
  protected textRunAt(buffer: Uint8Array, index: number): number {
    if (!isSentenceStart(buffer, index)) return NOT_A_RUN
    let end = index
    while (end < buffer.length && isTextByte(buffer[end])) {
      end += 1
      if (isLineFeed(buffer[end - 1])) return end - index
    }
    return (end >= buffer.length) ? PENDING : end - index
  }

  /* Binary payloads routinely contain 0xFF 0x5A, so a wrong device on the line can
     open a "frame" that never completes. Without this the buffer would grow forever
     and the problem would stay invisible — which is the outcome this refactor exists
     to remove. */
  protected withBufferLimit(sentences: DraftCMA[], remainder: Uint8Array): ExtractedSentences<Uint8Array> {
    if (remainder.byteLength <= this._bufferLimit) return { sentences, remainder }
    sentences.push(garbageSentence(remainder, `Buffer limit exceeded: ${remainder.byteLength} pending byte(s) over a limit of ${this._bufferLimit}`))
    return { sentences, remainder: new Uint8Array(0) }
  }
}
