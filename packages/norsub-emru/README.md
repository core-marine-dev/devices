# NorSub eMRU parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/norsub-emru) [![publish](https://github.com/core-marine-dev/devices/actions/workflows/norsub-emru.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/norsub-emru.yml) ![npm](https://img.shields.io/npm/dy/%40coremarine/norsub-emru)

**NorSub eMRU parser** reads the telegrams of [NorSub](https://norsub.com) eMRU / OEM MRU motion-reference
units and emits them in the unified **CMA** output format shared by every CoreMarine device parser.

It is built on [`@coremarine/nmea-parser`](https://www.npmjs.com/package/@coremarine/nmea-parser), so
every standard NMEA 0183 sentence still parses — the eMRU's proprietary sentences and their decoded
**device status** are added on top.

Protocols it knows out of the box: `NORSUB`, `NORSUB2`, `NORSUB6`, `NORSUB7`, `NORSUB7b`, `NORSUB8`,
`GYROCOMPAS1` (`HEHDT`, `PHTRO`, `PHINF`), `NORSUB PRDID`, `RDI ADCP`, `Tokimek PTVG`, `SMCA`, `SMCC`
— plus all of NMEA 0183.

All NorSub-family definitions report `protocol.version: '1.2.0'`, the *NORSUB OEM Series — OEM MRU User
Manual* revision they were transcribed from. Inherited NMEA sentences keep their own `3.1`.

## Install

```bash
npm i @coremarine/norsub-emru
```

Requires **Node ≥ 22**. The library is cross-runtime — no `node:fs`, no `Buffer` — so it also runs on
Deno, Bun and in the browser.

## How to use it

```typescript
import { NorsubParser } from '@coremarine/norsub-emru'

const parser = new NorsubParser()

const sentences = parser.parseData('$PNORSUB8,1234567,890,1.234,…,4160749567*40\r\n')
```

`parseData` returns an array of **CMA** objects. Data can also be fed and drained separately, which is
what you want on a serial/TCP stream where sentences arrive split across chunks:

```typescript
parser.addData(chunk)                  // buffers; incomplete sentences wait for the rest
const sentences = parser.parseData()   // drains everything complete so far
```

### Output — a real parsed `PNORSUB8`

Trimmed to the interesting parts (the full payload is 24 fields):

```jsonc
{
  "raw": "$PNORSUB8,1234567,890,1.234,…,4160749567*40\r\n",
  "timestamp": 1785308158376,
  "id": "PNORSUB8",
  "protocol": { "name": "NORSUB8", "version": "1.2.0" },
  "payload": [
    { "raw": "1234567", "name": "time",  "type": "uint32",  "value": 1234567, "units": "us" },
    { "raw": "890",     "name": "delay", "type": "uint32",  "value": 890,     "units": "us" },
    { "raw": "1.234",   "name": "roll",  "type": "float64", "value": 1.234,   "units": "deg" },
    // … pitch, heading, surge, sway, heave, rates, velocities, accelerations, periods, amplitudes …
    {
      "raw": "4160749567",
      "name": "status",
      "type": "uint32",
      "value": 4160749567,
      // The bitfield decoded — see "Device status" below.
      "metadata": { "status": { "main": { "ok": true, "health": true }, "…": "…" } }
    }
  ],
  "metadata": {
    "checksum": "40",
    "standard": false,
    "talker": { "value": "PNORSUB8", "description": "Vendor specific" },
    // The SAME status, mirrored at payload level — see "Where status lands".
    "payload": { "status": { "main": { "ok": true, "health": true }, "…": "…" } },
    "timestamp": { "received": 1785308158376, "parsed": 1785308158376 }
  }
}
```

`metadata.timestamp` carries **`received`** (when the data reached the parser) and **`parsed`**. There is
deliberately **no `sentence`** timestamp: the eMRU's `time` (T1) and `delay` (T2) fields are a
free-running **internal-clock counter** that wraps, not a wall clock, and no other NorSub sentence carries
a time field. `T1`/`T2` therefore keep their raw microsecond values and get no metadata of their own.

## Device status

The `PNORSUB*` sentences carry a 32-bit health/status bitfield. It is decoded into a nested object:

```typescript
type Status = {
  main: { ok: boolean, health: boolean },
  system: {
    ok: boolean
    health: boolean
    synchronized: { time: boolean, clock: boolean }
    cpu: boolean
  },
  sensor: {
    ok: boolean
    health: boolean
    limits: boolean
    environmental: { vibration: boolean, temperature: boolean }
  },
  algorithms: {
    ok: boolean
    health: boolean
    initialization: { observer: boolean, heading: boolean }
    roll_pitch: { ok: boolean, health: boolean }
    heading: { ok: boolean, health: boolean }
    surge_sway: { ok: boolean, health: boolean }
    heave: { ok: boolean, health: boolean }
  },
  aiding: {
    received: { position: boolean, velocity: boolean, heading: boolean }
    valid: { position: boolean, velocity: boolean, heading: boolean, vertical: boolean, horizontal: boolean }
  }
}
```

### Where status lands

| sentence | `payload[last].metadata.status` | `metadata.payload.status` |
| --- | :---: | :---: |
| `PNORSUB`, `PNORSUB2`, `PNORSUB6`, `PNORSUB7`, `PNORSUB8` — one `uint32` field | ✅ | ✅ |
| `PNORSUB7b` — split across two `uint16` fields | ❌ | ✅ |

A single `uint32` field decodes on its own, so it carries its own decode. `PNORSUB7b` splits the same 32
bits across `status_a` + `status_b`, and **neither half means anything alone** — so there is no
field-level metadata there.

Status is **always** mirrored at payload level, even when one field produced it. That is deliberate: it
describes the whole device rather than one field, so swapping a `PNORSUB7b` unit for a `PNORSUB8` one
costs a consumer nothing — `metadata.payload.status` is the single read path for both.

## `PTVG` decoding

The Tokimek telegram glues the unit letter to the number and scales pitch/roll by 100
(`$PTVG,abbbbP,accccR,ddd.dT*hh`), so those payload fields are **strings** — a numeric type could only
ever decode them to `null`. The real quantities are in the field metadata:

```typescript
parser.parseData('$PTVG,-0036P, 0021R,101.8T*42\r\n')
// payload[0] -> { name: 'pitch',   value: '-0036P', metadata: { degrees: -0.36 } }
// payload[1] -> { name: 'roll',    value: ' 0021R', metadata: { degrees: 0.21  } }
// payload[2] -> { name: 'heading', value: '101.8T', metadata: { degrees: 101.8 } }
```

The sign character is `-` for bow up and a space for bow down.

## API

```typescript
new NorsubParser({ protocol?, memory?, bufferLimit? })
```

| member | type | description |
| --- | --- | --- |
| `addData(data)` | `(string) => void` | Feed data. Buffers whatever does not yet form a complete sentence. |
| `parseData(data?)` | `(string?) => CMA[]` | Feed (optionally) and drain every complete sentence. |
| `buffer` | `string` *(readonly)* | The not-yet-complete input still held. |
| `memory` | `boolean` | Keep incomplete input between calls. Default `true`. |
| `bufferLimit` | `number` | Max characters held in the buffer. |
| `protocol` | `NorsubProtocol` | The protocol the device is emitting. Default `'nmea'`. |
| `protocols` | `NorsubProtocol[]` *(readonly)* | Every protocol that can be selected. |
| `parser` | `NorsubNMEAParser` *(readonly)* | The active protocol parser — see below. |

**Nothing throws.** An invalid assignment is discarded and the current value kept; an invalid `protocol`
in the constructor falls back to the default. A sentence with a bad checksum is still emitted, carrying a
sentence-level error, never silently dropped.

### Protocol selection

An eMRU is configured to emit **one** protocol. Today only NMEA is implemented, but the device also
supports TSS1, Atlas, Ifremer Victor, Simrad EM 3000 and a custom binary format, so `NorsubParser` is a
facade that *composes* its protocol parser rather than being one. Adding a protocol is therefore an
additive change, not a reshape of this class.

Switching `protocol` **discards internal state** — the buffer and any parsed-but-undrained sentences are
dropped, because half a sentence in one protocol can never be completed by another. `memory` and
`bufferLimit` carry over.

### `parser` — the active protocol parser

Protocol-specific extras are reached through `parser` rather than being delegated one by one (the facade's
API would balloon as protocols are added, and most methods would be meaningless for whichever protocol is
active):

```typescript
parser.parser.getFakeSentenceByID('PNORSUB8')   // a valid sample sentence
parser.parser.getSentence('PNORSUB8')           // the stored definition
parser.parser.getSentencesByProtocol()          // definitions grouped by protocol
parser.parser.addSentences(yaml)                // add your own sentences at runtime
```

`addSentences` takes a YAML string and returns a `Result` — see the
[`@coremarine/nmea-parser` README](https://www.npmjs.com/package/@coremarine/nmea-parser) for the schema,
and for how the knowledge base resolves several definitions sharing one id (which is how `PRDID` supports
both the 2-field NorSub telegram and the 3-field RDI ADCP one).

### Also exported

| export | description |
| --- | --- |
| `NorsubNMEAParser` | The NMEA protocol layer, usable — or subclassable — directly. |
| `NORSUB_SENTENCES` | The bundled sentence definitions, generated from `protocols/norsub.yml`. |
| `NORSUB_METADATA_AGGREGATORS` | The status + `PTVG` metadata aggregators. |
| `getStatus` | Decode a status bitfield by hand. |
| `Status`, `StatusInput`, `NorsubProtocol`, `NorsubParserOptions` | Types. |
| `StatusSchema`, `StatusInputSchema` | Runtime validators. |

## Notes

- Sentences must be terminated with `\r\n`; without it the parser (correctly) keeps waiting for the rest.
- A sentence with **no checksum at all** is not treated as NMEA and is discarded. Every NorSub telegram
  carries one.
- The definitions are bundled pre-generated, so the parser never parses YAML at startup and needs no
  filesystem access.

## License

MIT
