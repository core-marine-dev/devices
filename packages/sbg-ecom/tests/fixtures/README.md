# sbg-ecom test corpus

Real captures from a CoreMarine SBG Ellipse. **Every number below was measured, not estimated** — walk
for `FF 5A`, `LEN` uint16LE at `+4`, require ETX `0x33` at `+6+LEN+2`, compare
`crc16kermit(bytes[i+2 .. i+6+LEN])` against the uint16LE at `+6+LEN`.

These three files are the **only copy of this device's output that exists in git**. The captures they
were carved from (`tests/sbg_*.csv`, `tests/sbg-raw.bin`) are gitignored and live on cru's disk alone,
so do not delete these without putting something equally verified in their place.

| file | bytes | frames | CRC-valid | complete `$GPGGA` | malformed runs | log ids (class 0) |
| --- | --- | --- | --- | --- | --- | --- |
| `stream-mixed.bin` | 3,840 | 71 | **71 (100%)** | **3** | **0** | `1`×2 `2`×2 `6`×21 `9`×22 `13`×11 `14`×11 `15`×2 |
| `stream-lossy.bin` | 698 | 13 | 13 (100%) | 0 | **1** | `6`×4 `9`×4 `13`×2 `14`×2 `15`×1 |
| `stream-logs.bin` | 11,776 | 249 | 249 (100%) | 1 | 2 | `1` `2` `3` `4` `7` `8` `9` `13` `14` `15` `36` `44` |

Together they cover **13 distinct log types**. The other implemented logs (`5` MAG_CALIB, `16`/`17`/`18`
GPS2, `19` ODO, `29`/`30` DVL, `31`/`38` GPS RAW, `32` SHIP_MOTION_HP, `37` USBL, `47` DEPTH) have no
capture anywhere and are datasheet-only — treat their field tables as unverified against hardware.

All three are **contiguous slices** cut on frame boundaries, not concatenations of hand-picked frames.
That matters: the value of these files is the byte stream exactly as the device emitted it.

## `stream-mixed.bin` — the interleaving proof, clean

Carved from `sbg_2000.csv`. Three plain-ASCII `$GPGGA` sentences sit **between binary frames with zero
gap on either side** — the device emits NMEA as raw text alongside eCom (manual §2.1.4), so one buffer
holds two framings. This slice was chosen to contain **no lossy spot**, so the expectation is exact:

> **71 eCom CMAs + 3 NMEA CMAs, no `errors` on any of them, and zero garbage sentences.**

Any change to `extractSentences` must keep that true. `EKF_EULER` (id `6`) appears **only** in the CSV
captures, which is why this slice exists at all — the `.bin` capture below does not contain a single one.

## `stream-lossy.bin` — dropped bytes on the line

The source capture has **9 places where bytes went missing mid-sentence or mid-frame**, and this 698-byte
slice contains one of them: an **orphan GGA tail** whose head never arrived —

```
,W,1,19,2.6,603.963,M,50.238,M,,*71\r\n
```

It follows a complete frame directly (`… 30 71 33` then `,W,1,19…`), so it is not an artefact of the cut.
The expectation here is the opposite of the file above: **13 eCom CMAs plus one garbage sentence** whose
`raw` holds those 37 bytes. This is what a real serial line does, and the parser must report it rather
than drop it silently.

## `stream-logs.bin` — the breadth capture

`tests/sbg-raw.bin` verbatim (md5 `24ea8f368496a1ce3b7a6e461ebef07b`), the same bytes the Node-RED
wrapper ships in `examples/`. Twelve log types including the inertial ones (`3` IMU_DATA, `4` MAG,
`7` EKF_QUAT, `8` EKF_NAV, `36` AIR_DATA, `44` IMU_SHORT) that the CSVs lack.

Two malformed runs, both worth a test of their own:

- a ~40-byte binary fragment — the tail of a frame whose header was lost ⇒ **garbage**;
- **a single trailing `0xFF`, the very last byte of the file.** That is a truncated sync, not junk: it
  must stay **PENDING on the buffer**, never be emitted as garbage, or a frame split across two chunks
  would be destroyed. Septentrio's `blockAt` has exactly this rule; sbg needs it too.

## What was deleted, and why

`tests/sbg.bin` was removed on 2026-08-01. It had **320 well-framed frames and 0 that passed CRC** —
framing intact, payload bytes mangled by whatever produced the file. It was never tracked, so nothing is
lost from history. It is worth knowing it existed: it is the reason the legacy parser looked broken. Fed
clean bytes, that parser named every frame it was given.
