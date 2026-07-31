# @coremarine/septentrio-sbf-nodered

[![npm version](https://img.shields.io/npm/v/@coremarine/septentrio-sbf-nodered.svg)](https://www.npmjs.com/package/@coremarine/septentrio-sbf-nodered)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Node-RED node for **Septentrio** GNSS receivers speaking **SBF** (Septentrio Binary Format). It
turns the receiver's binary output into **CMA**, the same JSON shape every CoreMarine device parser
emits.

Wrapper of [@coremarine/septentrio-sbf](https://www.npmjs.com/package/@coremarine/septentrio-sbf).
**All 108 blocks** of the AsteRx SB3 Pro+ firmware 4.10.1 reference guide are decoded.
Node >= 22, Node-RED >= 4.

## Install

From the Node-RED palette manager, or:

```bash
npm install @coremarine/septentrio-sbf-nodered
```

The node appears in the **CoreMarine** palette category as **Septentrio SBF parser**.

## Configuration

| Field | Meaning |
| --- | --- |
| **Name** | Optional node label |
| **Firmware** | `Default, corrected by the receiver` (default) or `4.10.1` |
| **Memory** | On by default — append each input to the buffer instead of replacing it |

The firmware selects which knowledge base describes each block. You rarely need to pin it:
`ReceiverSetup` (5902) reports the receiver's real version and the parser adopts it, so the device
is normally the authority on itself. A version this build does not model is **reported, never
substituted**.

**Leave memory on for a live stream.** SBF framing is length-prefixed rather than terminated, so a
block only decodes once its *last* byte has arrived — with memory off, any block split across two
messages is lost.

## msg API

Send `payload` to parse. Every other key is optional; **a key you do not send is absent from the
output too**, and on a bad request the corresponding output key holds an error **string**.

| Key | In | Out |
| --- | --- | --- |
| `payload` | SBF bytes — a **Buffer**, a base64 string, or a byte array | `CMA[]` |
| `memory` | `{ command: 'get' }` / `{ command: 'set', payload: boolean }` | `{ memory, bytes }` |
| `protocol` | `{ command: 'get' }` / `{ command: 'set', payload: 'sbf' }` | `{ protocol, protocols }` |
| `firmware` | `{ command: 'get' }` / `{ command: 'set', payload: '4.10.1' }` | `{ firmware, firmwares, reported?, leapSeconds? }` |
| `ids` | any truthy value | `string[]` — all 108 block numbers |
| `definition` | `4007` or `{ id, protocol? }` | `SBFSentenceDefinition[]`, one per revision |
| `fake` | `5938` or `{ id, protocol?, options? }` | a real wire frame, as a **Buffer** |

Full details, tables and warnings are in the node's **help panel** inside Node-RED.

### Binary input

SBF is binary, so `payload` is normally a **Buffer** — that is what the serial, TCP and file nodes
give you, and it needs no conversion.

A **base64 string** is also accepted, and that is deliberate rather than generous: every `raw` in
the CMA output is base64, so it is this package's own vocabulary for bytes. It closes the diagnostic
loop — copy a `raw` out of a debug node, inject it back, and you are re-parsing the exact frame that
misbehaved. Base64 is validated strictly, so an ASCII string is rejected with a message rather than
silently parsed as garbage. An array of byte numbers works too, for a JSON-only path.

### Three conventions worth knowing

**`id` is the block NUMBER** — `'5938'`, not `'AttEuler'`. The human name is in `metadata.name`. The
number is what the wire carries and what Septentrio's own documentation indexes by.

**Values are the datasheet's, unscaled.** A field documented in units of `0.01 m` keeps
`value: 812` with `units: '0.01 m'`, and the engineering value is in that field's `metadata` as
`{ value: 8.12, units: 'm' }`. Angles in radians or semi-circles work the same way. Bitfields and
enums keep their integer `value`, with the decode in `metadata`.

**The timestamp is the receiver's clock.** `payload[i].timestamp` is the block's own GNSS time, not
this machine's — a GNSS receiver is disciplined to atomic time. Leap seconds are learned from the
device itself (`ReceiverTime.DeltaLS`). The navigation-message blocks are the exception: they are
stamped with when the *satellite transmitted* the bits, which can be far in the past, so those keep
the parse time. `metadata.timestamp` always has `received` and `parsed`.

### Diagnostics

`ids` and `definition` let a flow ask the running node what it expects — field names, types, units,
Do-Not-Use values and descriptions, **one entry per revision**, because a receiver generation only
sends the fields its revision defines.

That matters because these receivers sit on remote installations with restricted internet access for
years: asking the deployed node settles a question that would otherwise need the datasheets.

Seven blocks are `opaque` — the five `Meas3*` and the two `PVTSupport*` — because Septentrio
publishes no field layout for them at all. Their bodies are emitted as bytes rather than invented
into fields.

### Fake frames

`fake` builds a real wire frame from the same field table the parser reads, with a real CRC and a
real `Length`, so wiring it back into `payload` round-trips. It is **deterministic** — the same
request returns the same bytes forever, which is what makes it committable into a flow:

```javascript
msg.fake = 5938
// -> a 44-byte Buffer: a valid AttEuler frame

msg.fake = { id: 4007, options: { revision: 2, fields: { NrSV: 12 } } }
// -> a 96-byte PVTGeodetic revision 2, with NrSV forced to 12
```

## Two things a flow must handle

**A field value can be `null`** — the receiver marked it Do-Not-Use. Its `metadata` then says
`{ doNotUse: true, value: <the sentinel> }`. **`null` means "not available" and must never be read
as zero**: a Do-Not-Use course-over-ground is not a heading of north, and a receiver in
heading-and-pitch attitude mode has no roll solution at all.

**Sentences can carry `errors`.** Nothing the parser receives is dropped silently:

- A **bad CRC or a truncated body** still decodes every field it can, plus `errors` saying what is
  wrong. Flagged data beats none.
- Bytes that cannot start a block come back as a **garbage sentence** — `id` and `protocol` are
  `'unknown'`, `payload` is empty, and `raw` keeps the discarded bytes. Adjacent junk is coalesced
  into one report, so a noisy line does not flood the flow.
- A block number this build does **not** know still produces a sentence, with `payload: []`,
  `metadata.name: 'unknown'`, the body in `metadata.body` — and **no `errors`**, because nothing is
  wrong. That is what keeps a newer firmware's blocks from vanishing.

Check `errors` and `id === 'unknown'` before trusting a reading.

## Examples

Import `examples/septentrio-sbf-examples.json` from the Node-RED menu → Import → Examples, or open
it directly:

```bash
pnpm run septentrio-sbf:nodered:examples
```

Eight groups, **every frame a real one from a Septentrio receiver**: decoded blocks (AttEuler,
PVTGeodetic, ReceiverTime), the Do-Not-Use case, failed and garbage input (a corrupted CRC, line
noise), memory with a frame split in two, firmware and protocol channels, diagnostics, and fake
frames. It uses **only built-in node types**, so it imports cleanly with no extra contrib nodes.

Every inject was verified by booting a real Node-RED against the flow file and firing it — fire
*ReceiverTime* and then *firmware: get* to watch `leapSeconds` appear, learned from the device.

## Development

```bash
pnpm run septentrio-sbf:nodered:build    # tsup -> CJS + copy html/icons
pnpm run septentrio-sbf:nodered:test     # node:test — unit + real headless node-red
pnpm run septentrio-sbf:nodered:dev      # local Node-RED on a scratch flow
```

## Upgrading from 1.x

The output is now **CMA** rather than `SBFResponse`, and the msg API is entirely different. The node
type is **unchanged** (`cma-septentrio-parser`), so existing flows keep their node — but the
messages in and out of it must be rewritten.

1.x drove the node with a single `msg.command` string. There is now **one msg key per channel**, so
a message can reconfigure and feed data at once:

| 1.x | 2.0.0 |
| --- | --- |
| `command: 'addData'` + a `payload` buffer, then `command: 'getData'` | just send `payload` — the parsed `CMA[]` comes back on `payload` |
| `command: 'getFirmware'` / `'setFirmware'` | `firmware: { command, payload? }` |
| `command: 'getMemory'` / `'setMemory'` | `memory: { command, payload? }` |
| — | `protocol`, `ids`, `definition` and `fake` are new |
| `SBFResponse` with `frame.header` / `frame.time` / `frame.body` | **CMA**: `payload` is the SBF body, header and time stamp in `metadata` |
| `name` / `number` / `version` | `metadata.name` / `id` / `metadata.revision` |
| a bad CRC, a wrong length or an unknown block was **dropped silently** | every one of them is reported — see above |
| values were raw integers | `value` + `units` are the datasheet's, with the converted value in `metadata` |
| the sentence date was **wrong by years** (SBF sends milliseconds; the old code passed them to a seconds API, on the GPS scale rather than UTC) | `timestamp` is the receiver's own UTC, checked against its own `ReceiverTime` block |
| **Node >= 18**, Node-RED >= 3 | **Node >= 22**, Node-RED >= 4 |

Six real bugs in the 1.x library were fixed on the way, including the timestamp above and
`AttEuler`'s three rate fields being reported on the wrong axes. The library's
[README](https://www.npmjs.com/package/@coremarine/septentrio-sbf) lists them.

## License

MIT
