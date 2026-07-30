# Package inventory

State as of **2026-07-29** (branch `dev`). CMA = the unified output format, see [CMA.md](CMA.md).
Shared base = the private `@coremarine/protocol-core` (`Parser`/`StringParser`/`BinaryParser`,
`DeviceParser<B>` contract, `Result`, CMA schemas), bundled into each parser via tsup `noExternal`.

## Libraries

| Package | Version | Output | On `protocol-core` | Parser API |
| --- | --- | --- | --- | --- |
| `@coremarine/nmea-parser` | **4.0.0** (npm) | **CMA** | ✅ reference impl | `new X({memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/norsub-emru` | **4.0.0** (npm) | **CMA** | ✅ via nmea-parser | `new X({protocol?,memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/septentrio-sbf` | 1.0.1 | legacy `SBFResponse` | ❌ | `addData(buf)` + `parseData()` |
| `@coremarine/sbg-ecom` | 0.0.1 | legacy `SBGFrameResponse` | ❌ | `addData(buf)` + `getFrames()` |
| `@coremarine/thelmabiotel-tblive` | **2.0.0** (unreleased) | **CMA** on `protocol-core` | ✅ | `addData(str)` + `parseData(): CMA[]` |

All: `type: module`, dual ESM/CJS via tsup `exports`, MIT. `engines.node`: `>=22` on nmea-parser and
norsub-emru (the two latest LTS are what we test); the other three still say `>= 18` — tighten each as it
is refactored.

### Per-library notes / known issues

- **nmea-parser** — the finished CMA reference: `NMEAParser extends StringParser`, `CMA[]` output,
  3-level metadata (sentence / field / payload), timestamp metadata, `Result` pattern, knowledge fed by
  YAML string (`addSentences`) or the generated built-in (`protocols/nmea.yml` → `src/nmea.ts`). Since
  3.1.0 it exposes `protected` extension points for device parsers built on top —
  `registerProtocols` and `registerAggregators` — see its README §"Extending" and
  `tests/extension.test.ts`. **New in 4.0.0 (2026-07-29):** (a) **no input is dropped
  silently** — malformed sentences are emitted with `errors[]` and undecodable input as *garbage
  sentences* (`src/sentences.ts` `scanBuffer`), and `bufferLimit` is finally enforced; (b) **sentence
  resolvers** (`src/resolvers.ts`, third extension point `registerResolvers`) split one wire id into
  several definitions — built-in `$PSXN` → `PSXN20`/`PSXN23` (Kongsberg Seatex). Both in
  [`CMA.md`](CMA.md). Remaining cruft: a committed `legacy/` folder + stray root files (`morenmea.tss`).
- **norsub-emru** — refactored onto CMA. **4.0.0: inherits both nmea-parser 4.0.0 changes with no source change of its own.** `NorsubParser implements
  DeviceParser<string>` is a device facade that **composes** its protocol parser (one protocol active at a
  time, `protocol: 'nmea'` today) rather than extending one, so adding the binary protocols the device
  also supports (TSS1, Atlas, Ifremer Victor, Simrad EM 3000, custom) is additive. The protocol layer
  `NorsubNMEAParser extends NMEAParser` registers the generated NORSUB definitions via
  `registerProtocols` and 7 aggregators via `registerAggregators` (status × 6 + `PTVG:3`). Status lands at
  field **and** payload level for the five single-`uint32` sentences, payload-only for `PNORSUB7b`; the old
  top-level `metadata.status` is gone. No `sentenceTimestamp` override — `T1`/`T2` are a wrapping internal
  counter, so only `received`/`parsed` are emitted. Protocol-specific extras are reached through the
  `parser` getter, not delegated. 45/45 tests.

- **septentrio-sbf** — SBF binary (GNSS). One firmware: `4.10.1` (`src/firmware/4-10-1/` —
  ReceiverTime, PVT group, Attitude group). Deps: `crc`, `gpstime`. Well tested (54/54). Will want a
  `sentenceTimestamp` override for TOW+WNc when refactored.
