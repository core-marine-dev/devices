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
> **Last updated:** 2026-07-08 · **Branch:** `dev` (HEAD not pushed) · Repo was idle
> 2025-12-15 → 2026-07-08.

## How to use this doc

1. Read this top-to-bottom, then the linked docs. Newer docs win over older ones.
2. Authoritative context (all in-repo, provider-agnostic):
   - Repo rules for agents: [`AGENTS.md`](../AGENTS.md) (≤80 lines, points here)
   - What the repo is / layout / `misc/` convention: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
   - Per-package state + known issues: [`docs/PACKAGES.md`](PACKAGES.md)
   - The target output format: [`docs/CMA.md`](CMA.md)
   - Commands: [`docs/COMMANDS.md`](COMMANDS.md) · Stack/CI: [`docs/TOOLING.md`](TOOLING.md)
   - pnpm migration (done): [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md)
3. Working method the user (cru) expects: **discuss decisions before coding, one step at a
   time; this repo feeds the Tracker product, so output-format changes are breaking changes.**

## Mission

Refresh the whole monorepo in strokes:

1. **CMA format rollout** — every parser emits the same output shape ([`docs/CMA.md`](CMA.md)).
   Today only `thelmabiotel-tblive` conforms.
2. ~~**pnpm migration**~~ — ✅ DONE (2026-07-08). See [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md).
3. ~~**Linter + formatter migration**~~ — ✅ DONE (2026-07-08). ESLint flat config with
   @stylistic + sonarjs + perfectionist plugins (mirrors Tracker repo).
4. **Documentation** — `docs/CodeStyle.md` (rationale + examples), AGENTS.md code-style
   section, codify lint→tsc→test run order.
5. **Dependency refresh** — deps are from ~2025; audit + bump per package.
6. **Result pattern** — adopt `Result<T,E>` no-exceptions-as-control-flow (from Tracker repo).
   Later track, after linter + CMA.

## Done

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
- **2026-07-08 — pnpm migration (step 1 of refactor):**
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
- **2026-07-08 — ESLint flat config migration (step 2 of refactor):**
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

## Where we are now

Working tree has uncommitted ESLint migration changes on `dev`. Steps 1 (pnpm) and 2 (ESLint)
are complete and verified. Next up: **step 3 — documentation (CodeStyle.md + AGENTS code-style
section + lint→tsc→test run order)**.

No parser code has been refactored yet — CMA rollout, Result pattern, and dep refresh are all
still pending, in that discussion order.

## Decisions (locked unless cru says otherwise)

- **CMA draft of record is [`docs/CMA.md`](CMA.md) §Current draft** (timestamp = epoch ms,
  `protocol.version` required) — open questions listed there must be settled before rollout.
- **Docs live in `docs/`, one small doc per concern; `AGENTS.md` stays ≤80 lines** (index only).
- **`misc/` is gitignored** — raw sensor captures and dev helpers are never committed.
- **pnpm migration is done** — no more npm in the repo (except Node-RED Dockerfiles, deferred).
- **ESLint sonar thresholds: strict from day one** (Option A: max-lines-per-function 50,
  cyclomatic-complexity 10, cognitive-complexity 15; tests exempt from max-lines).
- **Result pattern will be adopted** as a later track, after linter + CMA.

## Next steps (in order)

1. **Commit the ESLint migration** (all changes on `dev`).
2. **Documentation** — `docs/CodeStyle.md` (rationale + examples), AGENTS.md code-style
   section, codify lint→tsc→test run order.
3. **Dependency refresh** package by package.
4. **CMA rollout** — lock the [`docs/CMA.md`](CMA.md) open questions with cru first, then
   start with **sbg-ecom** (pre-release 0.0.1, no tests to break, SBG→CMA design work
   already exists in `misc/tests/sbg/`); then septentrio-sbf, nmea-parser (+norsub-emru),
   and align thelmabiotel-tblive's extra top-level keys.
5. **Result pattern** — port from Tracker repo (no-exceptions-as-control-flow).

## Open threads / known bugs (report before fixing)

- **Dep rot:** resolved for valibot (1.4.2 now installs); other deps still from ~2025 —
  audit during dep refresh.
- `nmea-parser/src/types.ts`: `Float32`/`Float64` types are swapped (each aliases the other's schema).
- `sbg-ecom` has **zero test specs** (only fixtures) and its CI test step is commented out.
- `thelmabiotel-tblive-nodered` has a `test` script but **no mocha specs** (`No test files found`).
- All 5 nodered CI workflows have their test jobs commented out — they publish untested.
- nmea-parser ships a committed `legacy/` folder + stray root files (`morenmea.tss`).
- Nodered sibling dep ranges now use `workspace:^` (was inconsistent `^exact` vs `>=`).
- `main: index.js` removed from root `package.json` (was pointing to a non-existent file).
- P08-Trident harness (`misc/tests/p08trident/`) status unknown — ask cru if still live.
