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
> **Last updated:** 2026-07-10 · **Branch:** `dev` (pushed). **NMEA CMA refactor (slice A–F) +
> STEP 1 (3-level metadata) + STEP 2 (Result pattern) are done & green.** Repo was idle
> 2025-12-15 → 2026-07-08.
>
> **Steps 1-6 complete: pnpm, ESLint, docs, dep refresh, security audit, tsconfig fixes.**
> **CMA rollout IN PROGRESS:** `@coremarine/protocol-core` scaffolded (`174e4cc`); **nmea-parser
> refactored onto it (2026-07-10, slice A–F) — the reference implementation, committed & green**
> (lint + tsc + 56/56 tests + build ESM+CJS+DTS). Journey doc: [`docs/NMEA.md`](NMEA.md).
> **STEP 1 DONE: 3-level metadata via dev-authored aggregators** (`src/metadata.ts`, seeded GGA).
> **STEP 2 DONE: no-throw Result pattern** (`Result<T,E>` in core; `parseProtocols`/`addSentences`
> return `Result`; 62/62 tests). **NEXT: clone the reference implementation to the other four
> parsers — norsub-emru first (it no longer builds; see Open threads).**

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
  nmea-parser lint+tsc+62/62+build ESM+CJS+DTS. **Remaining throw in core:** the `set memory` /
  `set bufferLimit` setters still `.parse()` (throw on bad assignment) — out of STEP 2's NMEA scope;
  a setter can't return a Result. Flagged for cru (see Open threads).
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

Steps 1-6 are complete and pushed to `dev` (HEAD `4c14b41`). Modern stack: pnpm 11,
TypeScript 6.0.3, ESLint 10 + sonar + perfectionist, Vitest 4, Valibot 1.4.2, zero known vulns.

**CMA rollout in progress.** `packages/core/` (the shared contract) is committed & pushed
(`174e4cc`). **NMEA refactor is now underway** — the full locked design is in the section below
(§"NMEA refactor — locked design & plan"). If interrupted mid-code, follow the Resume prompt
there.

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
- **Result pattern (LOCKED 2026-07-10, DONE for core + nmea-parser):** parsers **never throw**;
  `Result<T,E> = { success:true, value:T } | { success:false, error:E }` lives in
  `@coremarine/protocol-core` (ported from Tracker `src/core/tracker/src/types.ts`). Every function
  that threw pre-refactor returns a `Result` after; `try/catch` nested only where strictly necessary,
  never propagated. Parse hot-path already never throws (null value / `errors[]`) — stays as-is.
  Each newly-refactored parser adopts the same pattern.

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
> **norsub-emru (next).** It no longer builds: it imports the removed old NMEA API (`NMEASentence`,
> `Uint16`/`Uint32`, `Field`, `ProtocolsInputSchema`), calls `addProtocols`, and overrides the old
> `parseData`. norsub is a thin extension of NMEA (adds status metadata). Refactor it onto core the
> same way nmea-parser is built: `class NorsubParser extends StringParser`, implement
> `extractSentences`, emit `CMA[]`, feed knowledge via `addSentences(yaml)`, adopt `Result` for the
> throwing paths, and port any norsub-specific derivations as metadata aggregators
> (`src/metadata.ts`, keyed by `${id}:${payloadLength}`). Reuse core exports:
> `Parser`/`StringParser`/`BinaryParser`, `CMA`/`CMASchema`, `TYPE_SCHEMAS`, `Input`, `Result`.
> Then tblive, then the two binary parsers (septentrio-sbf, sbg-ecom — `BinaryParser`,
> `Buffer`→`Uint8Array`/`DataView`). Each parser's Node-RED wrapper also uses the removed old API
> (`addProtocols`) and must be updated alongside its lib.

## Next steps (in order)

1. **Merge `dev` → `main`** when cru is ready — this publishes to npm via GitHub Actions and
   clears the 75 dependabot vulnerabilities on the default branch.
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

- **`norsub-emru` no longer builds** (expected — it's next in the rollout). It imports the removed
  NMEA API (`NMEASentence`, `Uint16`/`Uint32`, `Field`, `ProtocolsInputSchema`) and calls
  `addProtocols`/overrides the old `parseData`. Refactor it onto CMA + `addSentences` next.
- **`nmea-parser-nodered` wrapper uses the removed old API** — `src/parser.js` calls
  `parser.addProtocols({ file, ... })`, which no longer exists (replaced by `addSentences(yaml)` in
  slice A–F). Broken at runtime like norsub-emru; update each wrapper alongside its refactored lib.
- **Core `set memory` / `set bufferLimit` still throw** — they validate assignment with `.parse()`
  (`packages/core/src/parser.ts`), so `parser.memory = <bad>` throws. Out of STEP 2's NMEA scope and
  a setter can't return a `Result`; decide with cru whether to keep the throw (programmer-error
  guard) or switch to `safeParse` + silently ignore invalid assignments.
- ~~**DEFERRED: GGA metadata enrichment**~~ — RESOLVED 2026-07-10 (STEP 1): reimplemented in
  `nmea-parser/src/metadata.ts` as the seeded `GGA:14` aggregator (lat/long decimal degrees →
  payload metadata; UTC timestamp + quality label → field metadata).
- ~~`nmea-parser/src/types.ts`: `Float32`/`Float64` types are swapped~~ — RESOLVED by the NMEA
  refactor (values now validate via core `TYPE_SCHEMAS`; the swapped local aliases are gone).
- `sbg-ecom` has **zero test specs** (only fixtures) and its CI test step is commented out.
- `thelmabiotel-tblive-nodered` has a `test` script but **no mocha specs** (`No test files found`).
- All 5 nodered CI workflows have their test jobs commented out — they publish untested.
- nmea-parser ships a committed `legacy/` folder + stray root files (`morenmea.tss`).
- Node-RED docker `Dockerfile`s still use `npm i` inside the container (install the published
  package from the npm registry, not the workspace — unaffected by the pnpm migration, but
  inconsistent).
- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- P08-Trident harness (`misc/tests/p08trident/`) status unknown — ask cru if still live.
