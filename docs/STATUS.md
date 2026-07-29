# Devices repo — Working Status (resume here)

> **Living handoff doc ("cuaderno de bitácora").** If a session ends mid-work (AI provider
> limit, context loss, switching agents), a new agent — any provider — reads THIS file to
> continue. Everything authoritative lives in the repo, not in any tool's memory.
>
> **🔄 Maintenance rule (for ANY agent working in this repo):** after every meaningful change —
> a refactor step, a locked decision, a commit, or a shift in what's next — check whether this
> doc is still accurate and, if not, **update it in the same turn**. Do NOT wait for the end of
> the session: limits hit without warning. Keeping "Where we are now", "Next steps" and "HEAD"
> current is the entire purpose of this file.
>
> **Last updated:** 2026-07-29 · **Branch:** `dev`. **NMEA CMA refactor (slice A–F) +
> STEP 1 (3-level metadata) + STEP 2 (Result pattern) + STEP 3 (timestamp metadata, core-wide) are
> done & green.** Repo was idle 2025-12-15 → 2026-07-08.
>
> **🎉 2026-07-24 — PHASE 1 + PHASE 2 SHIPPED. `@coremarine/nmea-parser@3.0.2` AND
> `@coremarine/nmea-parser-nodered@2.0.1` are LIVE on npm** (PR [#70](https://github.com/core-marine-dev/devices/pull/70)
> merged `dev`→`main` at 10:32 UTC; `main` @ `290a38f`). nmea-parser is the finished CMA reference lib
> **and** its Node-RED wrapper is done + published — both the lib pattern and the wrapper template are
> now proven end-to-end. **NEXT = PHASE 3: `norsub-emru` (lib refactor) then its `-nodered` wrapper.**
> See the paste-ready **"Phase 3 handoff prompt"** at the very end of this doc.
>
> **✅ Branch sync DONE.** `dev` (`a76856b`) already contains the `290a38f` merge commit — nothing to
> do (only the stale local `main` ref is behind; harmless).
>
> **🟡 2026-07-29 (later) — cru's two remaining data decisions APPLIED, and they pull `nmea-parser` into
> this release as `3.2.0`.** (1) **`version: '1.2.0'` on all 12 protocols in `norsub.yml`** (the OEM manual
> revision) — NorSub CMAs no longer say `version: "unknown"`. (2) **`float32` → `float64` swept through
> `nmea.yml` too** (68 fields). That second one changes `nmea-parser`'s OWN published output, so the lib is
> bumped **3.1.0 → 3.2.0** and must be published alongside `norsub-emru@3.0.0`. **The wrapper needs NO
> change** (`^3.0.2` already accepts it; re-verified 19/19 against the changed lib). Detail + the
> semver reasoning: §"2026-07-29 (later) — data decisions" in Done.
>
> **🟢 2026-07-29 — PHASE 3, TASK 3a: the `norsub-emru` LIBRARY REWRITE IS CODE-COMPLETE AND GREEN
> (uncommitted — cru to review).** All 7 steps of the Phase 3 coding prompt are done: package plumbing,
> a NEW SHARED protocols generator, `NorsubNMEAParser extends NMEAParser` (7 aggregators), the
> `NorsubParser implements DeviceParser<string>` facade, a rewritten 45-spec suite, a from-scratch README,
> and full verification. **norsub-emru 45/45 · nmea-parser 71/71 · core 15/15; lint + tsc + build
> (ESM+CJS+DTS) clean repo-wide; `--frozen-lockfile` clean; packed manifest = `3.0.0` /
> `engines.node >=22` / dep `@coremarine/nmea-parser` `^3.1.0` / no `protocol-core` leak.** The CI job
> order was re-verified from a deleted-dist state (`protocol-core:build` → `nmea-parser:build` →
> `norsub-emru:test` → `norsub-emru:build`). **NEXT = cru reviews + commits, then TASK 3b (the
> `norsub-emru-nodered` wrapper).** Detail: the 2026-07-29 entry at the top of §Done.
>
> **🔵 2026-07-28 — PHASE 3 IN PROGRESS: norsub-emru.** Design locked with cru: **composition (device
> facade + protocol parser, one protocol active at a time)**, internal generated-TS knowledge load,
> status metadata at field **and** payload level, and **no sentence timestamp** (datasheet-verified).
> **Prerequisites are DONE & released: `nmea-parser@3.1.0`** (two `protected` extension points) **+
> `DeviceParser<B>` in `protocol-core`**, plus a datasheet-driven **units fix** in the norsub protocol
> data. Wrapper untouched (no change needed). **NEXT: the norsub-emru lib rewrite itself.** Full spec +
> remaining opens: **§"Phase 3 — norsub-emru: locked design (2026-07-28)"**.
>
> **🚀 SHIPPED 2026-07-28 — `@coremarine/nmea-parser@3.1.0` IS LIVE on npm** (PR
> [#71](https://github.com/core-marine-dev/devices/pull/71) merged 10:39 UTC, merge commit `a80c8e4`;
> `npm view` → `latest: 3.1.0`). **Branches are synced: `dev` == `main` == `a80c8e4`, working tree
> clean.** The wrapper stayed at `2.0.1` (untouched, path-filtered — nothing to publish); `norsub-emru`
> CI was red as expected (legacy pre-3.0 API, `publish` blocked by `needs: test`). cru's remaining
> manual step: refresh the Node-RED flow-library entry for the nmea component.
>
> **➡️ NEXT SESSION STARTS HERE: the `norsub-emru` library rewrite — design is fully locked, so it is a
> CODING session.** Use the paste-ready **"Phase 3 coding prompt"** at the very end of this doc.
>
> **Wrapper decisions locked this session (apply to every future `-nodered` wrapper):**
> - **Dev-instance isolation = won't-fix / accepted by design.** Sibling `@coremarine/*-nodered` nodes
>   appearing in the local dev palette is fine; node-red stays a **root** devDep. What matters: the node
>   is in the **CoreMarine** palette category and that category is pinned first via
>   `editorTheme.palette.categories` in `dev-server.mjs` (dev-only; not shippable by a node package).
> - **`engines.node: ">=22"` (major-only), `node-red.version: ">=4.0.0"`.** The node floor is set by
>   the **library's tested targets (two latest LTS: 22 & 24)**, NOT node-red 4's own `>=18.5`. "Runs in
>   node-red 4, but needs node ≥22." Dev is on the latest node-red (`5.0.1`). The **library** was also
>   patched to `engines.node >=22` (was a mistaken `>= 18`) — do the same for every parser lib.
> - **Ship `"!**/*.backup"` in `files`** — node-red writes hidden `.<flow>.backup` files that otherwise
>   leak into the npm tarball.
> - **Keep READMEs current with the API** — both nmea READMEs were rewritten this session; do NOT let a
>   wrapper/lib publish with stale API docs.
>
> **RELEASE PREP DONE (2026-07-13): nmea-parser bumped to `3.0.0`, CI/CD migrated to npm OIDC
> Trusted Publishing across ALL packages, publish-if-version-changed gate, `repository.directory`
> everywhere.** Committed on `dev` (A→B→D→C, HEAD `65bec81`), NOT yet pushed at time of writing →
> then pushed. **NEXT: cru opens PR `dev` → `main`; the merge publishes only nmea-parser 3.0.0
> (every other package's publish job no-ops on the version gate; norsub + wrappers fail test/build
> and are skipped — expected).** After it's live: nmea-parser-nodered wrapper, then norsub-emru code
> refactor.
>
> **Steps 1-6 complete: pnpm, ESLint, docs, dep refresh, security audit, tsconfig fixes.**
> **CMA rollout IN PROGRESS:** `@coremarine/protocol-core` scaffolded (`174e4cc`); **nmea-parser
> refactored onto it (2026-07-10, slice A–F) — the reference implementation, committed & green**
> (lint + tsc + 56/56 tests + build ESM+CJS+DTS). Journey doc: [`docs/NMEA.md`](NMEA.md).
> **STEP 1 DONE: 3-level metadata via dev-authored aggregators** (`src/metadata.ts`, seeded GGA).
> **STEP 2 DONE: no-throw Result pattern** (`Result<T,E>` in core; `parseProtocols`/`addSentences`
> return `Result`; 62/62 tests). **NEXT: after the 3.0.0 release lands on npm, clone the reference
> implementation to the other four parsers — norsub-emru first (it no longer builds; see Open threads).**

## How to use this doc

1. Read this top-to-bottom, then the linked docs. Newer docs win over older ones.
2. Authoritative context (all in-repo, provider-agnostic):
   - Repo rules for agents: [`AGENTS.md`](../AGENTS.md) (≤80 lines, points here)
   - What the repo is / layout / `misc/` convention: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
   - Per-package state + known issues: [`docs/PACKAGES.md`](PACKAGES.md)
   - The target output format: [`docs/CMA.md`](CMA.md)
   - Commands: [`docs/COMMANDS.md`](COMMANDS.md) · Stack/CI: [`docs/TOOLING.md`](TOOLING.md)
   - Code style: [`docs/CodeStyle.md`](CodeStyle.md)
   - pnpm migration (done): [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md)
3. Working method the user (cru) expects: **discuss decisions before coding, one step at a
   time; this repo feeds the Tracker product, so output-format changes are breaking changes.**

## Mission

Refresh the whole monorepo in strokes. **cru's two end goals for the deep refactor:**

- **Goal 1 — same output:** every parser emits the identical CMA shape ([`docs/CMA.md`](CMA.md)),
  regardless of protocol.
- **Goal 2 — same API:** every parser has the same internal/external API — `new X(opts)` →
  `addData(input)` / `parseData(input): CMA[]`. Only the protocol-decode logic differs. This is
  enforced by a shared base class in `@coremarine/protocol-core`.
- **Cross-runtime:** the libraries (not the `-nodered` wrappers) must run on node, deno, bun
  **and** the web — no `node:fs`/`Buffer` in the hot path; input is `string | Uint8Array`.

Strokes:

1. **CMA format rollout** — every parser emits the same output shape ([`docs/CMA.md`](CMA.md)).
   Today only `thelmabiotel-tblive` conforms.
2. ~~**pnpm migration**~~ — ✅ DONE (2026-07-08, `f6444c3`). See
   [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md).
3. ~~**Linter + formatter migration**~~ — ✅ DONE (2026-07-08, `21ad374`). ESLint flat config
   with @stylistic + sonarjs + perfectionist plugins (mirrors Tracker repo).
4. ~~**Documentation**~~ — ✅ DONE (2026-07-08, `055b6d4`). `docs/CodeStyle.md` + AGENTS.md
   code-style section + lint→tsc→test run order codified.
5. ~~**Dependency refresh**~~ — ✅ DONE (2026-07-08, `3bcc0d6`). TypeScript 6.0.3, Vitest 4.x,
   Valibot 1.4.2, @schemasjs/* latest, tsup 8.5.1 (patched), safe dep bumps.
6. ~~**Security audit + fixes**~~ — ✅ DONE (2026-07-08, `b505fc9` + `2d40a86` + `31b52c3`).
   All 27 known vulnerabilities fixed (0 remaining). node-red 4→5, js-yaml bump, pnpm
   overrides for transitive vulns, valibot pinned to 1.4.2 everywhere, rootDir added to
   all per-package tsconfigs (TS 6 requirement).
7. ~~**Result pattern**~~ — ✅ DONE (2026-07-10) in `@coremarine/protocol-core` + nmea-parser;
   `Result<T,E>` no-exceptions-as-control-flow (from Tracker repo). Cloned per parser as they refactor.

## Done

- **2026-07-29 (later) — data decisions: protocol `version` + the `float64` sweep ⇒ `nmea-parser` 3.2.0
  joins this release.** Both were the open questions raised by the Task 3a session; cru decided both.
  - **`version: '1.2.0'` added to ALL 12 protocols in `norsub.yml`** (both copies — norsub-emru's real KB
    and nmea-parser's test fixture), placed before `standard:` to match `nmea.yml`. cru's call was "apply it
    to all", including the third-party formats (GYROCOMPAS1, Tokimek PTVG, RDI ADCP, SMCA, SMCC) — coherent,
    because the version identifies the **NORSUB OEM Series — OEM MRU User Manual revision they were
    transcribed from**, and that manual documents all of them as formats the eMRU can emit. Verified:
    `PNORSUB8` → `protocol: {name: 'NORSUB8', version: '1.2.0'}`, `HEHDT` → `{GYROCOMPAS1, 1.2.0}`, while an
    inherited `GGA` still reports `{NMEA, 3.1}`. Two hardcoded fixtures in
    `nmea-parser/tests/protocols.test.ts` updated (`version: undefined` → `'1.2.0'`).
  - **`float32` → `float64` swept through `nmea.yml`** (68 fields) as well as the 3 norsub ones, per cru's
    rule "a datasheet float with no stated width → `float64`, the JS default".
  - **⚠️ WHY THIS NEEDS A `nmea-parser` RELEASE — and what it does NOT change.** The earlier norsub-only
    sweep was invisible to nmea-parser because its `protocols/norsub.yml` is **only a test fixture**;
    `nmea.yml` is the real published knowledge base, so sweeping it **changes nmea-parser's own output**.
    Measured, not assumed: `parseValue` does `Number(raw)` and then a **range check** via `TYPE_SCHEMAS`
    (`Float32Schema.is`) — it never truncates precision. So:
    - **`field.value` is unchanged** for every realistic value. `$INHDT,123.456,T` still yields exactly
      `123.456` (a real float32 truncation would have given `123.45600128173828`).
    - **`field.type` changes** `'float32'` → `'float64'` in emitted CMAs. This is the whole behavioural delta.
    - The accepted range **widens** (`Float32Schema` rejects `|x| > 3.4e38`, `Float64Schema` accepts to
      `1.8e308`), so a few pathological inputs now decode instead of becoming `null` — strictly more
      permissive, never less.
  - **Version choice: `3.1.0` → `3.2.0` (MINOR).** Reasoning: a **patch** understates it (real consumer-
    visible output changes), a **major** overstates it (no key added or removed, no value semantics changed,
    range only widened — nothing a consumer reading `value`/`name`/`units` can notice). **The one condition
    that would make it breaking: if Tracker branches on `field.type === 'float32'` anywhere.** If it does,
    make this `4.0.0` instead — it is a one-line change in `packages/nmea-parser/package.json`. cru to
    confirm.
  - **The `nmea-parser-nodered` wrapper needs NO change and NO bump.** Its published dep range is `^3.0.2`,
    which already resolves 3.2.0 (same situation as the 3.1.0 release, which was verified end-to-end with a
    real fresh install + headless node-red on 2026-07-28). Re-verified anyway against the changed lib:
    wrapper build + **19/19** `node:test`, including the real-node-red integration that asserts a live GGA
    → CMA. Bumping it would publish an identical package. It WILL start emitting `type: 'float64'`, which is
    the intended consequence, and its README documents no field types so nothing there went stale.
  - **Docs kept current:** norsub README's sample now shows `version: '1.2.0'` plus a line explaining where
    that version comes from; nmea-parser README's copy-paste YAML example switched to `float64` (the `float32`
    mentions that remain are the list of *valid CMA types*, which is still accurate — the type still exists,
    we just no longer use it in our own data). `docs/PACKAGES.md` nmea-parser row → `3.2.0`.
  - **Re-verified after both changes:** norsub-emru **45/45**, nmea-parser **71/71**, core **15/15**,
    wrapper **19/19**; repo-wide `pnpm lint` clean; `tsc --noEmit` clean in both libs; regeneration a no-op
    beyond the intended data. **Publishing plan: ONE `dev`→`main` merge publishes BOTH
    `nmea-parser@3.2.0` AND `norsub-emru@3.0.0`** (each workflow is path-filtered and version-gated, and
    both packages changed). No ordering problem: norsub-emru depends on `^3.1.0`, which is already live.
- **2026-07-29 — PHASE 3 / TASK 3a: `norsub-emru` library rewritten onto CMA (code-complete, green,
  NOT yet committed).** Everything in the "Phase 3 coding prompt" is implemented. Three of cru's open
  questions were answered this session and applied.
  - **cru's answers (2026-07-29):** (1) **a datasheet "float" with no width → `float64`** (JS numbers are
    doubles; fewer conflicts) ⇒ `HEHDT.heading` + `PHTRO.pitch`/`roll` `float32` → `float64`. (2) **The
    `PRDID` trailing comma in the manual is a typo** — no code change; test the 2-field form without it and
    the 3-field form with it (the comma yields `heading: null`). (3) **A checksum is ALWAYS present** — the
    manual's checksum-less RDI ADCP format is a typo, so the current drop-if-absent behaviour stands, nothing
    to build.
  - **`src/` is new:** `parser.ts` = `NorsubParser implements DeviceParser<string>`, a facade **composing**
    its protocol parser via a factory registry (`Record<NorsubProtocol, (options) => ProtocolParser>`), with
    `protocol` getter/setter, a `protocols` list, and the locked **`parser`** getter for the protocol-specific
    extras (NOT delegated method-by-method). `protocol-nmea.ts` = `NorsubNMEAParser extends NMEAParser`,
    registering the generated definitions with `registerProtocols` and 7 aggregators with
    `registerAggregators`. `metadata.ts` = those aggregators. Nothing throws: an invalid setter value is
    discarded, an invalid constructor `protocol` falls back to the default.
  - **Status placement is exactly the locked 3 rules:** field **and** payload level for the five
    single-`uint32` sentences (`PNORSUB:7`, `PNORSUB2:8`, `PNORSUB6:18`, `PNORSUB7:24`, `PNORSUB8:24`),
    **payload-only** for `PNORSUB7b:25` (verified: `payload.at(-1).metadata` is `undefined` there). Old
    top-level `metadata.status` is gone. `src/status.ts` + `src/utils.ts` survive **unchanged** (both were
    manual-validated on 2026-07-28). Verified a split status decodes identically to the combined one.
  - **`PTVG:3` aggregator built** as cru asked: strips the glued unit letter, `/100` for pitch and roll,
    whitespace-tolerant sign (`- 036` and `-0036` both read as -36), decoded value in FIELD metadata as
    `{ degrees }`. Real parse: `$PTVG,-0036P, 0021R,101.8T*42` → `-0.36 / 0.21 / 101.8`. Non-numeric or
    missing-letter input ⇒ no metadata, never a throw.
  - **No `sentenceTimestamp` override** (datasheet-verified): every sentence carries `received` + `parsed`
    and NO `sentence`; `T1`/`T2` keep their raw `us` values with no metadata. Asserted in the suite.
  - **🆕 SHARED GENERATOR — `scripts/yaml-to-ts.mjs` (root), replacing BOTH per-package `yaml-to-json.js`
    (deleted).** It emits a **typed** const (`export const NAME: ProtocolsFileContent = …` + the import) and
    then reformats the file **through the repo's own ESLint API (`fix: true`)**, so the output is
    byte-identical to `pnpm run format` and regeneration is **idempotent** — which is what finally lets
    `protocols` run on **test** as well as build without dirtying the tree (verified: run twice → identical
    sha256; `git diff` shows only intentional data changes). Both packages now call it with
    `--name`/`--type`/`--type-from`; `js-yaml` went to **root** devDeps (eslint was already there) rather
    than being added per-package, since one script serves both. `**/yaml-to-json.js` dropped from the eslint
    ignores. **`test` now regenerates protocols in nmea-parser too** (cru's open question (c) — yes).
  - **This closed the drift bug for real, and found a second one.** The committed `src/norsub.ts` had been
    hand-adapted, so `norsub-emru:protocols` had never regenerated it; the new generator reproduces it
    byte-for-byte **except** it exposed that the file's `description: '0 - Error\n\n1 - No Error'` did not
    match the YAML, which folds to `'0 - Error\n 1 - No Error'` (a stray space — YAML folds a line break
    inside a double-quoted scalar to a space). Fixed the **YAML** in both copies to a single-line
    `"0 - Error\n1 - No Error"` so intent and output agree.
  - **Typing the generated consts is a real win:** `src/nmea.ts` now carries
    `: ProtocolsFileContent`, so the whole NMEA knowledge base is validated by `tsc` at compile time, not
    only by the runtime `safeParse`. It typechecks clean.
  - **Tests: `tests/index.test.ts` rewritten, 45 specs** (was 2). Covers the facade defaults/options/
    fallback/no-throw setters, `DeviceParser<string>` conformance for BOTH the facade and the protocol
    parser, KB registration + inherited NMEA built-ins, every fake sentence round-tripping, the YAML feed
    through `.parser`, status placement per sentence (`test.each`), all-bits-set/clear, non-PNORSUB
    sentences getting no status, `PTVG`, **`PRDID` 2-field vs 3-field**, timestamps, bad checksum emitted
    with an error, garbage input, and partial-sentence buffering. `tests/status.test.ts` +
    `tests/utils.test.ts` kept as-is.
  - **Plumbing:** version → **3.0.0**, `engines.node` `">= 18"` → `">=22"`, `protocols/norsub.yaml` →
    **`.yml`**, root `norsub-emru:protocols` script added, and **`.github/workflows/norsub-emru.yml` now
    prepends `pnpm run protocol-core:build`** to "Build monorepo deps" in BOTH the test and publish jobs
    (the pre-existing fresh-checkout bug). Re-verified the exact CI order after deleting all three `dist/`
    folders: core build → nmea build → norsub test 45/45 → norsub build.
  - **README rewritten from scratch** on the current API (the old one documented the removed 2.x
    `NMEASentence` shape): install/Node ≥22, `addData`/`parseData`, a REAL parsed `PNORSUB8` CMA sample, the
    `Status` type, a "where status lands" table, `PTVG` decoding, the full API table, protocol selection +
    the `parser` getter, and the extra exports. `docs/PACKAGES.md` + `docs/CMA.md` §Conformance flipped to
    the new state.
  - **⚠️ ONE TEST GAP, deliberate and documented in the suite:** the locked "switching `protocol` discards
    the buffer and undrained sentences" branch **cannot be exercised while `NorsubProtocol` has a single
    member** — there is nothing to switch to. What IS tested: same-protocol assignment preserves the buffer,
    and an invalid protocol falls back. The discard test lands with protocol #2.
  - **🆕 TWO THINGS FOR cru (neither blocks the commit):**
    1. **Every NorSub sentence emits `protocol.version: "unknown"`** because `protocols/norsub.yml` declares
       no `version` for any of its protocols (nmea.yml declares `3.1`). The OEM manual is at **1.2.0** — do
       you want `version: '1.2.0'` on the NORSUB* protocols (and what, if anything, on the third-party
       GYROCOMPAS1 / Tokimek / RDI ADCP / SMCA / SMCC)? It is a data-only change but it **changes CMA
       output**, so it is your call, not mine.
    2. **`nmea.yml` still has `float32` fields** (real NMEA sentences). cru's "unspecified float →
       `float64`" rule was applied ONLY to the norsub data this session — changing nmea.yml would alter the
       published reference lib's output values (float32 rounding → float64 precision), so it was left alone
       deliberately. Flag if you want it swept.
  - **Verified:** norsub-emru lint + `tsc --noEmit` + **45/45** + build ESM+CJS+DTS; nmea-parser **71/71**
    (one fixture updated for float64) + build; core **15/15**; repo-wide `pnpm lint` clean;
    `pnpm install --frozen-lockfile` clean; packed manifest `3.0.0` / `engines.node >=22` / dep
    `@coremarine/nmea-parser` rewritten `workspace:^` → **`^3.1.0`** / **zero** `protocol-core` in the
    manifest or the `dist/*.d.ts` / tarball = dist + README + LICENSE only.
  - **NOT committed** — cru commits when he has reviewed. The pre-existing stray
    `packages/norsub-emru/probe.tmp.ts` (untracked, from an older session) was left untouched.
- **2026-07-28 — 🚀 `@coremarine/nmea-parser@3.1.0` PUBLISHED (PR [#71](https://github.com/core-marine-dev/devices/pull/71),
  merge `a80c8e4`) — the base-library prerequisites for Phase 3 + a datasheet-driven data fix.** Design
  session for norsub-emru first (all decisions in §"Phase 3 — norsub-emru: locked design"), then the
  prerequisites were implemented, verified, released and merged by cru; `npm view` → `latest: 3.1.0`.
  **`dev` == `main` == `a80c8e4`, tree clean.** Two code commits (`fecb500` units fix, `adc327b` 3.1.0)
  plus docs.
  - **`protocol-core`: new `DeviceParser<B>` interface** (`memory`, `bufferLimit`, readonly `buffer`,
    `addData`, `parseData`), `Parser<B> implements DeviceParser<B>`. Required by the composition design:
    `Parser<B>` has protected members, so a facade that COMPOSES protocol parsers is not
    type-assignable to `Parser<string>` even with an identical public surface. Goal 2 ("same API") is now
    a contract, not a side-effect of shared inheritance. Test: an extending parser and a composing
    facade coexist in a `DeviceParser<string>[]` (core **15/15**).
  - **nmea-parser: two additive `protected` extension points** — `registerProtocols` (was `private`) so a
    subclass registers its own bundled generated built-in with no YAML round-trip and no `fs`; and a
    **per-instance aggregator registry** (`MetadataAggregators` + `BUILTIN_METADATA_AGGREGATORS`
    exported, `aggregateMetadata`/`parseSentence` take an optional registry — defaulted, so existing call
    sites are untouched — plus `protected registerAggregators()` merging into the instance copy). Also
    unlocks metadata for sentences fed at runtime via `addSentences`.
  - **New exports for downstream device parsers:** `BUILTIN_METADATA_AGGREGATORS`, types
    `MetadataAggregator`/`MetadataAggregators`, and re-exported core types `DeviceParser`, `DraftCMA`,
    `Field`, `Metadata`, `Value` (core is private, so only what nmea-parser re-exports is reachable).
  - **`packages/nmea-parser/tests/extension.test.ts`** (new, 6 specs) — the executable spec for the seam
    norsub uses; **read it before writing norsub**. nmea-parser **71/71** (was 65).
  - **Data fix (manual-verified):** `PNORSUB6`/`PNORSUB7`/`PNORSUB7b` `T1`/`T2` units `ms` → `us` in 4
    files (norsub-emru YAML + generated `src/norsub.ts`; nmea-parser's byte-identical fixture copy
    `protocols/norsub.yml` + generated `tests/norsub.ts`). Also **validated `norsub-emru/src/status.ts`
    bit-for-bit** against the OEM manual (incl. `STATUS_A` low half / `STATUS_B` high half) — unchanged.
  - **Wrapper untouched and deliberately NOT bumped** (still `2.0.1`): it only uses
    `new NMEAParser({memory})`/`addSentences`/`parseData`, and its published `^3.0.2` range already
    accepts 3.1.0; its workflow is path-filtered so the merge didn't trigger it. Re-verified green
    anyway: build + **19/19** `node:test` incl. real-headless-node-red.
  - Verified: core lint+tsc+15/15+build; nmea lint+tsc+71/71+build ESM+CJS+DTS; `DeviceParser` inlined
    into the published `.d.ts` with **zero** protocol-core refs; packed manifest `3.1.0` /
    `engines.node >=22` / no core leak; `--frozen-lockfile` clean; `dev` CI green (`nmea-parser` 22.x +
    24.x, `protocol-core`). **`norsub-emru` CI red as expected** (legacy pre-3.0 API; `publish` is
    `needs: test`) — and it exposed the pre-existing missing-`protocol-core:build` bug in
    `norsub-emru.yml`, to be fixed with the norsub rewrite where the job can actually go green.
  - **✅ Fresh-install verification with ONLY npm-published packages (2026-07-28), answering cru's
    question "does installing the wrapper pull the new lib?":** in an empty temp dir,
    `npm i @coremarine/nmea-parser-nodered` → `npm ls` shows
    `@coremarine/nmea-parser-nodered@2.0.1 └─ @coremarine/nmea-parser@3.1.0` (declared range `^3.0.2`
    resolves to `3.1.0`). Then booted the **real node-red** headless in that temp dir with a flow
    `inject → cma-nmea-parser → test-sink`: node-red auto-loaded `@coremarine/nmea-parser-nodered`
    (`cma-nmea-parser`, enabled) and a GGA came out as CMA — `id: GGA`,
    `protocol: {NMEA, 3.1}`, `metadata.timestamp: {received, parsed, sentence}`,
    `metadata.payload: {latitude: 48.1173, longitude: 11.5166…}`, `payload[5].metadata: {label: 'GPS fix'}`.
    **So the unchanged wrapper picks up 3.1.0 automatically — no republish needed, nothing to do in the
    Node-RED flow library for the wrapper itself.** (Nit found: the lib's `exports` map does not expose
    `./package.json`, so `require('@coremarine/nmea-parser/package.json')` throws
    `ERR_PACKAGE_PATH_NOT_EXPORTED` — normal for a strict `exports`, harmless, mentioned only so nobody
    is surprised.)
  - **Deliberately NOT done:** mirroring "regenerate `protocols` on **test**" to nmea-parser — the
    generator emits raw `JSON.stringify` while the committed `src/nmea.ts` is eslint-formatted, so a
    `pretest` regeneration would dirty tracked files. Fix the generator (emit typed, lint-clean output)
    during the norsub rewrite, then mirror. **cru's remaining manual step: refresh the Node-RED
    flow-library entry for the nmea component.**
- **2026-07-24 — 🚀 PHASE 1 + PHASE 2 PUBLISHED (cru merged PR [#70](https://github.com/core-marine-dev/devices/pull/70) `dev`→`main`).**
  `@coremarine/nmea-parser@3.0.2` and `@coremarine/nmea-parser-nodered@2.0.1` are **live on npm** (OIDC
  + provenance). Verified post-merge: `npm view` returns both versions; PR merged 10:32 UTC; `main` @
  `290a38f`. The version gate no-op'd every other package; norsub-emru + sbg-ecom test-red stayed
  contained (`needs: test`). This closes the whole nmea-parser track — lib **and** wrapper both in
  production, both serving as the reference/template for the remaining parsers. **`dev` is now behind
  `main` by the merge commit — sync it before Phase 3 (see top banner).** **NEXT = Phase 3: norsub-emru.**
- **2026-07-24 — nmea-parser-nodered wrapper: both open dev-server items resolved (cru).** Committed
  edits to `dev-server.mjs` + `templates/nodered/dev-server.mjs`; `docs/STATUS.md` updated same-turn.
  - **Dev-instance isolation → WON'T-FIX, accepted by design (cru's pragmatic call).** The whole
    `pnpm deploy`-from-isolated-dir direction (validated last session) is **dropped, not implemented** —
    wrappers are a complementary offering and the isolation machinery isn't worth the future-maintenance
    cost. **node-red + mocha + node-red-node-test-helper stay ROOT devDeps** (already the state — last
    session's per-package experiment was already reverted; nothing to change there). Siblings appearing
    in the palette is fine **as long as** our node sits in the **CoreMarine** category and that category
    is **first**. ctx7 recap that informed the call: non-legacy `pnpm deploy` (needs
    `inject-workspace-packages=true`) DOES prune to a clean target via a dedicated lockfile, but the
    setting is workspace-wide (hard-linking, `syncInjectedDepsAfterScripts`) — too heavy for a dev-only
    convenience; `--legacy` avoids the setting but drags the whole root devDep list. Neither adopted.
  - **Palette category order — DONE.** Added `editorTheme.palette.categories: ['CoreMarine', …defaults]`
    to the `RED.init` settings in `dev-server.mjs` (exact key confirmed via ctx7 nodered.org config docs:
    unlisted categories append to the end, so the built-in defaults are listed after CoreMarine to keep
    their normal order). The node already declares `category: "CoreMarine"` in `parser.html`. **Caveat:
    this pins order only in the LOCAL dev-server — palette category order is a per-editor setting, not
    shippable by a node package**; an end user's Node-RED is unaffected.
  - **Removed the `setModuleState` sibling-disable block** from `dev-server.mjs` (from commit `d158f9a`
    "only this node") — now pointless (siblings accepted) and it never reliably worked. Dropped the now-
    unused `ownName` const + `readFileSync` import + stale "ONLY this node" header comment. The fresh
    throwaway `userDir` per run is kept.
  - **Verified live** (no docker): booted `dev-server.mjs` in both `dev` and `examples` modes headless;
    `GET /settings` → `editorTheme.palette.categories.order = ['CoreMarine', …]`; `GET /nodes` →
    `@coremarine/nmea-parser-nodered` (`cma-nmea-parser`) loaded + enabled (the 4 siblings also load +
    enabled, as accepted); examples mode reads the shipped `examples/nmea-parser-examples.json`.
    `dev-server.mjs` lints clean.
  - **Mirrored to `templates/nodered/dev-server.mjs`** (same edits + a `TODO:` note on keeping the
    `CoreMarine` category). **`CONTRIBUTING.md` needed no change** — it made no isolation/sibling claims.
  - **Publish-readiness verified + two fixes (cru, same day).** Before marking the wrapper done, ran
    the exact CI steps locally and inspected `pnpm pack`:
    - **CI `test` job = GREEN locally:** `protocol-core:build` + `nmea-parser:build` → `nmea-parser:nodered:build`
      → `nmea-parser:nodered:test` **19/19** (incl. the real-headless-node-red integration test).
      `pnpm install --frozen-lockfile` clean after the package.json edits.
    - **CI `publish` job:** version-gated (`2.0.0` not on npm → will publish), OIDC configured; packed
      manifest confirms `workspace:^` → `@coremarine/nmea-parser: "^3.0.0"`, **no `protocol-core` leak**.
      ✅ **Ordering constraint SATISFIED:** `npm view @coremarine/nmea-parser@3.0.0` → live (`latest:
      3.0.0`), so **Phase 1 is done** and the wrapper's `^3.0.0` dep resolves. Merging the wrapper is safe.
      Pushed to `origin/dev` (`29f7173`); the `dev` CI run is **GREEN** (Test 22.x + 24.x ✅, Publish
      skipped as it's not `main`). **UPDATE (patches below): the `dev→main` merge now also touches
      `packages/nmea-parser/**`, so it triggers BOTH `nmea-parser.yml` AND `nmea-parser-nodered.yml`
      (path-filtered) → publishes **nmea-parser 3.0.2** AND **wrapper 2.0.1** in one merge; every other
      package still no-ops on its version gate.** **This is Phase 2.**
    - **FIX 1 — stray `.backup` no longer published.** node-red auto-writes a hidden
      `.<flowfile>.backup` beside any flow it opens; `files: ["examples"]` was globbing it into the
      tarball (49 KB). Deleted the 4 stray `*.backup` files repo-wide (all gitignored cruft) and added
      **`"!**/*.backup"`** to the wrapper's `files` array. Re-pack (with a simulated regenerated backup)
      confirms it's excluded. Mirrored to `templates/nodered/package.json`.
    - **FIX 2 — `engines.node` set to `>=22` (major only, cru's locked reasoning).** cru develops
      against the **latest node-red (`5.0.1`)** and publishes as compatible with **node-red `>=4.0.0`**
      (the wrappers use the v4 API, which still works on 5) — `node-red.version` stays **`>=4.0.0`**.
      **The node floor is driven by the LIBRARY, not node-red's floor:** cru guarantees/tests
      `@coremarine/nmea-parser` only on the **two latest LTS (node 22 & 24)**, so the wrapper cannot
      honestly claim node 18 even though node-red 4 runs on ≥18.5. Hence `engines.node: ">=22"` —
      "runs in node-red 4, but requires node ≥22" (node-red 4 supports node up to 22, so a node-red-4
      user on node 22 is fine; older-node users are honestly excluded). **cru prefers major-only in
      `engines.node` (no minor/patch)** → `">=22"`, not `">=22.0.0"`. node-red stays the `latest`
      (5.0.1) devDep. (An earlier `>=18.5` attempt — reasoning from node-red 4's own floor — was
      corrected: the lib's guarantee, not node-red's floor, sets the bar.)
    - **FIX 3 — nmea-parser (LIBRARY) `engines.node` `">= 18"` → `">=22"`, patched to `3.0.1` (cru).**
      The lib's `>= 18` was a legacy/mistake — it's only built & tested on the two latest LTS (22 & 24),
      so 18 was never truly guaranteed. This is the floor the wrapper's `>=22` derives from, so the lib
      must agree. cru's call: correct the metadata and ship a **patch** (`3.0.0` → `3.0.1`) — tightening
      `engines` is arguably breaking, but since it corrects inaccurate metadata (never really supported)
      and `engines` is advisory, a patch is fine. Major-only (`">=22"`). No code/build change (tsup is
      `platform: neutral`, no node-18 target anywhere). Verified: lint + tsc + **65/65** + build
      ESM+CJS+DTS; packed manifest `engines.node >=22` / no protocol-core leak;
      frozen-lockfile clean (workspace deps are links). Dependents (`norsub-emru`, `nmea-parser-nodered`)
      use `workspace:^` / `^3.0.x` → accept the bump unchanged. **(Version later bumped 3.0.1 → 3.0.2
      with the README rewrite — see FIX 4.)**
    - **FIX 4 — READMEs rewritten to the new API + patch bumps (cru).** Both package READMEs still
      documented the **removed** API (lib: `NMEASentence` output, `new NMEAParser()`, `addProtocols({file|
      content|protocols})`; wrapper: a stale "only this node in the palette" dev note). Rewrote them:
      - **`packages/nmea-parser/README.md`** — full rewrite onto the current API: `new NMEAParser({ memory?,
        bufferLimit? })` (memory default true), `addData`/`parseData` → **`CMA[]`** (real GGA sample from a
        live parse, trimmed), `addSentences(yaml): Result<void, NMEAError>` (YAML-string-only; old
        `addProtocols` explicitly called out as removed), the getters, cross-runtime + Node ≥22 note, and
        a full API table. Output/type blocks taken from `docs/CMA.md` + `src/`.
      - **`packages/nmea-parser-nodered/README.md`** — the msg API (`payload`/`memory`/`protocols`/`sentence`/
        `fake` → CMA output) was already current; only fixed the `:dev`/`:examples` palette note to
        "CoreMarine category, pinned first; siblings also show in the monorepo dev instance (harmless)".
      - **Patch bumps for the doc change (cru's instruction):** nmea-parser **3.0.1 → 3.0.2**,
        nmea-parser-nodered **2.0.0 → 2.0.1**. ⚠️ Since 3.0.1 and 2.0.0 were **never published** (only
        nmea-parser 3.0.0 is on npm), these bumps effectively **skip** 3.0.1 / 2.0.0 — the first published
        versions after 3.0.0 will be **3.0.2** (lib) and **2.0.1** (wrapper, its first publish ever).
        Harmless (npm ignores gaps); trivially adjustable pre-merge if cru prefers not to skip.
      - Verified: frozen-lockfile clean; packed manifests = lib `3.0.2` / wrapper `2.0.1`, wrapper dep
        rewritten `workspace:^` → **`^3.0.2`**, `engines.node >=22` on both, no protocol-core leak.
    - **Node-RED flow-library checklist re-confirmed via ctx7** (nodered.org/docs/creating-nodes/packaging):
      `node-red.nodes` map ✅, `keywords` has `node-red` ✅, name/version/description/MIT ✅, repository +
      `repository.directory` + bugs + homepage ✅, README + LICENSE shipped ✅, `examples/` flows ✅,
      `engines.node` ✅. **Wrapper is publish-ready** (gated only on Phase 1).
- **2026-07-23 — dev-isolation investigation: cru's per-package-devDep+catalog idea DISPROVEN
  empirically; `pnpm deploy --legacy` VALIDATED as the real fix (not yet implemented in
  `dev-server.mjs`).** No code committed this session — pure investigation, all experimental edits
  reverted, working tree clean.
  - **Ruled out node-red-node-test-helper as the cause (cru's hunch):** its `package.json` has NO
    dependency on `node-red` (only a `"node-red"` string in `keywords`); `mocha` is its own devDep.
    Not the mechanism.
  - **Ruled out `mocha` removal (cru's other hunch) — NOT SAFE YET:** `norsub-emru-nodered`,
    `thelmabiotel-tblive-nodered`, `sbg-ecom-nodered`, `septentrio-sbf-nodered` still run mocha
    (only `nmea-parser-nodered` uses `node:test` so far). Removing the root devDep would break
    those four until each is refactored in its own turn.
  - **Root cause nailed down precisely** (was previously only "confirmed the walk-up climbs to the
    workspace"): `@node-red/registry/lib/localfilesystem.js` `scanTreeForNodesModules` climbs from
    `coreNodesDir` (wherever `@node-red/nodes` physically sits) **one directory at a time all the
    way to filesystem `/`**, checking `<ancestor>/node_modules` at every level. Because pnpm
    workspaces use **one shared virtual store for the whole workspace** (single lockfile), that walk
    always passes through `node_modules/.pnpm/node_modules/@coremarine/*` — a directory pnpm
    populates with a symlink to **every** workspace package unconditionally (needed for
    `workspace:*`-protocol resolution generally), regardless of which package.json declares
    `node-red`.
  - **Tested cru's fix empirically and it does NOT work:** moved `node-red` out of the root
    `devDependencies` into `packages/nmea-parser-nodered`'s own `devDependencies` (twice — once
    alone, once combined with a `pnpm deploy` test), ran `pnpm install` both times. Result **both
    times**: node-red resolves to the exact same `node_modules/.pnpm/node-red@5.0.1.../` path, and
    `.pnpm/node_modules/@coremarine/*` still lists all 11 sibling packages, unchanged. **Which
    manifest declares node-red is irrelevant** — the shared virtual store is a property of the whole
    workspace, not of any one dependency edge. **pnpm `catalog:` is therefore not needed for this
    fix** (it would only synchronize a version string across manifests that don't affect isolation).
  - **Validated fix: `pnpm --filter <pkg> deploy --legacy <tmp-dir>`, then boot node-red FROM that
    deployed dir** (not from the workspace). `pnpm deploy` builds a fresh, self-contained
    `node_modules` scoped to just that package's own resolved dependency graph — its `.pnpm/
    node_modules/@coremarine/*` contains only `nmea-parser` (the real dep) + itself, never the other
    workspace packages. Since node-red's own files then live entirely inside that isolated tree, the
    `coreNodesDir` walk-up never reaches the shared store at all. **Proved with a probe script**
    (boots `RED.init`/`RED.start` from inside the deployed dir, fresh tmp `userDir`, then
    `RED.nodes.getNodeList()`): output was `MODULES: [ '@coremarine/nmea-parser-nodered' ]` — zero
    siblings — reproduced on **two separate deploys** (node-red only as root devDep; node-red
    duplicated into the wrapper's own devDeps too) with identical results, reinforcing that the
    declaration site doesn't matter.
    - **⚠️ Known wart, not yet resolved:** `--legacy` is required (`ERR_PNPM_DEPLOY_NONINJECTED_
      WORKSPACE` without it — the workspace doesn't set `injectWorkspacePackages: true`), and legacy
      deploy against a shared lockfile drags the **entire root `devDependencies` list** into the
      deploy target (eslint, mocha, tsup, vitest, typescript, chai — ~627 resolved packages) rather
      than just node-red + the wrapper's own deps. Harmless functionally (disposable tmp dir,
      content-addressable store hard-links make repeat deploys fast) but wasteful/not clean. **Not
      investigated:** whether setting `injectWorkspacePackages: true` in `pnpm-workspace.yaml` (then
      deploying WITHOUT `--legacy`) avoids the bloat — check ctx7 for exact semantics/tradeoffs
      before adopting.
  - **Not yet done:** wiring this into `dev-server.mjs` (needs a deploy-then-spawn/require step
    instead of importing `node-red` directly), dropping the `setModuleState` hack, mirroring to
    `templates/nodered/`. See the updated open-item note in "Node-RED wrapper refactor" below and the
    paste-ready resume prompt at the end of this doc.
- **2026-07-22 — nmea-parser-nodered wrapper refactored to TS + new API + node:test (Phase 2, cru).**
  The wrapper is rebuilt as the **template for all future wrappers**; verified green three ways
  (local clean-dist chain, `node:test`, and **act** in a container). NOT yet published (publishes on
  the next `dev`→`main` merge via the OIDC+version gate; `workspace:^` rewrites to `^3.0.0`).
  - **Authoring:** TypeScript → **tsup** → CJS (`export = init` → `module.exports = <fn>`), `platform:
    node`, `@coremarine/nmea-parser` stays **external** (published runtime dep). `copy-assets.mjs`
    copies `parser.html` + `icons/` into `dist/`. `tsconfig` needs `"module": "preserve"` for `export =`.
  - **Architecture:** pure-logic `src/lib.ts` (NO node-red dep — unit-testable) + thin adapter
    `src/parser.ts`. New lib API: `new NMEAParser({ memory })`, `addSentences(yaml)` (handles the
    `Result`; a configured/`msg` `file` path is read in-node via `node:fs`; `content` YAML also
    accepted, precedence content>file), `parseData`→`CMA[]`. Fixed the old `parser()` bug + the
    flow/registerType type name.
  - **Tests (`node:test` via `tsx`, 19/19):** `tests/lib.unit.test.ts` (pure logic w/ a real parser) +
    `tests/wrapper.integration.test.ts` — **boots real headless node-red** (public API + flowFile
    pattern), auto-loads the built node, runs `inject → cma-nmea-parser → sink`, asserts CMA output +
    timestamp metadata. NO `node-red-node-test-helper`.
  - **CI (`nmea-parser-nodered.yml`):** test job re-enabled, matrix `[22.x,24.x]`; builds the dep chain
    first (`protocol-core:build && nmea-parser:build`) then the wrapper (node-red auto-loads
    `dist/parser.js`), then `node:test`; publish job gated on `needs: test` + version. **act-verified:
    Job succeeded.**
  - **Versions:** `engines.node ≥22`, `node-red ≥4`, wrapper bumped **1.2.1 → 2.0.0** (breaking).
  - **Removed:** mocha + vitest test files, `manual_tests.sh`, `Dockerfile`, `docker-compose.yml`,
    `tests/nodered/`. **Added:** `dev-server.mjs` + `nmea-parser:nodered:dev` (local node-red, no
    docker) and `:build`/`:ci:local` root scripts. `@types/node-red` devDep (typed, `@types` were fine
    — the earlier errors were `moduleResolution: node`); dropped `@types/node-red-node-test-helper`.
  - **Manual/visual scripts (file-backed, tour off, palette scoped):** `:dev` edits the **tracked**
    scratch flow `tests/dev.flows.json`; `:examples` edits the committed, shipped example under
    `examples/` (node-red reads/writes the on-disk flow via an **absolute `flowFile`** — verified
    supported — so edits persist; `editorTheme.tours:false` kills the walkthrough). Both disable
    sibling `@coremarine/*-nodered` modules (`setModuleState`) so only this node shows — the "all my
    nodes appear" clutter is a **monorepo-only** artifact (shared workspace node_modules), not a bug.
    **Examples ship in `examples/` (NOT `dist/`)** via `files` and surface in node-red's
    *Import → Examples* (confirmed via ctx7). **cru's original `examples/nmea-parser-examples.json` is
    kept as-is**; a **second tab "NMEA Parser Examples — v3 API (CMA output)"** was appended to the
    SAME file (groups: Parse→CMA[], Memory, Protocols content|file, Sentence, Fake, Flow Errors) as a
    proposal for cru to visually compare/adjust. `parser.html` help documents the new API (protocols
    content/file, CMA[] output). **node-red flow-library checklist verified committed:** keywords has
    `node-red`, `node-red.version >=4`, `engines.node >=22`, examples shipped via `files`, README +
    LICENSE + repository + semver all present.
  - **`templates/nodered/` regenerated to match** (TS + tsup + copy-assets + node:test + dev-server,
    all with `TODO:` markers; near-ready for the NMEA-family, trimmable for binary parsers).
    `templates/nodered.yml` workflow blueprint modernized (OIDC + gate + build chain + node:test,
    was v4/node18/NPM_TOKEN). `CONTRIBUTING.md` "How to create a NodeRED component" rewritten (no
    docker; TS/tsup/node:test/dev-server flow). Templates are eslint-ignored + outside the pnpm
    workspace, so placeholders don't break lint/install. **Phase 2 DONE** except the actual publish.
  - **Example flow finalized (2026-07-22):** single "NMEA Parser Examples" tab (cru's design, legacy
    tab removed, no third-party `yaml` node). Groups: Flow Errors, Examples (single + partial + **batch
    & one-by-one via embedded-data function nodes** — no sample file), Memory API, **Protocols API =
    hot-expand demo** (get; parse PCMEX before; expand via CONTENT embedded YAML + via FILE
    `examples/example-protocol.yml`; parse PCMEX after → shows unknown→decoded), Sentence API, Fake API.
    Ships `examples/example-protocol.yml` (`COREMARINE_EXAMPLE`/`PCMEX`).
  - **✅ BOTH wrapper items CLOSED (2026-07-24) — see the top Done entry for detail:**
    1. **Isolated dev/examples node-red instance → WON'T-FIX, accepted by design (cru).** The
       `pnpm deploy` fix (validated 2026-07-23) was **dropped, not implemented** — not worth the
       future-maintenance cost for a complementary offering. node-red stays a **root** devDep;
       siblings appearing is fine. The `setModuleState` hack was **removed** from `dev-server.mjs`.
       (Historical: the whole isolation investigation — per-package devDep DISPROVEN, `pnpm deploy
       --legacy` validated but heavy — is preserved in the 2026-07-23 Done entry.)
    2. **CoreMarine palette category first → DONE.** `editorTheme.palette.categories: ['CoreMarine',
       …defaults]` added to `dev-server.mjs` `RED.init` (key confirmed via ctx7; verified live).
       Dev-server-only (per-editor setting, not shippable). Mirrored to `templates/nodered/`.
  - **Next: publish wrapper 2.0.0** (dev→main; workspace:^ → ^3.0.0), then **Phase 3 =
    norsub-emru** (lib refactor, then its `-nodered` wrapper cloned from this template).
- **2026-07-22 — git history rewritten to strip AI co-author trailers (cru).** cru uses multiple
  AI agents from different providers and does **not** want any single one credited in authorship.
  Removed the `Co-Authored-By: Claude …` trailer from all **9** commits that carried it (via
  `git filter-branch --msg-filter`; messages-only — content byte-identical, `git diff` empty,
  topology preserved). Force-pushed **both** branches: `origin/dev` `2811a4b→02c3e3a`, `origin/main`
  `d2d8a28→0f0191c`; remote verified 0 trailers. Also set globally in `~/.claude/settings.json`:
  `attribution.commit=""`, `attribution.pr=""`, `attribution.sessionUrl=false`,
  `includeCoAuthoredBy=false` (Claude Code adds no attribution anywhere, all repos, going forward).
  **⚠️ Consequences for the next agent:**
  - **All commit SHAs changed.** Every short hash cited in the Done entries below (`ee08691`,
    `65bec81`, `c39f233`, etc.) is a **pre-rewrite** reference and **no longer resolves** on the
    branches — treat them as historical labels, not lookups. Current tips: `dev` `02c3e3a`,
    `main` `0f0191c`.
  - **Anyone with an existing clone must** `git fetch origin && git reset --hard origin/<branch>`
    before working, or they'll re-push the old history.
  - **GitHub still retains the old SHAs** via the merged PR's `refs/pull/*` + caches (force-push
    can't purge those; would need GH Support or repo recreate). Nothing was on npm, so no pkg impact.
- **2026-07-22 — FIX: nmea-parser CI couldn't resolve the private core in a fresh checkout (cru).**
  After the pnpm fix, running the workflow locally with **`act`** surfaced a *second*, pre-existing
  break: nmea-parser's tests/build import `@coremarine/protocol-core`, whose `package.json`
  `exports`/`main` point **only at `dist/`** — and the workflow built **nothing** before Tests. In a
  fresh checkout the core has no `dist/`, so vitest died with *"Failed to resolve entry for package
  @coremarine/protocol-core"* (4 suites). It only ever passed locally because a prior session left
  `packages/core/dist/` on disk. **This had been red in CI since the 2026-07-10 core refactor** — the
  pnpm bug just failed earlier and hid it. **Fix (Option A, cru): added a `🛠️ Build monorepo deps`
  step running `pnpm run protocol-core:build`** to `nmea-parser.yml` — before Tests in the test job,
  and before Build in the publish job (mirrors the `norsub-emru.yml` "build nmea-parser first"
  pattern). Reproduced + fixed locally (rm core dist → 4 fail; build core → 65/65) and **re-verified
  end-to-end with `act` from a clean checkout: Setup pnpm ✅ → protocol-core build ✅ → 65/65 ✅ →
  nmea build ✅ → job succeeded.** Follow-ups noted for later: (B) a `pretest` hook, or (C) resolve
  the core from source (`exports`→`src`/vitest alias) to drop the build-order dep repo-wide — revisit
  when refactoring norsub. **Local dev gotcha remains:** run `pnpm run protocol-core:build` once
  before `nmea-parser:test` if `packages/core/dist/` is absent.
- **2026-07-22 — FIX: CI red at `Setup pnpm` — pnpm `11.12.0` is a broken release (cru).** The
  `dev`→`main` merge was made and **failed on every library workflow at the `📦 Setup pnpm` step**
  (`pnpm/action-setup@v6`, self-update to the packageManager version): `[ERROR] Cannot use 'in'
  operator to search for 'integrity' in undefined` while parsing the lockfile. Root cause is **not
  our logic** — **pnpm `11.12.0` was deprecated by upstream as broken** (`npm view pnpm@11.12.0
  deprecated` → *"This release is broken. Please upgrade to v11.13.1 or newer."*; `11.13.0` is
  broken too). It was green on 2026-07-13 because npm deprecated/it surfaced afterward. Same bug hit
  the **local** dev env (corepack honors the same field). **Fix: bumped root `package.json`
  `packageManager` `pnpm@11.12.0` → `pnpm@11.15.1`** (current `latest-11`, clean). Lockfile
  unaffected (packageManager doesn't change dep resolution); `--frozen-lockfile` still clean. Verified
  local: pnpm 11.15.1, nmea-parser **65/65** + build ESM+CJS+DTS. **The `nmea-parser@3.0.0` publish
  did NOT happen** (test failed → publish skipped by `needs: test`), so nothing bad shipped — re-merge
  `dev`→`main` after this lands on `dev` and the `dev` run is green.
  - **Lesson / process:** the `test`/`build` jobs run on **every `dev` push** (only `publish` is
    `main`-gated), so **land changes on `dev` and confirm the workflow is green there BEFORE merging
    to `main`**. `act` (nektos/act) is set up for fully-local workflow runs (Docker/podman present).
- **2026-07-22 — CI/CD publish-gating re-audited + release plan phased (cru).** No code change
  (HEAD still `aaa6847`). Audited all 11 workflows: **every publishable package's publish job is
  correctly gated on `github.ref == 'refs/heads/main'` AND a `npm view <name>@<version>`
  version-differs check** (publish steps run only when that exact version is NOT yet on npm), each
  workflow targets **its own** package (no cross-wiring), all on OIDC (`id-token: write`, zero
  `NPM_TOKEN` — the only "NPM_TOKEN" text is a comment); `protocol-core` correctly has no publish
  job (private). **Confirmed the only fully-working action today is `nmea-parser`**; `norsub-emru`
  + `sbg-ecom` test jobs go red on a `main` merge (expected mid-refactor — norsub uses the removed
  API, sbg has no specs) and `needs: test` blocks their publish, so nothing broken ships. cru
  **locked the release into strict phases** (see "Where we are now" + the paste-ready prompt):
  **Phase 1** publish nmea-parser 3.0.0 + verify a fresh install → **Phase 2** (on cru's signal)
  refactor the nmea-parser-nodered wrapper + verify its CI/CD → **Phase 3** (only once nmea-parser
  **and** its wrapper are fully in production) norsub-emru + its wrapper → then tblive, then the
  binary parsers, each with its wrapper. PR message for the `dev`→`main` merge drafted this turn.
- **2026-07-13 — post-release cleanup + safe dep bumps (cru).** HEAD `ee08691`.
  - **`c39f233` — strip private core from published manifests.** New **`.pnpmfile.mjs`** with a
    `beforePacking` hook that deletes `@coremarine/protocol-core` from any packed package's
    dependencies/devDependencies/peerDependencies. Replaces the earlier harmless-but-ugly dangling
    `@coremarine/protocol-core@0.0.0` in nmea-parser's published devDeps. Verified: `pnpm pack`
    manifest now contains **zero** `protocol-core` references. (Stays in the workspace package.json
    for local builds; only the *published* manifest is cleaned.)
  - **`b16b7c0` — fixed `thelmabiotel-tblive` `homepage`** (was `github.com/core-marine-dev/tree/…`,
    missing `/devices`).
  - **`ee08691` — safe dep bumps:** `packageManager` pnpm `11.10.0→11.12.0` (⚠️ **11.12.0 later
    found broken & deprecated upstream → bumped to `11.15.1` on 2026-07-22**, see the top Done entry),
    `@types/node` `26.0.1→26.1.1`, `eslint` `10.6.0→10.7.0`. Verified: nmea 65/65, core 14/14, both
    lint+tsc+build clean, whole-repo `pnpm lint` clean, `--frozen-lockfile` clean.
  - **Deferred deliberately (NOT risk-free — see the CI/CD & versions decisions):**
    - **TypeScript 7** (native Go rewrite, GA 2026-07-08): held at `6.0.3`. TS7 has **no stable
      programmatic API until 7.1** (~Oct 2026); `typescript-eslint@8.63` peers `typescript
      >=4.8.4 <6.1.0` and tsup's dts uses the TS API — both break on 7. `tsc` itself is fine/~10× faster;
      revisit when 7.1 ships and typescript-eslint/tsup add support.
    - **js-yaml 5**: held at 4.x. The workspace **security override** `js-yaml: '>=4.1.1'` pins the
      whole workspace to 4.3.0; bumping nmea-parser to 5 would need to change that override, dragging
      mocha/node-red's transitive js-yaml to v5 too. No CVE on 4.3.0 → no benefit, real risk.
- **2026-07-13 — nmea-parser 3.0.0 release prep + repo-wide CI/CD modernization (cru).** Four
  commits on `dev`, in order A→B→D→C (HEAD `65bec81`):
  - **A `aca7a37` — CI/CD (all 11 workflows).** Bumped `actions/checkout@v4→v7`,
    `actions/setup-node@v4→v6`, `pnpm/action-setup@v4→v6`; node matrix → the two latest LTS lines
    **`[22.x, 24.x]`** (publish job on `24`; Node 26 isn't LTS until 2026-10-28). **Migrated every
    publish job off `NPM_TOKEN` to npm Trusted Publishing (OIDC)** — added `permissions: { id-token:
    write, contents: read }`, dropped the token env; provenance is emitted automatically. **cru
    configured Trusted Publishers on npmjs for ALL packages.** Added a **publish-if-version-changed
    gate**: the publish job runs `npm view <name>@<version>` first and only installs/builds/publishes
    when that exact version is NOT yet on npm (verified empirically: published→exit 0, missing→E404).
    New **`protocol-core.yml`** (test-only; private package, no publish). Node-RED workflows:
    version-bumped + OIDC + gate, **test jobs stay disabled** until each wrapper is refactored.
    `pnpm publish` on pnpm 11.10.0 + Node 24 supports OIDC (regression pnpm#11513 was fixed in
    #11526, we're well past it).
  - **B `37dfde2` — `build` regenerates protocols.** nmea-parser + norsub-emru `build` now runs
    `protocols` before `format && tsup`, so the published dist always carries the latest
    `protocols/*.yml` sentences and every workflow stays uniform (no per-package generate step).
    (Verified generate→format→tsup reproduces the committed `src/nmea.ts` byte-for-byte.)
  - **D `5a5ad0a` — `repository.directory` in every package.json** (all 10 publishable + private
    core got a repository/homepage/bugs block for parity).
  - **C `65bec81` — nmea-parser 3.0.0.** Bumped `2.2.1→3.0.0` (CMA output is breaking). **Moved
    `@coremarine/protocol-core` `dependencies`→`devDependencies`** — it's private/unpublished and
    bundled via tsup `noExternal`, so it must not be a runtime dep (else `npm i` 404s on
    `@coremarine/protocol-core@0.0.0`). **Added `dts: { resolve: [/@coremarine\/protocol-core/] }`**
    to `tsup.config.ts` so the core's TYPES inline into `dist/*.d.ts` too (`noExternal` only inlines
    JS) — the published `.d.ts` now has zero reference to the unpublished core. Verified: `pnpm pack`
    tarball has NO protocol-core in `dependencies`, self-contained types, all 4 dist files.
  - Verified end-to-end: nmea-parser lint+tsc+**65/65**+build ESM+CJS+DTS; core lint+tsc+**14/14**
    +build; all 11 workflow YAMLs parse; `pnpm install --frozen-lockfile` clean. (The published
    `devDependencies` initially still listed `@coremarine/protocol-core@0.0.0` after pnpm's
    `workspace:*` rewrite — now stripped by the `.pnpmfile.mjs` `beforePacking` hook, see the newer
    Done entry above.)
- **2026-07-13 — STEP 3: sentence timestamp metadata (`metadata.timestamp`), core-wide (cru).**
  Every emitted CMA now carries `cma.metadata.timestamp = { received, parsed, sentence? }` (epoch
  ms). **Core** (`@coremarine/protocol-core`): new `ValibotTimestampMetadataSchema` +
  `ValibotSentenceMetadataSchema` (a **loose** object — typed `timestamp` + free-form extras) in
  `src/cma.ts`; **`CMA.metadata` promoted optional → required** (single source of truth — the
  timestamp is not optional because of internal logic). New types `TimestampMetadata`,
  `SentenceMetadata`, and **`DraftCMA`** (= `CMA` minus its metadata timestamp — what a protocol's
  `extractSentences` returns). `Parser.addData` stamps `received` (call time) + `parsed`
  (= `draft.timestamp`) into every sentence — the **only** place a `CMA` gains its timestamp, so the
  required contract can't be violated and no placeholder is needed. New protocol hook
  `protected sentenceTimestamp(draft): Timestamp | undefined` (default: none) supplies the optional
  `sentence`. **nmea-parser**: whole pipeline retyped `CMA` → `DraftCMA`
  (`sentences.ts`/`metadata.ts`); overrides `sentenceTimestamp` to promote the first field-level
  `timestamp` (GGA `utc_position`) → `metadata.timestamp.sentence`; added `NMEASentenceMetadata`
  type. **Decision B (cru): kept the GGA field-level `timestamp` as-is** (it's the source the hook
  promotes — deliberate redundancy, gives field-decoders freedom). Verified: core lint+tsc+14/14
  +build, nmea lint+tsc+**65/65**+build ESM+CJS+DTS; real-run confirms GGA has all three, HDT has
  received+parsed only. Docs: [`docs/CMA.md`](CMA.md) §Timestamp metadata, [`docs/NMEA.md`](NMEA.md)
  §Sentence timestamp. **No `-nodered` wrappers touched; norsub not touched.**
- **2026-07-10 — STEP 2: Result pattern (no throws) in core + nmea-parser.**
  New `packages/core/src/result.ts`: `Result<T,E> = { success:true, value:T } | { success:false,
  error:E }` (bare literals, no `ok`/`err` helpers), exported from `@coremarine/protocol-core`.
  nmea-parser `NMEAError = { kind: 'invalid-yaml' | 'invalid-schema', message }` (`src/types.ts`).
  `parseProtocols(yaml)` now returns `Result<ProtocolsFileContent, NMEAError>` — `yaml.load` wrapped
  in try/catch (→ `invalid-yaml`), `safeParse` miss → `invalid-schema`; the lone `throw` is gone.
  `addSentences(yaml)` returns `Result<void, NMEAError>` (non-string input or a failing
  `parseProtocols` → error; else registers + `{ success:true, value:undefined }`). Constructor loads
  the trusted built-in via `safeParse` (was throwing `.parse`) — never throws. Parse hot-path
  unchanged (already no-throw). Tests updated: `parseProtocols`/`addSentences` invalid-content specs
  now assert `.success === false` (+ `error.kind`). Verified: core lint+tsc+12/12+build,
  nmea-parser lint+tsc+62/62+build ESM+CJS+DTS.
- **2026-07-10 — core setters no longer throw (cru).** `set memory` / `set bufferLimit`
  (`packages/core/src/parser.ts`) now use `BooleanSchema.is` / `NaturalSchema.is` guards: a valid
  assignment is set, an invalid one is **discarded** (current value kept), never thrown — the legacy
  throw-on-bad-assignment behaviour is removed. Test added (13/13 core). Setters can't return a
  `Result`, so discard-and-keep is the no-throw contract.
- **2026-07-10 — protocols renamed `.yaml` → `.yml` + `nmea.yml` expanded (cru), regenerated.**
  `protocols/{nmea,norsub}.yml`; updated the `protocols` generator script and the two tests that
  read norsub by path; regenerated `src/nmea.ts` + `tests/norsub.ts`. 62/62 green.
- **2026-07-10 — STEP 1: 3-level metadata via dev-authored aggregators (nmea-parser).**
  New `packages/nmea-parser/src/metadata.ts`. `type MetadataAggregator = (cma) => { fields?:
  Record<number, Metadata>, payload?: Metadata }`; registry `METADATA_AGGREGATORS` keyed by
  **`${id}:${payloadLength}`** (stable identity, NOT field names); aggregators read fields **by
  index**. `aggregateMetadata(cma)` runs after upgrade — merges `fields[i]` into
  `payload[i].metadata` and `payload` (flat) into `cma.metadata.payload`; **no-ops when no
  aggregator is registered**, so unknown/wrong-length sentences pass through untouched (known-only).
  Wired: `parseSentence = aggregateMetadata(upgradeKnownSentence(parseGenericSentence(raw)))`.
  Seeded **GGA (`GGA:14`)** — resurrects the deleted `nmea-metadata.ts` on the CMA shape: field
  metadata `utc_position`→`{ timestamp }` (hhmmss.ss→epoch ms, UTC, dated today; idx 0) +
  `gps_quality`→`{ label }` (idx 5); payload metadata `{ latitude, longitude }` in decimal degrees
  (idx 1+2, 3+4). Free-form metadata; **core CMA schema unchanged**. Verified: lint clean, tsc
  clean, **62/62 tests** (+6 in `tests/metadata.test.ts`), build ESM+CJS+DTS. Kept the prior
  agent's proposed names (`MetadataAggregator`/`aggregateMetadata`/`METADATA_AGGREGATORS`); quality
  field metadata key is `label` (avoids clashing with the field's own `description`).
- **2026-07-10 — nmea-parser refactored onto `@coremarine/protocol-core` (slice A–F, committed & green).**
  The reference CMA implementation. Output shape changed `NMEASentence` → `CMA` (breaking for
  Tracker — deliberate). Verified: `pnpm lint` clean, `tsc --noEmit` clean, **56/56 tests pass**,
  build emits ESM+CJS+DTS. Zero `node:` imports and zero "frame" in `src/`.
  - **`parser.ts`** — `class NMEAParser extends StringParser` (core owns memory/buffer/drain +
    `addData`/`parseData`). Implements only `extractSentences(buffer) → { sentences: CMA[], remainder }`.
    New single knowledge-feed input `addSentences(yaml: string)` (js-yaml; web-safe — caller reads
    the file). **Constructor is now object-arg `new NMEAParser({ memory?, bufferLimit? })` and
    `memory` DEFAULTS TO `true`** (core default; old NMEA default was `false` — tests needing
    independence pass `{ memory: false }`). Kept renamed extras: `getSentences`,
    `getSentencesByProtocol`, `getSentence`, `getFakeSentenceByID`.
  - **`sentences.ts`** — `parseSentence = upgradeKnownSentence(parseGenericSentence(raw))`. Generic
    parse emits a CMA (all fields `type:'string'`, empty field → `value:null`, `metadata:{checksum,
    standard:false, talker?}`, `protocol:{name:'NMEA', version:'unknown'}`); a **bad checksum is
    emitted WITH a sentence-level error, never dropped** (locked decision 4b). Upgrade looks up the
    KB, filters defs by field count, and applies the **newest** by version (semver-tolerant
    `compareVersions`). Values parsed via core `TYPE_SCHEMAS` (fixes the old Float32/Float64 swap);
    int64/uint64 ride as decimal strings.
  - **Talker/id semantics (my call — flagging; the locked design under-specified proprietary +
    full-id-registered sentences):** upgrade lookup order = `[fullId, strippedId]`; the MATCHED
    definition's id becomes the CMA `id`; `talker` (from `getTalker`) always goes to `metadata`.
    Unmatched → generic with `id = fullId`. This reproduces the old full-id-first behavior exactly
    (`HEHDT`→GYROCOMPAS1 not standard `HDT`; proprietary `PNORSUB8`) and passes every test. **If cru
    wants different talker/id handling, it's a localized change in `upgradeKnownSentence`.**
  - **Knowledge base** is now `Map<id, StoredSentence[]>` (multiple defs per id). `protocols.ts`
    keeps `parseProtocols(yaml)` + `getStoredSentences` (multi-def), **dropped `node:fs`** (no more
    file-path mode).
  - **`schemas.ts`/`types.ts` trimmed** — dropped legacy OUTPUT schemas (`NMEASentenceSchema`,
    `NMEAParsedField*`, local numeric field validators, the file/object arms of the old
    `ProtocolsInputSchema`, `JSONSchemaInputSchema`, `ChecksumSchema`); kept the YAML-input +
    KB + sentence-structure schemas. `MapStoredSentencesSchema` now maps id → array.
  - **Deleted:** `src/nmea-sentences.ts` (stale duplicate — knowledge now flows YAML →
    `yaml-to-json.js` → generated `src/nmea.ts` `PROTOCOLS` only), `src/nmea_protocols_schema.json`
    (unused), and **`src/nmea-metadata.ts`** (GGA lat/long/quality enrichment — DEFERRED; it
    referenced now-deleted types, so it's removed and must be reimplemented on CMA as a follow-up).
- **2026-07-09 — `@coremarine/protocol-core` scaffolded (CMA rollout foundation, uncommitted).**
  New private workspace package `packages/core/` — the shared contract both refactor
  goals build on. Not published (`"private": true`); each parser will bundle it into its own
  `dist` via tsup `noExternal: [/@coremarine\/protocol-core/]`, so published parsers carry no
  runtime dep on it.
  - `src/cma.ts` — canonical CMA valibot schemas (house idiom: `ValibotXSchema` → `ValibotValidator`),
    the definitive format cru locked (see [`docs/CMA.md`](CMA.md) §Locked decisions). Field
    `value` union is `string | number | boolean | null`.
  - `src/schemas.ts` — config schemas (`Boolean`/`Natural`) **plus one field-value validator per
    CMA `Type`** (`Char`, `String`, `Uint8/16/32`, `Int8/16/32`, `Float32/64` from
    `@schemasjs/valibot-numbers`; `Int64`/`Uint64` as decimal strings) and a
    `TYPE_SCHEMAS: Record<Type, Schema<Value>>` lookup for table-driven, identical field
    validation across parsers. This is also the correct single source that fixes NMEA's
    `Float32`/`Float64` swap bug when NMEA is refactored.
  - `src/types.ts` — CMA types **inferred** from the schemas (`ReturnType<typeof …Schema.parse>`),
    plus `Input = string | Uint8Array`, `ParserOptions`, `ExtractedSentences<B>`.
  - `src/parser.ts` — `abstract Parser<B>` owns the whole `memory`/buffer/drain machinery; the
    ONE protocol-specific method is `protected extractSentences(buffer): { sentences, remainder }`.
    Two flavor bases supply buffer mechanics: `StringParser` (NMEA/Norsub/TB Live) and
    `BinaryParser` (Septentrio/SBG, Uint8Array via `DataView`, no Node `Buffer`).
  - `tsup.config.ts` `platform: 'neutral'` (runtime-agnostic). Root proxy scripts added
    (`protocol-core:{lint,format,build,test,test:coverage}` — prefix follows the package name,
    not the folder).
  - **Folder is `packages/core/`; package name is `@coremarine/protocol-core`** (cru's choice —
    short folder, descriptive package name). They intentionally differ.
  - Verified: lint clean, `tsc --noEmit` clean, 5/5 tests pass, build emits ESM+CJS+dts.
- **2026-07-09 — housekeeping (uncommitted):** moved each parser's `docs/` datasheet PDFs out
  of the packages into `misc/datasheets/<package>/` (gitignored; septentrio's nested `4-10-1/`
  folder preserved). No package `docs/` folders remain. These PDFs were untracked, so it's a
  pure filesystem move. See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) `misc/` convention.
- **2026-07-08 — full repo revision + docs reset.** Three exploration passes (packages,
  uncommitted work, tooling/CI) written into `docs/` (was empty); `AGENTS.md` slimmed to a
  ≤80-line index; this STATUS.md created as the handoff log.
- **2026-07-08 — uncommitted-pile triage (was ~46 dirty files, cru's call on categories):**
  - **`misc/` convention adopted** (gitignored, like the Tracker repo): raw sensor data,
    scratch harnesses, drafts and parked work must never be committed. Moved there: the root
    CMA harness (`misc/tests/` — cma.ts draft, SBG corpus, P08-Trident), `misc/todo/`
    (ublox-ubx + vectornav scaffolds, never tracked), sbg-ecom-nodered draft tests + raw
    bin/csv samples (`misc/drafts/`, `misc/data/sbg/`), tblive runtime outputs
    (`misc/data/tblive/`), the unused `receiver` helper node, `drafts.excalidraw.png`, and
    superseded design drafts (`misc/archive/`).
  - **Deleted** 14 untracked npm-generated `package-lock.json` files (packages' test folders,
    templates).
  - **Restored** the root `package-lock.json` (its deletion was uncommitted and unexplained;
    we stay on npm until the pnpm migration). `npm install` then refreshed it (committed with
      the sbg-ecom bump).
  - **Verified then committed** the pre-idle threads: septentrio-sbf test modernization
    (`getFrames()→parseData()`, `ErrorCode→ERROR_CODE`, `Mode→MODE`) — **54/54 tests pass**;
    sbg-ecom dep bump + vitest `include` + example fixes (trailing `}` in template strings —
    also fixed a real one in `example_csv.ts` map keys) — lint + build clean;
    septentrio-sbf-nodered sibling bump `^1.0.1`; tblive-nodered expanded docker flows +
    its previously-untracked docker components mirror.
- **2026-07-08 — pnpm migration (step 1, `f6444c3`):**
  - Root `package.json`: `packageManager: pnpm@11.10.0`, dropped npm `workspaces` + `main`,
    rewrote ~36 proxy scripts to `pnpm --filter @coremarine/<pkg> run <action>`.
  - `.npmrc` (`engine-strict=true`) + `pnpm-workspace.yaml` (`strictDepBuilds: true` +
    `allowBuilds: { esbuild: true }`) — supply-chain hardened (mirrors Tracker repo).
  - 5 tracked `package-lock.json` removed; `package-lock.json` added to `.gitignore`.
  - Sibling deps → `workspace:^` (norsub-emru + all 5 nodered packages).
  - septentrio-sbf `types` hack removed — `gpstime.d.ts` is now a local ambient declaration
    (`declare module 'gpstime'`) included in `tsconfig.json` (no more copying to root
    `node_modules/@types/`).
  - valibot ERESOLVE dep rot fixed: `nmea-parser` `valibot: 1.1.0` → `^1.4.0`; `norsub-emru`
    peer `valibot: 1.1.0` → `>=1.0.0` (valibot 1.4.2 now installs cleanly).
  - 10 CI workflows + 2 templates rewritten: `pnpm/action-setup@v4`, `cache: 'pnpm'`,
    `pnpm install --frozen-lockfile`, `pnpm publish --filter --no-git-checks`.
  - Verified: all 5 builds pass, all 4 test suites with specs pass (nmea 60/60, septentrio
    54/54, tblive 134/134, norsub 8/8; sbg-ecom has no specs — pre-existing).
  - Docs updated: TOOLING, COMMANDS, PNPM-MIGRATION (marked done), CONTRIBUTING, AGENTS.
- **2026-07-08 — ESLint flat config migration (step 2, `21ad374`):**
  - Root `eslint.config.js` with 4 plugins: typescript-eslint, @stylistic, eslint-plugin-sonarjs,
    eslint-plugin-perfectionist (mirrors Tracker repo). House style: no-semi, single-quotes,
    2-space, K&R braces, arrowParens: always. Sonar thresholds: max-lines-per-function 50,
    cyclomatic-complexity 10, cognitive-complexity 15 (tests exempt from max-lines). Import
    ordering: `// built-in` → `// installed` → `// coded` via perfectionist partitionByComment.
  - ts-standard removed; per-package `ts-standard`/`eslintConfig` blocks removed.
  - `lint` = `eslint`, `format` = `eslint --fix`; root `lint`/`lint:fix` scripts added.
  - `.vscode/settings.json` updated: ESLint flat config integration, `source.fixAll.eslint`
    on save, dropped `standard.*` settings.
  - Per-package `tsconfig.json` updated to include `tests/**/*` (for projectService).
  - ~2596 auto-fixable violations fixed (quotes, semicolons, trailing commas, indentation).
  - ~180 non-fixable violations triaged:
    - Mechanical fixes: split multi-statement lines (66), unused vars/imports (25), test
      assertion specificity (20).
    - Complexity violations (max-lines-per-function, cyclomatic-complexity, cognitive-complexity):
      inline-disabled with `-- CMA refactor will address` comments.
    - Sonar findings: `===` type-mismatch (fixed a real type bug in nmea-parser/sentences.ts;
      intentional ones disabled with comments), `Math.random()` in tests (disabled), TODO tags
      (disabled), empty collections (disabled), hardcoded IP (disabled), dead stores (removed).
  - Verified: all 5 builds pass, all 4 test suites pass (nmea 60/60, septentrio 54/54,
    tblive 134/134, norsub 8/8). `pnpm lint` clean across the whole monorepo.
  - Docs updated: TOOLING (linting section), COMMANDS, CONTRIBUTING, AGENTS.
- **2026-07-08 — documentation (step 3, `055b6d4`):**
  - `docs/CodeStyle.md` created — dev explainer with rationale + examples for: formatting,
    import groups, arrow functions, one-statement-per-line, small-function thresholds,
    validation & types (Valibot/SchemasJS), per-package five-file structure, tooling commands,
    inline eslint-disable policy. Adapted from the Tracker repo's CodeStyle.md, tailored for
    Node/monorepo (no Bun built-ins, no Result pattern yet — that's a later track).
  - `AGENTS.md` — added "Code style (enforced)" condensed checklist section (73 lines total,
    under the 80-line cap) + CodeStyle.md added to docs map.
  - `docs/STATUS.md` — updated to reflect step 3 done.
- **2026-07-08 — dependency refresh (step 5, `3bcc0d6`):**
  - **TypeScript 5.9.3 → 6.0.3.** Root `tsconfig.json` replaced the annotated starter template
    with a clean modern config: `moduleResolution: "bundler"`, `moduleDetection: "force"`,
    `types: ["node"]`, `noFallthroughCasesInSwitch`, `noImplicitOverride`. Per-package
    tsconfigs updated. `norsub-emru` needed `override` on `parseData()`.
  - **tsup 8.5.0 → 8.5.1 (patched).** tsup injects `baseUrl: "."` in its DTS build, which TS 6
    deprecated (TS5101). Patched via `pnpm patch` to skip the injection (see
    `patches/tsup@8.5.1.patch`).
  - **Vitest 3.2.4 → 4.1.10** + `@vitest/coverage-v8` 3.2.4 → 4.1.10. Zero code changes needed.
  - **Valibot** — `nmea-parser` `valibot: ^1.4.0` → `1.4.2`; `@valibot/to-json-schema`
    `1.3.0` → `1.7.1`; `@schemasjs/valibot-numbers` → `1.1.1`; `@schemasjs/validator` → `2.0.5`.
  - **Other deps:** `@types/node` 24.8.1 → 26.0.1, `mocha` 11.7.4 → 11.7.6, `chai` 6.2.0 → 6.2.2,
    `deep-equal-in-any-order` 2.1.0 → 2.2.0, `node-red-node-test-helper` 0.3.5 → 0.3.6.
  - Verified: all 5 builds pass, all 4 test suites pass (nmea 60/60, septentrio 54/54,
    tblive 134/134, norsub 8/8), `pnpm lint` clean, `pnpm install --frozen-lockfile` clean.
  - Docs updated: TOOLING, STATUS.
- **2026-07-08 — security audit + vulnerability fixes (step 6, `b505fc9` + `2d40a86` + `31b52c3`):**
  - `pnpm audit` found 27 vulnerabilities (3 critical, 15 high, 9 moderate). Root cause: mostly
    transitive deps through `node-red@4.1.1` (tar, multer, qs, ws, uuid, path-to-regexp,
    jsonata, form-data, ajv) + `esbuild` (via tsup) + `js-yaml` (via mocha/nmea-parser).
  - **node-red 4.1.1 → 5.0.1** — fixed 19 of 27 vulns.
  - **js-yaml 4.1.0 → 4.2.0** in nmea-parser — fixed prototype pollution + quadratic DoS.
  - **pnpm overrides** in `pnpm-workspace.yaml` for remaining transitive vulns:
    `serialize-javascript >=7.0.5`, `diff >=8.0.3`, `js-yaml >=4.1.1`, `jsonata >=2.2.0`,
    `form-data >=4.0.6`, `esbuild >=0.28.1`.
  - **valibot pinned to `1.4.2`** (exact) in all `peerDependencies` — was `>=1.0.0` in root +
    norsub-emru + thelmabiotel-tblive + thelmabiotel-tblive-nodered, allowing older vulnerable
    versions.
  - **rootDir fix** — TS 6 requires explicit `rootDir` when `include` spans multiple dirs
    (`src/` + `tests/`). Added `"rootDir": "."` to all 5 library packages + template.
  - Result: `pnpm audit` reports **0 known vulnerabilities**.
  - GitHub still shows 75 vulns on `main` (default branch) — they'll clear once `dev` is merged
    to `main`.

## Where we are now

**HEAD `ee08691` (+ this docs commit), branch `dev`, working tree clean (2026-07-13).** Steps 1-6
complete. Modern stack: pnpm 11.15.1, TypeScript 6.0.3 (TS7 deferred), ESLint 10.7 + sonar +
perfectionist, Vitest 4, Valibot 1.4.2, zero known vulns on `dev` (the 74 dependabot alerts are on
`main`, clear on merge).

**CMA rollout in progress.** `packages/core/` (shared contract) done. **nmea-parser is the finished
reference implementation** — CMA output + 3-level metadata + Result pattern + STEP 3 timestamp
metadata. Core = 14/14, nmea = 65/65, both build clean.

**RELEASE PREP FOR nmea-parser 3.0.0 IS DONE** (see the top Done entry, 4 commits A→B→D→C): every
package's CI/CD is on **npm OIDC Trusted Publishing** with a **publish-if-version-changed gate**,
node LTS `[22.x,24.x]`, `checkout@v7`/`setup-node@v6`/`action-setup@v6`; `build` regenerates
protocols; `repository.directory` everywhere; nmea-parser is `3.0.0` with protocol-core moved to
devDeps + types inlined into the published `.d.ts`. **cru has configured Trusted Publishers on npmjs
for ALL packages.**

**NEXT — the release is PHASED (locked with cru 2026-07-22); do them strictly in order, each fully
in production before the next:**

- ~~**Phase 1 — publish nmea-parser 3.0.x**~~ — ✅ **DONE 2026-07-24: `@coremarine/nmea-parser@3.0.2`
  live on npm** (PR #70). (History: the 2026-07-22 first attempt died at `Setup pnpm` on the broken
  pnpm `11.12.0` → fixed by bumping `packageManager` to `pnpm@11.15.1`; then 3.0.0 published, later
  patched to 3.0.1→3.0.2 for the engines fix + README.)
- ~~**Phase 2 — nmea-parser-nodered wrapper**~~ — ✅ **DONE 2026-07-24: `@coremarine/nmea-parser-nodered@2.0.1`
  live on npm** (PR #70). TS rewrite onto `addSentences`/CMA, `node:test`, OIDC publish, dev-server +
  palette + engines all settled (see the top Done entries + banner).
- **Phase 3 (CURRENT) — norsub-emru.** **TASK 3a (the LIBRARY) is DONE, green and uncommitted as of
  2026-07-29** — see the top banner + the 2026-07-29 Done entry. Prerequisites shipped as
  **`nmea-parser@3.1.0`** (PR #71). **NEXT: cru reviews + commits 3a, then TASK 3b — the
  `norsub-emru-nodered` wrapper** (clone `nmea-parser-nodered`, the proven template; node type
  `cma-norsub-parser`; expose the facade's `protocol` selection in the config UI). Then
  thelmabiotel-tblive (+ wrapper), then the binary parsers septentrio-sbf & sbg-ecom (+ wrappers).
  **The paste-ready TASK 3b prompt is at the very end of this doc.**

### Prompt for the next agent — HISTORICAL (Phase 1/2 era, kept for context only)

> ⚠️ **SUPERSEDED — do not follow.** Phases 1 and 2 are shipped. The live prompt is the
> **"Phase 3 coding prompt"** at the very end of this doc.

> Continue the CoreMarine **devices** monorepo refactor (branch `dev`, HEAD is a `docs(status)`
> commit — run `git log --oneline -10` first). Read **`docs/STATUS.md`** top-to-bottom (esp. the top
> Done entries + Decisions). cru works **one step at a time and wants decisions converged BEFORE
> acting**; verify per package from the package dir (lint → tsc → test → build); update
> `docs/STATUS.md` **same-turn**. **Repo rule: for any npm / pnpm / GitHub-Actions / TypeScript /
> library specifics, fetch current docs with the `ctx7` CLI — do not rely on memory.**
>
> **The release is PHASED (locked 2026-07-22). Do the phases strictly in order — each must be fully
> in production before starting the next.**
>
> **PHASE 1 (current) — publish nmea-parser 3.0.0 & verify a fresh install.** nmea-parser is a
> FINISHED reference implementation and its 3.0.0 release + repo-wide OIDC/version-gated CI/CD are
> DONE and committed on `dev` — **do NOT redo any of it.** CI/CD was re-audited 2026-07-22: every
> package's publish job is correctly gated on `on main` AND `version-differs`, so **only nmea-parser
> 3.0.0 publishes** on the merge (norsub-emru + sbg-ecom test-red is expected mid-refactor and blocks
> nothing). **This step is cru's own: open PR `dev` → `main` and merge** (PR message already drafted —
> see the 2026-07-22 Done entry / ask cru). If you're driving, watch the `nmea-parser` publish job
> succeed (OIDC + provenance), confirm `@coremarine/nmea-parser@3.0.0` is on npm, then **smoke-test a
> fresh install**: in a clean dir `npm i @coremarine/nmea-parser@3.0.0`, import both ESM + CJS, confirm
> types resolve and there is **no** `@coremarine/protocol-core` runtime dep.
>
> **PHASE 2 (ONLY when cru says go, after 3.0.0 is live) — nmea-parser-nodered wrapper.** Bump its
> dep `@coremarine/nmea-parser` → `^3.0.0` (pnpm rewrites `workspace:^` on publish). Its workflow is
> already on OIDC + the version gate, but its **test job is still commented out** and its
> `src/parser.js` calls the **removed old API** (`parser.addProtocols({...})`) — rewrite it to
> `addSentences(yaml)` + CMA output, re-enable the test job (needs the lib's dist built first), bump
> version, verify CI/CD green, publish, smoke-test a fresh install. Trusted Publisher already
> configured on npm.
>
> **PHASE 3 (ONLY once nmea-parser AND its wrapper are fully in production) — norsub-emru, then its
> wrapper.** The lib is the next *code* refactor: §"NMEA refactor — locked design & plan" → Resume
> prompt has the full spec + two open design questions. Its workflow is already modernized (keeps the
> `Build monorepo deps: nmea-parser:build` step since it extends NMEAParser). Timestamp metadata is
> inherited from core; no work there. Then norsub-emru-nodered.
>
> **LATER (same lib-then-wrapper pattern):** thelmabiotel-tblive, then the binary parsers
> septentrio-sbf & sbg-ecom (`BinaryParser`, `Buffer`→`Uint8Array`/`DataView`; septentrio will want a
> `sentenceTimestamp` override for TOW+WNc).

## Node-RED wrapper refactor — locked plan (Phase 2, started 2026-07-22)

> `nmea-parser-nodered` is refactored first and becomes the **template for all future wrappers**
> (`templates/nodered/`). Plan converged with cru after deep investigation (below). Not yet coded.

**Locked decisions (2026-07-22, cru):**
- **Versions:** `engines.node ≥22`, `node-red ≥5` (needs Node 22), CI matrix `[22.x, 24.x]`, drop the
  Node-18 Dockerfile base.
- **Authoring: TypeScript → tsup → CJS** (validated by spike — see below). Node-RED requires CJS;
  tsup `export = init` emits `module.exports = <fn>`, node-red's exact contract. Build = tsup for JS
  **+ copy `parser.html` + icons** (tsup doesn't handle static assets).
- **API migration** (`src/parser.*`): `new NMEAParser({ memory })`; `addProtocols({file,...})` →
  **`addSentences(yaml)` handling the `Result`**; the configured **`file` path is read in-node (fs)**
  and its content passed to `addSentences`; `parseData` → `CMA[]`. Fix the latent `parser()` bug and
  the flow/registerType type name (`cma-nmea-parser`). Surviving getters kept.
- **Architecture:** split into a **pure-logic module (zero node-red deps)** + a **thin RED adapter**.
- **Testing — three layers:**
  1. **Pure-logic unit tests** via **`node:test` + `node:assert`** (no helper). CI backbone.
  2. **Integration** (registration + msg wiring) in CI — **VALIDATED approach (cru chose B): boot
     real node-red headless via its PUBLIC api + the flowFile pattern** (spiked green 2026-07-22):
     write a flow (`inject → cma-nmea-parser → test-sink`) to a temp `flowFile`, `RED.init(http
     server, { httpAdminRoot:false, httpNodeRoot:false, disableEditor:true, userDir:<tmp>,
     logging:{console:{level:'off'}} })`, register a `test-sink` type before `RED.start()`, then
     `await RED.start()`; the wrapper **auto-loads from node_modules** (workspace symlink), the `once`
     inject fires, the sink captures. Confirmed: injected `$GPGGA…\r\n` came out as `payload:[CMA]`
     (`id:GGA`, `protocol:{NMEA,3.1}`, `metadata.timestamp:{received,parsed,sentence}`). Uses only the
     stable public API — no fragile helper/patch. Notes: NMEA sentences need `\r\n` terminators (else
     buffered); boot ≈700ms so **share one runtime across many assertions** (one flow, sink collects an
     array), don't boot-per-test. The `runtime.flows.setFlows` admin API does NOT reliably start nodes
     embedded — use the flowFile-before-start pattern. **A. patch-the-helper is REJECTED** (too brittle
     to maintain).
  3. **Manual visual** via a **`<pkg>:nodered:dev` script that runs the local `node-red` dep** (no
     docker) so the node/icon/wiring can be seen live. Retire `manual_tests.sh`/docker.
- **CI/CD:** re-enable the wrapper test job (runs `node:test`), build lib dist first (monorepo dep),
  matrix `[22,24]`, bump wrapper to a new **major** (breaking API + CMA output), publish via existing
  OIDC + version gate.

**Investigation findings (evidence, 2026-07-22):**
- **`node:test` is fine as the runner** — it drove `node-red-node-test-helper` to `helper.load`;
  mocha fails identically. The runner was never the problem.
- **BLOCKER: `node-red-node-test-helper@0.3.6` (latest, 2024) is incompatible with `node-red@5.x`.**
  It hard-codes ~8 internal node-red file paths (e.g. `@node-red/registry/lib/util`) that node-red 5
  moved/renamed, AND its relative-path hunting is defeated by pnpm's non-flat `node_modules`. Init
  throws (silently swallowed) → `helper.load` crashes on `undefined`. No fixed helper published. This
  is why all `-nodered` test jobs are disabled. A robust patch = rewrite its resolution to
  package-name `require`s (non-trivial) — hence the "boot node-red programmatically" alternative.
- **TS authoring VALIDATED:** a spike (`parser.ts` with `@types/node-red@1.3.5` +
  `@types/node-red-node-test-helper`, `moduleResolution: bundler`, `strict`, `skipLibCheck:false`)
  compiles **0 errors**, and tsup emits node-red-loadable CJS. cru's earlier TS errors were the
  **deprecated `moduleResolution: node`** (TS6 rejects it), not a real `@types` problem. The two
  `@types/*` devDeps were added to the wrapper (uncommitted) during the spike.

## Phase 3 — norsub-emru: locked design (2026-07-28)

> Converged with cru in discussion; **no code written yet**. norsub is, in cru's words, "essentially
> the nmea-parser + feed `norsub.yml` + the status metadata". Everything in `packages/norsub-emru/src`
> today is legacy (positional constructor, `addProtocols`, `override parseData`, `metadata = {status}`).

**LOCKED — architecture: composition, two layers (cru, Open/Closed).** cru expects a hardware
teammate to need a **binary** norsub protocol "soon" (the device supports Custom binary, Atlas,
Ifremer Victor, Simrad EM 3000, TSS1) and wants the upgrade path open *now* while the monorepo
refactor is fresh in mind. **Only ONE protocol is ever active at a time** (the MRU is configured to
emit one), so this is protocol *selection*, not multiplexing.

```
NorsubParser                            ← device facade; what the package exports
  └ active protocol parser, selected by name:
      'nmea' → NorsubNMEAParser extends NMEAParser   ← norsub.yml + status aggregators
      (future) 'tss1' | 'custom-binary' | … extends BinaryParser
```

- The **protocol layer stays a subclass** on purpose: core's contract says `stampTimestamp` is the
  ONLY place a CMA gains `metadata.timestamp`, and status is field/payload metadata owned by the
  aggregator model. A facade decorating finished `CMA[]` would violate both — so decoration happens
  inside the protocol parser, never in the facade.
- Rationale for paying the facade cost now: a future binary protocol is necessarily its own class
  anyway (core `Parser<B>` is parameterised on ONE buffer type), so the only question is what sits in
  front. Facade now ⇒ adding protocol #2 is an **additive minor**; `extends` now ⇒ it's a **major**
  reshape of the exported class. norsub goes to 3.0.0 in this refactor regardless, so now is free.
- Selection API: `new NorsubParser({ protocol?, memory?, bufferLimit? })` (default `'nmea'`, the only
  value today) + a `protocol` getter/setter. Registry = a factory map `Record<NorsubProtocol, (opts)
  => …>`, so protocol #2 = one entry + one class.

**LOCKED — knowledge load is internal + self-contained (cru).** Same as nmea-parser: the `protocols`
script generates a typed TS object from the YAML; the constructor registers it internally. **NOT** via
the public `addSentences(yaml)` — no runtime YAML parse, no `fs`, browser-safe. Also: run `protocols`
on **test** as well as build, and rename `protocols/norsub.yaml` → `.yml` (nmea's were renamed).

**LOCKED — status metadata placement (cru's 3 rules).** Old top-level `metadata.status` is gone.

| sentence | `payload[last].metadata.status` (rule 1: field self-sufficient) | `metadata.payload.status` (rules 2+3) |
| --- | --- | --- |
| `PNORSUB`, `2`, `6`, `7`, `8` (single `status` uint32) | ✅ | ✅ |
| `PNORSUB7b` (`status_a`+`status_b` uint16) | ❌ neither half decodes alone | ✅ (mandatory) |

Rule 3 is cru's **supply-chain/substitutability rule**, worth documenting in `docs/CMA.md` as a
GENERAL CMA rule: *metadata that describes the whole device rather than one field MAY also be mirrored
at payload level even when a single field produced it, so equivalent sentences from different device
variants expose ONE read path* — swapping a norsub7b for a norsub8 then costs Tracker nothing.

**LOCKED — no sentence timestamp in norsub (datasheet-verified 2026-07-28).** Read
`misc/parsers/norsub/datahseets/NORSUB OEM Series - OEM MRU User Manual 1.2.0.pdf`:
- `T1` = "time for valid measurement (**internal clock**)", explicitly "wraps from (2^32-1) to 0";
  `T2` = "delay from T1 to telegram is sent" ⇒ telegram-sent ≈ `T1 + T2`. A free-running counter, NOT
  a wall clock (the MRU clock can be host/NTP-synced, but T1 is the internal counter and wraps).
  Arithmetic agrees: uint32 ms ≈ 49.7 days max, uint32 µs ≈ 71.6 min — an epoch ms needs 41 bits.
- **No other norsub-family sentence carries any time field** (PRDID, PTVG, PSMCA, PSMCC, HEHDT,
  PHTRO, PHINF). ⇒ norsub emits **`received`/`parsed` only**, inherited from core. Nothing to build.
- Per cru's rule (self-contained ⇒ field level, "maybe does not even require metadata"): T1/T2 get
  **no metadata** — value + `units` from the definition already say everything.

**✅ DATA BUG FIXED (2026-07-28) — wrong `units` in the norsub protocol definitions.** Manual: `T1`/`T2`
are **[ms]** for `PNORSUB` + `PNORSUB2` and **[µs]** for `PNORSUB6`, `PNORSUB7`, `PNORSUB7b`,
`PNORSUB8`. Our data said `ms` for PNORSUB6/7/7b (only PNORSUB8 was right) ⇒ 6 values (`time` +
`delay` × 3 sentences) corrected to `us` in **4 files**: `packages/norsub-emru/protocols/norsub.yaml`
+ its generated `src/norsub.ts`, and the byte-identical copy `packages/nmea-parser/protocols/norsub.yml`
+ its generated `tests/norsub.ts` (nmea-parser keeps a copy of the norsub YAML purely as a test
fixture). Verified: `git diff` contains **only** those 24 lines of data; **nmea-parser 65/65 green**.

**Status decode VALIDATED against the manual (2026-07-28) — no change needed.** All 32 bits in
`src/status.ts` match §"NORSUB Status Bits" exactly, and the manual confirms `STATUS_A` = bytes 1+2
(low half) / `STATUS_B` = bytes 3+4 (high half), which is what `utils.ts getUint32(lsb, msb)` assumes.
That logic survives the refactor as-is.

**🐛 Two more norsub-emru breakages found while fixing the data (both hit cru's "regenerate on
test/build" requirement):**
1. **`js-yaml` is not a dependency of norsub-emru**, but `yaml-to-json.js` imports it ⇒ `pnpm run
   norsub-emru:protocols` dies with `ERR_MODULE_NOT_FOUND` under pnpm's strict layout (it only ever
   worked under npm hoisting). Fix in the refactor: add `js-yaml` as a **devDependency** (build-time
   only, never shipped).
2. **The generator's output doesn't match what norsub imports.** `yaml-to-json.js` emits
   `export const PROTOCOLS = …` (untyped), but the committed `src/norsub.ts` is
   `export const NORSUB_SENTENCES: ProtocolsFileContent = …` — i.e. it was hand-adapted, so the
   `protocols` script has **never** actually regenerated it. Decide in the refactor: import
   `PROTOCOLS` like nmea-parser does (uniform, untyped + runtime `safeParse`), or upgrade the shared
   generator to emit a typed const for both packages (one line, gives compile-time checking).

**✅ DATA QUESTIONS RESOLVED with cru (2026-07-28) — two more fixes applied, one deliberately left:**
- **`PSMCA` field 3 `heading` → `heave` — FIXED** (all 4 files). Manual Table 44 says "heading" but
  with unit **m** / ±10 m, while SMCA's own Data list reads "Roll, pitch / **Heave** / Surge, sway" and
  `PSMCC`'s metre field is `heave`. cru: *"probably a typo when I started doing the yaml long time ago,
  fix it"*. Changes `payload[2].name` in CMA output (fine — norsub goes to 3.0.0).
- **`PTVG` fields `float64` → `string` — FIXED** (all 4 files), with the wire format spelled out in each
  `description`. Manual: `$PTVG,abbbbP,accccR,ddd.dT*hh` — the letter is GLUED to the number (`" 021P"`,
  `"- 036R"`, `"101.8T"`) and pitch/roll are the value **×100** (type INT in the manual), so `float64`
  could only ever produce `value: null`. **TODO in the norsub rewrite (cru's call): a `PTVG:3`
  aggregator putting the decoded degrees in FIELD metadata** — strip the trailing letter, `/100` for
  pitch/roll, sign convention `[-]` bow up / `[space]` bow down. `units` were dropped from the field
  definitions (the raw value is not degrees); the decoded metadata carries the real quantity.
- **`PRDID`: the KB handles the two definitions correctly — CORRECTED 2026-07-28 (cru was right).** An
  earlier note in this doc called them "colliding"; that was wrong. Verified empirically (built dist +
  the real `norsub.yaml` through `addSentences`): both definitions register under id `PRDID` (NORSUB
  PRDID = 2 fields `pitch,roll`; RDI ADCP = 3 fields `pitch,roll,heading`) and the field-count filter
  separates them cleanly — `$PRDID,-000.49,-000.14*57` → `NORSUB PRDID`, 2 fields. **Same id + different
  payload length is exactly what the multi-definition KB is for; no change needed.**
  - **The one genuinely open item is empirical, for cru:** the manual's NORSUB PRDID telegram AND its
    example both carry a **trailing comma** before the checksum (`$PRDID,pitch,roll,*CS`,
    `$PRDID,-000.49,-000.14,*61`). A trailing comma = a third, empty payload slot, so such a sentence
    has 3 fields and legitimately matches the 3-field RDI-ADCP definition (verified: values right,
    `heading: null`, protocol labelled "RDI ADCP"). **Does the device actually emit that trailing
    comma?** If it is a doc artifact, nothing to do. If it is real, NORSUB PRDID would need a 3-field
    definition — and THEN it would truly clash with RDI ADCP, separable only by the checksum's presence
    (NorSub has `*CS`, RDI ADCP has none), which would need an optional discriminator flag in the KB
    schema + a tiebreak in `upgradeKnownSentence` (~20 lines + a minor release). Do not build that
    speculatively.
- **⚠️ Behaviour worth a decision (found 2026-07-28, NOT acted on): a sentence with NO checksum is
  silently discarded.** The manual's RDI ADCP format is `$PRDID,sddd.dd, sddd.dd, sddd.dd<CR><LF>` —
  no `*CS` at all — and `parseData` returns **0 sentences with an empty buffer** (not buffered, not
  emitted with an error). A following valid sentence still parses, so nothing is corrupted. The locked
  rule "bad checksum ⇒ emit WITH a sentence-level error, never drop" does not cover "checksum absent".
  Decide deliberately: is a `$…<CR><LF>` without `*CS` a valid sentence (emit with
  `metadata.checksum: null`) or not NMEA at all (keep dropping — current, and the standing
  recommendation)? Matters only if a device is configured to emit a checksum-less protocol.
- **Do not trust the manual's example checksums** — `$PRDID,-000.49,-000.14,*61` actually computes to
  `6F`, and the PNORSUB2 example reuses PNORSUB's `*62`. Recompute when writing test fixtures.
- ~~Nit: `HEHDT`/`PHTRO` are `float32` while everything else is `float64`~~ — RESOLVED 2026-07-29 (cru):
  a datasheet float with no stated width becomes **`float64`**. Applied to those 3 fields AND swept through
  `nmea.yml` (68 fields), which is why `nmea-parser` goes to 3.2.0.

**✅ PREREQUISITES DONE & PUBLISHED (2026-07-28) — `protocol-core` + `nmea-parser@3.1.0` (live on npm,
PR [#71](https://github.com/core-marine-dev/devices/pull/71), merge `a80c8e4`).** Everything norsub
needs from the base library is implemented, green, packed and released; norsub's own rewrite is next.
1. **`DeviceParser<B>` in `protocol-core`** (`src/types.ts`): the shared API contract (`memory`,
   `bufferLimit`, readonly `buffer`, `addData`, `parseData`); `Parser<B> implements DeviceParser<B>`.
   Needed because `Parser<B>` has protected members ⇒ a *composing* facade is NOT type-assignable to
   `Parser<string>` even with an identical public surface. Test proves an extending parser and a
   composing facade coexist in a `DeviceParser<string>[]` (core 15/15).
2. **`NMEAParser.registerProtocols` `private` → `protected`** — a subclass registers its own bundled,
   generated built-in the way `NMEAParser` registers `PROTOCOLS` (no YAML round-trip, no `fs`).
3. **Aggregator registry is now instance-level** — `metadata.ts` exports `MetadataAggregators` +
   `BUILTIN_METADATA_AGGREGATORS`; `aggregateMetadata(sentence, aggregators?)` and
   `parseSentence(raw, definitions, aggregators?)` take it (defaulted, so existing call sites are
   unchanged); `NMEAParser._aggregators` is a per-instance copy of the built-ins plus a
   `protected registerAggregators(...)` (later registration wins on a duplicate key).
4. **Exports for downstream device parsers:** `BUILTIN_METADATA_AGGREGATORS`, types
   `MetadataAggregator` / `MetadataAggregators`, and re-exported core types `DeviceParser`, `DraftCMA`,
   `Field`, `Metadata`, `Value` (core is private/unpublished, so a consumer can only see what
   nmea-parser re-exports).
5. **`tests/extension.test.ts`** (new, 6 specs) is the executable spec for the seam norsub uses: a
   subclass registering proprietary definitions + a status-style aggregator writing BOTH field and
   payload metadata, the built-in GGA aggregator still intact, and a base parser unaffected by the
   subclass registry. **nmea-parser 71/71** (was 65).
6. **Released as `3.1.0`** (additive ⇒ minor) + README §"Extending: device parsers built on NMEA" and
   §"The shared parser contract". Verified: core lint+tsc+15/15+build; nmea lint+tsc+71/71+build
   ESM+CJS+DTS; `DeviceParser` inlined into the published `.d.ts` with **zero** `protocol-core`
   references; packed manifest = `3.1.0`, `engines.node >=22`, no protocol-core leak;
   `--frozen-lockfile` clean.
7. **The wrapper needs NO change** — it uses `new NMEAParser({memory})` / `addSentences` / `parseData`
   only, and its published `^3.0.2` range already accepts 3.1.0. Verified anyway: wrapper build +
   **19/19** node:test (incl. the real-headless-node-red integration) green against the new lib. Left
   at `2.0.1`, unpublished this round (its workflow is path-filtered and won't even trigger); bumping
   it would publish an identical package.

**NOT bundled into this release (deliberate):** mirroring "regenerate `protocols` on **test**" to
nmea-parser. The generator emits raw `JSON.stringify` output while the committed `src/nmea.ts` is
eslint-formatted, so a `pretest` regeneration would dirty tracked files on every test run unless
`format` runs too. Better solved by upgrading the shared generator to emit lint-clean typed output —
which is a norsub-refactor task anyway (see the generator finding above).

**🐛 CI bug to fix in the same pass:** `.github/workflows/norsub-emru.yml` builds `nmea-parser` first
but **not** `protocol-core`, whose `exports` point only at `dist/` ⇒ `nmea-parser:build` dies in a
fresh checkout (same class of bug fixed in `nmea-parser.yml` on 2026-07-22). Prepend
`protocol-core:build`. Also bump norsub's `engines.node` `">= 18"` → `">=22"`.

**LOCKED — switching protocol discards internal state (cru, 2026-07-28).** Changing `protocol` builds a
fresh protocol parser, so the input buffer AND any parsed-but-not-yet-drained CMAs are dropped: half a
sentence in protocol A can never be completed by protocol B.

**LOCKED — the facade exposes the active protocol parser as `parser` (cru, 2026-07-28).** The
protocol-specific extras (`addSentences`, `getSentence`, `getSentencesByProtocol`,
`getFakeSentenceByID`) are reached through it — `norsub.parser.getFakeSentenceByID('PNORSUB8')` — and are
NOT delegated method-by-method (cru's reasoning: the facade's API would balloon as protocols are added,
and most methods would be meaningless for whichever protocol is active). With one protocol in the union
today, `parser` types concretely as `NorsubNMEAParser`, so no narrowing is needed until protocol #2.

**OPEN (need cru) before coding:** (a) does the facade delegate the NMEA-only extras (`addSentences`,
`getSentence*`, `getFakeSentenceByID`) or expose the active parser via a getter — cru leans getter, so
does this doc, name TBD (`parser`); (b) `DeviceParser` interface in core now or when protocol #2 lands
(recommend now); (c) mirror the `protocols`-runs-on-test change to nmea-parser too?; (d) the four open
data questions above.

## Decisions (locked unless cru says otherwise)

- **CMA format is LOCKED** — [`docs/CMA.md`](CMA.md) §Current draft + §Locked decisions
  (2026-07-09, cru): timestamp = epoch ms only; `protocol` closed with required `version`;
  per-protocol extras go in `metadata` (so tblive's `mode`/`firmware` move there); `Type` uses
  `boolean`. Canonical schema is `packages/core/src/cma.ts`.
- **Terminology: "sentence", not "frame"** — a unit of input data is a *sentence*. Applies to
  all new/refactored code and docs.
- **Field `value` = `string | number | boolean | null`** (2026-07-09): `null` = present-but-empty
  field; **no bigint** — `int64`/`uint64` carried as decimal strings (JSON-safe). No protocol
  currently uses 64-bit ints. Per-`Type` validators + `TYPE_SCHEMAS` lookup live in core.
- **Shared core (Decision A1):** sameness lives in a private, unpublished
  `@coremarine/protocol-core`, bundled into each parser via tsup `noExternal`. Not template-only.
- **Unified API contract:** object-arg constructor `new X({ memory?, bufferLimit? })`,
  `addData(input): void` + `parseData(input?): CMA[]`; input is `string | Uint8Array`. Protocol
  parsers extend `StringParser` or `BinaryParser` and implement only `extractSentences`.
- **Cross-runtime target** (node/deno/bun/web): the one blocker in NMEA is `node:fs`
  (`readProtocolsYAMLFile`, isolate as a node-only path) — `node:crypto` there is already Web
  Crypto (`getRandomValues`), just drop the import. Buffer→Uint8Array work is in the two binary
  parsers (Septentrio/SBG), done last.
- **Docs live in `docs/`, one small doc per concern; `AGENTS.md` stays ≤80 lines** (index only).
- **`misc/` is gitignored** — raw sensor captures and dev helpers are never committed.
- **pnpm migration is done** — no more npm in the repo (except Node-RED Dockerfiles, deferred).
- **ESLint sonar thresholds: strict from day one** (Option A: max-lines-per-function 50,
  cyclomatic-complexity 10, cognitive-complexity 15; tests exempt from max-lines).
- **Valibot pinned to 1.4.2** (exact) in all peerDependencies — no `>=1.0.0` ranges.
- **Metadata has 3 levels (LOCKED 2026-07-10, all DONE for nmea-parser):** sentence (`cma.metadata`:
  `checksum` always, `talker` optional), field (`cma.payload[i].metadata`: 1-field decode), payload
  (`cma.metadata.payload`, flat: aggregated from ≥2 fields). Field/payload metadata is **known-only**
  and **dev-authored**: aggregators registered by **`id + payload length`** (NOT field names — those
  are unofficial), reading fields **by index**. Free-form `Record<string,unknown>`; core CMA schema
  unchanged. Contract = `MetadataAggregator` in `nmea-parser/src/metadata.ts` (see [`docs/NMEA.md`](NMEA.md)).
- **Timestamp metadata (LOCKED 2026-07-13, DONE core + nmea-parser):** every CMA carries
  `cma.metadata.timestamp = { received, parsed, sentence? }` (epoch ms). `received` = `addData` call
  time; `parsed` = decode time (`=== cma.timestamp`); `sentence` = optional, the sentence's own time
  (protocol-supplied). **`addData` parses immediately** (Option B) so received/parsed are ~equal — a
  gap is a built-in lag metric. **CMA is the single source of truth: `metadata` and its `timestamp`
  are REQUIRED, never optional-because-of-internal-logic.** Core owns received/parsed (stamped in
  `addData`, the only place a CMA gets its timestamp); protocols supply `sentence` via the
  `sentenceTimestamp` hook. `extractSentences` returns `DraftCMA` (= CMA minus metadata timestamp) so
  no placeholder is needed. Sentence metadata schema is a **loose** object (typed timestamp +
  free-form extras); field metadata (`payload[i].metadata`) stays free-form `Record`. See
  [`docs/CMA.md`](CMA.md) §Timestamp metadata.
- **Result pattern (LOCKED 2026-07-10, DONE for core + nmea-parser):** parsers **never throw**;
  `Result<T,E> = { success:true, value:T } | { success:false, error:E }` lives in
  `@coremarine/protocol-core` (ported from Tracker `src/core/tracker/src/types.ts`). Every function
  that threw pre-refactor returns a `Result` after; `try/catch` nested only where strictly necessary,
  never propagated. Parse hot-path already never throws (null value / `errors[]`) — stays as-is.
  Each newly-refactored parser adopts the same pattern.
- **CI/CD (LOCKED 2026-07-13, DONE all packages):** publish via **npm OIDC Trusted Publishing** (no
  `NPM_TOKEN`; `permissions: { id-token: write, contents: read }`; provenance automatic). Publish
  job **version-gates** with `npm view <name>@<version>` — only publishes when that exact version is
  NOT on npm, so `dev`→`main` merges no-op unchanged packages. Actions pinned to majors
  `checkout@v7` / `setup-node@v6` / `pnpm/action-setup@v6`; node matrix = the **two latest LTS**
  lines (today `[22.x, 24.x]`; bump to `24+26` after 2026-10-28 when 26 goes LTS). Each lib's `build`
  regenerates its `protocols/*.yml` first, so workflows stay uniform. `protocol-core.yml` is
  test-only (private). Node-RED workflows are modernized but keep their **test jobs disabled** until
  each wrapper is refactored. Bundled private deps (`@coremarine/protocol-core`) go in
  **devDependencies** (not runtime deps), need tsup `dts.resolve` to inline their TYPES, and are
  stripped from the published manifest by `.pnpmfile.mjs` `beforePacking`.
- **Toolchain versions (updated 2026-07-22):** node CI = two latest LTS `[22.x, 24.x]`; pnpm
  `11.15.1` (was `11.12.0` — that release is broken/deprecated upstream; **avoid 11.12.0 & 11.13.0**);
  **TypeScript held at `6.0.3`** (TS7 native rewrite needs 7.1's stable programmatic API before
  typescript-eslint/tsup work — revisit ~Oct 2026); **js-yaml held at 4.x** (workspace security
  override `js-yaml: '>=4.1.1'` pins it; going to 5 would drag mocha/node-red transitive js-yaml).

## NMEA refactor — locked design & plan (IN PROGRESS, started 2026-07-09)

> **State (2026-07-10): slice A–F + STEP 1 (3-level metadata) + STEP 2 (Result pattern) DONE &
> green** (lint + tsc + 62/62 tests + build). nmea-parser is now the complete reference
> implementation. See the Done entries above for what shipped and the one flagged talker/id
> decision. The A–F design below is historical (finished). **The live to-do is the Resume prompt at
> the end of this section: clone the reference to the other four parsers, norsub-emru first.**

First parser onto `@coremarine/protocol-core`. It becomes the reference model for the other
four. **Every decision below is locked with cru.** Output shape changes `NMEASentence` → `CMA`
(breaking for Tracker — deliberate; no PR to `main` until at least NMEA is done).

**Terminology:** "sentence", never "frame". Rename symbols (`getUnparsedNMEAFrames` →
`getUnparsedNMEASentences`, `lastUncompletedFrame` → `lastUncompletedSentence`, etc.). Grep to
confirm zero "frame" remains in `src/`.

**API / contract:**
- `class NMEAParser extends StringParser` (from core). Constructor `({ memory?, bufferLimit? })`.
  Core supplies `addData(string)` / `parseData(string?): CMA[]`. NMEA implements only
  `protected extractSentences(buffer: string): { sentences: CMA[], remainder: string }`.
- **Single knowledge-feed input:** `addSentences(yaml: string): void` — a YAML **string** (works
  on web: `await file.text()`; on node: read the file yourself). Parsed with `js-yaml`
  (isomorphic). DROP the old file-path and pre-parsed-object modes.
- Keep useful NMEA-only extras (`getSentence`, etc.), renamed to sentence terminology.

**Knowledge model:**
- Author in YAML: `protocols/nmea.yaml` = single source of truth. A build step generates
  `src/nmea.ts` (`export const NMEA_PROTOCOLS = {...} as const`) — bundled, web-safe (no runtime
  fs). **Delete the hand-written `src/nmea-sentences.ts`** (it's a stale duplicate; the generated
  `src/nmea.ts`/`PROTOCOLS` is currently dead code — collapse to one source). Update
  `yaml-to-json.js` to emit the typed `.ts`.
- Storage: `Map<id, KnownSentence[]>` — **multiple definitions per id** (same id, different field
  counts across NMEA versions). In YAML, author variants under separate protocol-version blocks
  (same `protocol: NMEA`, different `version`).

**Pipeline (`extractSentences`, per candidate — decision 4a: upgrade inline, one pass):**
1. Split buffer → candidate sentence strings + `remainder` (`lastUncompletedSentence` keeps the
   incomplete tail when `memory` on).
2. `parseGenericSentence(raw)`: verify NMEA format + checksum; split talker off the id → a
   generic CMA sentence:
   - root `raw` = whole sentence; `timestamp` = `Date.now()`; `id` = base id (talker removed);
     `protocol = { name:'NMEA', version:'unknown' }`;
   - `payload` fields = `{ raw: <field slice>, name:'unknown', type:'string', value: <field slice> }`
     (unknown field: `raw === value`; empty field `value: null`);
   - `metadata = { checksum, standard:false, talker? }` (talker key only if present);
   - `errors: [...]` if format/checksum invalid (4b: **emit-with-errors, never drop**).
   - Default unknown strings = `'unknown'`.
3. `upgradeKnownSentence(generic)`: look up id → definitions; keep those whose
   `payload.length === generic field count`; if ≥1 → pick **newest** (compare protocol version,
   semver-tolerant, highest wins; if not comparable, first); apply field name/type/units/
   description; parse each value via core `TYPE_SCHEMAS[type]`; set `protocol = matched {name,
   version}`, `metadata.standard` from the def. **No length match (incl. id known but wrong
   length) → stays generic, no error.**

**CMA mapping specifics:** protocol closed to `{name, version}`; ALL extras → root `metadata`
(same for every parser); legacy field `sample` → `raw`.

**Cross-runtime:** remove `import fs from 'node:fs'` (drop `protocols.ts` file mode) and
`import crypto from 'node:crypto'` in `sentences.ts` (use global `crypto.getRandomValues`).
`yaml-to-json.js` keeps `node:fs` — build-only script, never bundled. Goal: **zero `node:`
imports in `src/`**.

**Build/pkg:** `tsup.config.ts` add `noExternal: [/@coremarine\/protocol-core/]` + `platform:
'neutral'`; add dep `@coremarine/protocol-core: workspace:*`; keep js-yaml/valibot/@schemasjs;
update the `protocols` npm script. Add root proxy scripts if needed.

**Tests:** the existing ~60 specs assert the legacy `NMEASentence` shape — rewrite them to assert
`CMA`. Run order: lint → tsc → test.

### Resume prompt (if this session is interrupted)

> **nmea-parser is DONE — the complete reference implementation** (slice A–F CMA rewrite + STEP 1
> 3-level metadata + STEP 2 Result pattern), committed & green (lint + tsc + 62/62 + build). Do NOT
> redo it. Read [`docs/NMEA.md`](NMEA.md) (the journey/code-map) — it is the spec for the rest.
> **The task now is to clone the reference to the other four parsers**, in cru's order, starting with
> **norsub-emru**. Run `git log --oneline -8` first. cru works one step at a time and wants decisions
> converged before coding — discuss, then implement. Update this doc same-turn.
>
> **norsub-emru (next).** It no longer builds. Today (`packages/norsub-emru/src/parser.ts`) it
> `extends NMEAParser` with the OLD API: positional `super(memory, limit)`, `ProtocolsInputSchema.parse`,
> `this.addProtocols(NORSUB_SENTENCES)`, and an `override parseData` that post-processes every
> `PNORSUB*` sentence through `addStatus` — decoding a status bitfield (`status_a`/`status_b` for
> `…b` variants via the last two fields, else a single `status` from the last field; see
> `src/status.ts` `getStatus`) and attaching it to `sentence.metadata.status` + the last field's
> `metadata`. norsub is otherwise a thin NMEA extension (its own generated `src/norsub.ts` knowledge).
>
> Target shape: `class NorsubParser extends NMEAParser` still works (NMEAParser now extends
> `StringParser`), object-arg constructor `{ memory?, bufferLimit? }`, emit `CMA[]`, adopt `Result`.
> **Converge these design questions with cru BEFORE coding — they aren't settled by the NMEA
> reference:**
> 1. **How a subclass loads its own built-in.** NMEAParser loads `PROTOCOLS` via the **private**
>    `registerProtocols` + `safeParse`. norsub's `NORSUB_SENTENCES` is a generated JS object, not YAML,
>    so `addSentences(yaml)` doesn't fit. Cleanest: make `registerProtocols` **`protected`** so
>    `NorsubParser`'s constructor can register `ProtocolsFileContentSchema.safeParse(NORSUB_SENTENCES)`.
> 2. **How norsub injects its status metadata.** The NMEA `METADATA_AGGREGATORS` registry is a
>    module-level const in `nmea-parser/src/metadata.ts` — not extensible by a subclass, and keyed by
>    exact `${id}:${payloadLength}` (norsub status spans many `PNORSUB*` ids/lengths). Options to
>    discuss: (a) make the registry instance-level / mergeable so a subclass adds aggregators;
>    (b) generalise the key to allow a predicate/prefix (`PNORSUB*`); (c) keep norsub's own light
>    post-process. Prefer folding it into the aggregator model (no `override parseData`) if clean.
>
> Then tblive, then the two binary parsers (septentrio-sbf, sbg-ecom — `BinaryParser`,
> `Buffer`→`Uint8Array`/`DataView`). Each parser's Node-RED wrapper also uses the removed old API
> (`addProtocols`) and is updated alongside its lib (cru: wrappers come after each lib is finished).

## Next steps (in order)

1. **Ship the release in PHASES (locked 2026-07-22 — see "Where we are now" for full detail).**
   **Phase 1 (current):** cru opens PR `dev` → `main` and merges → publishes **nmea-parser 3.0.0**
   (OIDC + provenance), clears the dependabot alerts on `main`; the version gate no-ops every other
   package; then smoke-test `npm i @coremarine/nmea-parser@3.0.0` in a clean dir (ESM+CJS import,
   types resolve, no protocol-core runtime dep). **Phase 2 (on cru's signal):** nmea-parser-nodered
   wrapper (dep → `^3.0.0`, `addProtocols`→`addSentences`, re-enable test, verify CI/CD, publish).
   **Phase 3 (only once nmea-parser + its wrapper are fully in production):** norsub-emru + its wrapper.
2. **CMA rollout** — format is locked; `@coremarine/protocol-core` is scaffolded. Refactor the
   parsers onto it in **cru's order** (easiest-first, NMEA becomes the model):
   1. ~~**nmea-parser**~~ — ✅ DONE (2026-07-10): the reference implementation (CMA rewrite +
      3-level metadata + Result pattern). ⚠️ output-shape change (`NMEASentence` → `CMA`) is
      breaking for Tracker — deliberate.
   2. **norsub-emru** (NEXT) — thin extension of NMEA (adds status metadata); nearly free now NMEA lands.
   3. **thelmabiotel-tblive** — already CMA-ish; move `mode`/`firmware` into `metadata`,
      adopt the base class. Protocol-version matching is the hard part (least-clean protocol).
   4. **septentrio-sbf** — binary; extend `BinaryParser`, migrate `Buffer`→`Uint8Array`/`DataView`,
      verify/replace the `crc` dep. Mature, well-tested (54/54).
   5. **sbg-ecom** — binary; same Buffer migration; SBG→CMA design exists in `misc/tests/sbg/`.
3. ~~**Result pattern**~~ — ✅ DONE (2026-07-10): `Result<T,E>` in `@coremarine/protocol-core`;
   nmea-parser's throwing paths converted. Each newly-refactored parser adopts it.
4. **Strictness pass** (deferred) — add `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `verbatimModuleSyntax` to root tsconfig (the Tracker repo
   has them; needs ~218 code fixes in the parsers — mostly array access returning `T |
   undefined`).

## Open threads / known bugs (report before fixing)

- ~~**`norsub-emru` no longer builds**~~ — RESOLVED 2026-07-29 by the Phase 3 / Task 3a rewrite
  (CMA output, `DeviceParser<string>` facade, 45/45). Uncommitted pending cru's review.
- **`nmea-parser-nodered` wrapper uses the removed old API** — `src/parser.js` calls
  `parser.addProtocols({ file, ... })`, which no longer exists (replaced by `addSentences(yaml)` in
  slice A–F). Broken at runtime like norsub-emru; update each wrapper alongside its refactored lib.
- ~~**DEFERRED: GGA metadata enrichment**~~ — RESOLVED 2026-07-10 (STEP 1): reimplemented in
  `nmea-parser/src/metadata.ts` as the seeded `GGA:14` aggregator (lat/long decimal degrees →
  payload metadata; UTC timestamp + quality label → field metadata).
- ~~`nmea-parser/src/types.ts`: `Float32`/`Float64` types are swapped~~ — RESOLVED by the NMEA
  refactor (values now validate via core `TYPE_SCHEMAS`; the swapped local aliases are gone).
- `sbg-ecom` has **zero test specs** (only fixtures) and its CI test step is commented out.
- `thelmabiotel-tblive-nodered` has a `test` script but **no mocha specs** (`No test files found`).
- 4 of 5 nodered CI workflows still have their test jobs commented out — they publish untested.
  (`nmea-parser-nodered` is DONE: test job enabled + `node:test`, published 2.0.1. The other four —
  norsub, tblive, sbg-ecom, septentrio — get theirs enabled as each wrapper is refactored in turn.)
- nmea-parser ships a committed `legacy/` folder + stray root files (`morenmea.tss`).
- Node-RED docker `Dockerfile`s still use `npm i` inside the container (install the published
  package from the npm registry, not the workspace — unaffected by the pnpm migration, but
  inconsistent).
- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- P08-Trident harness (`misc/tests/p08trident/`) status unknown — ask cru if still live.

## Phase 3 coding prompt (paste-ready — START HERE: TASK 3b, the norsub-emru NODE-RED WRAPPER)

> **TASK 3a — the `norsub-emru` LIBRARY — is DONE (2026-07-29): code-complete, green, uncommitted.**
> Do NOT redo it. Read the **two 2026-07-29 entries at the top of §Done** for exactly what was built.
> Both data questions are now decided and applied (`version: '1.2.0'` on all norsub protocols; `float64`
> swept everywhere), which bumped **`nmea-parser` to 3.2.0** — so this release publishes BOTH
> `nmea-parser@3.2.0` and `norsub-emru@3.0.0`. The only thing still open there is whether 3.2.0 should
> instead be 4.0.0 (see the semver note in that entry). Neither blocks the wrapper.
>
> **This is a CODING session.** Every design decision was converged with cru and is LOCKED — do not
> re-open it, do not re-litigate composition vs inheritance, do not redo any nmea work.
>
> **Repo working method:** For ANY npm / pnpm / node-red / TypeScript / GitHub-Actions / library
> specifics, fetch current docs with the **`ctx7` CLI** — never rely on memory. Update
> **`docs/STATUS.md` in the same turn** as any meaningful change. Verify per package from its dir:
> **lint → tsc → test → build**. Commit only when cru asks; no AI co-author trailer (disabled globally).
> Code style: no semicolons, single quotes, 2-space, arrow functions, import groups
> (`// built-in` → `// installed` → `// coded`), functions ≤50 lines / cyclomatic ≤10 / cognitive ≤15
> (see `docs/CodeStyle.md`).
>
> **STATE.** Branch `dev`, HEAD `738a0cc` + the **uncommitted** Task 3a work. Live on npm:
> `@coremarine/nmea-parser@3.1.0`, `@coremarine/nmea-parser-nodered@2.0.1` (the wrapper template).
> `@coremarine/norsub-emru` is at **3.0.0 in-tree, unreleased**, emitting CMA through
> `NorsubParser implements DeviceParser<string>` (a facade composing `NorsubNMEAParser extends NMEAParser`),
> with the `parser` getter for protocol-specific extras. `@coremarine/protocol-core` is the private shared
> base. **The library API the wrapper must target:** `new NorsubParser({ protocol?, memory?, bufferLimit? })`,
> `addData(string)`, `parseData(string?) => CMA[]`, `protocol` get/set, `protocols`, `parser`.
>
> **First: does cru want norsub-emru 3.0.0 published BEFORE the wrapper?** Phases 1/2 established the
> ordering rule "the library must be live on npm before its wrapper publishes" (the wrapper's dep range has
> to resolve). Confirm the sequence with cru before starting.
>
> ### TASK 3b — the `norsub-emru-nodered` wrapper (THIS session)
>
> Clone `packages/nmea-parser-nodered` — it IS the template. Apply the wrapper decisions locked
> 2026-07-24 (see the top banner + the Done entry): TypeScript → tsup → CJS (`export = init`,
> `"module": "preserve"`); pure-logic `src/lib.ts` + thin adapter `src/parser.ts`; `node:test` (unit +
> real-headless-node-red integration via `RED.init` + the flowFile pattern, NO
> `node-red-node-test-helper`); `dev-server.mjs` with `editorTheme.palette.categories` (CoreMarine
> first) and no sibling-hiding hack; **`engines.node: ">=22"`** + **`node-red.version: ">=4.0.0"`**;
> **`"!**/*.backup"` in `files`**; node-red stays a ROOT devDep; examples shipped in `examples/` via
> `files`; re-enable the wrapper's CI test job (build the dep chain `protocol-core` → `nmea-parser` →
> `norsub-emru` first); OIDC + version-gated publish; README written to the CURRENT API from the start.
> Node type name `cma-norsub-parser`. Bump to a new **major**. Expose the facade's `protocol` selection
> in the node's config UI.
>
> ### THEN — the rest of the CMA rollout
>
> thelmabiotel-tblive (+ wrapper; move `mode`/`firmware` into `metadata`), then the binary parsers
> septentrio-sbf & sbg-ecom (+ wrappers; `BinaryParser`, `Buffer`→`Uint8Array`/`DataView`; septentrio
> wants a `sentenceTimestamp` override for TOW+WNc). Tighten each lib's `engines.node` to `">=22"` as it
> is refactored.
