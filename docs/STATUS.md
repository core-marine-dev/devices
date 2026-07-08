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
> **Last updated:** 2026-07-08 · **Branch:** `dev` (not pushed) · Repo was idle 2025-12-15 →
> 2026-07-08.

## How to use this doc

1. Read this top-to-bottom, then the linked docs. Newer docs win over older ones.
2. Authoritative context (all in-repo, provider-agnostic):
   - Repo rules for agents: [`AGENTS.md`](../AGENTS.md) (≤80 lines, points here)
   - What the repo is / layout / `misc/` convention: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
   - Per-package state + known issues: [`docs/PACKAGES.md`](PACKAGES.md)
   - The target output format: [`docs/CMA.md`](CMA.md)
   - Commands: [`docs/COMMANDS.md`](COMMANDS.md) · Stack/CI: [`docs/TOOLING.md`](TOOLING.md)
   - Planned migration: [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md)
3. Working method the user (cru) expects: **discuss decisions before coding, one step at a
   time; this repo feeds the Tracker product, so output-format changes are breaking changes.**

## Mission

Refresh the whole monorepo in three big strokes:

1. **CMA format rollout** — every parser emits the same output shape ([`docs/CMA.md`](CMA.md)).
   Today only `thelmabiotel-tblive` conforms.
2. **pnpm migration** — npm workspaces → pnpm, supply-chain hardened ([`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md)).
3. **Dependency refresh** — deps are from ~2025; audit + bump per package. First evidence of
   rot: fresh `npm install` hits ERESOLVE (see Open threads).

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

## Where we are now

Working tree is **clean** (everything above committed on `dev`, not pushed). The docs in this
folder describe the repo accurately as of today. No parser code has been refactored yet —
CMA rollout, pnpm migration and dep refresh are all still pending, in that discussion order.

## Decisions (locked unless cru says otherwise)

- **CMA draft of record is [`docs/CMA.md`](CMA.md) §Current draft** (timestamp = epoch ms,
  `protocol.version` required) — open questions listed there must be settled before rollout.
- **Docs live in `docs/`, one small doc per concern; `AGENTS.md` stays ≤80 lines** (index only).
- **`misc/` is gitignored** — raw sensor captures and dev helpers are never committed.
- **pnpm migration happens as its own step** (not mixed with CMA refactor commits).

## Next steps (in order)

1. **Push `dev`** when cru is ready (publishing only happens on merge to `main`, so pushing
   `dev` is safe).
2. **pnpm migration** per [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md).
3. **Dependency refresh** package by package — start from the ERESOLVE conflict below.
4. **CMA rollout** — lock the [`docs/CMA.md`](CMA.md) open questions with cru first, then start
   with **sbg-ecom** (pre-release 0.0.1, no tests to break, SBG→CMA design work already exists
   in `misc/tests/sbg/`); then septentrio-sbf, nmea-parser (+norsub-emru), and align
   thelmabiotel-tblive's extra top-level keys.

## Open threads / known bugs (report before fixing)

- **Dep rot (ERESOLVE):** fresh resolve fails — `norsub-emru` pins peer `valibot@1.1.0` exactly
  while `@schemasjs/valibot-numbers@^1.0.18` resolves to 1.1.1 requiring `valibot@^1.4.0`.
  Currently worked around with `npm install --legacy-peer-deps`. Fix during dep refresh
  (widen/bump valibot peers across packages).
- `nmea-parser/src/types.ts`: `Float32`/`Float64` types are swapped (each aliases the other's schema).
- `sbg-ecom` has **zero test specs** (only fixtures) and its CI test step is commented out.
- `thelmabiotel-tblive-nodered` has a `test` script but **no mocha specs** (`No test files found`).
- All 5 nodered CI workflows have their test jobs commented out — they publish untested.
- septentrio-sbf `types` script hack (copies `gpstime.d.ts` into root node_modules) — dies with pnpm.
- nmea-parser ships a committed `legacy/` folder + stray root files (`morenmea.tss`).
- Nodered sibling dep ranges inconsistent (`^exact` vs `>=`); `main: index.js` points to a
  non-existent file in all five.
- P08-Trident harness (`misc/tests/p08trident/`) status unknown — ask cru if still live.