- **sbg-ecom** — sbgECom binary (INS). Firmware `2.3`, 22 LOG parsers (see [SBG-REPORT.md](SBG-REPORT.md));
  CMD/HIGH_FREQ/NMEA/THIRD_PARTY classes are placeholders. Issues: **no test specs at all** (only
  fixtures, CI test step commented out); `schemas` export commented out; API named `getFrames()`
  instead of `parseData()`; several `*.dev.md` scratch files; README is 135 bytes.
- **thelmabiotel-tblive** — TB Live hydrophone text protocol, **refactored onto CMA 2026-07-30
  (`2.0.0`, not yet released)**. `TBLiveParser extends StringParser`. The protocol has **no framing**
  (command traffic has neither start flag nor terminator, and every response echoes its request), so
  `src/tokenizer.ts` matches every known token at every offset and reconciles overlaps with three
  rules: longest-match-wins, an `opaque` sentence swallows its interior (the `HE?` help dump only), and
  otherwise a token inside another's extent is **half-duplex interference** — the inner sentence is
  kept and the wrecked outer one reported as garbage, never recomposed. `src/definitions.ts` holds the
  17-sentence table as data. Firmware is **learned** (`FV=`, or `LIVECM` vs `TBRC`) and carried as
  `protocol.version`; `mode` is in `metadata`. Serial numbers are **strings** so the firmware's
  inconsistent padding survives. The emitter `data` field is emitted as an opaque `uint16` and
  **deliberately not decoded** — that encoding is CoreMarine's, so it belongs to the consumer.
  Six real bugs fixed on the way, incl. an empty `data` field being reported as a real 0.0°
  inclination. Exposes **`getFakeSentence(id, protocol, options?)`** (deterministic — the defaults are
  the datasheets' own example sentences) and **`getSentenceDefinition(id, protocol?)`** (self-description
  for remote diagnosis), both returning `Result` rather than `null`. **259 tests, 100%
  statements/lines/functions and 96% branches**, thresholds enforced in `vitest.config.ts`.

## Node-RED components

Node id is `cma-<device>` in all of them.

| Package | Version | Sibling dep | Tests | Notes |
| --- | --- | --- | --- | --- |
| nmea-parser-nodered | **3.0.0** (npm) | `workspace:^` → `^4.0.0` | `node:test`, **enabled in CI** (22/22) | **The template.** `msg.protocols` renamed **`msg.sentences`** in 3.0.0, so both wrappers now agree. TS → tsup → CJS, pure `src/lib.ts` + thin `src/parser.ts`, real-headless-node-red integration test, `dev-server.mjs` (no docker), examples shipped in `examples/` |
| norsub-emru-nodered | **3.0.0** (npm) | `workspace:^` → `^4.0.0` | `node:test`, **enabled in CI** (34/34) | Rebuilt from the nmea template. Adds a **protocol** selector (config + `msg.protocol`); `msg.protocols` renamed **`msg.sentences`** |
| septentrio-sbf-nodered | 1.0.1 | `workspace:^` | mocha, CI test job disabled | `test:vitest` script but no vitest.config.ts |
| sbg-ecom-nodered | 0.0.2 | `workspace:^` | mocha, CI test job disabled | ships bin/csv fixtures |
| thelmabiotel-tblive-nodered | **2.0.0** (unreleased) | `workspace:^` → `^2.0.0` | `node:test`, **enabled in CI** (42/42) | Rebuilt from the nmea template 2026-07-30. Node type kept as `cma-thelmabiotel-tblive` so deployed flows survive. Adds a **firmware** selector (config + `msg.firmware`), plus `msg.ids` / `msg.definition` / `msg.fake` for diagnosis; no `msg.sentences` (definitions are compiled in). Stray `peerDependencies: valibot` removed |

The two un-refactored wrappers still use mocha + `node-red-node-test-helper` (which is **incompatible
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
