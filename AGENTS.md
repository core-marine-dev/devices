# AGENTS.md

Guidance for AI coding assistants in this repository. Keep this file **under 80 lines** —
details live in small docs under [`docs/`](docs/README.md); add/update those instead of growing this file.

## Read first

1. **[`docs/STATUS.md`](docs/STATUS.md)** — living handoff log: where work stands, next steps,
   uncommitted-work triage. **Read it before touching anything, and keep it updated in the same
   turn as any meaningful change** (its maintenance rule applies to you).
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — what this repo is and how it's laid out.
3. [`docs/PACKAGES.md`](docs/PACKAGES.md) — per-package state and known issues.

## What this repo is (one paragraph)

CoreMarine monorepo (pnpm workspaces) of TypeScript **marine device protocol parsers**
+ their **Node-RED wrappers**, under `packages/`. They are the parsing layer
of the Tracker telemetry product, so output shapes are contracts. A deep refactor is in
progress: all parsers must converge on the unified **CMA output format** —
[`docs/CMA.md`](docs/CMA.md). Today only `thelmabiotel-tblive` conforms.

## Docs map

| Need | Doc |
| --- | --- |
| Current state / next steps | [`docs/STATUS.md`](docs/STATUS.md) |
| Repo layout & package patterns | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Package inventory & issues | [`docs/PACKAGES.md`](docs/PACKAGES.md) |
| CMA output format | [`docs/CMA.md`](docs/CMA.md) |
| Commands | [`docs/COMMANDS.md`](docs/COMMANDS.md) |
| Stack, CI, templates | [`docs/TOOLING.md`](docs/TOOLING.md) |
| npm→pnpm migration | [`docs/PNPM-MIGRATION.md`](docs/PNPM-MIGRATION.md) |
| Protocol wire formats | [`docs/PROTOCOLS.md`](docs/PROTOCOLS.md) |
| New packages | `CONTRIBUTING.md` + `templates/` (follow `TODO:` markers) |

## Essential commands

Package names: `nmea-parser`, `norsub-emru`, `septentrio-sbf`, `sbg-ecom`, `thelmabiotel-tblive`.

```bash
pnpm run <package>:test            # vitest (watch)
pnpm run <package>:build           # format + tsup (ESM + CJS)
pnpm run <package>:lint            # ts-standard
pnpm run <package>:nodered:test    # mocha (Node-RED wrapper)
```

Full list incl. coverage, docker env, single-file runs: [`docs/COMMANDS.md`](docs/COMMANDS.md).

## Ground rules

- **Discuss before coding.** The user (cru) wants decisions converged first, one step at a time.
- Output-format changes are **breaking changes** for Tracker — never change a parser's output
  shape casually; that's the CMA refactor's job, done deliberately per package.
- Stack: pnpm workspaces (supply-chain hardened), tsup build, Vitest (libs) / Mocha (nodered),
  ts-standard style, Valibot via SchemasJS wrapper, Node >= 18. Details: [`docs/TOOLING.md`](docs/TOOLING.md).
- Git: branch from `dev`, PR to `dev`; merging `main` **publishes to npm** via GitHub Actions.
- The working tree currently has uncommitted work from old sessions — check
  [`docs/STATUS.md`](docs/STATUS.md) before cleaning or committing anything.
