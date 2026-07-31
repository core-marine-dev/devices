# Package inventory

State as of **2026-07-31** (branch `dev`). CMA = the unified output format, see [CMA.md](CMA.md).
Shared base = the private `@coremarine/protocol-core` (`Parser`/`StringParser`/`BinaryParser`,
the `DeviceParser<B>` contract, `Result`, CMA schemas, plus `bytes.ts` cross-runtime Base64,
`gps.ts` GPS-epoch/leap-second helpers and `pseudorandom.ts` seeded generators), bundled into each
parser via tsup `noExternal`.

**`DeviceParser<B>` now REQUIRES the introspection surface** — `sentenceIds`,
`getSentenceDefinition(id, protocol?)`, `getFakeSentence(id, protocol?, options?)` — and the abstract
`Parser` base declares them abstract, so a parser that omits them does not compile. Every `Result`
error side is an **array** (`ParserError[]`): one call can be wrong for more than one reason.

## Libraries

| Package | Version | Output | On `protocol-core` | Parser API |
| --- | --- | --- | --- | --- |
| `@coremarine/nmea-parser` | **5.0.0** (npm) | **CMA** | ✅ reference impl | `new X({memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/norsub-emru` | **5.0.0** (npm) | **CMA** | ✅ via nmea-parser | `new X({protocol?,memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/septentrio-sbf` | **2.0.0** (unreleased) | **CMA** | ✅ | `new X({protocol?,firmware?,memory?,bufferLimit?})` + `addData(u8)` / `parseData(): CMA[]` |
| `@coremarine/sbg-ecom` | 0.0.1 | legacy `SBGFrameResponse` | ❌ **NEXT** | `addData(buf)` + `getFrames()` |
| `@coremarine/thelmabiotel-tblive` | **2.0.0** (npm) | **CMA** | ✅ | `addData(str)` + `parseData(): CMA[]` |

All: `type: module`, dual ESM/CJS via tsup `exports`, MIT. `engines.node` is `>=22` everywhere except
**`sbg-ecom`, which still says `>= 18`** — tighten it when it is refactored.

Test counts, measured 2026-07-31: `protocol-core` 43, `nmea-parser` 120, `norsub-emru` 48,
`septentrio-sbf` 190, `thelmabiotel-tblive` 260, `sbg-ecom` **0**.

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
  [`CMA.md`](CMA.md). **New in 5.0.0:** the shared introspection contract — `sentenceIds`, plus
  `getSentence`/`getFakeSentenceByID` renamed to `getSentenceDefinition`/`getFakeSentence` and both
  returning `Result` with an **array** error side; `protocol` now selects WHICH definition of an id is
  used; and `getFakeSentence` is **idempotent** (it used to call `Math.random()` per field, so a fixture
  could not be committed). Remaining cruft: a committed `legacy/` folder + stray root files
  (`morenmea.tss`).
- **norsub-emru** — refactored onto CMA. **4.0.0: inherits both nmea-parser 4.0.0 changes with no source change of its own.** `NorsubParser implements
  DeviceParser<string>` is a device facade that **composes** its protocol parser (one protocol active at a
  time, `protocol: 'nmea'` today) rather than extending one, so adding the binary protocols the device
  also supports (TSS1, Atlas, Ifremer Victor, Simrad EM 3000, custom) is additive. The protocol layer
  `NorsubNMEAParser extends NMEAParser` registers the generated NORSUB definitions via
  `registerProtocols` and 7 aggregators via `registerAggregators` (status × 6 + `PTVG:3`). Status lands at
  field **and** payload level for the five single-`uint32` sentences, payload-only for `PNORSUB7b`; the old
  top-level `metadata.status` is gone. No `sentenceTimestamp` override — `T1`/`T2` are a wrapping internal
  counter, so only `received`/`parsed` are emitted. Protocol-specific extras are reached through the
  `parser` getter, not delegated. 48/48 tests.

