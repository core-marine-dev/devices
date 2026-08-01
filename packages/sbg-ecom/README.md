# SBG sbgECom parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/sbg-ecom) [![publish](https://github.com/core-marine-dev/devices/actions/workflows/sbg-ecom.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/sbg-ecom.yml) ![npm](https://img.shields.io/npm/dy/%40coremarine/sbg-ecom)

**sbgECom Parser** parses the binary protocol of SBG Systems inertial systems — ELLIPSE, EKINOX and APOGEE.

> sbgECom is SBG's own binary protocol. Every frame starts with the sync bytes `0xFF 0x5A`, then a message id, a message class, a little-endian length, the payload, a CRC-16 Kermit and the end flag `0x33` — §2.1.1 of the *Inertial Sensor Interface Firmware Reference Manual* (SBGFWM.2.3).

**All 34 output logs of `SBG_ECOM_CLASS_LOG_ECOM_0` are decoded** — every log in §2.3.1 of the manual, each transcribed from its datasheet table with units, descriptions and decoded status words. See [Logs](#logs).

**⭐ One stream, two protocols.** An SBG device does not wrap its NMEA output in an eCom frame: the sentences arrive as plain ASCII *interleaved with* the binary frames on the same wire. This parser reads both from one buffer with no configuration — see [The mixed stream](#the-mixed-stream).

**Nothing you feed the parser is dropped silently.** A bad CRC, a truncated body, a log this build does not know, or bytes that are not sbgECom at all — each comes back as a sentence saying so, never as an empty array. See [Failed, unmodelled and garbage frames](#failed-unmodelled-and-garbage-frames).

> The output is the unified **CMA** format shared by every CoreMarine device parser — see [`docs/CMA.md`](../../docs/CMA.md).

## Install

```bash
npm i @coremarine/sbg-ecom
```

Ships ESM + CJS + types. Runs on node, deno, bun and the web: there are no `node:*` imports and no `Buffer` in the parse path — input is a `Uint8Array` or a `string`, and every `raw` is Base64. Requires Node `>=22`.

## How to use it

```typescript
import { SBGParser } from '@coremarine/sbg-ecom'

// every option is optional
const parser = new SBGParser()
// const parser = new SBGParser({ memory: true, bufferLimit: 4095, firmware: '2.3' })

// feed it whatever the wire gives you — bytes from a serial port, or a string
const sentences = parser.parseData(bytesFromSerialPort)

// or in two steps
parser.addData(bytesFromSerialPort)
const drained = parser.parseData()
```

`addData` appends to an internal buffer and decodes everything complete in it; `parseData` drains what has been decoded. A partial frame stays on the buffer until the rest of its bytes arrive, so feeding the stream one byte at a time gives byte-identical output to feeding it whole.

### Options

| option | default | what it does |
| --- | --- | --- |
| `memory` | `true` | keep the buffer between calls, so a frame split across chunks still decodes. `false` replaces it each time. |
| `bufferLimit` | `4095` | maximum **bytes** held pending. The largest frame the protocol allows is `6 + 4086 + 3`, so the default fits one exactly. Exceeding it emits a garbage sentence and resets — a binary payload can contain `0xFF 0x5A`, so without this a wrong device on the line would grow the buffer forever, silently. |
| `firmware` | `'2.3'` | which knowledge base decodes the logs. An unsupported value is ignored rather than throwing. |

## Output

Every sentence is a CMA. A real `SBG_ECOM_LOG_EKF_EULER` frame from `tests/fixtures/stream-mixed.bin`, abridged:

```jsonc
{
  "raw": "/1oGACAAmGQpnj9gx7t2hfi7KhW4v68bIzu6ASM7galSPdQIAAARRTM=",
  "timestamp": 1679996289100,
  "id": "0:6",
  "protocol": { "name": "SBG ECOM", "version": "2.3" },
  "payload": [
    {
      "raw": "mGQpng==",
      "name": "TIME_STAMP",
      "type": "uint32",
      "value": 2653512856,
      "units": "us",
      "description": "Time since the sensor was powered up. NOT a clock — an uptime counter…"
    },
    {
      "raw": "P2DHuw==",
      "name": "ROLL",
      "type": "float32",
      "value": -0.006084471475332975,
      "units": "rad",
      "description": "Roll angle",
      "metadata": { "value": -0.34861453610431686, "units": "deg" }
    },
    // … PITCH, YAW, ROLL_ACC, PITCH_ACC, YAW_ACC …
    {
      "raw": "1AgAAA==",
      "name": "SOLUTION_STATUS",
      "type": "uint32",
      "value": 2260,
      "description": "Kalman filter status: the solution mode in bits 0-3, then which aiding data…",
      "metadata": {
        "label": "SBG_ECOM_SOL_MODE_NAV_POSITION",
        "attitudeValid": true,
        "velocityValid": true,
        "positionValid": true,
        "gps1PositionUsed": true
        // … one flag per documented bit
      }
    }
  ],
  "metadata": {
    "name": "SBG_ECOM_LOG_EKF_EULER",
    "class":   { "raw": "AA==", "name": "CLASS", "type": "uint8",  "value": 0,  "description": "SBG_ECOM_CLASS_LOG_ECOM_0" },
    "message": { "raw": "Bg==", "name": "MSG",   "type": "uint8",  "value": 6,  "description": "Message identifier within the class" },
    "length":  { "raw": "IAA=", "name": "LEN",   "type": "uint16", "value": 32, "units": "bytes" },
    "crc":     { "raw": "EUU=", "name": "CRC",   "type": "uint16", "value": 17681 },
    "timestamp": { "received": 1679996289100, "parsed": 1679996289100 }
  },
  "description": "Computed orientation as Euler angles, with a 1 sigma accuracy per axis…"
}
```

### `id` is `'<class>:<message>'`

Identity in sbgECom is a **pair**: §2.1.1 gives `MSG` and `CLASS` as two independent header bytes, and there is no revision concept. `MSG 6` means `EKF_EULER` in class `0x00` and something else entirely in class `0x02`, so the class is part of the identity — `'0:6'`, not `'6'`. The log's name is at `metadata.name`.

(This differs from `@coremarine/septentrio-sbf`, whose ids are a bare number, because SBF packs one block number and a revision into a single `uint16`.)

### Metadata

Three levels, as [`docs/CMA.md`](../../docs/CMA.md) defines them:

- **Sentence** (`metadata`) — the header fields (class, message, length, CRC) as `Field`-shaped entries so the raw bytes sit next to the parsed value, plus `name` and the `timestamp` block.
- **Field** (`payload[i].metadata`) — one field decoded into a richer form: a bitmask into named booleans, an enum code into its documented `label`, a radian angle into degrees, a scaled integer into its engineering value.
- **Payload** (`metadata.payload`) — a value aggregated from **two or more** fields. `GPS1_POS` and `EKF_NAV` publish `ellipsoidAltitude` (altitude + undulation); `UTC_TIME` publishes the assembled `utc` epoch; the event logs publish every event's absolute time.

**Angles are radians on the wire and degrees in metadata.** sbgECom reports every angle in radians; marine consumers want degrees, so every angular field carries the conversion rather than leaving each consumer to rediscover the factor.

**Scaled integers keep their raw value.** `IMU_SHORT` reports delta velocities as counts at 1048576 LSB per m·s⁻², so `value` is the count the wire carried and `metadata.value` is the engineering figure. Both are useful; only one is what the device sent.

## Timestamps

The first field of almost every log is `TIME_STAMP`, and **it is not a clock** — the manual calls it "time since sensor is powered up". You cannot say when a sample was taken from an uptime counter alone, so this parser never presents one as a time.

It becomes a time through **`SBG_ECOM_LOG_UTC_TIME`**, which publishes the counter *and* the matching UTC. §2.3.3.2 is explicit: *"You thus have to use this frame if you would like to time stamp all data to an absolute UTC or GPS time reference."* Once such a frame arrives **with `CLOCK_STATUS` reporting `SBG_ECOM_UTC_VALID`**, the parser learns the correspondence and every later log gets a real time:

```typescript
parser.clock                            // { uptime: 10000000, utc: 1785587415500 } — or undefined
sentence.metadata.timestamp.sentence    // the log's own absolute time
sentence.timestamp                      // promoted to it: the device's clock beats the host's
```

Anything short of `SBG_ECOM_UTC_VALID` means the device is propagating a guess internally, and it is refused — a guessed clock is worse than an honest absence. Logs decoded before the first `UTC_TIME` of a session simply carry no `sentence` time.

`metadata.timestamp.received` and `.parsed` are always present and always the host's, so the host-side timings stay visible whatever the device says.

## The mixed stream

§2.1.4 says of the NMEA and third-party message classes: *"This class is only used for identification purpose and does not contain any sbgECom message."* The class ids exist so you can **configure** which sentence goes out — the sentence itself is emitted as raw ASCII alongside the binary frames. §2.1.1 Note 4 warns the integrator directly: *"It belongs to the user to decode the different formats if several protocols are used at the same time."*

So there is **no protocol setting**. Both framings are always looked for, and a mixed batch needs no special handling because the output is CMA either way:

```typescript
const sentences = parser.parseData(oneChunkOfTheWire)

sentences[0].id            // '0:9'   protocol.name 'SBG ECOM'
sentences[1].id            // 'GGA'   protocol.name 'NMEA'
sentences[2].id            // '0:13'  protocol.name 'SBG ECOM'
```

The NMEA half is [`@coremarine/nmea-parser`](../nmea-parser), composed rather than reimplemented, so every standard sentence it knows works here — and its extension points are reachable for your own:

```typescript
parser.nmea.addSentences(yourYaml)
```

Frames are resolved **first**, and only the bytes between them are examined for sentences. That ordering is what makes the two framings unambiguous: a `$` inside an eCom payload is never scanned, and `0xFF` cannot appear in ASCII NMEA text.

> The device's own proprietary sentences (`$PSBGI`, `$PSBGB`, `$PRDID`, `$PASHR`, and the Ixblue and Trimble formats of §3.3) are **not yet in the knowledge base**. They still parse — as generic sentences with unnamed fields — and adding them is additive, not a breaking change.

## Failed, unmodelled and garbage frames

Four tiers, and only two of them are errors:

| tier | when | what you get |
| --- | --- | --- |
| **decoded** | CRC and ETX good, log modelled | full `payload` |
| **identified** | CRC and ETX good, `(class, message)` not modelled | real `id`, `payload: []`, bytes at `metadata.body`, `metadata.name: 'unknown'`, **no `errors`** |
| **failed** | CRC mismatch or wrong ETX | decoded as far as possible **plus** `errors` |
| **garbage** | bytes that cannot start a frame | `id: 'unknown'`, the bytes in `raw`, `errors` explaining why |

**How you detect a problem: `errors` is present.** That is the only signal, and it is the same one every parser in this monorepo uses.

*Identified* is deliberately not an error. §2.4 states that SBG "reserves the right to add at the end of logs new fields in future revision of the sbgECom protocol", so a newer device is a normal event, not a fault — an unmodelled log arrives with its bytes intact, and a log that has **grown** decodes every field this build knows and publishes the extra bytes at `metadata.trailing`.

Adjacent junk is **coalesced** into one garbage sentence, so a noisy line produces one report rather than a flood. A trailing `0xFF` is never garbage: it may be the first half of a sync split across two reads, so it stays pending.

## Large frames

A frame with **bit 7 of `CLASS`** set is a *large frame* (§2.1.2.1): its payload begins with a 5-byte page header, and `LEN` includes it.

Each page is emitted as **its own CMA** with the pagination in metadata, and pages are **not reassembled**:

```jsonc
{
  "id": "0:6",                      // the large-frame bit is masked off — pagination is framing, not identity
  "payload": [{ "name": "DATA", "type": "string", "value": "3q2+7w==" }],
  "metadata": { "large": { "transmissionId": 7, "pageIndex": 1, "pages": 3 } }
}
```

Two reasons, both deliberate. A page cuts at a fixed byte boundary, so it can split a field in half and page 1 starts mid-field — there is no field list to publish for a fragment. And an in-parser reassembly buffer would hold a transmission forever if one page were lost on the wire: a memory leak with no symptom. Reassembly belongs to a layer that can time it out and see the gap.

In practice you will not meet one: §2.1.2.1 notes that *"ELLIPSE Generation 1, 2 and 3 don't use large frame"*, and there are none in the committed corpus. The path exists so the parser cannot mis-frame one.

## Introspection

Both calls return a `Result` and **never throw**. There is no protocol selector: an eCom id contains a colon and an NMEA id does not, so they dispatch on the id itself.

```typescript
parser.sentenceIds                       // ['0:1', '0:2', … , 'GGA', 'RMC', …]

parser.getSentenceDefinition('0:6')      // the field table, CMA-shaped
parser.getSentenceDefinition('GGA')      // answered by nmea-parser
parser.getLogDefinition('0:6')           // the same, with eCom's own `name` and `opaque`

parser.getFakeSentence('0:6')            // a real frame: real CRC, real LEN, parses straight back
parser.getFakeSentence('0:6', undefined, { fields: { ROLL: 0.5 }, timestamp: 1_000_000 })
```

A fake frame is **deterministic** — the same request returns the same bytes forever, so it can be committed into a spec or a Node-RED example flow. `{ random: true }` opts out.

> A fake round trip proves the *framing*, not the field table: it is built from the same table it is decoded with, so the two agree even when the table is wrong. What catches a wrong table is the datasheet and a real capture — which is why `tests/fixtures/` exists.

## Logs

All 34 logs of `SBG_ECOM_CLASS_LOG_ECOM_0`, by manual section:

| § | logs |
| --- | --- |
| 2.3.3 general information and time | `STATUS` (1) · `UTC_TIME` (2) |
| 2.3.4 inertial sensor data | `IMU_DATA` (3) · `IMU_SHORT` (44) |
| 2.3.5 EKF output | `EKF_EULER` (6) · `EKF_QUAT` (7) · `EKF_NAV` (8) · `SHIP_MOTION` (9) · `SHIP_MOTION_HP` (32) |
| 2.3.6 aiding sensors | `MAG` (4) · `MAG_CALIB` (5) · `GPS1_VEL` (13) · `GPS1_POS` (14) · `GPS1_HDT` (15) · `GPS1_RAW` (31) · `GPS2_VEL` (16) · `GPS2_POS` (17) · `GPS2_HDT` (18) · `GPS2_RAW` (38) · `ODO_VEL` (19) · `AIR_DATA` (36) · `DVL_BOTTOM_TRACK` (29) · `DVL_WATER_TRACK` (30) · `DEPTH` (47) · `USBL` (37) |
| 2.3.7 miscellaneous | `EVENT_A`–`EVENT_E` (24–28) · `EVENT_OUT_A` (45) · `EVENT_OUT_B` (46) · `DIAG` (48) · `RTCM_RAW` (49) |

The other message classes — `CMD` (`0x10`), `LOG_ECOM_1` (high-rate, `0x01`), the two NMEA identifier classes and `THIRD_PARTY` — are **recognised but not modelled**. A frame from one arrives as *identified*, with its real id and its bytes, rather than as garbage.

### Which logs are verified against hardware

**Thirteen of the 34 are decoded from real device output** in the committed corpus: `STATUS`, `UTC_TIME`, `IMU_DATA`, `MAG`, `EKF_EULER`, `EKF_QUAT`, `EKF_NAV`, `SHIP_MOTION`, `GPS1_VEL`, `GPS1_POS`, `GPS1_HDT`, `AIR_DATA`, `IMU_SHORT`. Their values are additionally checked against physics — a stationary IMU measures 1 g, a quaternion is normalised, the position lands where the capture was taken.

**The other 21 are datasheet-only.** Their tables were transcribed by hand from the manual and round-trip through `getFakeSentence`, but no capture of them exists, so treat them as unverified against hardware. `DIAG` (48) deserves particular suspicion: the manual's field table for it is self-contradictory — it prints three mutually impossible offsets — and the layout here is reconstructed from its stated total size.

## Two things the manual gets wrong

Recorded because both cost real time, and because a reader hitting them should know they were checked rather than missed:

1. **`GPS1_POS`/`GPS2_POS` offsets.** The offset column prints 54 for `BASE_STATION_ID` and 56 for `DIFF_AGE`, which puts the end of the log at 58 — while the same table says "Total size 57". The fields are **packed**, at 53 and 55, and that is measured, not assumed: every `GPS1_POS` frame in the corpus has `LEN` 57.
2. **`SBG_ECOM_LOG_DEPTH`'s `DEPTH` unit** is printed as `m/s`; its own description calls it a depth measurement. It is metres.

## Development

```bash
pnpm run sbg-ecom:test       # vitest, watch
pnpm run sbg-ecom:build      # format + tsup (ESM + CJS + types)
pnpm run sbg-ecom:lint       # eslint
```

The tests are worth reading before changing a field table: [`tests/fixtures/README.md`](tests/fixtures/README.md) states exactly what each capture must parse to, and `tests/logs.test.ts` checks the decoded numbers against physics.
