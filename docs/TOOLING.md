# Tooling, CI & templates

## Tech stack

| Concern | Tool | Notes |
| --- | --- | --- |
| Package manager | pnpm 11.x (workspaces) | `packageManager: pnpm@11.10.0`; supply-chain hardened (`strictDepBuilds` + `allowBuilds` in `pnpm-workspace.yaml`, `engine-strict` in `.npmrc`) |
| Build | tsup 8.x | dual ESM + CJS output; ESM is the focus |
| Test (libraries) | Vitest 3.x | root `vitest.config.ts` aggregates per-package configs via `test.projects` |
| Test (Node-RED) | Mocha + node-red-node-test-helper | assertion lib varies (`should` / `chai`) |
| Lint/format | ts-standard 12 | StandardJS style; `format` = `--fix` (migration to ESLint flat config planned) |
| Runtime validation | Valibot via [SchemasJS](https://github.com/crisconru/schemasjs) | `@schemasjs/validator` (ValibotValidator) + `@schemasjs/valibot-numbers`; keeps us validator-agnostic (Zod swappable). septentrio-sbf & sbg-ecom have NO validation yet |
| TypeScript | 5.9.x | root tsconfig is mostly the annotated starter (target/module ESNext) |
| Node | >= 18 | CI tests 18.x + 20.x, publishes on 20 |

Wishlist (long-term): runtime-agnostic libraries (node / deno / bun, maybe browser).

## CI / publishing (`.github/workflows/`, 10 files)

One workflow per package, copied from `templates/library.yml` / `templates/nodered.yml`:

- **Trigger:** `push` filtered to `paths: packages/<pkg>/**` + `workflow_dispatch`.
- **Each job:** `pnpm/action-setup@v4` → `actions/setup-node@v4` (`cache: 'pnpm'`) → `pnpm install --frozen-lockfile`.
- **Library workflows:** `test` job (Node 18.x/20.x matrix, test + build) →
  `publish` job (only on `main`): `pnpm publish --access public --filter @coremarine/<pkg> --no-git-checks`
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

## Supply-chain hardening

Mirrors the Tracker repo decision — defense-in-depth for dependency lifecycle scripts:

- **`pnpm-workspace.yaml`** — `strictDepBuilds: true` makes any unreviewed build-script dep FAIL
  the install (`ERR_PNPM_IGNORED_BUILDS`). `allowBuilds` explicitly lists reviewed packages:
  `esbuild: true` (tsup's bundler; trusted, dev-only).
- **`.npmrc`** — `engine-strict=true` fails fast on Node version mismatches.

## Known tooling debt

- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- Node-RED docker `Dockerfile`s still use `npm i` inside the container (install the published
  package from the npm registry, not the workspace — unaffected by the pnpm migration, but
  inconsistent; could switch to pnpm inside the image if desired).
- No `.nvmrc` / `.node-version` — Node version only constrained via `engines` + CI matrix.
