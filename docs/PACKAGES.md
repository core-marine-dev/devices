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
| `@coremarine/nmea-parser` | **6.0.0** (unreleased; 5.0.0 on npm) | **CMA** | ✅ reference impl | `new X({memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/norsub-emru` | **6.0.0** (unreleased; 5.0.0 on npm) | **CMA** | ✅ via nmea-parser | `new X({protocol?,memory?,bufferLimit?})` + `addData` / `parseData` |
| `@coremarine/septentrio-sbf` | **2.0.0** (unreleased) | **CMA** | ✅ | `new X({protocol?,firmware?,memory?,bufferLimit?})` + `addData(u8)` / `parseData(): CMA[]` |
| `@coremarine/sbg-ecom` | 0.0.1 | legacy `SBGFrameResponse` | ❌ **NEXT** | `addData(buf)` + `getFrames()` |
| `@coremarine/thelmabiotel-tblive` | **3.0.0** (unreleased; 2.0.0 on npm) | **CMA** | ✅ | `addData(str)` + `parseData(): CMA[]` |

All: `type: module`, dual ESM/CJS via tsup `exports`, MIT. `engines.node` is `>=22` on the four
refactored libraries; **`sbg-ecom` still says `>= 18`** (tighten it when it is refactored), and so does
**`protocol-core`** — harmless, since it is private and never published, but it is the only floor a
consumer never sees.

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
  [`CMA.md`](CMA.md). **In 5.0.0 (published):** `getSentence`/`getFakeSentenceByID` renamed to
  `getSentenceDefinition`/`getFakeSentence`, both returning a `Result` with a SINGLE
  `{ kind, message }` error. **New in 6.0.0 (unreleased):** the rest of the shared introspection
  contract — `sentenceIds` — plus three breaking changes, all verified by diffing the published
  tarball's `.d.ts` and running it side by side: every `Result` error side is now an **array**
  (`addSentences`, `getSentenceDefinition`, `getFakeSentence` — so a consumer reading
  `.error.message` gets `undefined`, which is exactly what broke the wrappers); `protocol` selects
  WHICH definition of an id is used (new `unknown-protocol` error kind); and `getFakeSentence` is
  **idempotent** (it used to call `Math.random()` per field, so a fixture could not be committed) with
  `{ random: true }` as the opt-out. **The "remaining cruft" this note used to list is gone:** the
  `legacy/` folder and `morenmea.tss` are no longer in the package — they live under
  `misc/parsers/nmea/`, local and untracked, per the `misc/` convention in
  [`ARCHITECTURE.md`](ARCHITECTURE.md).
