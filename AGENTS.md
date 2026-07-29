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
[`docs/CMA.md`](docs/CMA.md) — on the shared base `@coremarine/protocol-core`. **Done and published:
`nmea-parser` (the reference) and `norsub-emru`, each with its Node-RED wrapper. Still to convert:
`thelmabiotel-tblive` (CMA-shaped but not on the base class), then the binary parsers `septentrio-sbf`
and `sbg-ecom`.**

## Docs map

| Need | Doc |
| --- | --- |
| Current state / next steps | [`docs/STATUS.md`](docs/STATUS.md) |
| Repo layout & package patterns | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Package inventory & issues | [`docs/PACKAGES.md`](docs/PACKAGES.md) |
| CMA output format | [`docs/CMA.md`](docs/CMA.md) |
| nmea-parser journey (how it works) | [`docs/NMEA.md`](docs/NMEA.md) |
| Commands | [`docs/COMMANDS.md`](docs/COMMANDS.md) |
| Stack, CI, templates | [`docs/TOOLING.md`](docs/TOOLING.md) |
| Code style | [`docs/CodeStyle.md`](docs/CodeStyle.md) |
| npm→pnpm migration | [`docs/PNPM-MIGRATION.md`](docs/PNPM-MIGRATION.md) |
| Protocol wire formats | [`docs/PROTOCOLS.md`](docs/PROTOCOLS.md) |
| New packages | `CONTRIBUTING.md` + `templates/` (follow `TODO:` markers) |

## Essential commands

Package names: `nmea-parser`, `norsub-emru`, `septentrio-sbf`, `sbg-ecom`, `thelmabiotel-tblive`.

```bash
pnpm run <package>:test            # vitest (watch)
pnpm run <package>:build           # format + tsup (ESM + CJS)
pnpm run <package>:lint            # eslint
pnpm run <package>:nodered:test    # mocha (Node-RED wrapper)
```

Full list incl. coverage, docker env, single-file runs: [`docs/COMMANDS.md`](docs/COMMANDS.md).

## Code style (enforced — apply to every new line)

> Condensed checklist; the dev explainer with rationale + examples is
> [`docs/CodeStyle.md`](docs/CodeStyle.md).

- **No semicolons**, **single quotes**, **2-space** indent, **K&R** braces, `arrowParens: always`.
- **Import groups** (`// built-in` → `// installed` → `// coded`), each with a comment, blank
  line between, alphabetical within. Built-ins always prefixed: `node:<module>`.
- **Arrow functions** everywhere. One statement per line — never `const a = 1; const b = 2`.
- **Small functions:** max 50 lines, cyclomatic complexity ≤ 10, cognitive complexity ≤ 15
  (tests exempt from max-lines). Inline-disable with a `-- rationale` only when unavoidable.
- **Run order after changes:** lint → tsc → test.

## Ground rules

- **Discuss before coding.** The user (cru) wants decisions converged first, one step at a time.
- Output-format changes are **breaking changes** for Tracker — never change a parser's output
  shape casually; that's the CMA refactor's job, done deliberately per package.
- Stack: pnpm workspaces (supply-chain hardened), tsup build, Vitest (libs) / Mocha (nodered),
  ESLint flat config (@stylistic + sonarjs + perfectionist), Valibot via SchemasJS wrapper,
  Node >= 18. Details: [`docs/TOOLING.md`](docs/TOOLING.md).
- Git: branch from `dev`, PR to `dev`; merging `main` **publishes to npm** via GitHub Actions.
- The working tree currently has uncommitted work from old sessions — check
  [`docs/STATUS.md`](docs/STATUS.md) before cleaning or committing anything.
