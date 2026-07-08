# Devices — Code Style

> For developers. The *why* behind our conventions, with examples. The condensed checklist
> lives in [`AGENTS.md`](../AGENTS.md); this doc explains the reasoning. Applies to the
> TypeScript in `packages/*/src/`.
>
> Guiding principle: **code is maintained by people first.** Prefer the simple, explicit,
> boring option. Don't add structure before a real need.

## Formatting

- **No semicolons.** Only where mandatory (e.g. `for (;;)`).
- **Single quotes** (`'`), not double — except where mandatory (JSON files).
- **2-space** indentation.
- **K&R brace style** (`} else {`, `} catch {`).
- **`arrowParens: always`** — `const fn = (x) => x` not `const fn = x => x`.

```ts
// good
const name = 'tracker'

// avoid
const name = "tracker";
```

## Imports — grouped, ordered, commented

Three groups, in this order, each preceded by a comment, with a blank line between them:

1. `// built-in` — Node.js built-ins, **always prefixed**: `node:*` (e.g. `node:path`, `node:fs`)
2. `// installed` — npm dependencies (valibot, @schemasjs/*, etc.)
3. `// coded` — our own modules (relative `./`)

```ts
// built-in
import { readFileSync } from 'node:fs'

// installed
import * as v from 'valibot'

// coded
import { checksum } from './checksum'
```

Why: you can see at a glance what a file depends on and where each import comes from. The
`eslint-plugin-perfectionist` rule enforces this — it alphabetizes within each block and
never reorders across blocks (via `partitionByComment`).

## Functions — arrows everywhere

Use **arrow functions** for all function declarations. Class methods may use arrow fields
where `this` binding matters. The only mandatory exceptions are `constructor` and getters
(they can't be arrows).

```ts
// good
export const parseSentence = (data: Buffer): Frame[] => { ... }

// avoid
export function parseSentence (data: Buffer) { ... }
```

### One statement per line

Never put two statements on one line (`const a = 1; const b = 2`). Split them. The
`@stylistic/max-statements-per-line` rule enforces this.

```ts
// good
const a = 1
const b = 2

// avoid
const a = 1; const b = 2
```

### Small functions — strict complexity thresholds

The `eslint-plugin-sonarjs` rules enforce small, focused functions:

- **`max-lines-per-function: 50`** — a function body longer than 50 lines needs splitting.
  (Test files are exempt — `describe()` blocks are inherently setup-heavy.)
- **`cyclomatic-complexity: 10`** — too many branches (if/else/switch/loops) → refactor.
- **`cognitive-complexity: 15`** — too hard to hold in your head → simplify.

If a function genuinely can't be split (e.g. a protocol field-mapping that's one line per
bit), add an inline `// eslint-disable-next-line sonarjs/max-lines-per-function -- rationale`
with a comment explaining why. The CMA refactor will revisit these.

## Validation & types

- **Validate with [valibot](https://valibot.dev)** via the
  [SchemasJS](https://github.com/crisconru/schemasjs) wrapper
  (`@schemasjs/validator` + `@schemasjs/valibot-numbers`). This keeps us validator-agnostic
  (Zod swappable).
- **Single source of truth:** types are **inferred** from schemas, never hand-written
  alongside them.
  ```ts
  export const FrameSchema = v.object({ timestamp: v.number() })
  export type Frame = v.InferOutput<typeof FrameSchema>
  ```
- **Centralize per package, grouped by context:**
  - all schemas → `schemas.ts`
  - all shared types → `types.ts`
  - all constants → `constants.ts`
  - all utils → `utils.ts`
  A file may keep a *local* type used only within it.
- **septentrio-sbf & sbg-ecom have NO validation yet** — adding it is part of the CMA rollout.

## Structure — per-package five-file pattern

Each library package follows a consistent layout (see [`templates/library/`](../templates/library/)):

```text
packages/<name>/
  src/
    index.ts       public API — re-exports from parser, constants, schemas, types
    parser.ts      the parser: addData(), parseData(), getFrames(), etc.
    constants.ts   ALL shared constants (sync flags, status enums, frame formats, …)
    schemas.ts     ALL valibot schemas (or absent if no validation yet)
    types.ts       ALL shared types — mostly InferOutput<> of schemas
    utils.ts       shared helpers (bit operations, CRC, checksum, …)
    <protocol>.ts  protocol-specific data (generated from YAML, e.g. nmea.ts)
  tests/           vitest specs, mirroring src/ structure
  tsup.config.ts   dual ESM + CJS build config
  vitest.config.ts test + coverage config
  tsconfig.json    extends root tsconfig
```

Binary protocols (septentrio-sbf, sbg-ecom) add a `src/firmware/` tree: one folder per
firmware version, with sub-folders per message group (logs, commands, etc.).

Node-RED wrapper packages (`<name>-nodered`) ship raw `.js` source (no build step) and
register a `cma-<component>` node that wraps the sibling library.

## Tooling

```text
pnpm lint                 # eslint — check (stylistic + sonar + import-order rules)
pnpm lint:fix             # eslint --fix (auto-fixes stylistic/import-order only)
pnpm run <pkg>:test       # vitest (watch mode)
pnpm run <pkg>:test:coverage  # vitest run --coverage
pnpm run <pkg>:build      # format (eslint --fix) + tsup (ESM + CJS + DTS)
```

**Run order after changes:** lint → tsc → test. Lint first so auto-fixes don't fight the
type-checker; test last.

## Inline eslint-disable policy

Disable a rule inline only with a comment explaining why:

```ts
// eslint-disable-next-line sonarjs/pseudo-random -- test data generation, not security-sensitive
const value = Math.random()

// eslint-disable-next-line sonarjs/max-lines-per-function -- pure field mapping, one bit per line; CMA refactor will revisit
```

Never use a bare `// eslint-disable` without a `-- rationale` suffix. The linter is there to
catch mistakes — if you disable it, say why.