- **septentrio-sbf** — SBF binary (GNSS), **rewritten onto CMA 2026-07-31 (`2.0.0`, not yet
  released)**. `SeptentrioParser implements DeviceParser<Uint8Array>` is a device facade that
  **composes** its protocol parser (norsub's pattern — a Septentrio box can emit SBF, NMEA or RTCM on
  one port, so device ≠ protocol; `protocol: 'sbf'` today), and `SBFParser extends BinaryParser` is the
  protocol layer. Framing is length-prefixed with a CRC (§4.1.1), so there is no terminator: find the
  sync, trust `Length`, verify the CRC.
  - **Blocks are DESCRIBED, not hand-decoded.** Each block file declares its body as a table of field
    definitions in datasheet order and **one engine** (`src/engine.ts`) derives every byte offset,
    base64 `raw` slice, little-endian read, Do-Not-Use check, sub-block run, padding boundary and
    truncation error. Three consumers read the same table — `engine.ts` (parse), `fake.ts`
    (`getFakeSentence`), `introspect.ts` (`getSentenceDefinition`) — so they cannot disagree. Blocks add
    `decoders` (bitfields/enums/scaling → field metadata) and `payloadMetadata` (cross-field aggregates).
  - **ALL 108 BLOCKS of Appendix B are modelled**, all 16 §4.2 categories, one folder per category
    (`src/firmware/4-10-1/<Category>/`), each block keeping its verbatim datasheet table as a comment.
    Every block number **and name** is verified against Appendix B by script. **Seven are `opaque`** —
    the five `Meas3*` and the two `PVTSupport*`, for which Septentrio publishes no field layout at all —
    so their bodies go out as bytes at `metadata.body` rather than being invented into fields.
    (The Appendix B total is **108**, not the 107 quoted in older notes; it was counted block by block.)
  - **Four output tiers, nothing dropped silently:** decoded · identified-but-not-modelled (a block
    number from a *newer* firmware: real `id`, real timestamp, body in `raw`, `payload: []`, **no**
    errors — this is what makes it forward-safe) · failed (bad CRC / truncated → decoded as far as
    possible + `errors`) · garbage (coalesced junk).
  - **`cma.timestamp` is the RECEIVER's own GNSS time**, not the host clock — every block carries
    TOW+WNc and a GNSS clock is disciplined to atomic time. Leap seconds are learned in-band from
    `ReceiverTime.DeltaLS` with a core fallback table, and the firmware is learned from
    `ReceiverSetup.RxVersion` (an unmodelled version is *reported* via `errors` +
    `parser.reportedFirmware`, never substituted). **Signal-in-space blocks are NOT promoted** — their
    stamp is when the satellite transmitted the bits, which can be far in the past.
  - Runtime-agnostic: **no `node:` imports, no `Buffer` API, no `Math.random`** in the shipped bundle;
    one external import (`crc/calculators/crc16xmodem` — the subpath, so no `buffer` polyfill).
    `gpstime` is **gone** (it was the source of the ms-vs-s timestamp bug and needed a hand-written
    `.d.ts`); GPS-epoch logic moved into `protocol-core`.
  - **190 tests**, 24 committed binary fixtures from real receivers (108 KB, not shipped), and **every frame in every capture
    in `misc/parsers/septentrio/captures/` decodes** — 0 unmodelled, 0 errors, 0 garbage (that metric
    went 1080 → 705 → 0 over the refactor).
  - **Eight real bugs fixed on the way**, six of them in 1.x — ms-vs-s timestamp (dates were out by
    years), AttEuler's three rate fields rotated onto the wrong axes, `getPadding` throwing above 6
    padding bytes, a newer revision silently decoding as revision 0, rev-2 padding never populated,
    DOP/xPPSOffset Do-Not-Use and typo bugs — plus two introduced by the rewrite itself and caught
    later: `ExtEventBaseVectGeod` registered as **4216 instead of 4217** (invisible to a fake round
    trip, which builds the frame from the same wrong number), and **`bufferLimit` defaulting to 1024
    bytes**, smaller than the 1052/1060-byte `Commands` blocks this receiver emits, which destroyed
    them into garbage whenever they arrived in small serial chunks. Each is pinned by a spec.
  - README rewritten to the 2.0.0 API (the 1.x one documented `availableFirmwares`,
    `SBFParser(firmware, memory)` and `SBFResponse`), with an **Upgrading from 1.x** section.
  - Its **Node-RED wrapper is rebuilt** and aligned at `2.0.0` (see the Node-RED table). ⏭️ Still
    open: §QUEUED in [`STATUS.md`](STATUS.md) — re-release nmea/norsub/tblive because `protocol-core`
    gained code, and add the NMEA protocol to the facade (note `EncapsulatedOutput` 4097 can carry
    NMEA *inside* SBF).
