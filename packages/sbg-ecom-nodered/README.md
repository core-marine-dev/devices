# @coremarine/sbg-ecom-nodered

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/sbg-ecom-nodered)
[![publish](https://github.com/core-marine-dev/devices/actions/workflows/sbg-ecom-nodered.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/sbg-ecom-nodered.yml)
![npm](https://img.shields.io/npm/dy/%40coremarine/sbg-ecom-nodered)

Node-RED node for **SBG Systems** inertial systems — ELLIPSE, EKINOX and APOGEE — speaking
**sbgECom**. It turns the device's output into **CMA**, the same JSON shape every CoreMarine device
parser emits.

Wrapper of [@coremarine/sbg-ecom](https://www.npmjs.com/package/@coremarine/sbg-ecom).
**All 34 output logs** of `SBG_ECOM_CLASS_LOG_ECOM_0` are decoded. Node >= 22, Node-RED >= 4.

## Install

From the Node-RED palette manager, or:

```bash
npm install @coremarine/sbg-ecom-nodered
```

The node appears in the **CoreMarine** palette category as **SBG sbgECom parser**.

## Configuration

| Field | Meaning |
| --- | --- |
| **Name** | Optional node label |
| **Firmware** | Empty for the library default (`2.3`), or a version this build models |
| **Memory** | On by default — append each input to the buffer instead of replacing it |

You rarely need to pin the firmware. §2.4 of the manual states that SBG only ever **adds** fields at
the end of a log, so `2.3` decodes a newer device correctly and publishes the extra bytes at
`metadata.trailing` rather than failing. A version this build does not model is **refused, never
substituted**.

**Leave memory on for a live stream.** eCom framing is length-prefixed rather than terminated, so a
frame only decodes once its *last* byte has arrived — with memory off, any frame split across two
messages is lost.

## ⭐ One node, two protocols

An SBG device does **not** wrap its NMEA output in an eCom frame. The manual is explicit (§2.1.4):
the NMEA classes are *"only used for identification purpose and does not contain any sbgECom
message"* — the class ids exist so you can **configure** which sentence goes out, and the sentence
itself is emitted as raw ASCII **alongside** the binary frames, on the same wire. §2.1.1 Note 4 warns
the integrator directly.

So this node has **no protocol setting**. Wire your serial node straight in and both come out as CMA:

```
sentences[0].id  // '0:9'   protocol.name 'SBG ECOM'
sentences[1].id  // 'GGA'   protocol.name 'NMEA'
sentences[2].id  // '0:13'  protocol.name 'SBG ECOM'
```

The example flow has a group demonstrating exactly this — it is the feature most likely to surprise
you, so it is the one to open first.

## msg API

Send `payload` to parse. Every other key is optional; **a key you do not send is absent from the
output too**, and on a bad request the corresponding output key holds an error **string**.

| Key | In | Out |
| --- | --- | --- |
| `payload` | a **Buffer**, a base64 string, an **NMEA sentence** (any string starting with `$`), or a byte array | `CMA[]` |
| `memory` | `{ command: 'get' }` / `{ command: 'set', payload: boolean }` | `{ memory, bytes }` |
| `firmware` | `{ command: 'get' }` / `{ command: 'set', payload: '2.3' }` | `{ firmware, firmwares, clock? }` |
| `ids` | any truthy value | `string[]` — the 34 eCom log ids **plus** every NMEA sentence id |
| `definition` | `'0:6'`, `'GGA'`, or `{ id, protocol? }` | the field table |
| `fake` | `'0:6'` or `{ id, protocol?, options? }` | a real wire frame, as a **Buffer** |

Full details, tables and warnings are in the node's **help panel** inside Node-RED.

### Input — what a string means

| string | read as |
| --- | --- |
| starts with `$` | **the NMEA sentence**, passed through as text |
| anything else | **base64** eCom bytes, validated strictly |

There is no ambiguity to resolve: base64's alphabet contains no `$`, and every NMEA sentence starts
with one. A **Buffer** works for both and is the normal case — a serial, TCP or file node hands you
one and it goes straight through.

Base64 is accepted because **every `raw` in the output is base64**, so it is this package's own
vocabulary for bytes: copy a `raw` out of a debug node, inject it back, and you are re-parsing the
exact frame that misbehaved. A byte array works too, for JSON-only paths such as an inject node.

### `id` is `'<class>:<message>'`

The convention most likely to catch a flow author out. Identity in sbgECom is a **pair** — §2.1.1
gives `MSG` and `CLASS` as two independent header bytes, with no revision concept — so `MSG 6` means
`EKF_EULER` in class `0x00` and something else entirely in class `0x02`. The id is therefore `'0:6'`,
and the log's name is at `metadata.name`.

### Timestamps — the device tells us the time, or nothing does

The first field of almost every log is `TIME_STAMP`, and **it is not a clock**: the manual calls it
time since power-up. You cannot say when a sample was taken from an uptime counter, so this node
never presents one as a time.

It becomes a time through `SBG_ECOM_LOG_UTC_TIME`, which publishes that counter *and* the matching
UTC. Once such a log arrives with a valid clock status, every later sentence carries an absolute
`metadata.timestamp.sentence`, promoted over `timestamp` — the device's clock beats the host's.

Until then there is no absolute time, deliberately: a guessed clock is worse than an honest absence.
**Send `firmware: { command: 'get' }` to see whether the device has published one** — the reply
carries `clock` once it has. That is the answer to "why has my data no timestamp?", and it is why the
channel reports it at all.

## Nothing is dropped silently

A bad CRC, a wrong end flag, a log this build does not know, or bytes that are not sbgECom at all:
each comes back as a sentence saying so, never as an empty array. **The signal is the presence of
`errors`** on a sentence.

A log the knowledge base does not model is **not** an error — it arrives with its real `id`, its
bytes at `metadata.body` and `metadata.name: 'unknown'`. A log that has *grown* decodes every field
this build knows and publishes the extra bytes at `metadata.trailing`.

## Examples

Import from the Node-RED menu → **Import** → **Examples** → `@coremarine/sbg-ecom-nodered`, or open
[`examples/sbg-ecom-examples.json`](examples/sbg-ecom-examples.json).

Eight groups, each with a comment node explaining what it shows:

| group | what it demonstrates |
| --- | --- |
| Decoded logs | real frames from a CoreMarine ELLIPSE; the `'0:6'` id convention |
| **The mixed stream** | binary frames and a `$GPGGA` sentence through one node, nothing configured |
| Timestamps | fire 1/2, then 2/2 — a `UTC_TIME` log turning uptime into a real clock |
| Failed and garbage | a corrupted CRC still decoding, and junk reported rather than dropped |
| Memory | half a frame, then the rest |
| Diagnostics | `ids`, `definition`, `firmware` — asking the running node what it expects |
| Fake frames | a fabricated frame fed straight back in, round-tripping |
| Flow errors | a `catch` node, so a mistake is visible rather than silent |

**Every payload in that flow is a real frame from the committed test corpus**, and the flow is
covered by `tests/examples.unit.test.ts` — it is structurally validated and every inject is run
through this wrapper's own handlers, so a shipped example cannot rot unnoticed.

## Development

```bash
pnpm run sbg-ecom:nodered:build       # tsup -> dist/ + copy parser.html and icons
pnpm run sbg-ecom:nodered:test        # node --test (unit + a real node-red integration run)
pnpm run sbg-ecom:nodered:lint        # eslint
pnpm run sbg-ecom:nodered:dev         # a local Node-RED on :1880 with a scratch flow
pnpm run sbg-ecom:nodered:examples    # the same, editing the SHIPPED example flow
pnpm run sbg-ecom:nodered:docker      # the docker manual-test environment
```

Two traps worth knowing before you change anything:

- **The tests run against `dist/`, not `src/`.** Build the wrapper *and* the library first, or you
  are testing a stale copy.
- **`tsx` strips types without checking them**, and `:nodered:lint` does not typecheck either. Run
  `npx tsc --noEmit -p tsconfig.json` inside this package whenever the library changes shape — three
  real breaks hid behind a green suite that way during the septentrio refactor, and one hid here.
