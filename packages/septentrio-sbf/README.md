# Septentrio SBF parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/septentrio-sbf) [![publish](https://github.com/core-marine-dev/devices/actions/workflows/septentrio-sbf.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/septentrio-sbf.yml) ![npm](https://img.shields.io/npm/dy/%40coremarine/septentrio-sbf)

**Septentrio SBF Parser** is a library to parse SBF data from Septentrio GNSS receivers.

> SBF (Septentrio Binary Format) is Septentrio's own binary protocol, used by its GNSS receivers. Unlike NMEA it is **binary and length-prefixed**: every block starts with the sync bytes `0x24 0x40` (`$@`), then a CRC, a block ID, a total length, and a GPS time stamp — see §4.1 of any Septentrio reference guide.

**All 108 blocks of the AsteRx SB3 Pro+ firmware 4.10.1 reference guide are decoded** — every block in all 16 categories of its Appendix B, each transcribed from the datasheet table with its units, Do-Not-Use values and field descriptions. See [Blocks](#blocks).

**Nothing you feed the parser is dropped silently.** A bad CRC, a truncated body, a block number this build does not know, or bytes that are not SBF at all — each comes back as a sentence saying so, never as an empty array. See [Failed, unmodelled and garbage blocks](#failed-unmodelled-and-garbage-blocks).

> The parser output is the unified **CMA** format shared by every CoreMarine device parser — see [`docs/CMA.md`](../../docs/CMA.md).

## Install

```bash
npm i @coremarine/septentrio-sbf
```

Ships ESM + CJS + types. Runs on node, deno, bun and the web: there are no `node:*` imports and no `Buffer` in the parse path — input is a `Uint8Array` and every `raw` is Base64. Requires Node `>=22`.

## How to use it

```typescript
import { SeptentrioParser } from '@coremarine/septentrio-sbf'

// every option is optional
const parser = new SeptentrioParser()
// const parser = new SeptentrioParser({ memory: true, bufferLimit: 65535, firmware: '4.10.1' })
```

### Parse SBF data

Feed bytes and drain the parsed blocks as `CMA[]`:

```typescript
import type { CMA } from '@coremarine/septentrio-sbf'

// one-shot
const output: CMA[] = parser.parseData(bytes)

// streaming: add chunks, then drain
parser.addData(chunk1)
parser.addData(chunk2)
const drained: CMA[] = parser.parseData()   // returns + clears the queued blocks
```

- `addData(data: Uint8Array): void` — parse immediately and queue the results.
- `parseData(data?: Uint8Array): CMA[]` — optionally add `data`, then return **and clear** the queue.

A block split across two chunks is held on the internal buffer and parsed once its tail arrives; a
lone trailing `0x24` is treated as a possible half-received sync, not as junk.

### Output — the CMA shape

```typescript
interface CMA {
  raw: string              // the whole block, BASE64 (it is binary)
  timestamp: number        // epoch ms — the RECEIVER's own GNSS time when it has one (see Timestamps)
  id: string               // the SBF block NUMBER as a string, e.g. '5938'
  protocol: { name: 'SBF', version: string }        // version = the firmware knowledge base in use
  payload: Field[]         // the SBF BODY only, one entry per datasheet row, in datasheet order
  metadata: {
    name: string           // the block NAME, e.g. 'AttEuler' ('unknown' if not modelled)
    revision: number       // from ID bits 13-15; it is not in the body, so it lives here
    crc: Field             // header + time-stamp values, each Field-shaped ({ raw, name, type, value })
    length: Field
    tow: Field             // GPS time-of-week, in its own datasheet units (0.001 s)
    wnc: Field             // continuous GPS week count
    timestamp: { received: number, parsed: number, sentence?: number }
    payload?: Record<string, unknown>   // values aggregated from >= 2 fields (e.g. a position triple)
    subBlocks?: Field[][]  // sub-block fields grouped by occurrence, positionally
    padding?: { raw: string, bytes: number }         // §4.1.5: value undefined, never decoded
    body?: { raw: string, bytes: number }            // an opaque or unmodelled body
    revisionDecoded?: number                         // set when the frame's revision is newer than ours
    [key: string]: unknown
  }
  errors?: string[]        // present ONLY when something is wrong
  description?: string
}

interface Field {
  raw: string              // this field's own bytes, Base64
  name: string             // the datasheet's own field name
  type: 'char' | 'string' | 'int8' | 'int16' | 'int32'
      | 'uint8' | 'uint16' | 'uint32' | 'float32' | 'float64'
  value: string | number | null                      // null = Do-Not-Use, or unreadable
  units?: string           // the DATASHEET's unit, unscaled ('0.01 m', 'semi-circles', 'rad')
  description?: string
  errors?: string[]
  metadata?: Record<string, unknown>                 // decoded bitfields, enum labels, converted values
}
```

Three conventions are worth knowing before you read a payload:

1. **`id` is the block number, the name is in `metadata.name`.** `'5938'`, not `'AttEuler'` — the
   number is what the wire carries and what Septentrio's own documentation indexes by.
2. **`value` and `units` are the datasheet's, unscaled.** A field documented as `0.01 m` keeps
   `value: 812, units: '0.01 m'`, and the engineering value goes to `metadata` as
   `{ value: 8.12, units: 'm' }`. The datasheet stays the single source of truth, and nothing has to
   guess what scale a consumer wanted. Angles in radians or semi-circles work the same way — the
   converted degrees are in `metadata`.
3. **A bitfield, mask or enum keeps its integer `value`;** the decoded meaning is in that field's
   `metadata`. CMA has no bitfield type and none is invented.

<details>
  <summary>Example — a real <code>AttEuler</code> (5938) frame, trimmed</summary>

```json
{
  "raw": "JEC0kzIXLADQkPEW2AgHAAEAAADPsS5DPVAQwfkCldDvlEa++QKV0AxBoD4=",
  "timestamp": 1685616912000,
  "id": "5938",
  "protocol": { "name": "SBF", "version": "4.10.1" },
  "payload": [
    { "raw": "Bw==", "name": "NrSV", "type": "uint8", "value": 7 },
    { "raw": "AA==", "name": "Error", "type": "uint8", "value": 0,
      "metadata": { "mainAux1Baseline": "NO_ERROR", "mainAux2Baseline": "NO_ERROR", "attitudeNotRequested": false } },
    { "raw": "AQA=", "name": "Mode", "type": "uint16", "value": 1,
      "metadata": { "label": "HEADING_PITCH_FLOAT" } },
    { "raw": "z7EuQw==", "name": "Heading", "type": "float32", "value": 174.69456481933594, "units": "deg" },
    { "raw": "PVAQwQ==", "name": "Pitch", "type": "float32", "value": -9.0195894241333, "units": "deg" },
    { "raw": "+QKV0A==", "name": "Roll", "type": "float32", "value": null, "units": "deg",
      "metadata": { "doNotUse": true, "value": -20000000000 } },
    { "raw": "75RGvg==", "name": "PitchDot", "type": "float32", "value": -0.19392751157283783, "units": "deg/s" },
    { "raw": "DEGgPg==", "name": "HeadingDot", "type": "float32", "value": 0.3129962682723999, "units": "deg/s" }
  ],
  "metadata": {
    "name": "AttEuler",
    "revision": 0,
    "crc":    { "raw": "tJM=",     "name": "CRC",    "type": "uint16", "value": 37812 },
    "length": { "raw": "LAA=",     "name": "Length", "type": "uint16", "value": 44, "units": "bytes" },
    "tow":    { "raw": "0JDxFg==", "name": "TOW",    "type": "uint32", "value": 384930000, "units": "0.001 s" },
    "wnc":    { "raw": "2Ag=",     "name": "WNc",    "type": "uint16", "value": 2264, "units": "week" },
    "payload": { "attitude": { "heading": 174.69456481933594, "pitch": -9.0195894241333, "roll": null, "units": "deg" } },
    "timestamp": { "received": 1785510182944, "parsed": 1785510182945, "sentence": 1685616912000 }
  },
  "description": "GNSS attitude expressed as Euler angles at the time given by TOW and WNc, in the receiver time frame"
}
```

This receiver is in attitude mode 1 — heading and pitch only — so `Roll` and `RollDot` are at their
Do-Not-Use value and read `null`, with `metadata.doNotUse` saying **why** they are null and which
sentinel matched. A `null` that means "not available" is never confused with a measured zero.

</details>

### Timestamps — the receiver's clock wins

`metadata.timestamp` means what it does for every CoreMarine parser: `received` when `addData` was
called, `parsed` when the block was decoded, and `sentence` the block's own time. SBF then does one
thing the text parsers do not:

**`cma.timestamp` is the block's own GNSS time, not the host clock.** Every SBF block carries TOW +
WNc, and a GNSS receiver's clock is disciplined to atomic time — so for blocks stamped by the
receiver it is strictly better than the machine that happened to read the serial port. Leap seconds
come from the device itself (`ReceiverTime.DeltaLS`) when that block is in the output, falling back to
a built-in table otherwise.

Two exceptions, both deliberate:

- **Signal-in-space blocks are not promoted.** The raw navigation pages (§4.2.2) and decoded
  navigation messages (§4.2.3-4.2.8) are stamped with when the *satellite transmitted the bits*, which
  can be far in the past. Promoting that would move a sentence's time backwards. Their
  `metadata.timestamp.sentence` is still filled in; `cma.timestamp` stays the parse time.
- **A block whose TOW/WNc are Do-Not-Use** — normal for a few seconds after start-up — has no
  `sentence` time at all, so `cma.timestamp` is the parse time.

```typescript
const [block] = parser.parseData(bytes)
block.timestamp                        // 1687513492000 -> 2023-06-23T09:44:52.000Z, from the receiver
block.metadata.timestamp.parsed        // when this process decoded it
parser.parser.leapSeconds              // 18, learned from the device (undefined until ReceiverTime arrives)
```

## Failed, unmodelled and garbage blocks

Every byte you feed in either decodes, comes back reported, or stays on the buffer as an incomplete
tail. **A problem is signalled by the optional `errors: string[]`** — that is the only check you need:

```typescript
for (const block of parser.parseData(bytes)) {
  if (block.id === 'unknown') { /* not SBF at all — inspect block.raw */ }
  else if (block.errors !== undefined) { /* decoded, but flag it: errors says what is wrong */ }
  else if (block.payload.length === 0 && block.metadata.name === 'unknown') { /* known frame, unmodelled block */ }
  else { /* clean */ }
}
```

There are four tiers:

| tier | what it is | shape |
| --- | --- | --- |
| **decoded** | CRC valid, block modelled | full `payload`, no `errors` |
| **identified** | CRC valid, block number **not** in this firmware's knowledge base | real `id`, real timestamp, body at `metadata.body`, `payload: []`, `metadata.name: 'unknown'`, and **no `errors`** |
| **failed** | CRC mismatch, or a body shorter than its own definition | decoded as far as possible **plus** `errors` |
| **garbage** | bytes that cannot begin a block | `id: 'unknown'`, `payload: []`, the junk in `raw`, `errors` |

**"Identified but not modelled" is not an error**, and it is what makes this library forward-safe: a
receiver on a newer firmware that emits a block this build has never heard of still produces a
sentence with the right number, the right time and the bytes in `raw`, rather than vanishing. Today
every block of 4.10.1 is modelled, so you will only see this tier from a newer firmware.

```typescript
// a valid frame carrying block number 4999, which 4.10.1 does not define
parser.parseData(frame)
// -> [{ id: '4999', payload: [], metadata: { name: 'unknown', body: { raw: '…', bytes: 30 }, … } }]
//    no errors: nothing is wrong, we simply have no table for it
```

**A CRC failure never stops the decode** — the payload is usually still readable, and a flagged block
is more useful than a dropped one:

```typescript
// an AttEuler frame with its CRC deliberately corrupted
const [block] = parser.parseData(corrupted)
block.errors        // ['Invalid CRC: computed 55888, received 4660']
block.payload       // all 10 fields, decoded anyway
block.metadata.name // 'AttEuler' — still identified
```

Garbage is **coalesced**, so a noisy line produces one report rather than a flood:

```typescript
parser.parseData(new Uint8Array([1, 2, 3, 0xff, 0xfe]))
// -> [{ raw: 'AQID//4=', id: 'unknown', payload: [],
//       protocol: { name: 'unknown', version: 'unknown' },
//       errors: ['Unparseable data: 5 byte(s) before a valid block'], … }]
```

| input | result |
| --- | --- |
| valid block, modelled | CMA, no `errors` |
| valid block, unknown number | CMA, `payload: []`, `metadata.name: 'unknown'`, **no** `errors` |
| CRC mismatch | full CMA + `Invalid CRC: computed X, received Y` |
| body shorter than its table | fields up to the cut + `Body truncated: field X needs bytes a-b of n` |
| revision newer than we model | decoded at our **highest known** revision + `metadata.revisionDecoded` |
| `Length` not a multiple of 4, or out of range | not treated as a block — becomes garbage |
| bytes before a valid block | **garbage**, coalesced into one report |
| incomplete trailing block | **pending** on the buffer — never an error, it may still complete |
| pending bytes exceed `bufferLimit` | **garbage** + `Buffer limit exceeded`, buffer reset |

That last row matters more for a binary protocol than a text one: `0x24 0x40` occurs inside block
bodies all the time, so a wrong device on the line can open a "block" that never completes. The limit
turns that into a visible report instead of a buffer that grows forever.

## Blocks

All **108** blocks of the AsteRx SB3 Pro+ firmware 4.10.1 reference guide (Appendix B), in the 16
categories of its §4.2:

| §4.2 category | blocks | |
| --- | --- | --- |
| 1 Measurement | 8 | `MeasEpoch` `MeasExtra` `Meas3Ranges`\* `Meas3CN0HiRes`\* `Meas3Doppler`\* `Meas3PP`\* `Meas3MP`\* `EndOfMeas` |
| 2 Navigation Page | 15 | the raw broadcast bits: `GPSRawCA` `GPSRawL2C` `GPSRawL5` `GLORawCA` `GALRawFNAV` `GALRawINAV` `GEORawL1` `GEORawL5` `BDSRaw` `BDSRawB1C` `BDSRawB2a` `QZSRawL1CA` `QZSRawL2C` `QZSRawL5` `NAVICRaw` |
| 3 GPS Decoded | 4 | `GPSNav` `GPSAlm` `GPSIon` `GPSUtc` |
| 4 GLONASS Decoded | 3 | `GLONav` `GLOAlm` `GLOTime` |
| 5 Galileo Decoded | 6 | `GALNav` `GALAlm` `GALIon` `GALUtc` `GALGstGps` `GALSARRLM` |
| 6 BeiDou Decoded | 4 | `BDSNav` `BDSAlm` `BDSIon` `BDSUtc` |
| 7 QZSS Decoded | 2 | `QZSNav` `QZSAlm` |
| 8 SBAS L1 Decoded | 14 | `GEOMT00` `GEOPRNMask` `GEOFastCorr` `GEOIntegrity` `GEOFastCorrDegr` `GEONav` `GEODegrFactors` `GEONetworkTime` `GEOAlm` `GEOIGPMask` `GEOLongTermCorr` `GEOIonoDelay` `GEOServiceLevel` `GEOClockEphCovMatrix` |
| 9 GNSS Position, Velocity, Time | 15 | `PVTCartesian` `PVTGeodetic` `PosCovCartesian` `PosCovGeodetic` `VelCovCartesian` `VelCovGeodetic` `DOP` `PosCart` `PosLocal` `PosProjected` `BaseVectorCart` `BaseVectorGeod` `PVTSupport`\* `PVTSupportA`\* `EndOfPVT` |
| 10 GNSS Attitude | 4 | `AttEuler` `AttCovEuler` `AuxAntPositions` `EndOfAtt` |
| 11 Receiver Time | 2 | `ReceiverTime` `xPPSOffset` |
| 12 External Event | 5 | `ExtEvent` `ExtEventPVTCartesian` `ExtEventPVTGeodetic` `ExtEventBaseVectGeod` `ExtEventAttEuler` |
| 13 Differential Correction | 3 | `DiffCorrIn` `BaseStation` `RTCMDatum` |
| 14 L-Band Demodulator | 2 | `LBandTrackerStatus` `LBandBeams` |
| 15 Status | 14 | `ChannelStatus` `ReceiverStatus` `SatVisibility` `InputLink` `OutputLink` `NTRIPClientStatus` `NTRIPServerStatus` `IPStatus` `DynDNSStatus` `QualityInd` `DiskStatus` `RFStatus` `P2PPStatus` `CosmosStatus` |
| 16 Miscellaneous | 7 | `ReceiverSetup` `RxMessage` `Commands` `Comment` `BBSamples` `ASCIIIn` `EncapsulatedOutput` |

**\* the seven `opaque` blocks.** Septentrio publishes **no field layout** for these — the reference
guide says so in as many words for each Meas3 block ("The detailed definition of this block is not
available in this document") and for the two PVTSupport blocks ("internal parameters for maintenance
and support"). Rather than invent fields, their bodies are published as bytes at `metadata.body`, with
the whole frame in `raw`. Nothing is lost: the bytes are all there for whoever does have the
definition. If you need the Meas3 observables, either log `MeasEpoch` + `MeasExtra` instead — the same
measurements, larger frames, fully decoded here — or run Septentrio's own RxTools decoder over `raw`.

`parser.sentenceIds` is the list at runtime, and
[`getSentenceDefinition`](#introspection-ask-the-parser-what-it-knows) will tell you what any of them
contains.

### Sub-blocks

Many blocks repeat a nested record N times (`AuxAntPositions` per antenna, `ChannelStatus` per
channel, `MeasEpoch` per satellite and per signal). Those fields are **flattened into `payload` in wire
order**, so every mandatory value stays in the mandatory place and every field keeps an honest `type`
— and mirrored positionally at **`metadata.subBlocks: Field[][]`**, so a consumer can read occurrence
*i* without doing offset arithmetic:

```typescript
const [status] = parser.parseData(channelStatusFrame)
status.payload.length                         // every field, flattened
;(status.metadata.subBlocks as unknown[])     // one entry per occurrence
```

Because the payload length varies with N, **definitions are keyed by block number + revision, never by
payload length.**

## Introspection: ask the parser what it knows

These parsers run on remote installations for years, so the deployed binary can answer questions that
would otherwise need the datasheets.

```typescript
import type { Result, SBFSentenceDefinition, SBFError } from '@coremarine/septentrio-sbf'

const ids: string[] = parser.sentenceIds        // ['4027', '4000', …] — all 108

const result: Result<SBFSentenceDefinition[], SBFError[]> = parser.getSentenceDefinition(5938)
if (result.success) {
  // ONE ENTRY PER REVISION, oldest first — a receiver generation only sends the
  // fields its revision defines, so seeing them side by side is the point
  for (const revision of result.value) {
    revision.revision   // 0, 1, 2, …
    revision.timestamp  // 'receiver' | 'external' | 'sis'
    revision.payload    // field definitions: name, type, units, doNotUse, reserved, description
  }
}
```

`getSentenceDefinition(5938)` returns one entry, of which the first three payload rows are:

```json
{
  "id": "5938",
  "name": "AttEuler",
  "protocol": { "name": "SBF", "version": "4.10.1" },
  "revision": 0,
  "timestamp": "receiver",
  "payload": [
    { "name": "NrSV", "type": "uint8", "doNotUse": 255,
      "description": "The average over all antennas of the number of satellites currently included in the attitude calculations" },
    { "name": "Error", "type": "uint8",
      "description": "Bit field: bits 0-1 Main-Aux1 baseline error code, bits 2-3 Main-Aux2, bit 7 set when GNSS-based attitude was not requested" },
    { "name": "Heading", "type": "float32", "units": "deg", "doNotUse": -20000000000, "description": "Heading" }
  ]
}
```

A sub-block row nests instead, carrying its `count` (the field holding N, or a literal size) and its
own `fields`.

### Fake blocks, for tests and example flows

`getFakeSentence` builds a real wire frame from the same field table the parser reads — with a real
CRC and a real `Length`, so `parseData(getFakeSentence(id))` round-trips.

**It is idempotent**: the same call returns the same bytes forever, because a fake frame is meant to be
committed into a spec, an example flow or a bug report. Pass `{ random: true }` for varied (but still
seeded, still reproducible) filler.

```typescript
const fake = parser.getFakeSentence(5938)
if (fake.success) {
  const [block] = parser.parseData(fake.value)   // a clean AttEuler CMA
}

// pick a revision, set the time, override individual fields BY NAME
parser.getFakeSentence(4007, undefined, { revision: 2, tow: 384930000, wnc: 2264, fields: { Mode: 4, NrSV: 12 } })
parser.getFakeSentence(4013, undefined, { random: true })
```

### Errors are a Result, never a throw

Every fallible call returns `Result<T, SBFError[]>`. **The error side is an array** because one call
can be wrong for more than one reason, and each keeps its own `kind`:

```typescript
parser.getSentenceDefinition(1234)
// { success: false, error: [{ kind: 'unknown-block', message: 'Block 1234 is not modelled for firmware 4.10.1' }] }

parser.getFakeSentence(5938, '9.9.9')
// { success: false, error: [{ kind: 'unknown-firmware', message: 'Firmware "9.9.9" is not supported; supported: 4.10.1' }] }
```

`SBFError['kind']` is `'unknown-block' | 'unknown-firmware' | 'unknown-protocol' | 'unknown-revision'`.

**Nothing in this library throws.** Setters ignore invalid values rather than raising: an unsupported
`firmware` keeps the current one, an unknown `protocol` keeps the active one.

## The device facade

`SeptentrioParser` is the **device** parser; `SBFParser` is the **protocol** parser. They are separate
because a Septentrio receiver can be configured to emit SBF, NMEA or RTCM on the same port, so the
device is not the same thing as the protocol. The facade *composes* a protocol parser rather than being
one:

```typescript
parser.protocol        // 'sbf' — the active protocol
parser.protocols       // ['sbf', 'nmea'] — everything this device can speak
parser.parser          // the active protocol parser, for anything protocol-specific
```

Everything protocol-specific lives on `.parser`, exposed as one getter rather than delegated method by
method, so adding a protocol does not change this class's surface. Narrow it with `instanceof`:

```typescript
import { SBFParser } from '@coremarine/septentrio-sbf'

if (parser.parser instanceof SBFParser) {
  parser.parser.firmware            // '4.10.1' — the knowledge base in use
  parser.parser.reportedFirmware    // what the RECEIVER says it runs (see below)
  parser.parser.leapSeconds         // the GPS-UTC offset learned from the device
}
```

The facade's `getSentenceDefinition` returns the **shared** `SentenceDefinition` shape, because it
fronts more than one protocol. SBF's extra keys (`name`, `revision`, `timestamp`, `opaque`) come from
`.parser` for the same reason everything else protocol-specific does.

Switching protocol **discards the buffer and any undrained sentences** — the bytes were being read
under different framing rules, so keeping them would be worse than dropping them.

### NMEA — the second protocol

A Septentrio box can be configured to emit NMEA 0183 instead of SBF. Select it and feed the same
**bytes**; the conversion is internal, so both protocols look identical from the outside:

```typescript
const parser = new SeptentrioParser({ protocol: 'nmea' })
parser.parseData(chunk)   // -> CMA[], same shape as SBF
```

You get every sentence `@coremarine/nmea-parser` knows (`GGA`, `RMC`, `GNS`, `GSA`, `GST`, `GSV`, `HDT`,
`VTG`, `ZDA`, `GBS`, `GRS`, `GLL`, `ROT`, `TXT`, …) plus the **six proprietary `$PSSN` sentences** from
Appendix C.1 of the reference guide:

| id | sentence | what it carries |
| --- | --- | --- |
| `PSSNHRP` | Heading, Roll, Pitch | attitude with a standard deviation per axis |
| `PSSNRBD` | Rover-Base Direction | azimuth/elevation of the base from the rover |
| `PSSNRBP` | Rover-Base Position | baseline as north/east/up |
| `PSSNRBV` | Rover-Base Velocity | rate of change of that baseline |
| `PSSNTFM` | Coordinate Transformation | which RTCM transformation messages were used |
| `PSSNSNC` | NTRIP Client Status | per-connection status — see below |

All six arrive as `$PSSN,<SUBTYPE>,…`, with the subtype in the FIRST FIELD rather than the id, so the id
is resolved to `PSSN<SUBTYPE>` before decoding. `submessage_id` stays in the payload because it is a
real wire field.

Two traps worth knowing:

- **`PSSNHRP` modes 1, 2 and 5 carry NO roll.** The field arrives empty and stays `null` — never `0`,
  which would read as "perfectly level" instead of "not measured".
- **`PSSNTFM`'s values ARE RTCM message numbers** (`1021`, `1023`, `1025`, …), and `null` means *none of
  that group was used*, not zero.

The NMEA parser itself is reachable through `.parser` for its own extras — `addSentences(yaml)` to teach
it your own sentences, `getSentencesByProtocol()`, and so on.

#### `PSSNSNC` — the one sentence whose payload is nested

`SNC` does not look like NMEA. Its payload is a bracket group holding three scalars followed by **one
sub-group per NTRIP connection**, so the number of comma-separated fields changes from message to
message:

```
$PSSN,SNC,[0,379359000,1840,[1,2,0,0]]*68
```

Since a field list of varying length cannot be described as a fixed definition, this sentence is decoded
in code and shaped deliberately: **the payload is always TWO fields**, whatever the connection count.

```jsonc
{
  "id": "PSSNSNC",
  "payload": [
    { "raw": "SNC", "name": "submessage_id", "type": "string", "value": "SNC" },
    {
      "raw": "[0,379359000,1840,[1,2,0,0]]",
      "name": "ntrip_client_status",
      "type": "string",
      "value": "[0,379359000,1840,[1,2,0,0]]",
      "metadata": {
        "fields": [
          { "raw": "0", "name": "message_revision", "type": "uint8", "value": 0 },
          { "raw": "379359000", "name": "time_of_week", "type": "uint32", "value": 379359000, "units": "ms" },
          { "raw": "1840", "name": "week_number", "type": "uint16", "value": 1840 }
        ],
        "submessages": [
          [
            { "raw": "1", "name": "cd_index", "type": "uint8", "value": 1 },
            { "raw": "2", "name": "status", "type": "uint8", "value": 2 },
            { "raw": "0", "name": "error_code", "type": "uint8", "value": 0 },
            { "raw": "0", "name": "info", "type": "uint8", "value": 0 }
          ]
        ]
      }
    }
  ]
}
```

**So read `metadata`, not `value`, for this sentence.** `payload[1].value` is the bracket text exactly as
it arrived — kept byte-faithful so the checksum still verifies against it — while the decoded, typed
values live in `metadata.fields` (the outer scalars) and `metadata.submessages` (one `Field[]` per NTRIP
connection, so `submessages[i]` is connection *i*). That is the same shape SBF uses for repeated groups
in `metadata.subBlocks`.

Two limitations, stated plainly:

- **The reference guide never says whether consecutive sub-groups are comma-separated.** The decoder
  parses bracket depth rather than the comma split, so `],[` and `][` give identical results and the
  question does not arise — but it means the behaviour is inferred, not documented.
- **An unbalanced group is refused, not guessed.** A truncated `SNC` stays a generic `PSSN` sentence with
  its fields unnamed. Nothing is dropped: `raw` and every field are still emitted.

The same data is also available on the SBF side as the `NTRIPClientStatus` block (4053), fully modelled,
if you would rather not deal with the nesting at all.

If you only ever speak SBF, `SBFParser` is a `DeviceParser<Uint8Array>` too and can be used directly.
Type against the interface rather than a concrete class:

```typescript
import type { DeviceParser } from '@coremarine/septentrio-sbf'

const parse = (parser: DeviceParser<Uint8Array>, chunk: Uint8Array) => parser.parseData(chunk)
```

### The firmware is learned from the device

`firmware` selects which knowledge base decodes the blocks. You can set it, but you rarely should:
**`ReceiverSetup` (5902) reports the receiver's real firmware**, and the parser adopts it when it
arrives.

A firmware this build does **not** model is never silently substituted. The knowledge base stays where
it is (inventing one would be worse), the reported version is exposed as `reportedFirmware`, and that
block gets an error saying what happened:

```
Receiver reports firmware "4.99.9", which this build does not model; decoding with 4.10.1
```

The same block also identifies the box, at `metadata.payload.receiver`:

```json
{ "name": "GRB0053", "product": "AsteRx SB3 Pro+", "serialNumber": "3238137",
  "firmware": "4.10.1", "gnssFirmware": "6.10.3-ga4180cb379", "antenna": "Unknown", "marker": "SEPT" }
```

## API

| Member | Signature | Description |
| --- | --- | --- |
| `parseData` | `(data?: Uint8Array) => CMA[]` | Optionally add `data`, then return and clear the queued blocks. |
| `addData` | `(data: Uint8Array) => void` | Parse immediately and queue the results. |
| `sentenceIds` | `string[]` | Every block number this parser can decode, describe or fabricate. |
| `getSentenceDefinition` | `(id: number \| string, firmware?: string) => Result<SentenceDefinition[], ParserError[]>` | What a sentence contains — for SBF, one entry **per revision**. Ask `.parser` for SBF's richer shape. |
| `getFakeSentence` | `(id: number \| string, firmware?: string, options?: FakeOptions) => Result<Uint8Array, ParserError[]>` | A real wire frame with a real CRC. Idempotent unless `{ random: true }`. `options` is SBF-only. |
| `protocol` | `'sbf' \| 'nmea'` (get/set) | The active protocol. Switching discards the buffer. |
| `protocols` | `readonly ['sbf', 'nmea']` | Every protocol this device can speak. |
| `parser` | `SBFParser \| SeptentrioNMEAParser` | The active protocol parser. Narrow with `instanceof` for SBF's `leapSeconds` / `reportedFirmware`. |
| `firmware` | `string` (get/set) | The knowledge base in use. An unsupported value is ignored. |
| `memory` | `boolean` (get/set) | Carry a half-received block between calls. |
| `bufferLimit` | `number` (get/set) | Max pending bytes before the buffer is reset with a garbage report. |
| `buffer` | `Uint8Array` | The pending bytes, read only. |

The second argument of `getSentenceDefinition` / `getFakeSentence` is the **firmware**, because that is
what selects the knowledge base — block 4007 is described by whichever firmware's table you ask for.
Omitted, it is the one the parser is set to. An unsupported firmware is refused rather than answered
from the wrong table.

### Also exported

| Export | Description |
| --- | --- |
| `SeptentrioParser`, `SBFParser`, `SeptentrioNMEAParser` | the device facade and the two protocol parsers |
| `firmwares()`, `isFirmware(x)`, `blocksFor(fw)` | the supported firmwares and their block registries |
| `decodeBody`, `createFakeFrame` | the table-driven engine and frame writer, for building on |
| `toBase64`, `fromBase64` | cross-runtime Base64 over `Uint8Array` — every `raw` is Base64 |
| `DEFAULT_FIRMWARE`, `PROTOCOL_NAME`, `SEPTENTRIO_PROTOCOLS` | the constants |
| types | `CMA`, `Field`, `Result`, `DeviceParser`, `Metadata`, `Timestamp`, `Value`, `Type`, `SentenceDefinition`, `ParserError`, `BlockDefinition`, `FieldDefinition`, `SBFError`, `SBFSentenceDefinition`, `FakeOptions`, `TimestampKind`, … |

## Notes

`bufferLimit` defaults to `65535` bytes — the largest a single SBF block can be, since `Length` is a
`uint16` — so one incomplete block always fits.

**Do not lower it below the largest block your receiver emits.** SBF framing is length-prefixed, not
terminated, so a block only decodes once its *last* byte has arrived; anything still pending when the
limit is passed is flushed as garbage. Real blocks get big — `Commands` runs past 1000 bytes and
`ChannelStatus` past 900 on a receiver tracking a full sky — and a limit under that destroys perfectly
good blocks whenever they arrive in small enough chunks, which is exactly what a serial port does.

Blocks are **described, not hand-decoded**: each block file declares its body as a table of field
definitions in datasheet order, and one shared engine derives every byte offset, `raw` slice,
little-endian read, Do-Not-Use check and padding boundary from it. Three consumers read the same table
— the parser, `getFakeSentence` and `getSentenceDefinition` — so they cannot disagree. That is a
deliberate choice: hand-written offset chains are what produced the field-rotation and padding bugs in
1.x.

## Upgrading from 1.x

**2.0.0 is a rewrite.** The output format, the constructor and the parse methods all changed, and 1.x
code will not run against it.

| 1.x | 2.0.0 |
| --- | --- |
| `new SBFParser(firmware, memory)` — positional | `new SeptentrioParser({ firmware, memory, bufferLimit })` — object arg |
| `availableFirmwares()` | `firmwares()` |
| `addData(data: Buffer)` | `addData(data: Uint8Array)` |
| `getFrames(): SBFResponse[]` | `parseData(data?): CMA[]` |
| `SBFResponse { name, number, version, frame: { header, time, body }, buffer }` | `CMA` — see [Output](#output--the-cma-shape) |
| throws on a bad firmware / non-`Buffer` input | never throws; `Result` or an ignored setter |
| CRC-failed, wrong-length and unknown blocks **dropped silently** | all four tiers reported — see [Failed, unmodelled and garbage blocks](#failed-unmodelled-and-garbage-blocks) |
| `Buffer` throughout | `Uint8Array` + `DataView`; every `raw` is Base64 |
| 11 blocks | **all 108** |

```typescript
// 1.x
const parser = new SBFParser('4.10.1', true)
parser.addData(Buffer.from(bytes))
const frames = parser.getFrames()
const heading = frames[0].frame.body.heading

// 2.0.0
const parser = new SeptentrioParser({ firmware: '4.10.1' })
const blocks = parser.parseData(bytes)
const heading = blocks[0].payload.find((f) => f.name === 'Heading')?.value
// or, aggregated: blocks[0].metadata.payload.attitude.heading
```

Six real bugs in the 1.x parser were found and fixed on the way, each now pinned by a spec against a
real frame:

- **The sentence timestamp was wrong by years.** SBF's TOW is in *milliseconds*; it was passed to an
  API documenting *seconds*, and on the GPS scale rather than UTC. `cma.timestamp` now equals the
  receiver's own reported UTC, block for block.
- **`AttEuler`'s three rate fields were rotated.** The datasheet order is `PitchDot`, `RollDot`,
  `HeadingDot`; 1.x laid them out heading-first, so a working dual-antenna install reported every rate
  on the wrong axis — including a roll *rate* on a frame with no roll solution.
- **More than 6 padding bytes threw** an uncaught `RangeError` out of `addData`.
- **A newer revision silently decoded as revision 0**, dropping every field the later revision added.
  It now decodes at the highest known revision and says so via `metadata.revisionDecoded`.
- **`PVTGeodetic` revision 2 never populated `padding`.**
- **`DOP` ignored its documented Do-Not-Use of 0** (reporting "no DOP available" as a real DOP of 0),
  and `xPPSOffset` overwrote `syncAge` with 0, inventing data the receiver had provided.

`engines.node` is now `>=22`, and the `gpstime` dependency is gone — GPS-epoch and leap-second logic
is internal, and works in the browser. Two runtime dependencies: `crc`, imported by its
`crc/calculators/crc16xmodem` subpath so no `Buffer` polyfill is pulled in, and
`@coremarine/nmea-parser`, which the `nmea` protocol composes. Neither is bundled; both stay external.