- **sbg-ecom** — sbgECom binary (INS). Firmware `2.3`, 22 LOG parsers (see [SBG-REPORT.md](SBG-REPORT.md));
  CMD/HIGH_FREQ/NMEA/THIRD_PARTY classes are placeholders. Issues: **no test specs at all** (only
  fixtures, CI test step commented out); `schemas` export commented out; API named `getFrames()`
  instead of `parseData()`; several `*.dev.md` scratch files; README is 135 bytes.
- **thelmabiotel-tblive** — TB Live hydrophone text protocol, **refactored onto CMA and published
  2026-07-30 (`2.0.0` on npm)**. `TBLiveParser extends StringParser`. The protocol has **no framing**
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
  for remote diagnosis), both returning `Result` rather than `null`. **260 tests, 100%
  statements/lines/functions and 96% branches**, thresholds enforced in `vitest.config.ts`.

> **Flow-library listings are current** as of 2026-07-30 for nmea, norsub and tblive.
> `septentrio-sbf-nodered@2.0.0` is new and needs its flow-library entry once published.

## Version policy

**A library and its Node-RED wrapper share a MAJOR** (locked 2026-07-30): `<library>@N.x` is wrapped
by `<library>-nodered@N.x`, so the generation is readable off the version. Minors stay independent —
an additive library release often needs no wrapper change, and a wrapper-only feature should not force
a library release.

The mechanism is the `workspace:^` dependency, which pnpm packs as `^<library version>` — inside that
major and never the next. Each wrapper has a `tests/version.unit.test.ts` that fails if the two majors
drift apart.

**The `septentrio-sbf` pair spent this refactor VIOLATING it** — library `2.0.0`, wrapper `1.0.1` —
and that window is exactly what the guard exists for: a release would have shipped a wrapper calling
the removed `getFrames()` against a `workspace:^` dep that had quietly begun resolving to `^2.0.0`.
Nothing caught it, because that wrapper was one of the two without a `version.unit.test.ts` and its CI
test job was disabled. **Resolved 2026-07-31**: the pair is aligned at `2.0.0`, the guard is in place,
and CI runs it. `sbg-ecom` is now the only pair with no guard.

**⚠️ Three pairs are now AHEAD of npm with an unreleased BREAKING change.** `nmea-parser`,
`norsub-emru` and `thelmabiotel-tblive` (and their wrappers) still carry their published versions —
`5.0.0` / `5.0.0` / `2.0.0` — but on `dev` their `Result` error side is an array and their fake
sentences are idempotent. **They must not be published at those versions**; the bumps are part of the
release that closes §QUEUED item 1, and each pair moves a major together. The `version.unit.test.ts`
guards compare a wrapper to its *sibling library*, so they say nothing about npm — this is the one
drift no test in the repo can catch.

## Node-RED components

Node id is `cma-<device>` in all of them.

