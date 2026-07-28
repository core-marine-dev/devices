# Package inventory

State as of **2026-07-28** (branch `dev`). CMA = the unified output format, see [CMA.md](CMA.md).
Shared base = the private `@coremarine/protocol-core` (`Parser`/`StringParser`/`BinaryParser`,
`DeviceParser<B>` contract, `Result`, CMA schemas), bundled into each parser via tsup `noExternal`.

## Libraries

| Package | Version | Output | On `protocol-core` | Parser API |
| --- | --- | --- | --- | --- |
| `@coremarine/nmea-parser` | **3.1.0** (npm) | **CMA** | ✅ reference impl | `new X({memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/norsub-emru` | 2.1.0 | legacy (extends pre-3.0 nmea-parser) | ❌ **in progress** | `parseData(text)` — does not build |
| `@coremarine/septentrio-sbf` | 1.0.1 | legacy `SBFResponse` | ❌ | `addData(buf)` + `parseData()` |
| `@coremarine/sbg-ecom` | 0.0.1 | legacy `SBGFrameResponse` | ❌ | `addData(buf)` + `getFrames()` |
| `@coremarine/thelmabiotel-tblive` | 1.0.3 | **CMA-shaped** (not on the base class) | ❌ | `addData(str)` + `parseData()` |

All: `type: module`, dual ESM/CJS via tsup `exports`, MIT. `engines.node`: `>=22` on nmea-parser (the
two latest LTS are what we test); the other four still say `>= 18` — tighten each as it is refactored.

### Per-library notes / known issues

- **nmea-parser** — the finished CMA reference: `NMEAParser extends StringParser`, `CMA[]` output,
  3-level metadata (sentence / field / payload), timestamp metadata, `Result` pattern, knowledge fed by
  YAML string (`addSentences`) or the generated built-in (`protocols/nmea.yml` → `src/nmea.ts`). Since
  3.1.0 it exposes two `protected` extension points for device parsers built on top —
  `registerProtocols` and `registerAggregators` — see its README §"Extending" and
  `tests/extension.test.ts`. Remaining cruft: a committed `legacy/` folder + stray root files
  (`morenmea.tss`).
- **norsub-emru** — **next in the rollout, design locked** (see `STATUS.md` §"Phase 3 — norsub-emru:
  locked design"). Today it is pre-3.0 legacy and does **not build** (imports removed types, calls
  `addProtocols`, overrides `parseData`, overwrites `metadata`). Target: a device facade
  (`implements DeviceParser<string>`, one protocol active at a time) composing
  `NorsubNMEAParser extends NMEAParser`, which registers the generated NORSUB definitions + status
  aggregators. Also broken today: `protocols` script (missing `js-yaml` devDep, and the generator's
  output symbol doesn't match `src/norsub.ts`), and its CI workflow builds `nmea-parser` without
  building `protocol-core` first.
- **septentrio-sbf** — SBF binary (GNSS). One firmware: `4.10.1` (`src/firmware/4-10-1/` —
  ReceiverTime, PVT group, Attitude group). Deps: `crc`, `gpstime`. Well tested (54/54). Will want a
  `sentenceTimestamp` override for TOW+WNc when refactored.
- **sbg-ecom** — sbgECom binary (INS). Firmware `2.3`, 22 LOG parsers (see [SBG-REPORT.md](SBG-REPORT.md));
  CMD/HIGH_FREQ/NMEA/THIRD_PARTY classes are placeholders. Issues: **no test specs at all** (only
  fixtures, CI test step commented out); `schemas` export commented out; API named `getFrames()`
  instead of `parseData()`; several `*.dev.md` scratch files; README is 135 bytes.
- **thelmabiotel-tblive** — TB-Live hydrophone text protocol. CMA-shaped already (plus extra top-level
  `mode`/`firmware` keys, which move into `metadata` when it adopts the base class). Build script lacks
  the `format` prestep the others have.

## Node-RED components

Node id is `cma-<device>` in all of them.

| Package | Version | Sibling dep | Tests | Notes |
| --- | --- | --- | --- | --- |
| nmea-parser-nodered | **2.0.1** (npm) | `workspace:^` → `^3.0.2` | `node:test`, **enabled in CI** (19/19) | **The template.** TS → tsup → CJS, pure `src/lib.ts` + thin `src/parser.ts`, real-headless-node-red integration test, `dev-server.mjs` (no docker), examples shipped in `examples/` |
| norsub-emru-nodered | 1.3.0 | `workspace:^` | mocha, CI test job disabled | next wrapper to refactor; still JS + docker |
| septentrio-sbf-nodered | 1.0.1 | `workspace:^` | mocha, CI test job disabled | `test:vitest` script but no vitest.config.ts |
| sbg-ecom-nodered | 0.0.2 | `workspace:^` | mocha, CI test job disabled | ships bin/csv fixtures |
| thelmabiotel-tblive-nodered | 1.0.0 | `workspace:^` | `test` script but **no specs** | commits Node-RED runtime junk in `tests/nodered/data/`; extra `receiver` node only in the docker mirror |

The four un-refactored wrappers still use mocha + `node-red-node-test-helper` (which is **incompatible
with node-red 5** — that is why their CI test jobs are disabled) and a docker env for manual tests.
Each gets the nmea-parser-nodered treatment as its library is refactored: TS + tsup + `node:test` +
`dev-server.mjs`, `engines.node >=22`, `node-red.version >=4.0.0`, `"!**/*.backup"` in `files`,
CI test job re-enabled.

Cross-cutting inconsistencies to fix as each is touched:

- All five declare `main: index.js` but no `index.js` exists.
- `tests/nodered/components/` duplicates `src/` (intentional docker mirror, but easy to desync) — the
  refactored nmea wrapper dropped it entirely.
- Dockerfiles still `npm i` inside the container.

## Future parsers (parked in `misc/todo/`, local only, not in workspaces)

- `misc/todo/ublox-ubx` — u-blox UBX binary protocol (scaffold + interface PDF).
- `misc/todo/vectornav` — VectorNav binary/NMEA (scaffold + user manual PDF).
