# Architecture

## What this repo is

CoreMarine open source monorepo of **marine/IoT device protocol parsers** (TypeScript) and their
**Node-RED wrappers**. These libraries are the parsing layer of CoreMarine's **Tracker** product
(a telemetry ETL: extract from devices → transform/parse → load to cloud), so correctness and
output-format stability matter beyond this repo.

Currently an **npm workspaces** monorepo (`workspaces: ["packages/*"]`). A migration to **pnpm**
is planned — see [PNPM-MIGRATION.md](PNPM-MIGRATION.md).

## Repo layout

```text
packages/     the 10 publishable packages (5 device pairs)
templates/    scaffolding for new packages (library/ + nodered/ + 2 workflow .yml)
docs/         all documentation (this folder) — docs/STATUS.md is the living handoff log
misc/         GITIGNORED dev helpers: raw sensor data, scratch harnesses, drafts (see below)
.github/      one publish workflow per package (10 total)
```

### `misc/` convention (same as the Tracker repo)

Everything under `misc/` is **gitignored on purpose** — human/dev helpers that must never be
published or committed: raw sensor captures (binaries, CSVs), one-off scripts, draft docs.
Current contents (local only, may differ per machine):

```text
misc/tests/       CMA-refactor scratch harness (tests/cma.ts draft, SBG binary corpus + generators,
                  P08-Trident synthetic-data project)
misc/todo/        parked future parsers (ublox-ubx, vectornav) — scaffolds + datasheet PDFs
misc/data/        raw sensor data moved out of packages (sbg bin/csv samples, tblive runtime outputs)
misc/datasheets/  protocol datasheets / vendor manuals (PDFs), one folder per package — moved
                  out of each package's old docs/ folder (2026-07-09)
misc/drafts/      draft test files, helper nodes, diagrams
misc/archive/     superseded design drafts (old frame model, SBG→CMA comparison dump)
```

## Package pair pattern

Each supported device is TWO packages:

1. **Library** — `packages/<device>` → npm `@coremarine/<device>`. Pure TS parsing logic,
   built with tsup to dual ESM + CJS (ESM is the focus).
2. **Node-RED component** — `packages/<device>-nodered` → npm `@coremarine/<device>-nodered`.
   Thin JS wrapper consuming the library's CJS build. Node-RED node id is `cma-<device>`.

Naming: `<manufacturer>-<protocol>` (e.g. `septentrio-sbf`), except `nmea-parser` (standard protocol).

## Library internal structure

```text
src/index.ts       public exports
src/parser.ts      main Parser class (stateful: addData/parseData with optional memory buffer)
src/schemas.ts     Valibot schemas via SchemasJS wrapper (runtime validation)
src/types.ts       TS types (often inferred from schemas)
src/constants.ts   protocol constants
src/firmware/<v>/  (binary protocols) one folder per supported firmware, one file per frame/log type
tests/             Vitest specs
```

Parser API convention, now **enforced by the compiler** through the `DeviceParser<B>` contract in
`@coremarine/protocol-core`: `addData(raw)` feeds bytes/text into an internal buffer and
`parseData()` drains parsed sentences, plus the introspection surface every parser must expose —
`sentenceIds`, `getSentenceDefinition(id, protocol?)` and `getFakeSentence(id, protocol?, options?)`.
A parser that omits any of them does not compile. See [PACKAGES.md](PACKAGES.md) for per-package
detail.

## Node-RED component structure

All five wrappers now share this shape (TypeScript, built with tsup to CJS):

```text
src/lib.ts                  the pure logic — one function per msg channel, no node-red imports
src/parser.ts               the thin node: registers the type and wires msg keys to src/lib.ts
src/parser.html             editor UI + the help panel
src/icons/                  node icons
copy-assets.mjs             copies parser.html and icons into dist/ after tsup
dev-server.mjs              a local Node-RED on :1880 (`:nodered:dev` / `:nodered:examples`)
examples/*.json             the SHIPPED example flow, published in the tarball
tests/lib.unit.test.ts      node:test specs for src/lib.ts
tests/wrapper.integration.test.ts   boots a REAL headless node-red against the built dist
tests/version.unit.test.ts  the guard that the wrapper and its library share a major
```

Two things that are gone, because older notes still describe them: there is **no Mocha** (all five use
`node:test`) and **no Docker** manual-test environment (`dev-server.mjs` replaced it; the
`tests/nodered/` mirror of `src/` was deleted with the sbg-ecom 1.0.0 rewrite).

⚠️ The suites run through `tsx`, which strips types **without checking them**, and against the
library's built `dist` — so build the library first, and run `tsc --noEmit` in the wrapper when its
library changes.

## Output format

**Every parser emits the same CMA format**, regardless of protocol. See [CMA.md](CMA.md).
The refactor that got there is **complete as of 2026-08-01 — all five devices** are on the shared
`@coremarine/protocol-core` base and emit CMA ([PACKAGES.md](PACKAGES.md) has the per-package
detail). Output shapes are contracts for the Tracker product, so changing one is a breaking change.