| Package | Version | Sibling dep | Tests | Notes |
| --- | --- | --- | --- | --- |
| nmea-parser-nodered | **5.0.0** (npm) | `workspace:^` → `^5.0.0` | `node:test`, **enabled in CI** (28/28) | **The template.** `msg.protocols` renamed **`msg.sentences`** in 3.0.0, so both wrappers now agree. TS → tsup → CJS, pure `src/lib.ts` + thin `src/parser.ts`, real-headless-node-red integration test, `dev-server.mjs` (no docker), examples shipped in `examples/` |
| norsub-emru-nodered | **5.0.0** (npm) | `workspace:^` → `^5.0.0` | `node:test`, **enabled in CI** (37/37) | Rebuilt from the nmea template. Adds a **protocol** selector (config + `msg.protocol`); `msg.protocols` renamed **`msg.sentences`** |
| septentrio-sbf-nodered | **2.0.0** (unreleased) | `workspace:^` → `^2.0.0` | `node:test`, **enabled in CI** (61/61) | Rebuilt from the nmea/tblive template 2026-07-31. Node type kept as `cma-septentrio-parser` so deployed flows survive. **The first BINARY wrapper**: `payload` takes a Buffer (base64 string / byte array also accepted), and `fake` hands back a Buffer. Adds **protocol** (norsub's channel) + **firmware** (tblive's) selectors, plus `msg.ids` / `msg.definition` / `msg.fake` for diagnosis |
| sbg-ecom-nodered | 0.0.2 | `workspace:^` | mocha, CI test job disabled | ships bin/csv fixtures |
| thelmabiotel-tblive-nodered | **2.0.0** (npm) | `workspace:^` → `^2.0.0` | `node:test`, **enabled in CI** (45/45) | Rebuilt from the nmea template 2026-07-30. Node type kept as `cma-thelmabiotel-tblive` so deployed flows survive. Adds a **firmware** selector (config + `msg.firmware`), plus `msg.ids` / `msg.definition` / `msg.fake` for diagnosis; no `msg.sentences` (definitions are compiled in). Stray `peerDependencies: valibot` removed |

**`sbg-ecom-nodered` is the last un-refactored wrapper.** It still uses mocha +
`node-red-node-test-helper` (which is **incompatible with node-red 5** — that is why its CI test job
is disabled) and a docker env for manual tests. It gets the nmea-parser-nodered treatment when its
library is refactored: TS + tsup + `node:test` + `dev-server.mjs`, `engines.node >=22`,
`node-red.version >=4.0.0`, `"!**/*.backup"` + `"!**/*_cred.json"` in `files`, CI test job
re-enabled, plus the `tests/version.unit.test.ts` major-correlation guard.

### 🐛 The `Result`-error array change had broken all three existing wrappers — fixed

`protocol-core` making every `Result` error side an **array** (`ParserError[]`) is part of the
UNCOMMITTED septentrio work, and it broke the three wrappers that read the old shape. Their own test
suites caught it as soon as they were run against the working tree — 4 failures — but nothing had run
them since the change.

| wrapper | read | produced |
| --- | --- | --- |
| `nmea-parser-nodered` | `result.error.message` | `undefined` |
| `norsub-emru-nodered` | `result.error.message` | `undefined` |
| `thelmabiotel-tblive-nodered` | `result.error.join('; ')` (errors used to be `string[]`) | `[object Object]` |

Fixed at all 9 call sites with a shared `messages(errors)` helper per wrapper. **28/28 · 37/37 ·
45/45**, all green.

**The published packages were never affected** — published `nmea-parser@5.0.0` still returns a single
`{ kind, message }`, so the published wrappers match it. This was purely uncommitted-tree fallout, and
it is exactly why §QUEUED re-releases all three: they must ship together with the array change.

The lesson worth keeping: these wrappers run their tests with **`tsx`, which strips types without
checking them**, and `<pkg>:nodered:lint` does not typecheck either — so a breaking library change is
invisible until the tests actually run. `npx tsc --noEmit -p tsconfig.json` inside a wrapper is the
check that finds it.

Cross-cutting inconsistencies to fix as each is touched:

- `sbg-ecom-nodered` declares `main: index.js` but has no `index.js`; the four refactored
  wrappers point at `dist/parser.js`.
- `tests/nodered/components/` duplicates `src/` (intentional docker mirror, but easy to desync) —
  only `sbg-ecom-nodered` still has one; every refactored wrapper dropped it.
- `sbg-ecom-nodered`'s Dockerfile still `npm i`s inside the container. The other four replaced docker
  with `dev-server.mjs`.

## Future parsers (parked in `misc/todo/`, local only, not in workspaces)

- `misc/todo/ublox-ubx` — u-blox UBX binary protocol (scaffold + interface PDF).
- `misc/todo/vectornav` — VectorNav binary/NMEA (scaffold + user manual PDF).
