# Tooling, CI & templates

## Tech stack

| Concern | Tool | Notes |
| --- | --- | --- |
| Package manager | npm workspaces | migration to pnpm planned → [PNPM-MIGRATION.md](PNPM-MIGRATION.md) |
| Build | tsup 8.x | dual ESM + CJS output; ESM is the focus |
| Test (libraries) | Vitest 3.x | root `vitest.config.ts` aggregates per-package configs via `test.projects` |
| Test (Node-RED) | Mocha + node-red-node-test-helper | assertion lib varies (`should` / `chai`) |
| Lint/format | ts-standard 12 | StandardJS style; `format` = `--fix` |
| Runtime validation | Valibot via [SchemasJS](https://github.com/crisconru/schemasjs) | `@schemasjs/validator` (ValibotValidator) + `@schemasjs/valibot-numbers`; keeps us validator-agnostic (Zod swappable). septentrio-sbf & sbg-ecom have NO validation yet |
| TypeScript | 5.9.x | root tsconfig is mostly the annotated starter (target/module ESNext) |
| Node | >= 18 | CI tests 18.x + 20.x, publishes on 20 |

Wishlist (long-term): runtime-agnostic libraries (node / deno / bun, maybe browser).

## CI / publishing (`.github/workflows/`, 10 files)

One workflow per package, copied from `templates/library.yml` / `templates/nodered.yml`:

- **Trigger:** `push` filtered to `paths: packages/<pkg>/**` + `workflow_dispatch`.
- **Library workflows:** `test` job (Node 18.x/20.x matrix, `npm install`, test + build) →
  `publish` job (only on `main`): `npm publish --access public --workspace=@coremarine/<pkg>`
  with `secrets.NPM_TOKEN`.
- **Publish rule:** merging to `main` publishes whatever packages changed. PRs target `dev`.

Current CI gaps (as committed):

- All 5 **nodered workflows have the whole `test` job commented out** — they publish untested.
- `sbg-ecom.yml` has its test step commented out (package has no test specs yet).

## Templates (`templates/`)

Scaffolding for new packages — see CONTRIBUTING.md for the step-by-step recipes:

- `templates/library/` — full library skeleton (src/ five-file pattern, tests, tsup/vitest/tsconfig).
- `templates/nodered/` — Node-RED component skeleton (parser.js/html, docker test env).
- `templates/library.yml` / `nodered.yml` — workflow blueprints (`TODO:` markers to replace).

New package checklist: copy template → replace `TODO:` markers → add the workspace-proxy
scripts to root `package.json` → copy + rename the workflow yml into `.github/workflows/`.

## Known tooling debt

- Tracked `package-lock.json` files at `packages/nmea-parser/`, `packages/thelmabiotel-tblive-nodered/`,
  and two docker `tests/nodered/data/` folders (inconsistent; remove with pnpm migration).
- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- septentrio-sbf's `types` script copies `gpstime.d.ts` into root `node_modules/@types/` (breaks under pnpm).
- No `.nvmrc` / `packageManager` field — nothing pins toolchain versions.
