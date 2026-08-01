# @coremarine/thelmabiotel-tblive

[![npm version](https://img.shields.io/npm/v/@coremarine/thelmabiotel-tblive.svg)](https://www.npmjs.com/package/@coremarine/thelmabiotel-tblive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Parser for the **Thelma Biotel TB Live** acoustic receiver (hydrophone). It turns the receiver's
serial output into **CMA**, the same JSON shape every CoreMarine device parser emits, so consumers
handle one format regardless of protocol.

Node >= 22. Runs on node, deno, bun and the browser — no `node:` imports, input is a `string`.

## Install

```bash
npm install @coremarine/thelmabiotel-tblive
```

## Quick start

```typescript
import { TBLiveParser } from '@coremarine/thelmabiotel-tblive'

const parser = new TBLiveParser()

// Feed whatever arrives on the line, in whatever chunks it arrives.
const sentences = parser.parseData('$001129,1551087409,421,OPs,15,2,37,69\r')
```

```json
[
  {
    "raw": "$001129,1551087409,421,OPs,15,2,37,69\r",
    "timestamp": 1785402277806,
    "id": "emitter",
    "protocol": { "name": "TBLive", "version": "1.0.2" },
    "payload": [
      { "raw": "001129", "name": "receiver_serial_number", "type": "string", "value": "001129" },
      { "raw": "1551087409", "name": "seconds", "type": "uint32", "value": 1551087409, "units": "s" },
      { "raw": "421", "name": "milliseconds", "type": "uint16", "value": 421, "units": "ms" },
      { "raw": "OPs", "name": "transmit_protocol", "type": "string", "value": "OPs" },
      { "raw": "15", "name": "emitter", "type": "string", "value": "15" },
      { "raw": "2", "name": "data", "type": "uint16", "value": 2 },
      { "raw": "37", "name": "snr", "type": "uint8", "value": 37,
        "metadata": { "raw": 37, "signal": "strong" } },
      { "raw": "69", "name": "frequency", "type": "uint8", "value": 69, "units": "kHz" }
    ],
    "metadata": {
      "mode": "listening",
      "payload": {
        "receiver": "001129",
        "emitter": "15",
        "time": { "seconds": 1551087409, "milliseconds": 421, "total_milliseconds": 1551087409421 },
        "snr": { "raw": 37, "signal": "strong" }
      },
      "timestamp": { "received": 1785402277805, "parsed": 1785402277806 }
    }
  }
]
```

## API

| Member | Type | Notes |
| --- | --- | --- |
| `new TBLiveParser(options?)` | `{ memory?, bufferLimit?, firmware? }` | Nothing throws — an invalid option is discarded |
| `addData(input: string)` | `void` | Appends to the buffer and parses immediately |
| `parseData(input?: string)` | `CMA[]` | Adds `input` if given, then **drains** the queue |
| `buffer` | `string` (readonly) | The still-incomplete tail |
| `memory` | `boolean` | `false` discards the previous buffer on each `addData` |
| `bufferLimit` | `number` | Default 1024 characters. Enforced — see below |
| `firmware` | `'1.0.1' \| '1.0.2' \| 'unknown'` | Readable and writable; learned automatically |
| `firmwares` | `readonly string[]` | The firmwares this parser understands |
| `sentenceIds` | `SentenceId[]` | Every sentence it can fabricate or describe |
| `getFakeSentence(id, protocol, options?)` | `Result<string, ParserError[]>` | Fabricate a wire sentence — see below |
| `getSentenceDefinition(id, protocol?)` | `Result<SentenceDefinition[], ParserError[]>` | Ask what it expects — see below |

Both of the last two return a **`Result`**, never `null`: an unknown id, an unknown protocol and a
malformed option are three different mistakes, and the caller is told which.

```typescript
const result = parser.getFakeSentence('emitter', '1.0.2', { frequency: 34 })
if (result.success) {
  console.log(result.value)
} else {
  console.error(result.error.map((e) => e.message))   // ParserError[], not string[]
}
```

## Fake sentences

Fabricate a wire sentence for tests, demos and Node-RED example flows. `protocol` is a **mandatory
positional argument**, because the firmware genuinely changes the output; `options` is optional and
narrowed by TypeScript to the fields that `id` actually has.

```typescript
parser.getFakeSentence('emitter', '1.0.2', { receiverID: '100345', emitterID: '33280', frequency: 34 })
// -> '$100345,1589557202,615,S64K,33280,0,24,34\r'
```

**It is deterministic** — a pure function of its arguments, with no randomness — so a fixture cannot
drift between runs. And the defaults are the datasheets' **own example sentences**, so a call with no
options reproduces a document verbatim:

```typescript
parser.getFakeSentence('emitter', '1.0.1')   // '$1000042,1589557202,615,S64K,1285,0,24,69,11\r'
parser.getFakeSentence('receiver', '1.0.1')  // '$1000042,1589557600,TBR Sensor,297,15,29,69,6\r'
parser.getFakeSentence('command', '1.0.1')   // 'LIVECM'
parser.getFakeSentence('command', '1.0.2')   // 'TBRC'
```

Anything it produces parses back cleanly — that round trip is asserted for every id on every
firmware. Options by id:

| id | options |
| --- | --- |
| `emitter` | `receiverID`, `seconds`, `milliseconds`, `transmitProtocol`, `emitterID`, `data`, `snr`, `frequency`, `sent`¹ |
| `receiver` | `receiverID`, `seconds`, `log`, `temperature`, `noiseAverage`, `noisePeak`, `frequency`, `sent`¹ |
| `ping`, `serial_number` | `receiverID` |
| `frequency` | `frequency` |
| `listening_mode` | `listeningMode` |
| `log_interval` | `logInterval` |
| `time` | `seconds` |
| the rest | none — nothing to vary |

¹ `sent` exists only in 1.0.1 sentences; asking for it on 1.0.2 is reported rather than ignored.

Values may be numbers or numeric strings, and a string keeps its padding (`'001129'` stays
`'001129'`). `data: null` asks for the empty field an ID-only transmit protocol produces. Options are
checked for **shape, not plausibility** — `frequency: 34` is accepted even though the device listens
63-77 kHz.

## Asking the parser what it expects

`getSentenceDefinition` returns what this parser believes a sentence looks like. It is deliberately
**CMA-shaped**: the same keys a parsed sentence has, minus the ones only a real parse can fill (no
`raw`, no `timestamp`, no `errors`), with `payload` holding field *definitions* rather than decoded
values. `mode` sits at the top level because a definition has no `metadata` to nest it in.

```typescript
parser.getSentenceDefinition('receiver', '1.0.2')
```

```json
[
  {
    "id": "receiver",
    "protocol": { "name": "TBLive", "version": "1.0.2" },
    "payload": [
      { "name": "receiver_serial_number", "type": "string", "description": "…" },
      { "name": "seconds", "type": "uint32", "units": "s", "description": "…" },
      { "name": "log", "type": "string", "description": "…" },
      { "name": "temperature", "type": "int16", "description": "Raw temperature; (raw - 50) / 10 gives degrees Celsius" },
      { "name": "noise_average", "type": "uint8", "description": "Average background noise, 0-255" },
      { "name": "noise_peak", "type": "uint8", "description": "Peak background noise, 0-255" },
      { "name": "frequency", "type": "uint8", "units": "kHz", "description": "…" }
    ],
    "mode": "listening",
    "description": "Sensor log from the receiver itself — water temperature and background noise — printed at the interval set by `LI=`. Recognised by `$` and terminated by `<CR>`. Identified by its 7 fields: firmware 1.0.1 sends 8."
  }
]
```

**`description` is prose, at both levels**, and it carries what a structured object would: what the
sentence is, **how it is recognised in a frameless stream**, and whether the firmware changes it. That
last part is the difference the shape alone cannot show:

```typescript
parser.getSentenceDefinition('command', '1.0.1')[0].description
// '…Recognised as the fixed literal `LIVECM`. Firmware 1.0.1 only; firmware 1.0.2 uses a different form…'
parser.getSentenceDefinition('frequency', '1.0.1')[0].description
// '…Recognised by `FC=` followed by exactly 2 digits. Identical on both documented firmwares.'
```

Descriptions also carry the operational warnings from the datasheets — that `reset` **deletes** all
stored detections, that `upgrade` can **brick** the device, that `milliseconds` is not always
zero-padded.

**Omit `protocol` to get every protocol version** of that sentence — which is how you see what the
firmware actually changes:

```typescript
const result = parser.getSentenceDefinition('emitter')
// -> two definitions: 1.0.1 with a 9-field payload, 1.0.2 with 8
```

The return is **always an array**, even for a single match, so callers need one code path. The
`payload` array is a copy, so a caller cannot corrupt the parser's tables.

This exists for **diagnosis**. These parsers get deployed on remote installations with restricted
internet access and stay there for years; being able to ask the running binary what it expects settles
a question that would otherwise need the datasheets and a shell.

## Sentences

`id` names **what the sentence is about**; `metadata.mode` names **which of the device's APIs it
belongs to**.

| `id` | `mode` | Wire form |
| --- | --- | --- |
| `emitter` | `listening` | `$…\r` acoustic detection (9 fields on 1.0.1, 8 on 1.0.2) |
| `receiver` | `listening` | `$…\r` sensor log (8 fields on 1.0.1, 7 on 1.0.2) |
| `ping` | `listening` | `SN=nnnnnn ><>\r` |
| `clock_round` | `listening` | `ack01\r` |
| `clock_set` | `listening` | `ack02\r` |
| `command` | `listening` | `LIVECM` (1.0.1) / `TBRC` (1.0.2) |
| `listening` | `command` | `EX!` |
| `serial_number` | `command` | `SN=nnnnnnn` |
| `firmware` | `command` | `FV=1.0.2` |
| `frequency` | `command` | `FC=69` |
| `listening_mode` | `command` | `LM=01` |
| `log_interval` | `command` | `LI=03` |
| `time` | `command` | `UT=1589561768` |
| `api` | `command` | the `HE?` help dump |
| `restart` | `command` | `RR!` |
| `reset` | `command` | `FS!` |
| `upgrade` | `update` | `UF!` |

Two of those pairings look self-contradictory and are correct: `id` says what the sentence
*enables*, `mode` says where it *came from*. `LIVECM` is a listening-mode command that enters command
mode (`id: 'command'`, `mode: 'listening'`); `EX!` is a command-mode action that resumes listening
(`id: 'listening'`, `mode: 'command'`).

Every sentence other than `emitter` and `receiver` carries a **single** payload element: the response.

## Metadata

- **`metadata.mode`** — the API the sentence belongs to.
- **`metadata.timestamp`** — `{ received, parsed }`, always present, stamped by the parser.
- **`payload[i].metadata`** — one field decoded further (`snr` bands, `temperature` in °C, the `LM`
  protocol set, the `LI` label).
- **`metadata.payload`** — values aggregated from several fields (`noise`), **plus a deliberate mirror**
  of the facts that identify the device (`receiver`, `emitter`, `snr`, `temperature`, `time`).

The mirroring is redundant on purpose. The two firmwares differ in field count and order, and a
receiver in the field may be running either, so a consumer needs **one fixed read path** for the key
facts: swap a 1.0.1 unit for a 1.0.2 and nothing downstream changes.

## Things this parser deliberately does not do

**It does not decode the `data` field.** Those 16 bits carry whatever the *emitter's* firmware
encodes — CoreMarine's tags put inclination, or tilt and depth, there — which is not part of the
TB Live protocol. `data` is emitted as an opaque `uint16`, and interpreting it is the consumer's job.

**It does not judge whether a value is plausible.** `FC=99` is emitted as `99` with no error even
though the device listens 63-77 kHz, because only the deployment knows what is valid for a given
receiver. Documented ranges appear in each field's `description`. What *is* reported: undecodable
input, broken framing, interference, and a value that does not fit its declared type.

**It does not claim to know the time.** The device's own clock reads seconds since the Epoch *or*
seconds since power up; the two datasheets disagree about which when the clock is unset, and nothing
on the wire says which firmware is answering. So the numbers are published as data
(`metadata.payload.time`) and **never** as `metadata.timestamp.sentence`, and no ISO date is
produced. `total_milliseconds` is offered because composing it is easy to get wrong.

## Feedback: nothing is dropped silently

Every character either decodes, comes out as a *garbage sentence*, or stays on the buffer as the
still-incomplete tail. The signal is the optional **`errors: string[]`**.

A **garbage sentence** is a valid CMA whose mandatory values are all `'unknown'`, with `payload: []`
— but it keeps `raw` (so the discarded bytes can be inspected), the timestamps, and `errors`.

| Input | Result |
| --- | --- |
| a decodable sentence | CMA, no `errors` |
| a field that fails its declared type | full CMA, that field `null`, `errors` at field and sentence level |
| `data` empty on an ID-only protocol | CMA, `value: null`, **no error** — documented behaviour |
| `$…\r` with an unrecognised field count | `id: 'unknown'`, the CSV kept as generic fields, `Unknown field count: N` |
| another sentence *inside* one | the inner sentence decoded, the wreckage as garbage + `Interrupted by <id>` |
| input matching no known token | garbage + `Unrecognised input` (adjacent junk coalesced) |
| an incomplete sentence | held on `buffer` — never an error, it is still streaming |
| the pending tail exceeds `bufferLimit` | garbage + `Buffer limit exceeded`, buffer reset |
| whitespace between sentences | ignored |

### Interference

The receiver is half duplex and badly behaved: a response can be emitted *inside* a detection or a
log, and it arrives as corrupted bytes rather than a clean insertion. The wrecked sentence's true
extent is therefore unknowable, so this parser **keeps the sentence in the middle and does not try to
recompose the one it wrecked**:

```typescript
parser.parseData('$1000042,1589557202,615,S64K,ack01\r1285,0,24,69,11\r')
// -> garbage  '$1000042,1589557202,615,S64K,'  errors: ['Interrupted by clock_round']
// -> sentence 'ack01\r'                        id: 'clock_round'
// -> garbage  '1285,0,24,69,11\r'              errors: ['Unrecognised input']
```

## Firmware

The two documented firmwares differ in field count and order. The parser starts at `'unknown'` and
learns:

- an explicit `FV=1.0.1` / `FV=1.0.2` response;
- `LIVECM` versus `TBRC`, which is definitive — 1.0.1 enters command mode with the first, 1.0.2 with
  the second;
- a detection or log states its own firmware through its field count.

A sentence that carries no evidence of its own reports the firmware learned so far. Pin it when the
deployment knows better:

```typescript
const parser = new TBLiveParser({ firmware: '1.0.1' })
```

## Upgrading from 1.x

`1.x` emitted a `ParsedSentence`; `2.0.0` emits **CMA**. Every change:

- **`protocol` is new and required** — `{ name: 'TBLive', version: <firmware> }`. The top-level
  **`firmware` key is gone**; it is now `protocol.version`.
- **The top-level `mode` key is gone** — it is now `metadata.mode`.
- **`metadata` is always present** and always contains `timestamp: { received, parsed }`.
- **`metadata.timestamp` changed meaning.** It used to hold the device's own time as
  `{ value, date }`. It is now the parser's own `{ received, parsed }`; the device's time moved to
  `metadata.payload.time`, and no ISO date is produced.
- **Field-name metadata keys are gone.** `metadata.angle` / `metadata.snr` / `metadata.temperature`
  now live under `metadata.payload`.
- **The inclination decode was removed.** `metadata.angle` and the `data` field's metadata no longer
  exist — see "Things this parser deliberately does not do". **Consumers relying on it must implement
  the bit split themselves.**
- **Field renames:** `TB Live serial number` → `receiver_serial_number`, `protocol` →
  `transmit_protocol`, `log intervals` → `log_interval`, and the `LM=` sentence id `protocols` →
  `listening_mode`.
- **Serial numbers are strings.** They used to be coerced with `Number()`, which destroyed the
  device's inconsistent zero-padding (`'001129'` became `1129`). Consumers matching on the last
  digits should use a string comparison.
- **Values can be `null`.** An empty field is `null` — including `data`, which is empty for ID-only
  transmit protocols. **`null` means "no measurement" and must never be read as zero.** `1.x`
  reported `0` there.
- **`NaN` no longer occurs.** A non-numeric value in a numeric field is `null` plus an error.
- **Sentences that used to vanish now arrive.** Unrecognised input, malformed sentences and
  interference-wrecked sentences are all emitted. Check `errors` and `id === 'unknown'`.
- **`bufferLimit` is enforced.** It was previously stored and ignored.
- **The class was renamed `TBLive` → `TBLiveParser`**, and `tbliveFirmwares()` is now the `firmwares`
  getter. The old `schemas` exports are gone.
- **New in 2.0.0:** `getFakeSentence(id, protocol, options?)` and
  `getSentenceDefinition(id, protocol?)`, both returning a `Result`.
- **Node >= 22** (was >= 18).

## License

MIT
