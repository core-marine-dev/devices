# NorSub eMRU — Node-RED

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/norsub-emru-nodered)
[![publish](https://github.com/core-marine-dev/devices/actions/workflows/norsub-emru-nodered.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/norsub-emru-nodered.yml)
![npm](https://img.shields.io/npm/dy/%40coremarine/norsub-emru-nodered)

Node-RED node that reads [NorSub](https://norsub.com) eMRU / OEM MRU telegrams — the NorSub
proprietary sentences **and** all of NMEA 0183 — and emits them in the unified **CMA** format.

Wrapper of [@coremarine/norsub-emru](https://www.npmjs.com/package/@coremarine/norsub-emru); see that
package for the output format and the protocol details.

- Node type / palette: **`cma-norsub-parser`**, under the **CoreMarine** category.
- Requires **Node ≥ 22** and **Node-RED ≥ 4**.

## Install

From the Node-RED palette manager, or:

```bash
npm i @coremarine/norsub-emru-nodered
```

An example flow ships with the package — import it from **Menu → Import → Examples → NorSub eMRU**.

## Configuration

| field | description |
| --- | --- |
| **Name** | Optional node label. |
| **Protocol** | Which protocol the eMRU is configured to emit. `NMEA` is the only one implemented today. |
| **Memory** | Keep incomplete input buffered between messages. On by default. |
| **Sentences file path** | Optional YAML file of **your own** extra sentence definitions, loaded at deploy. The NorSub and NMEA 0183 definitions are already built in. |

## Message API

`payload` is the data input; the other five keys are optional request/response channels. **Whatever
key you send comes back on the same key**, and any key you do not send is absent from the output. On
a bad request that key holds an **error string** instead of a result — the node does not throw.

### Input

| key | type | description |
| --- | --- | --- |
| `payload` | string | NorSub / NMEA ASCII data. Must be an *ASCII* string, not another encoding. |
| `memory` | object | Get or set the memory setting. |
| `protocol` | object | Get or set which protocol the device is emitting. |
| `sentences` | object | Get the known sentence definitions, or add your own. |
| `sentence` | string | A sentence id, to read its definition. |
| `fake` | string | A sentence id, to get a valid sample sentence. |

### Output

| key | type | description |
| --- | --- | --- |
| `payload` | array | **CMA[]** — one object per parsed sentence. |
| `memory` | object | `{ memory: boolean, characters: number }` |
| `protocol` | object | `{ protocol: string, protocols: string[] }` |
| `sentences` | object | The known definitions, grouped by protocol. |
| `sentence` | object \| null | The definition, or `null` if the id is unknown. |
| `fake` | string \| null | A sample sentence, or `null` if the id is unknown. |

## Parsing

Feed ASCII into `payload`; the node emits everything it could complete. Incomplete input is buffered
(with **Memory** on), so a sentence split across two messages still parses.

```jsonc
// in
{ "payload": "$PNORSUB8,1234567,890,1.234,…,4160749567*40\r\n" }

// out — payload[0], trimmed
{
  "id": "PNORSUB8",
  "protocol": { "name": "NORSUB8", "version": "1.2.0" },
  "payload": [
    { "raw": "1234567", "name": "time",  "type": "uint32",  "value": 1234567, "units": "us" },
    { "raw": "1.234",   "name": "roll",  "type": "float64", "value": 1.234,   "units": "deg" },
    // …
    { "name": "status", "type": "uint32", "value": 4160749567,
      "metadata": { "status": { "main": { "ok": true, "health": true } } } }
  ],
  "metadata": {
    "checksum": "40",
    "payload": { "status": { "main": { "ok": true, "health": true } } },
    "timestamp": { "received": 1785308158376, "parsed": 1785308158376 }
  }
}
```

### Device status

The `PNORSUB*` sentences carry a 32-bit health/status bitfield, decoded for you into a nested object
(`main`, `system`, `sensor`, `algorithms`, `aiding` — see the library README):

- `payload[i].payload[last].metadata.status` — for the five sentences whose status is a single
  `uint32` field (`PNORSUB`, `PNORSUB2`, `PNORSUB6`, `PNORSUB7`, `PNORSUB8`).
- `payload[i].metadata.payload.status` — for **all six**, including `PNORSUB7b`, whose status is
  split across two `uint16` fields that mean nothing individually.

**Read it from `metadata.payload.status`** and the same path works for every variant, so swapping a
PNORSUB7b unit for a PNORSUB8 one costs you no flow changes.

`PTVG` fields are strings on the wire (the unit letter is glued to the value); the decoded degrees
are in each field's `metadata.degrees`.

## Memory

- **on** — each injection is appended to whatever is still buffered.
- **off** — each injection replaces the buffer.

| Input | Output |
| --- | --- |
| `memory`: `{ command: 'get' }` | `memory`: `{ memory, characters }` |
| `memory`: `{ command: 'set', payload: boolean }` | `memory`: `{ memory, characters }` |

## Protocol

An eMRU is configured to emit **one** protocol, so this selects it rather than combining several.
`nmea` is the only value implemented today; the device also supports TSS1, Atlas, Ifremer Victor,
Simrad EM 3000 and a custom binary format, and each will simply appear in `protocols`.

> ⚠️ **Setting it discards internal state** — the buffer and any parsed-but-unsent sentences are
> dropped, because half a sentence in one protocol can never be completed by another. An unknown
> value is refused with an error string and the current protocol is kept.

| Input | Output |
| --- | --- |
| `protocol`: `{ command: 'get' }` | `protocol`: `{ protocol, protocols }` |
| `protocol`: `{ command: 'set', payload: 'nmea' }` | `protocol`: `{ protocol, protocols }` |

## Sentences

The NorSub and NMEA 0183 definitions are **built in**. This channel is for adding your *own*
sentences on top, at runtime. Send `command: 'set'` with **one** of:

1. `content` — the YAML **string** of the definitions.
2. `file` — a **string** path to a YAML file, read by the node.

`content` wins if both are sent. Bad YAML, a schema mismatch or an unreadable file give an error
string back. `get` lists everything currently known.

| Input | Output |
| --- | --- |
| `sentences`: `{ command: 'get' }` | `sentences`: object |
| `sentences`: `{ command: 'set', content: string }` | `sentences`: object |
| `sentences`: `{ command: 'set', file: string }` | `sentences`: object |

A ready-to-use file ships as [`examples/example-sentences.yml`](examples/example-sentences.yml), and
the example flow shows the before/after of hot-expanding the parser with it.

## Sentence & Fake

| Input | Output |
| --- | --- |
| `sentence`: `'PNORSUB8'` | `sentence`: the definition, or `null` |
| `fake`: `'PNORSUB8'` | `fake`: a valid sample sentence, or `null` |

A fake sentence is structurally correct with a valid checksum; the field values are garbage. Useful
for exercising a flow without a device attached.

## Upgrading from 1.x

The node was rewritten for the CMA output format. Breaking changes:

- **`payload` output is now `CMA[]`**, not the old `NMEASentence[]`.
- **`msg.protocols` is now `msg.sentences`.** It always meant "the sentence definitions", and the
  node now *also* has a `protocol` selection — two keys one letter apart meaning unrelated things
  was a trap, so the definitions channel took the library's own word for them.
- **`sentences.set` no longer accepts a pre-parsed `protocols` object** — pass `content` (a YAML
  string) or `file`.
- **Device status moved.** It was a top-level `metadata.status`; it is now field-level and/or
  payload-level metadata (see [Device status](#device-status)).
- **New `protocol` config field and message channel.**
- Requires **Node ≥ 22** (was ≥ 18).

## Development

```bash
pnpm run norsub-emru:nodered:build       # tsup -> CJS + copy parser.html/icons
pnpm run norsub-emru:nodered:test        # node:test — unit + real headless Node-RED
pnpm run norsub-emru:nodered:dev         # local Node-RED on a scratch flow, no docker
pnpm run norsub-emru:nodered:examples    # local Node-RED editing the SHIPPED example flow
```

`:dev` and `:examples` boot a real Node-RED at <http://localhost:1880> with this node under the
CoreMarine category. In this monorepo the sibling `@coremarine/*-nodered` nodes also appear, which
is harmless and expected — an end user who installs only this package never sees them.

## License

MIT
