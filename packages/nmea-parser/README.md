# NMEA parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/nmea-parser) [![publish](https://github.com/core-marine-dev/devices/actions/workflows/nmea-parser.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/nmea-parser.yml) ![npm](https://img.shields.io/npm/dy/%40coremarine/nmea-parser)

**NMEA Parser** is a library to parse NMEA 0183 sentences.

> [NMEA](https://en.wikipedia.org/wiki/NMEA_0183) 0183, or just NMEA, is a standard ASCII text protocol typically used for GNSS (GPS) devices and naval tools.

This library parses **ALL** NMEA-like sentences — an ASCII string starting with `$`, fields separated by `,`, an `*` splitting data from a two-hex-digit checksum, ending with `\r\n`.

**Real devices break those rules, so breaking them is reported, never silently ignored.** A sentence that violates the standard is still decoded and comes back with an `errors` list saying what is wrong (a one-character checksum, a missing `\r\n`, …), and input that cannot be decoded at all comes back as a *garbage sentence* rather than disappearing — see [Failed and garbage sentences](#failed-and-garbage-sentences).

If the parser knows the sentence it emits richer, typed metadata — see [Built-in sentences](#built-in-sentences) for the 26 it ships with, and feed it more with [`addSentences`](#feed-the-parser-add-known-sentences).

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
  "protocol": { "name": "NMEA", "version": "4.11" },
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

## Built-in sentences

Shipped in the knowledge base, no setup needed. Anything not listed here still parses — generically,
with `name: 'unknown'` fields — and you can add definitions for it with
[`addSentences`](#feed-the-parser-add-known-sentences).

| protocol | version | sentences |
| --- | --- | --- |
| NMEA 0183 standard | `4.11` | `AAM` `DTM` `GBS` `GGA` `GLL` `GNS` `GRS` `GSA` `GST` `GSV` `HDT` `MWV` `RMC` `ROT` `THS` `TXT` `VTG` `ZDA` |
| NMEA 0183 standard | `4.00` | `GBS` `GNS` `GRS` `GSA` `GSV` `RMC` |
| NMEA 0183 standard | `2.20` | `GLL` `RMC` |
| Miros SM-050 Wave and Current Radar | `1` | `PMIRWM` `PMIRCV` `PMIRLD` |
| Kongsberg Seatex | `15` | `PSXN20` `PSXN23` |
| Trimble | `1` | `PTNLAVR` `PTNLGGK` |
| Leica | `1` | `LLQ` |

**What `version` means here.** It is the **newest published NMEA 0183 revision whose table for that
sentence matches exactly those fields**. A sentence that never changed reads `4.11`; a superseded form
carries the last revision where it *was* current. Every value is a real revision — there has never been
an NMEA 0183 "3.1", which is what these definitions claimed before `6.0.0`.

**Why some ids appear more than once.** A definition is matched by **exact field count**, and several
standard sentences gained fields between NMEA versions — `RMC` exists with 11, 12 and 13 fields, `GLL`
with 6 and 7, `GNS` with 12 and 13, `GBS` with 8 and 10, `GRS` with 14 and 16, `GSA` with 17 and 18,
`GSV` with 19 and 20. Each length is its own definition, so the `protocol.version` in the output tells
you **which generation of the standard your device speaks**: a 13-field `RMC` is an NMEA 4.10+ device, an
11-field one predates 2.30. `getSentenceDefinition('RMC')` returns all three.

The two deltas behind the table: **2.30** added the FAA mode indicator as a new last field to `GLL`,
`RMC` and `VTG`; **4.10** extended the GNSS suite for Galileo — System ID on `GSA`, Signal ID on `GSV`,
both on `GBS` and `GRS`, and navigational status on `RMC` and `GNS`. `4.11` replaces `4.10` and is
backward-compatible to `2.00`.

```typescript
parser.parseData('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W,A,V*7D\r\n')
// -> id 'RMC', protocol { name: 'NMEA', version: '4.11' }, 13 named fields
```

A few field types are deliberate and worth knowing:

- **`latitude`/`longitude` are strings**, not numbers — the wire form is `ddmm.mmmm` (degrees *and*
  minutes concatenated), so parsing it as a float silently produces a wrong coordinate.
- **Dates are strings.** `RMC.date` is `ddmmyy`; `PTNLGGK.utc_date` is `mmddyy` — **month first**. A
  numeric type would hide that difference.
- **`PTNLGGK.ellipsoidal_height` is a string**, because Trimble puts an `EHT` prefix in the value
  itself (`EHT150.790`).
- **`GNS.mode_indicator` is one character per constellation** (`DAA` = 3 constellations), so its length
  is data, not noise.
- **A null field stays `null`**, never `0` — "no correction received" and "correction of zero" are not
  the same thing.

**Versions marked `1`** (Trimble, Leica) are *this knowledge base's* revision, not the vendor's: neither
publishes a protocol version for those sentences, and the CMA format requires a version string.

## Feed the parser (add known sentences)

Expand the parser with more NMEA-like sentences — standard or proprietary. The single input is a **YAML string**:

```typescript
import type { Result, NMEAError } from '@coremarine/nmea-parser'

// node: read the file yourself       // web: const yaml = await file.text()
import { readFileSync } from 'node:fs'
const yaml = readFileSync('./my-protocols.yml', 'utf8')

const result: Result<void, NMEAError[]> = parser.addSentences(yaml)
if (!result.success) {
  // never throws — errors come back as a Result, and the error side is an ARRAY:
  // one call can be wrong for more than one reason.
  for (const error of result.error) {
    console.error(error.kind, error.message)  // 'invalid-yaml' | 'invalid-schema'
  }
}
```

> The old `addProtocols({ file | content | protocols })` API is **removed**. There is now one input — a YAML string — which keeps the library cross-runtime (the caller owns any file reading).

### YAML format

```yaml
protocols:
  - protocol: NMEA          # protocol name
    version: '4.11'         # protocol revision
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
| `addSentences` | `(yaml: string) => Result<void, NMEAError[]>` | Feed more known sentences from a YAML string. Never throws. |
| `getSentences` | `() => StoredSentence[]` | All known sentence definitions. |
| `getSentencesByProtocol` | `() => Record<string, StoredSentence[]>` | Known definitions grouped by protocol name. |
| `getSentenceDefinition` | `(id: string, protocol?: string) => Result<Sentence[], NMEAError[]>` | Every stored definition for an id (talker-aware) — an ARRAY, one entry per NMEA revision. `protocol` narrows it, by protocol NAME or by version. |
| `getFakeSentence` | `(id: string, protocol?: string, options?: FakeSentenceOptions) => Result<NMEALike, NMEAError[]>` | A valid NMEA-like sentence with garbage fields. Built from the newest definition of the id, or from the one `protocol` names. Idempotent unless `{ random: true }`. |
| `memory` | `boolean` (get/set) | Carry a half-received sentence between calls. |
| `bufferLimit` | `number` (get/set) | Max characters held in the carried-over remainder. |

```typescript
// known sentences
const known = parser.getSentencesByProtocol()
const gga = parser.getSentenceDefinition('GGA')   // Result<Sentence[], NMEAError[]>

// fake sentence (testing)
const fake = parser.getFakeSentence('AAM')       // Result<NMEALike, NMEAError[]>
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

Some proprietary formats carry the real sentence type **in a field** instead of in the id. There are two
built-in cases, and both send variants with the **same field count**, so only the first field says which
is which:

```
$PSXN,20,x,x,x,x*hh              -> PSXN20    Kongsberg Seatex, quality indicators
$PSXN,23,x.x,x.x,x.x,x.x*hh      -> PSXN23    Kongsberg Seatex, attitude + heave
$PTNL,AVR,...                    -> PTNLAVR   Trimble, yaw/tilt from the baseline vector
$PTNL,GGK,...                    -> PTNLGGK   Trimble, fix with an ellipsoidal height
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

## Upgrading from 5.x

Three breaking changes. All of them **compile and run** at the call site, which is exactly why the
major exists: nothing tells you they happened except the version.

### 1. Every `Result` error side is an ARRAY

One call can be wrong for more than one reason, so `error` is now `NMEAError[]`.

```typescript
// 5.x
if (!result.success) console.error(result.error.message)

// 6.0.0 — the 5.x line above now prints `undefined`
if (!result.success) console.error(result.error.map((e) => e.message).join('; '))
```

This affects `addSentences`, `getSentenceDefinition` and `getFakeSentence`.

### 2. `getFakeSentence` is idempotent

It used to call `Math.random()` once per field, so the same id gave a different sentence every call and
the output could not be committed as a fixture. It is now deterministic. Pass `{ random: true }` for the
old behaviour:

```typescript
parser.getFakeSentence('GGA')                   // the same string every time
parser.getFakeSentence('GGA', undefined, { random: true })  // varied, as 5.x always was
```

### 3. `protocol` selects WHICH definition of an id is used

`getSentenceDefinition(id, protocol?)` and `getFakeSentence(id, protocol?)` take a protocol name or
version as their second argument. Omitting it still returns every definition of that id. Asking for one
the id does not have returns the new error kind `'unknown-protocol'`, which lists what it *is* defined
by.

### Also new, not breaking

`sentenceIds` — the ids the knowledge base holds, completing the shared introspection contract that
`norsub-emru`, `septentrio-sbf`, `sbg-ecom` and `thelmabiotel-tblive` also implement.

## Upgrading from 4.x

Two methods were renamed and both now return a `Result` instead of `null`, because `null` could not
say *why* a lookup failed — a malformed id and an unknown id are different mistakes.

| 4.x | 5.0.0 |
| --- | --- |
| `getSentence(id): Sentence \| null` | `getSentenceDefinition(id): Result<Sentence[], NMEAError[]>` |
| `getFakeSentenceByID(id): string \| null` | `getFakeSentence(id): Result<NMEALike, NMEAError[]>` |

```typescript
// 4.x
const gga = parser.getSentence('GGA')
if (gga !== null) { /* ... */ }

// 5.0.0
const result = parser.getSentenceDefinition('GGA')
if (result.success) { /* result.value is Sentence[] */ } else { /* result.error is NMEAError[] */ }
```

`getSentenceDefinition` also returns **every** version of an id rather than only the newest. The
knowledge base has always held one definition per version, but the old method silently discarded all
but the latest, so an earlier revision could not be inspected at all.

`NMEAError.kind` gained `'invalid-id'` and `'unknown-id'` alongside the existing
`'invalid-yaml'` / `'invalid-schema'`.

**Renaming rationale:** `getSentence` read like "give me a sentence" when it returns a *definition* —
one word away from `getFakeSentence`, which does give you a sentence. The same names and shapes are
now used by `norsub-emru` and `thelmabiotel-tblive`.

