# TB Live — field notes to carry over to Tracker

**Temporary file.** Created 2026-07-30 at cru's request, before the `thelmabiotel-tblive` CMA
refactor removes these comments from the parser source. They describe **how to interpret the
decoded values** — which is Tracker's job, not the parser's. Move them into Tracker and delete
this file.

Source: `packages/thelmabiotel-tblive/src/sample.ts`, docblocks of `emitter101`, `emitter102`,
`receiver101`, `receiver102`. **Part 1 is verbatim.** Part 2 adds the datasheet facts that make
them actionable, and Part 3 the decode helpers that are being removed with them.

---

## Part 1 — the comments, verbatim

### `emitter101` — Emitter: Acoustic detection (firmware 1.0.1, 9 fields)

```ts
/** Emitter: Acoustic detection
 * Field |  Type  | Description
 *     0 | string | Receiver serial number
 *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
 *     2 | uint16 | Milliseconds of timestamp
 *     3 | string | Transmitter Protocol
 *     4 | string | Transmitter serial number
 *     5 | uint16 | Transmitter Data Value
 *                | Bits  | Type   | Description
 *                | 00-09 | uint10 | Average inclination -> (0 - 1023) / 10 => 0.0° - 102.3° with ±0.10° resolution
 *                | 10-15 | uint6  | Standard deviation  -> (0 - 63) / 4    => 0.0° - 15.75° with ±0.25° resolution
 *     6 |  uint8 | Detection SNR (0-255)
 *                | signal  | SNR
 *                |    weak | 0 <= SNR <= 6
 *                | regular | 6 < SNR < 25
 *                |  strong | 25 <= SNR
 *                | typical | 6 < SNR < 60 typical values
 *     7 |  uint8 | Transmitter Detection Frequency in kHz, range 63-77 kHz
 *     8 | uint32 | Number of strings sent since power up
*/
```

### `emitter102` — Emitter: Acoustic detection (firmware 1.0.2, 8 fields)

Identical to the above, **without field 8** (`Number of strings sent since power up`):

```ts
/** Emitter: Acoustic detection
 * Field |  Type  | Description
 *     0 | string | Receiver serial number
 *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
 *     2 | uint16 | Milliseconds of timestamp
 *     3 | string | Transmitter Protocol
 *     4 | string | Transmitter serial number
 *     5 | uint16 | Transmitter Data Value
 *                | Bits  | Type   | Description
 *                | 00-09 | uint10 | Average inclination -> (0 - 1023) / 10 => 0.0° - 102.3° with ±0.10° resolution
 *                | 10-15 | uint6  | Standard deviation  -> (0 - 63) / 4    => 0.0° - 15.75° with ±0.25° resolution
 *     6 |  uint8 | Detection SNR (0-255)
 *                | signal  | SNR
 *                |    weak | 0 <= SNR <= 6
 *                | regular | 6 < SNR < 25
 *                |  strong | 25 <= SNR
 *                | typical | 6 < SNR < 60 typical values
 *     7 |  uint8 | Transmitter Detection Frequency in kHz, range 63-77 kHz
*/
```

### `receiver101` — Receiver: Receiver Log (firmware 1.0.1, 8 fields)

```ts
/** Receiver: Receiver Log
 * Field |  Type  | Description
 *     0 | string | Receiver serial number
 *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
 *     2 | string | Identifier for Log Messages
 *     3 |  int16 | Temperature ((data-50)/10 -> °C)
 *     4 |  uint8 | Average background noise
 *     5 |  uint8 | Peak background noise
 *     6 |  uint8 | Center listening band (kHz, listening in +-1kHz bands too) ==> TYPO IN DOCS 101 Detection SNR
 *     7 | uint32 | Number of strings sent since power up
*/
```

### `receiver102` — Receiver: Receiver Log (firmware 1.0.2, 7 fields)

Identical to the above, **without field 7** (`Number of strings sent since power up`):

```ts
/** Receiver: Receiver Log
 * Field |  Type  | Description
 *     0 | string | Receiver serial number
 *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
 *     2 | string | Identifier for Log Messages
 *     3 |  int16 | Temperature ((data-50)/10 -> °C)
 *     4 |  uint8 | Average background noise
 *     5 |  uint8 | Peak background noise
 *     6 |  uint8 | Center listening band (kHz, listening in +-1kHz bands too) ==> TYPO IN DOCS 101 Detection SNR
*/
```

**Note on the `TYPO IN DOCS` remark above — it is correct.** The 1.0.1 datasheet labels log field 6
"Detection Signal-to-Noise Ratio (SNR)"; the 1.0.2 datasheet labels the same position "Receiver
listening frequency, range 63-77 kHz", and both example values are `69`. The comment's reading
(frequency, not SNR) is the right one.

---

## Part 2 — datasheet facts these comments depend on

From `misc/parsers/thelmabiotel/datasheets/` (read 2026-07-30).

### The `data` field is legitimately EMPTY for ID-only protocols

**This is the one to be most careful about in Tracker.** The transmit protocol decides whether field
5 carries data at all. `receiver-1.0.2.pdf` p.2: *Transmitter Data (",," blank for non-data transmit
protocols)*. Real datasheet example, `receiver-1.0.1.pdf` p.10:

```txt
$1000042,0000002185,897,R64K,1023,,24,69,9
                              ^^ empty — R64K carries no data
```

| protocol | valid ID range | valid data range | comment |
| --- | --- | --- | --- |
| R256 | 1-256 | **NA** | |
| R04K | 1-4096 | **NA** | |
| R64K | 1-65536 | **NA** | |
| R01M | 1-1048576 | **NA** | Extra strong CRC |
| S256 | 1-256 | 0-255 | |
| S64K | 1-65536 | 0-255 | Extra strong CRC |
| HS256 | 1-256 | 0-65535 | Extra strong CRC and **high resolution data** |
| DS256 | 1-256 | 0-65535 (0-255 + 0-255) | Extra strong CRC and **double sensor data** |
| OPi | 1-1048576 | NA | Shared Open Network protocol |
| OPs | 1-65536 | 0-4095 | Shared Open Network protocol |

The old parser turned that empty field into `value: 0` and published
`average: 0.0°, deviation: 0.0°`, i.e. **a fabricated "perfectly vertical mooring line"**. After the
CMA refactor the field arrives as **`value: null`** with no inclination metadata. **Tracker must treat
`null` as "no measurement", never as zero.**

`HS256` (16-bit high-resolution) and `DS256` (explicitly two 8-bit values) line up with the
inclinometer (10+6) and depth-sensor (8+8 tilt+depth) encodings — so the protocol field itself is
evidence of which decode applies, alongside the emitter ID.

### SNR definition (`receiver-1.0.2.pdf` p.2)

```txt
SNR[dB] = 10 · log10(avg peak signal power in pulse train / avg noise power)
        = 20 · log10(avg peak signal amplitude in pulse train / avg noise amplitude)
```

*Typical values for SNR will be from 6 to 60 depending on signal strength and noise conditions. A
value of 6 is very week signals and 25 and above are strong signals. The scale is logarithmic.*
— which is where the weak/regular/strong bands in the `emitter*` comments come from.

### Emitter (transmitter) firmware — `emitter-1.0.1.pdf`, "17-firmware [rel-tag-2020-A] (v1.0.1-OC899)"

The CoreMarine-commissioned tag firmware. Its own words on the encoding:

> Send 16 bits of data: the average uses 10 bits [LSB] which will be interpreted as 0~102.3º with
> 0.1º resolution (0~1023/10) and the std dev uses the remaining 6 bits [MSB] which will be
> interpreted as 0-15.75º with 0.25º resolution (0~63/4). HS256 encoding with 8bit ID and 16bit
> payload.

Sampling behaviour, which sets what a single sample actually represents:

- Wakes every 3 s, logs 700 ms of TILT data (~15 samples); early samples may be discarded (sensor not
  warmed up). Averages those.
- After 5 such cycles, the 5 averages are averaged again, and the std dev is computed **from the 5
  averages, not from the 75 raw samples**.
- Duty cycle: ~15 s recording, then 10 s silent (transmitting / calibrating). So the stream is
  15 s info → 10 s silence → 15 s info …
- `TXmin` = `TXmax` = 25 s (the 25-second transmit rate), `PingDist` 5, `PingDist2` 10,
  `Freq`/`Freq2` 63→77 kHz, accelerometer ADXL362.
- Tilt is an average over a 15 s period — when checking a static position, let the unit rest ~25 s
  before trusting the value.

**Emitter ID constraint (matches the commented-out `SERIAL_NUMBERS_RESERVED` in `constants.ts`):**

> Sensor IDs should all be odd numbers and not any of these numbers: 104, 105, 106, 107, 110, 111

### Clock / timestamp caveat

An unset clock means field 1 is **seconds since power up**, not epoch — `receiver-1.0.1.pdf` p.9
footnote and p.13 (`UT` "otherwise this will give seconds since power up"). `receiver-1.0.2.pdf` p.2
instead claims the clock resets to 1 Jan 2000 on power loss. The two docs disagree. Either way, a
small field-1 value is **uptime, not a date** — the old parser rendered it as `1970-01-01`.

---

## Part 3 — decode helpers being removed from the parser

Verbatim from `packages/thelmabiotel-tblive/src/utils.ts` (the inclinometer bit split stays in the
library; the interpretation belongs in Tracker).

```typescript
export const getLineAngle = (data: number) => {
  const angle = 0b000_0000_0011_1111_1111 & data          // 10 LSB
  const deviation = (0b0000_1111_1100_0000_0000 & data) >>> 10   // 6 MSB
  return {
    raw: data,
    average: { raw: angle, degrees: Number.parseFloat((angle / 10).toFixed(1)) },
    deviation: { raw: deviation, degrees: Number.parseFloat((deviation / 4).toFixed(2)) },
  }
}

export const getLineSNR = (snr: number) => {
  if (snr > 25) return { signal: 'strong', raw: snr }
  if (snr > 6) return { signal: 'regular', raw: snr }
  return { signal: 'weak', raw: snr }
}

export const getLinesTemperature = (temperature: number) => ({
  raw: temperature,
  celsius: Number.parseFloat(((temperature - 50) / 10).toFixed(1)),
})
```

**Depth-sensor decode (8 LSB tilt + 8 MSB depth) is NOT implemented anywhere today** — cru's
description only. It has no counterpart in the source, so there is nothing to carry over beyond the
bit split itself.
