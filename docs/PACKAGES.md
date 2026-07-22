# Package inventory

State as of 2026-07-08 (branch `dev`). CMA = the unified output format, see [CMA.md](CMA.md).

## Libraries

| Package | Version | Output | Validation | Parser API |
| --- | --- | --- | --- | --- |
| `@coremarine/nmea-parser` | 2.2.1 | legacy `NMEASentence` | SchemasJS + valibot | `parseData(text)` |
| `@coremarine/norsub-emru` | 2.1.0 | legacy (extends nmea-parser) | SchemasJS + valibot | `parseData(text)` |
| `@coremarine/septentrio-sbf` | 1.0.1 | legacy `SBFResponse` | **none** | `addData(buf)` + `parseData()` |
| `@coremarine/sbg-ecom` | 0.0.1 | legacy `SBGFrameResponse` | **none** | `addData(buf)` + `getFrames()` |
| `@coremarine/thelmabiotel-tblive` | 1.0.3 | **CMA-shaped** | SchemasJS + valibot | `addData(str)` + `parseData()` |

All: `type: module`, dual ESM/CJS via tsup `exports`, `engines.node >= 18`, MIT.

### Per-library notes / known issues

- **nmea-parser** — NMEA 0183 (standard + proprietary; protocols added at runtime via
  `addProtocols` or regenerated from YAML with the `protocols` script → `src/nmea.ts`).
  Issues: `src/types.ts` swaps `Float32`/`Float64` (each aliases the other's schema);
  a committed `legacy/` folder with the old parser; stray root files (`morenmea.tss`).
- **norsub-emru** — `NorsubParser extends NMEAParser`; adds decoded status bitfield to
  `metadata.status` for `PNORSUB*` sentences. Depends on `@coremarine/nmea-parser ^2.2.0`.
- **septentrio-sbf** — SBF binary (GNSS). One firmware supported: `4.10.1`
  (`src/firmware/4-10-1/` — ReceiverTime, PVT group, Attitude group). Deps: `crc`, `gpstime`.
  Issue: `types` build script hand-copies `gpstime.d.ts` into root `node_modules/@types/` (hack;
  will break under pnpm's strict layout).
- **sbg-ecom** — sbgECom binary (INS). Firmware `2.3`, 22 LOG parsers
  (see [SBG-REPORT.md](SBG-REPORT.md)); CMD/HIGH_FREQ/NMEA/THIRD_PARTY classes are placeholders.
  Issues: **no test specs at all** (only fixtures); `schemas` export commented out (no
  `schemas.ts` exists); API named `getFrames()` instead of `parseData()` (inconsistent);
  several `*.dev.md` scratch files; README is 135 bytes. Pre-release (0.0.1) — the natural
  first target for the CMA rollout.
- **thelmabiotel-tblive** — TB-Live hydrophone text protocol. The **only CMA-conformant**
  parser (plus extra top-level `mode`/`firmware` keys). Build script lacks the `format` prestep
  the others have.

## Node-RED components

All: Mocha + `node-red-node-test-helper`, docker env for manual tests, node id `cma-<device>`.

| Package | Version | Depends on sibling | Notes |
| --- | --- | --- | --- |
| nmea-parser-nodered | 1.2.1 | `^2.2.1` ✓ | extra vitest setup alongside mocha |
| norsub-emru-nodered | 1.3.0 | `^2.1.0` ✓ | cleanest, most pattern-conformant |
| septentrio-sbf-nodered | 1.0.1 | `^1.0.1` ✓ | `test:vitest` script but no vitest.config.ts |
| sbg-ecom-nodered | 0.0.2 | `>=0.0.1` (loose) | vitest setup; ships bin/csv fixtures |
| thelmabiotel-tblive-nodered | 1.0.0 | `>=1.0.2` (loose) | commits Node-RED runtime junk in `tests/nodered/data/` (`.config.*.json`, backups); has an extra `receiver` node only in the docker mirror |

Cross-cutting inconsistencies to fix eventually:

- Sibling dep ranges: three pin `^exact`, two use open `>=`.
- All five declare `main: index.js` but no `index.js` exists.
- `tests/nodered/components/` duplicates `src/` (intentional docker mirror, but easy to desync).

## Future parsers (parked in `misc/todo/`, local only, not in workspaces)

- `misc/todo/ublox-ubx` — u-blox UBX binary protocol (scaffold + interface PDF).
- `misc/todo/vectornav` — VectorNav binary/NMEA (scaffold + user manual PDF).
