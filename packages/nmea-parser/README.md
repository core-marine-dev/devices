# NMEA parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/nmea-parser) [![publish](https://github.com/core-marine-dev/devices/actions/workflows/nmea-parser.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/nmea-parser.yml) ![npm](https://img.shields.io/npm/dy/%40coremarine/nmea-parser)

**NMEA Parser** is a library to parse NMEA 0183 sentences.

> [NMEA](https://en.wikipedia.org/wiki/NMEA_0183) 0183, or just NMEA, is a standard ASCII text protocol typically used for GNSS (GPS) devices and naval tools.

This library parses **ALL** NMEA-like sentences — an ASCII string starting with `$`, fields separated by `,`, an `*` splitting data from a two-hex-digit checksum, ending with `\r\n`.

**Real devices break those rules, so breaking them is reported, never silently ignored.** A sentence that violates the standard is still decoded and comes back with an `errors` list saying what is wrong (a one-character checksum, a missing `\r\n`, …), and input that cannot be decoded at all comes back as a *garbage sentence* rather than disappearing — see [Failed and garbage sentences](#failed-and-garbage-sentences).

If the parser knows the sentence it emits richer, typed metadata. Built-in known sentences are `AAM`, `GGA`, `HDT`, `ZDA` (NMEA 3.1) plus the proprietary Kongsberg Seatex `PSXN20`/`PSXN23` — feed the parser more with [`addSentences`](#feed-the-parser-add-known-sentences).

> The parser output is the unified **CMA** format shared by every CoreMarine device parser — see [`docs/CMA.md`](../../docs/CMA.md).

## Install

```bash
npm i @coremarine/nmea-parser
```

Ships ESM + CJS + types. Runs on node, deno, bun and the web (no `node:fs`/`Buffer` in the parse path; input is a `string`). Requires Node `>=22`.

## How to use it

```typescript
import { NMEAParser } from '@coremarine/nmea-parser'

// memory defaults to true; both options are optional
const parser = new NMEAParser()
// const parser = new NMEAParser({ memory: false, bufferLimit: 1024 })
```

### Parse NMEA data

Feed an ASCII string and drain the parsed sentences as `CMA[]`:

```typescript
import type { CMA } from '@coremarine/nmea-parser'

// one-shot: parse whatever you pass in
const input = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n'
const output: CMA[] = parser.parseData(input)

// streaming: add chunks, then drain
parser.addData(chunk1)
parser.addData(chunk2)
const drained: CMA[] = parser.parseData()   // returns + clears the queued sentences
```

- `addData(input: string): void` — parse immediately and queue the results.
- `parseData(input?: string): CMA[]` — optionally add `input`, then return **and clear** the queue.

### Output — the CMA shape

```typescript
interface CMA {
  raw: string              // whole ASCII sentence
  timestamp: number        // decode time, epoch ms (=== metadata.timestamp.parsed)
  id: string               // sentence id, talker stripped (e.g. 'GGA')
  protocol: { name: string, version: string }
  payload: Array<{
    raw: string
    name: string           // 'unknown' for unknown sentences/fields
    type: 'char' | 'string' | 'boolean'
        | 'int8' | 'int16' | 'int32' | 'int64'
        | 'uint8' | 'uint16' | 'uint32' | 'uint64'
        | 'float32' | 'float64'
    value: string | number | boolean | null   // null = present-but-empty; int64/uint64 as decimal strings
    units?: string
    description?: string
    errors?: string[]
    metadata?: Record<string, unknown>         // free-form field metadata (e.g. decoded timestamp, label)
  }>
  metadata: {              // ALWAYS present
    timestamp: {
      received: number     // when addData was called
      parsed: number       // decode time (=== cma.timestamp)
      sentence?: number    // the sentence's own time if it carries one (e.g. GGA UTC)
    }
    checksum: string       // NMEA: always
    standard: boolean      // NMEA: from the matched definition
    talker?: { value: string, description: string }
    payload?: Record<string, unknown>          // aggregated across fields (e.g. lat/long in decimal degrees)
    [key: string]: unknown
  }
  errors?: string[]
  description?: string
}
```

For an **unknown** sentence: `protocol` is `{ name: 'NMEA', version: 'unknown' }`, `metadata.standard` is `false`, and every field is `{ raw, name: 'unknown', type: 'string', value: <raw> }`. A bad checksum is **emitted with a sentence-level error, never dropped**.

<details>
  <summary>Example — parsed <code>GGA</code> (trimmed)</summary>

```json
{
  "raw": "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n",
  "timestamp": 1784888779942,
  "id": "GGA",
  "protocol": { "name": "NMEA", "version": "3.1" },
  "payload": [
    { "raw": "123519", "name": "utc_position", "type": "string", "value": "123519", "units": "ms", "metadata": { "timestamp": 1784896519000 } },
    { "raw": "1", "name": "gps_quality", "type": "int8", "value": 1, "metadata": { "label": "GPS fix" } },
    { "raw": "08", "name": "satellites", "type": "uint8", "value": 8 }
  ],
  "metadata": {
    "checksum": "47",
    "standard": true,
    "talker": { "value": "GP", "description": "Global Positioning System receiver" },
    "payload": { "latitude": 48.1173, "longitude": 11.516666666666667 },
    "timestamp": { "received": 1784888788388, "parsed": 1784888788388, "sentence": 1784896519000 }
  },
  "description": "Global Positioning System Fix Data"
}
```

</details>

### Memory and internal buffer

`memory` (default **on**) lets the parser hold a half-received sentence between `addData` calls, so a sentence split across chunks is still parsed once its tail arrives. `bufferLimit` caps how many characters that carried-over remainder may hold.

```typescript
const memory = parser.memory
const limit = parser.bufferLimit
parser.memory = false          // invalid assignments are ignored, never thrown
parser.bufferLimit = limit + 10
```

## Failed and garbage sentences

**Nothing you feed the parser is dropped silently.** Every character either decodes into a sentence, comes back as a *garbage sentence*, or stays on the buffer as a still-incomplete tail. Devices that "follow the standard when they feel like it" are the norm, and a silently empty output array hides the problem — while logging it repeats the same message forever.

**A problem is signalled by the optional `errors: string[]`.** That is the only check you need:

```typescript
for (const cma of parser.parseData(input)) {
  if (cma.errors === undefined) { /* clean */ }
  else if (cma.id === 'unknown') { /* undecodable — inspect cma.raw */ }
  else { /* usable, but flag it: cma.errors says what is wrong */ }
}
```

A **failed sentence is a normal CMA** — decoded as far as it can be (id, fields, types, units, protocol, metadata) — plus `errors`. A framing or checksum problem never stops the decode, because the data is usually still good:

```typescript
// A device that emits a one-character checksum (a dropped leading zero)
parser.parseData('$PSXN,23,0.231,0.174,309.56,0.000*3\r\n')
// -> id 'PSXN23', every field decoded, and:
//    errors: ['Invalid checksum format: expected 2 hexadecimal characters, received "3"']
//    The checksum VALUE still matches, so there is no corruption error — the data is intact.
```

A **garbage sentence** is a valid CMA whose mandatory values are all `'unknown'`, with `payload: []`. What it carries is `raw` (the discarded input), the timestamps, and `errors`:

```typescript
parser.parseData('\x00\x01binary protocol data\x02')
// -> [{ raw: '\x00\x01binary protocol data\x02', id: 'unknown', payload: [],
//       protocol: { name: 'unknown', version: 'unknown' },
//       errors: ['Unparseable input: not an NMEA sentence'], … }]
```

| input | result |
| --- | --- |
| valid sentence | CMA, no `errors` |
| wrong checksum (2 hex chars) | full CMA + `Invalid checksum: computed X, received Y` |
| checksum not 2 hex chars | full CMA + a **format** error, plus a mismatch error only if it also does not match |
| terminated by a lone `\n` | full CMA + `Invalid end flag` |
| no terminator, another `$` follows | full CMA + `Missing end flag` (the following `$` proves it will never be completed) |
| no `,` at all | CMA with `payload: []` + `Missing field separator` |
| `$…` with **no `*`** | **garbage** — the sentence length is unknowable, so no field list is invented |
| text outside any `$…` chunk | **garbage** (adjacent junk is coalesced into one, so a noisy line is one report, not a flood) |
| blank space between sentences | **ignored** — normal on a serial line |
| unterminated trailing `$…` | **pending** on the buffer — never an error, it may still be completed |
| pending chunk exceeds `bufferLimit` | **garbage** + `Buffer limit exceeded`, buffer reset |

## Feed the parser (add known sentences)

Expand the parser with more NMEA-like sentences — standard or proprietary. The single input is a **YAML string**:

```typescript
import type { Result, NMEAError } from '@coremarine/nmea-parser'

// node: read the file yourself       // web: const yaml = await file.text()
import { readFileSync } from 'node:fs'
const yaml = readFileSync('./my-protocols.yml', 'utf8')

const result: Result<void, NMEAError> = parser.addSentences(yaml)
if (!result.success) {
  // never throws — errors come back as a Result
  console.error(result.error.kind, result.error.message)  // 'invalid-yaml' | 'invalid-schema'
}
```

> The old `addProtocols({ file | content | protocols })` API is **removed**. There is now one input — a YAML string — which keeps the library cross-runtime (the caller owns any file reading).

### YAML format

```yaml
protocols:
  - protocol: NMEA          # protocol name
    version: '3.1'          # semantic version
    standard: true          # standard (true) or proprietary (false)
    sentences:
      - id: AAM
        description: Waypoint Arrival Alarm   # optional
        payload:
          - name: status
            type: string
            units: nautic miles               # optional
            description: A = entered, V = not passed   # optional
          - name: arrival_circle_radius
            type: float64
```

Field `type` is one of the CMA types (`char`, `string`, `boolean`, `int8`…`int64`, `uint8`…`uint64`, `float32`, `float64`). Multiple definitions may share an `id` across versions (different field counts); on parse, the newest matching definition (by field count, then version) is applied.

## API

| Member | Signature | Description |
| --- | --- | --- |
| `parseData` | `(input?: string) => CMA[]` | Optionally add `input`, then return and clear the queued sentences. |
| `addData` | `(input: string) => void` | Parse immediately and queue the results. |
| `addSentences` | `(yaml: string) => Result<void, NMEAError>` | Feed more known sentences from a YAML string. Never throws. |
| `getSentences` | `() => StoredSentence[]` | All known sentence definitions. |
| `getSentencesByProtocol` | `() => Record<string, StoredSentence[]>` | Known definitions grouped by protocol name. |
| `getSentenceDefinition` | `(id: string) => Result<Sentence[], NMEAError>` | Every stored definition for an id (talker-aware) — an ARRAY, one entry per NMEA version. |
| `getFakeSentence` | `(id: string) => Result<string, NMEAError>` | A valid NMEA-like sentence with garbage fields. Built from the newest definition of the id. |
| `memory` | `boolean` (get/set) | Carry a half-received sentence between calls. |
| `bufferLimit` | `number` (get/set) | Max characters held in the carried-over remainder. |

```typescript
// known sentences
const known = parser.getSentencesByProtocol()
const gga = parser.getSentenceDefinition('GGA')   // Result<Sentence[], NMEAError>

// fake sentence (testing)
const fake = parser.getFakeSentence('AAM')       // Result<string, NMEAError>
```

## Extending: device parsers built on NMEA

A device that speaks NMEA plus its own proprietary sentences (e.g.
[`@coremarine/norsub-emru`](https://github.com/core-marine-dev/devices/tree/main/packages/norsub-emru))
subclasses `NMEAParser` and uses three `protected` extension points, so it never has to override the
parse pipeline:

| Member | Signature | Description |
| --- | --- | --- |
| `registerProtocols` | `(content: ProtocolsFileContent) => void` | Register already-parsed definitions — for a bundled, generated built-in, the same way this class loads the NMEA standard (no YAML round-trip, no file access). |
| `registerAggregators` | `(aggregators: MetadataAggregators) => void` | Add field/payload metadata decoders for your sentences. Later registrations win on a duplicate key. |
| `registerResolvers` | `(resolvers: SentenceResolvers) => void` | Disambiguate sentences that share an id — see [Sentence resolvers](#sentence-resolvers-one-id-several-sentences). |

Aggregators are keyed **`${id}:${payloadLength}`** — the stable identity of a definition, since field
names are unofficial — and read fields **by index**:

```typescript
import { NMEAParser, ProtocolsFileContentSchema } from '@coremarine/nmea-parser'
import type { MetadataAggregators, ProtocolsFileContent } from '@coremarine/nmea-parser'

import { PROTOCOLS } from './my-generated-protocols'   // generated from YAML at build time

class MyDeviceParser extends NMEAParser {
  constructor() {
    super()
    const builtin = ProtocolsFileContentSchema.safeParse(PROTOCOLS)
    if (builtin.success) this.registerProtocols(builtin.value as ProtocolsFileContent)
    this.registerAggregators({
      // $PDEV,<value>,<status>*CS — decode the status word
      'PDEV:2': (sentence) => {
        const status = sentence.payload[1].value
        if (typeof status !== 'number') return {}
        const decoded = { ok: (status & 1) !== 0 }
        return {
          fields: { 1: { status: decoded } },   // -> payload[1].metadata.status
          payload: { status: decoded },         // -> metadata.payload.status
        }
      },
    })
  }
}
```

An aggregator returns `fields` (index → metadata, merged into `payload[index].metadata`) and/or
`payload` (flat metadata, merged into `metadata.payload`). Sentences with no registered aggregator
pass through untouched.

### Sentence resolvers: one id, several sentences

Some proprietary formats carry the real sentence type **in a field** instead of in the id. The built-in
case is Kongsberg Seatex: the MGC COMPASS sends **both** of these as `$PSXN` with the **same field
count**, and only the first field says which is which —

```
$PSXN,20,x,x,x,x*hh              -> PSXN20   quality indicators
$PSXN,23,x.x,x.x,x.x,x.x*hh      -> PSXN23   attitude + heave
```

Definitions are keyed by **id + field count**, so these two cannot be told apart by YAML alone. A
**resolver** runs *before* the knowledge-base lookup and returns the id to look the sentence up under
(or `null` to keep it), which lets the variants be ordinary YAML definitions:

```typescript
import type { SentenceResolvers } from '@coremarine/nmea-parser'

const MESSAGE_IDS: Record<string, string> = { 20: 'PSXN20', 23: 'PSXN23' }

this.registerResolvers({
  // keyed `${id}:${payloadLength}` on the id AS RECEIVED
  'PSXN:5': (sentence) => MESSAGE_IDS[sentence.payload[0].raw.trim()] ?? null,
})
```

Read the discriminator from `raw`, not `value`: at that point the sentence is still generic, so every
field is an unparsed string. **`raw` is never rewritten** — the sentence keeps exactly what the device
sent, so its checksum still verifies; only `id` changes. An unrecognised discriminator keeps the
original id rather than inventing a definition, and resolution is independent of the checksum (a
corrupted sentence is more useful flagged as `PSXN23` than as an unknown one).

### The shared parser contract

Every CoreMarine device parser exposes the same API. Type against `DeviceParser<string>` rather than a
concrete class, so a parser that *composes* protocol parsers (a device supporting several protocols,
one active at a time) is interchangeable with one that extends `NMEAParser`:

```typescript
import type { DeviceParser } from '@coremarine/nmea-parser'

const parse = (parser: DeviceParser<string>, chunk: string) => parser.parseData(chunk)
```

## Notes

`bufferLimit` defaults to `1024` characters — far more than the NMEA max sentence length (82 characters, flags included) — so a single incomplete sentence always fits. Changing it is not recommended unless you understand the NMEA framing well.

## Upgrading from 4.x

Two methods were renamed and both now return a `Result` instead of `null`, because `null` could not
say *why* a lookup failed — a malformed id and an unknown id are different mistakes.

| 4.x | 5.0.0 |
| --- | --- |
| `getSentence(id): Sentence \| null` | `getSentenceDefinition(id): Result<Sentence[], NMEAError>` |
| `getFakeSentenceByID(id): string \| null` | `getFakeSentence(id): Result<string, NMEAError>` |

```typescript
// 4.x
const gga = parser.getSentence('GGA')
if (gga !== null) { /* ... */ }

// 5.0.0
const result = parser.getSentenceDefinition('GGA')
if (result.success) { /* result.value is Sentence[] */ } else { /* result.error.kind + .message */ }
```

`getSentenceDefinition` also returns **every** version of an id rather than only the newest. The
knowledge base has always held one definition per version, but the old method silently discarded all
but the latest, so an earlier revision could not be inspected at all.

`NMEAError.kind` gained `'invalid-id'` and `'unknown-id'` alongside the existing
`'invalid-yaml'` / `'invalid-schema'`.

**Renaming rationale:** `getSentence` read like "give me a sentence" when it returns a *definition* —
one word away from `getFakeSentence`, which does give you a sentence. The same names and shapes are
now used by `norsub-emru` and `thelmabiotel-tblive`.

