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
> **Last updated:** 2026-07-22 · **Branch:** `dev`. **NMEA CMA refactor (slice A–F) +
> STEP 1 (3-level metadata) + STEP 2 (Result pattern) + STEP 3 (timestamp metadata, core-wide) are
> done & green.** Repo was idle 2025-12-15 → 2026-07-08.
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
  - **⚠️ TWO OPEN wrapper items (cru, 2026-07-22) — see the paste-ready prompt below:**
    1. **Isolated dev/examples node-red instance — NOT solved.** `dev-server.mjs` disables sibling
       `@coremarine/*-nodered` via `setModuleState` before `server.listen()`, BUT cru confirms (screenshot)
       the siblings STILL appear in the palette + Manage-Palette. Root cause: node-red (shared monorepo
       devDep) auto-discovers siblings by walking UP its install's parent `node_modules`
       (`@node-red/registry/lib/localfilesystem.js` scanTreeForNodesModules) → reaches the workspace root
       node_modules. `setModuleState`/`nodesExcludes`/`removeModule` do NOT reliably prevent this.
       **cru wants a genuinely FRESH node-red instance with ONLY this wrapper + built-in nodes installed
       each run — and says keep it SIMPLE, not overengineered.** cru's hint: node-red has an
       autoinstall-missing-modules setting (`externalModules.autoInstall`); and a fresh isolated dir where
       only the wrapper is installed would avoid the walk-up. Likely path: run node-red from an isolated
       dir OUTSIDE the workspace whose `node_modules` has only node-red + this wrapper (+ its dep) — e.g.
       `pnpm --filter <pkg> deploy <tmp> --prod` then add node-red, or a userDir package.json + autoInstall.
       Investigate the cleanest minimal option (fetch node-red docs via ctx7).
    2. **CoreMarine palette category first.** Put the "CoreMarine" category at the TOP of the palette via
       `editorTheme.palette.categories` in the dev-server RED.init settings (confirm exact key via ctx7).
  - **Next after those: publish wrapper 2.0.0** (dev→main; workspace:^ → ^3.0.0), then **Phase 3 =
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

- **Phase 1 (current) — publish nmea-parser 3.0.0 + verify a fresh install.** ⚠️ **First merge
  attempt (2026-07-22) failed** — every library workflow died at `Setup pnpm` because pnpm `11.12.0`
  is a broken/deprecated release (see top Done entry); **fixed on `dev` by bumping `packageManager`
  → `pnpm@11.15.1`.** The `3.0.0` publish did NOT happen (test failed → publish skipped), so re-merge
  is safe. **Next: land the fix on `dev`, confirm the `nmea-parser` workflow is GREEN on `dev`, then
  cru re-opens/re-merges PR `dev` → `main`** (PR message drafted 2026-07-22). Because of the
  **version gate** this is safe/quiet: **only nmea-parser 3.0.0 publishes** (OIDC + provenance); every other package's publish
  job runs the ~2s `npm view` check and **no-ops**; norsub-emru + sbg-ecom test-red is expected and
  blocks nothing (`needs: test`). The merge also clears the 74 dependabot alerts on `main`. Then
  **smoke-test a fresh install**: in a clean dir `npm i @coremarine/nmea-parser@3.0.0`, import both
  ESM + CJS, confirm types resolve and there is **no** `@coremarine/protocol-core` runtime dep.
- **Phase 2 (only when cru says go, after 3.0.0 is live) — nmea-parser-nodered wrapper.** Dep
  `@coremarine/nmea-parser` → `^3.0.0`; rewrite `src/parser.js` off the removed `addProtocols(...)`
  onto `addSentences(yaml)` + CMA output; re-enable its commented-out test job (build the lib dist
  first); bump version; verify CI/CD green; publish; smoke-test a fresh install.
- **Phase 3 (only once nmea-parser AND its wrapper are fully in production) — norsub-emru, then its
  wrapper.** Then thelmabiotel-tblive (+ wrapper), then the binary parsers septentrio-sbf & sbg-ecom
  (+ wrappers).

### Prompt for the next agent (paste-ready)

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

- **`norsub-emru` no longer builds** (expected — it's next in the rollout). It imports the removed
  NMEA API (`NMEASentence`, `Uint16`/`Uint32`, `Field`, `ProtocolsInputSchema`) and calls
  `addProtocols`/overrides the old `parseData`. Refactor it onto CMA + `addSentences` next.
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
- All 5 nodered CI workflows have their test jobs commented out — they publish untested.
- nmea-parser ships a committed `legacy/` folder + stray root files (`morenmea.tss`).
- Node-RED docker `Dockerfile`s still use `npm i` inside the container (install the published
  package from the npm registry, not the workspace — unaffected by the pnpm migration, but
  inconsistent).
- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- P08-Trident harness (`misc/tests/p08trident/`) status unknown — ask cru if still live.
