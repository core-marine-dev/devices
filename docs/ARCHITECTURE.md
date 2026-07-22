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

Parser API convention (not yet uniform — see [PACKAGES.md](PACKAGES.md)):
`addData(raw)` feeds bytes/text into an internal buffer; `parseData()` drains parsed frames.

## Node-RED component structure

```text
src/parser.js               node implementation
src/parser.html             editor UI
src/icons/                  node icons
tests/*.test.js             Mocha + node-red-node-test-helper specs
tests/nodered/              Docker-based manual/integration env (mirrors src/ — duplicated on purpose)
docker-compose.yml + Dockerfile + manual_tests.sh
```

## Output format

Goal of the ongoing deep refactor: **every parser emits the same CMA format** regardless of
protocol. See [CMA.md](CMA.md). Today only `thelmabiotel-tblive` conforms; the rest emit
legacy per-protocol shapes ([PACKAGES.md](PACKAGES.md) has the per-package state).