- **norsub-emru** — refactored onto CMA. **4.0.0 inherited both nmea-parser 4.0.0 changes with no
  source change of its own; 6.0.0 does change its own source** — it DELEGATES the three introspection
  members (`sentenceIds`, `getSentenceDefinition`, `getFakeSentence`) to the active protocol parser,
  the one exception to its otherwise deliberate non-delegation, because they are the shared contract. A
  failure adds an `inactive-protocol` error, since a lookup failing means the *selected* protocol does
  not define the id — not that the device cannot speak it. `NorsubParser implements
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
  - **ALL 108 BLOCKS of Appendix B are modelled** — confirmed at runtime: `parser.sentenceIds.length`
    is **108**. They span all 16 §4.2 categories but sit in **11 folders**
    (`src/firmware/4-10-1/<Category>/`), which is deliberate: the six decoded-message categories
    (§4.2.3–4.2.8, one per constellation) share `DecodedMessage/`, and `LBandTrackerStatus` sits in
    `LBand/` next to `LBandBeams` while the other 14 status blocks are in `Status/`. Each block keeps
    its verbatim datasheet table as a comment, and the per-category tally in
    `firmware/4-10-1/index.ts` sums to exactly 108. ⚠️ One thing to straighten out when someone has the
    guide open: that tally's parenthetical calls `LBandTrackerStatus` "the 14th" Status block, but
    `Status/` already contains 14 without it — the totals are right, the note is confused, and which
    §4.2.x the guide really files it under is unverified here.
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
  - Runtime-agnostic, **measured on `dist/index.js`**: zero `node:` imports, zero `Buffer` API calls
    (`Buffer.from`/`alloc`/`isBuffer`), and exactly one external import
    (`crc/calculators/crc16xmodem` — the subpath, so no `buffer` polyfill). `Math.random` appears
    **once**, and only there: core's `generator` returns it for the `{ random: true }` opt-in of
    `getFakeSentence`. The parse path has none, which is the property that matters — but the bundle is
    not literally free of it, as an earlier version of this note claimed.
    `gpstime` is **gone** (it was the source of the ms-vs-s timestamp bug and needed a hand-written
    `.d.ts`); GPS-epoch logic moved into `protocol-core`.
  - **190 tests**, 24 committed binary fixtures from real receivers (108 KB, not shipped — `files:
    ["dist"]`), and **every frame in every capture decodes**. Re-measured 2026-07-31 over all **five**
    captures in `misc/parsers/septentrio/captures/` (492 KB, **4092 sentences**): **0 garbage, 0 errors,
    0 unmodelled** — the metric went 1080 → 705 → 0 over the refactor. Reading that measurement
    correctly matters: 570 of those sentences have an EMPTY `payload` and are **not** gaps. They are the
    `opaque` blocks whose layout Septentrio does not publish (`Meas3Ranges`, `PVTSupport`,
    `PVTSupportA` — body at `metadata.body`) and the end-of-epoch markers that genuinely have no body
    (`EndOfMeas`, `EndOfPVT`). All five carry `metadata.name`, i.e. they are modelled; a truly
    unmodelled block is the one with no name.
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
  - Its **Node-RED wrapper is rebuilt** and aligned at `2.0.0` (see the Node-RED table). ⏭️ Still open:
    **add the NMEA protocol to the facade** (§QUEUED in [`STATUS.md`](STATUS.md)) — note
    `EncapsulatedOutput` 4097 can carry NMEA *inside* SBF. The other QUEUED item, re-releasing
    nmea/norsub/tblive, is **absorbed into this release**: they are not being republished merely
    because `protocol-core` gained code, they are **major-bumped** because their own APIs broke.
- **sbg-ecom** — sbgECom binary (INS). Firmware `2.3`, 22 LOG parsers (see [SBG-REPORT.md](SBG-REPORT.md));
  CMD/HIGH_FREQ/NMEA/THIRD_PARTY classes are placeholders. Issues: **no test specs at all** (only
  fixtures, CI test step commented out); `schemas` export commented out; API named `getFrames()`
  instead of `parseData()`; several `*.dev.md` scratch files; README is 135 bytes.
- **thelmabiotel-tblive** — TB Live hydrophone text protocol, **refactored onto CMA and published as
  `2.0.0` on 2026-07-30; now `3.0.0` in-tree, unreleased** (its error side became `ParserError[]`).
  `TBLiveParser extends StringParser`. The protocol has **no framing**
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
  for remote diagnosis), both returning a `Result` rather than `null` — with a `ParserError[]` error
  side since 3.0.0, so every reason a request was refused survives with its own `kind`. **260 tests**;
  coverage measured 2026-07-31 at **100% statements / lines / functions and 96.19% branches**
  (456/456, 93/93, 402/402, 278/289). The floor enforced in `vitest.config.ts` is lower on purpose —
  **95% statements / 90% branches** — so a genuinely unreachable branch does not fail the build; do not
  read the achieved numbers as the enforced ones.

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

**Four pairs are AHEAD of npm, three of them with a BREAKING change — bumped 2026-07-31, not yet
released.** `nmea-parser` and `norsub-emru` go **5.0.0 → 6.0.0**, `thelmabiotel-tblive` **2.0.0 →
3.0.0**, each with its wrapper; `septentrio-sbf` was already at `2.0.0` from `1.0.1`. The majors are
not a formality — the breaks were measured against the published tarballs, not assumed:
`.error.message` on a failed `Result` now reads `undefined` because the error side became an array,
`error.join('; ')` on tblive's now yields `[object Object]`, and `getFakeSentence` returns the same
string every call. Each one compiles and runs at the call site, which is why the version has to say so.

`sbg-ecom` is deliberately NOT bumped: it is untouched since `ef4480b` and does not depend on
`protocol-core` at all (only `crc`), so nothing about it changed.

**This is the one drift no test in this repo can catch.** The `version.unit.test.ts` guards compare a
wrapper to its *sibling library in the workspace* — verified 2026-07-31 by half-bumping a wrapper on
purpose, which does fail the suite — but nothing compares either of them to what is on npm. Publishing
a breaking change at an unchanged version would simply succeed.

## Node-RED components

Node types all start `cma-`, but they are **NOT uniform** — measured 2026-07-31 from each
`package.json`'s `node-red.nodes`, its `NODE_TYPE` constant and its `parser.html` (all three agree per
package):

| wrapper | node type |
| --- | --- |
| nmea-parser-nodered | `cma-nmea-parser` |
| norsub-emru-nodered | `cma-norsub-parser` |
| septentrio-sbf-nodered | `cma-septentrio-parser` |
| thelmabiotel-tblive-nodered | `cma-thelmabiotel-tblive` |
| sbg-ecom-nodered | `cma-sbg-ecom` |

Three carry a `-parser` suffix and two do not, and the device word is sometimes the library name and
sometimes short (`norsub`, `septentrio`). **This inconsistency is permanent by choice:** a node type is
the key deployed flows reference, so renaming one makes the node vanish from every flow already running
it. Do not "tidy" these. `node-red.version` is `>=4.0.0` on the four refactored wrappers and `>=3.0.0`
on `sbg-ecom-nodered`.

| Package | Version | Sibling dep | Tests | Notes |
| --- | --- | --- | --- | --- |
| nmea-parser-nodered | **6.0.0** (unreleased; 5.0.0 on npm) | `workspace:^` → `^6.0.0` | `node:test`, **enabled in CI** (28/28) | **The template.** `msg.protocols` renamed **`msg.sentences`** in 3.0.0, so both wrappers now agree. TS → tsup → CJS, pure `src/lib.ts` + thin `src/parser.ts`, real-headless-node-red integration test, `dev-server.mjs` (no docker), examples shipped in `examples/` |
| norsub-emru-nodered | **6.0.0** (unreleased; 5.0.0 on npm) | `workspace:^` → `^6.0.0` | `node:test`, **enabled in CI** (37/37) | Rebuilt from the nmea template. Adds a **protocol** selector (config + `msg.protocol`); `msg.protocols` renamed **`msg.sentences`** |
| septentrio-sbf-nodered | **2.0.0** (unreleased) | `workspace:^` → `^2.0.0` | `node:test`, **enabled in CI** (61/61) | Rebuilt from the nmea/tblive template 2026-07-31. Node type kept as `cma-septentrio-parser` so deployed flows survive. **The first BINARY wrapper**: `payload` takes a Buffer (base64 string / byte array also accepted), and `fake` hands back a Buffer. Adds **protocol** (norsub's channel) + **firmware** (tblive's) selectors, plus `msg.ids` / `msg.definition` / `msg.fake` for diagnosis |
| sbg-ecom-nodered | 0.0.2 | `workspace:^` | mocha, CI test job disabled | ships bin/csv fixtures |
| thelmabiotel-tblive-nodered | **3.0.0** (unreleased; 2.0.0 on npm) | `workspace:^` → `^3.0.0` | `node:test`, **enabled in CI** (45/45) | Rebuilt from the nmea template 2026-07-30. Node type kept as `cma-thelmabiotel-tblive` so deployed flows survive. Adds a **firmware** selector (config + `msg.firmware`), plus `msg.ids` / `msg.definition` / `msg.fake` for diagnosis; no `msg.sentences` (definitions are compiled in). Stray `peerDependencies: valibot` removed |

**`sbg-ecom-nodered` is the last un-refactored wrapper.** It still uses mocha +
`node-red-node-test-helper` (which is **incompatible with node-red 5** — that is why its CI test job
is disabled) and a docker env for manual tests. It gets the nmea-parser-nodered treatment when its
library is refactored: TS + tsup + `node:test` + `dev-server.mjs`, `engines.node >=22`,
`node-red.version >=4.0.0`, `"!**/*.backup"` + `"!**/*_cred.json"` in `files`, CI test job
re-enabled, plus the `tests/version.unit.test.ts` major-correlation guard.

### 🐛 The `Result`-error array change had broken all three existing wrappers — fixed

`protocol-core` making every `Result` error side an **array** (`ParserError[]`) — committed in
`da8c0db` — broke the three wrappers that read the old shape. Their own test suites caught it as soon
as they were run against the working tree — 4 failures — but nothing had run them since the change.

| wrapper | read | produced |
| --- | --- | --- |
| `nmea-parser-nodered` | `result.error.message` | `undefined` |
| `norsub-emru-nodered` | `result.error.message` | `undefined` |
| `thelmabiotel-tblive-nodered` | `result.error.join('; ')` (errors used to be `string[]`) | `[object Object]` |

Fixed at all 9 call sites with a shared `messages(errors)` helper per wrapper. **28/28 · 37/37 ·
45/45**, all green.

**The published packages were never affected** — published `nmea-parser@5.0.0` still returns a single
`{ kind, message }` (re-verified 2026-07-31 against the tarball from npm), so the published wrappers
match it. This was purely working-tree fallout — and it is exactly why each library must ship
**together with** its wrapper at the new major: a published wrapper reading the old error shape against
a library that returns the new one produces `undefined` where a message belongs.

The lesson worth keeping: these wrappers run their tests with **`tsx`, which strips types without
checking them**, and `<pkg>:nodered:lint` does not typecheck either — so a breaking library change is
invisible until the tests actually run. `npx tsc --noEmit -p tsconfig.json` inside a wrapper is the
check that finds it.

Cross-cutting inconsistencies to fix as each is touched:

- `sbg-ecom-nodered` declares `main: index.js` but has no `index.js` (verified 2026-07-31 — the file
  does not exist); the four refactored wrappers point at `dist/parser.js`.
- **The `misc/parsers/septentrio/samples/` corpus is 1.x-shaped and now unused.** Its 91 `.json`
  baselines are still the legacy `{ header, time, body }` output, not CMA, and nothing reads them — the
  package's specs use its own committed `tests/fixtures/` and the five `.sbf` files in
  `captures/`. Local and gitignored, so it harms nothing, but regenerate or drop it rather than
  trusting it as a baseline.
- `tests/nodered/components/` duplicates `src/` (intentional docker mirror, but easy to desync) —
  only `sbg-ecom-nodered` still has one; every refactored wrapper dropped it.
- `sbg-ecom-nodered`'s Dockerfile still `npm i`s inside the container. The other four replaced docker
  with `dev-server.mjs`.

## Future parsers (parked in `misc/todo/`, local only, not in workspaces)

- `misc/todo/ublox-ubx` — u-blox UBX binary protocol (scaffold + interface PDF).
- `misc/todo/vectornav` — VectorNav binary/NMEA (scaffold + user manual PDF).
