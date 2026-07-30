# @coremarine/thelmabiotel-tblive-nodered

[![npm version](https://img.shields.io/npm/v/@coremarine/thelmabiotel-tblive-nodered.svg)](https://www.npmjs.com/package/@coremarine/thelmabiotel-tblive-nodered)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Node-RED node for the **Thelma Biotel TB Live** acoustic receiver (hydrophone). It turns the
receiver's serial output into **CMA**, the same JSON shape every CoreMarine device parser emits.

Wrapper of [@coremarine/thelmabiotel-tblive](https://www.npmjs.com/package/@coremarine/thelmabiotel-tblive).
Node >= 22, Node-RED >= 4.

## Install

From the Node-RED palette manager, or:

```bash
npm install @coremarine/thelmabiotel-tblive-nodered
```

The node appears in the **CoreMarine** palette category as **TB Live parser**.

## Configuration

| Field | Meaning |
| --- | --- |
| **Name** | Optional node label |
| **Firmware** | `Learn from the stream` (default), `1.0.1` or `1.0.2` |
| **Memory** | On by default — append each input to the buffer instead of replacing it |

The firmware **is** the protocol version: 1.0.1 detections carry 9 fields and logs 8, while 1.0.2
carries 8 and 7. Left on *learn*, the parser works it out from the stream (an `FV=` response, or
whether the receiver entered command mode with `LIVECM` or `TBRC`) and reports `unknown` until
something proves it. Pin it when your deployment knows better than the wire does.

## msg API

Send `payload` to parse. Every other key is optional; **a key you do not send is absent from the
output too**, and on a bad request the corresponding output key holds an error **string**.

| Key | In | Out |
| --- | --- | --- |
| `payload` | TB Live ASCII string | `CMA[]` |
| `memory` | `{ command: 'get' }` / `{ command: 'set', payload: boolean }` | `{ memory, characters }` |
| `firmware` | `{ command: 'get' }` / `{ command: 'set', payload: '1.0.1' \| '1.0.2' }` | `{ firmware, firmwares }` |
| `ids` | any truthy value | `string[]` — every sentence id it knows |
| `definition` | `'emitter'` or `{ id, protocol? }` | `SentenceDefinition[]` |
| `fake` | `{ id, protocol, options? }` | a wire sentence `string` |

Full details, tables and warnings are in the node's **help panel** inside Node-RED.

### Diagnostics

`ids` and `definition` let a flow ask the running node what it expects — field names, types, units,
descriptions, which of the device's two APIs a sentence belongs to, and prose saying how it is
recognised on the wire. Omit `protocol` to get every firmware version, which is how you see what
the firmware changes.

That matters because these receivers sit on remote installations with restricted internet access
for years: asking the deployed node settles a question that would otherwise need the datasheets.

### Fake sentences

`fake` generates a valid sample sentence. `protocol` is required (the output genuinely differs by
firmware), it is **deterministic**, and with no `options` it reproduces the datasheets' own
examples:

```javascript
msg.fake = { id: 'emitter', protocol: '1.0.1' }
// -> '$1000042,1589557202,615,S64K,1285,0,24,69,11\r'
```

## Two things a flow must handle

**A field can be `null`** — present but empty. The emitter `data` field is empty for ID-only
transmit protocols (`R256`, `R04K`, `R64K`, `R01M`, `OPi`). **`null` means "no measurement" and
must never be read as zero.** Version 1.x reported `0` there, which made a missing reading
indistinguishable from a perfectly vertical mooring line.

**Sentences can carry `errors`.** Nothing the parser receives is dropped silently any more:
malformed input, line noise and interference-wrecked sentences all arrive, flagged. Check `errors`
and `id === 'unknown'` before trusting a reading. The shipped example flow demonstrates this with a
splitter routing clean and flagged sentences to separate debug nodes.

**The emitter `data` field is not decoded.** Those 16 bits carry whatever the *emitter's* firmware
encodes — an inclinometer, or tilt plus depth — which is not part of the TB Live protocol, so
decoding it is your flow's job.

## Examples

Import `examples/thelmabiotel-tblive-examples.json` from the Node-RED menu → Import → Examples, or
open it directly:

```bash
pnpm run thelmabiotel-tblive:nodered:examples
```

Nine groups, every payload taken from the datasheets: listening data, the empty-`data` case,
failed and garbage sentences (line noise, half-duplex interference, bad field counts), memory and
split sentences, firmware learning versus pinning, command-mode responses, diagnostics, and fake
sentences. It uses **only built-in node types**, so it imports cleanly with no extra contrib nodes.

## Development

```bash
pnpm run thelmabiotel-tblive:nodered:build    # tsup -> CJS + copy html/icons
pnpm run thelmabiotel-tblive:nodered:test     # node:test — unit + real headless node-red
pnpm run thelmabiotel-tblive:nodered:dev      # local Node-RED on a scratch flow
```

## Upgrading from 1.x

The output is now **CMA** rather than the old `ParsedSentence`. The node type is **unchanged**
(`cma-thelmabiotel-tblive`), so existing flows keep their node — but the data changed:

- **`msg.firmwares`** (a bare array, emitted on every message) is gone. Use `msg.firmware` with
  `{ command: 'get' }`, which reports the current firmware *and* the available ones.
- **`msg.memory`** was a bare boolean in and out; it is now `{ command, payload }` in and a
  `{ memory, characters }` report out.
- **No top-level `mode` or `firmware`** on the output: `mode` moved to `metadata.mode`, and the
  firmware is now `protocol.version`.
- **`protocol` is new and required** on every CMA — `{ name: 'TBLive', version }`.
- **Serial numbers are strings**, so the receiver's inconsistent zero-padding survives (`'001129'`
  used to become `1129`). Match on the last digits with a string comparison.
- **Values can be `null`**, and sentences that used to vanish now arrive with `errors`.
- **`metadata.angle` is gone** — the inclination decode was removed from the library, so a flow
  that relied on it must decode the `data` field itself.
- **Node >= 22** (was >= 18) and **Node-RED >= 4** (was >= 3).

## License

MIT
