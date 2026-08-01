# Tooling, CI & templates

## Tech stack

| Concern | Tool | Notes |
| --- | --- | --- |
| Package manager | pnpm 11.x (workspaces) | `packageManager: pnpm@11.18.0`; supply-chain hardened (`strictDepBuilds` + `allowBuilds` in `pnpm-workspace.yaml`, `engine-strict` in `.npmrc`). **`packageManager` is what `pnpm/action-setup` reads in CI**, so bumping it bumps CI too — there is no version pinned in the workflows. |
| Build | tsup 8.5.1 (patched) | dual ESM + CJS output; ESM is the focus. Patched to not inject `baseUrl` (TS 6 deprecation, see `patches/tsup@8.5.1.patch`) |
| Test (libraries) | Vitest 4.x | root `vitest.config.ts` aggregates per-package configs via `test.projects` |
| Test (Node-RED) | `node:test` + `node-red-node-test-helper` | run through `tsx`; `node:assert/strict` throughout. **Mocha is gone** from every wrapper (dropped 2026-08-01). ⚠️ `tsx` strips types WITHOUT checking them, so a green suite proves nothing about types — see the typecheck note under CI. |
| Lint/format | ESLint 10 (flat config) | `@stylistic` (house style: no-semi, single-quotes, 2-space, K&R) + `eslint-plugin-sonarjs` (code quality: complexity, cognitive-load, etc.) + `eslint-plugin-perfectionist` (import ordering). See [`eslint.config.js`](../eslint.config.js). Mirrors the Tracker repo setup. |
| Runtime validation | Valibot 1.4.2 via [SchemasJS](https://github.com/crisconru/schemasjs) | `@schemasjs/validator` 2.0.5 + `@schemasjs/valibot-numbers` 1.1.1; keeps us validator-agnostic (Zod swappable). septentrio-sbf & sbg-ecom have NO validation yet |
| TypeScript | 6.0.3 | root tsconfig: clean modern config (`moduleResolution: bundler`, `types: ["node"]`) |
| Node | **>= 22** (`engines.node`, uniform across all 11 packages) | CI tests **22.x + 24.x** — the two current LTS lines (Jod and Krypton) — and publishes on **24**. Node 26 exists but is not LTS yet, so it is deliberately not in the matrix. |

Wishlist (long-term): runtime-agnostic libraries (node / deno / bun, maybe browser).

## CI / publishing (`.github/workflows/`, 11 files)

One workflow per package, originally copied from `templates/library.yml` / `templates/nodered.yml`:

- **Trigger:** `push` filtered to `paths:` — its own package **plus every upstream package it builds
  against**, since a library change can break a wrapper whose tests run on the built `dist`. No branch
  filter, so a push to `dev` runs the tests; `publish` is gated separately.
- **Each job:** `pnpm/action-setup@v6` → `actions/setup-node@v7` (`cache: 'pnpm'`) →
  `pnpm install --frozen-lockfile`. `action-setup` takes its pnpm version from the root
  `packageManager` field, so nothing is pinned twice.
- **Library workflows:** `test` job (Node 22.x/24.x matrix: build the upstream chain, test, build) →
  `publish` job.
- **Wrapper workflows:** the same, plus a **`tsc --noEmit` typecheck step** — mandatory, because these
  suites run under `tsx`, which strips types without checking them, and eslint does not typecheck
  either. Without it a wrapper can be fully green with real type errors. (Libraries are covered by
  their own build, which emits declarations and therefore typechecks.)
- **Publish:** `needs: test` **and** `if: github.ref == 'refs/heads/main'`, then a step that checks npm
  for that exact `name@version` and no-ops if it is already there — so an unrelated re-run cannot
  republish. Publishing is `pnpm publish --access public --filter @coremarine/<pkg> --no-git-checks`
  over **OIDC trusted publishing** (`id-token: write`, no `NPM_TOKEN`), which emits provenance
  automatically.
- **Publish rule:** merging to `main` publishes whatever packages changed. PRs target `dev`.
- `protocol-core.yml` has **no publish job** — the package is `private`.

⚠️ **OIDC trusted publishing is configured per package on npmjs.com.** A package that has only ever
been published with a token will fail its publish step until a trusted publisher is added there. The
six packages released on 2026-07-30 carry SLSA provenance attestations and are proven to work; a
package whose latest version predates that has not been through this path.

## Local CI (act) — test workflows before pushing

[`nektos/act`](https://github.com/nektos/act) runs the GitHub Actions workflows **locally in a
container**, so you can confirm a workflow is green before pushing/merging (only `publish`, which
needs OIDC on `main`, can't run locally). This is the guard that would have caught both the
pnpm-`11.12.0` break and the `protocol-core` build-order break before they ever reached `main`.

- **Requires:** a running container engine (Docker **or** Podman) — nothing else.
- **Install (once):** `gh extension install nektos/gh-act` → invoke as `gh act …`.
  (Fedora's `dnf` `act` is an unrelated tool; don't use it.)
- **Config:** committed **`.actrc`** pins the runner image
  (`-P ubuntu-latest=catthehacker/ubuntu:act-latest` — medium image, ships Node+npm which
  `pnpm/action-setup` needs). First run pulls ~1.6 GB, then it's cached. `.secrets` /
  `.actrc.local` stay git-ignored for per-dev overrides.

```bash
pnpm run act:list                 # list all workflows/jobs act can see
pnpm run nmea-parser:ci:local     # run nmea-parser's Test job locally (both node LTS)
# raw, for anything else:
gh act push -W .github/workflows/<pkg>.yml -j test           # one workflow's test job
gh act push -W .github/workflows/nmea-parser.yml -j test --matrix node-version:24.x  # one matrix entry (faster)
```

`act` starts from a **clean checkout** (git-ignored `dist/` is absent), so it faithfully
reproduces fresh-CI resolution — which is exactly why it surfaces missing build-order steps that a
dirty local tree hides. Add a `<pkg>:ci:local` script per package as each one's workflow goes green.

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

## Linting (`eslint.config.js`)

Flat config, four plugins (mirrors the Tracker repo):

- **typescript-eslint** — TS parser + recommended rules.
- **@stylistic** — house formatting: no semicolons, single quotes, 2-space indent,
  K&R brace style (`} catch {`), `arrowParens: 'always'`. Same defaults as the old ts-standard.
- **eslint-plugin-sonarjs** — SonarLint rules (`sonarjs/recommended`, ~120 rules:
  complexity, cognitive-load, no-magic-numbers, no-duplicate-string, …). **Not
  auto-fixed** — surfaced for manual triage. Disable a rule inline only with a
  comment explaining why. Three rules Sonar ships as `recommended: false` are
  **explicitly enabled** with tight thresholds to enforce the small-functions house
  style: `max-lines-per-function` (50, **off for test files** — `describe()` blocks are
  inherently setup-heavy), `cyclomatic-complexity` (10), `cognitive-complexity` (15).
- **eslint-plugin-perfectionist** — import ordering: `// built-in` → `// installed`
  → `// coded` blocks preserved via `partitionByComment`; alphabetical within each
  block; `environment: 'node'` so `node:*` is classified as builtin.

Run order after changes: **lint → tsc → test** (lint first so auto-fixes don't fight
the type-checker; test last).

## Known tooling debt

- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- Node-RED docker `Dockerfile`s still use `npm i` inside the container (install the published
  package from the npm registry, not the workspace — unaffected by the pnpm migration, but
  inconsistent; could switch to pnpm inside the image if desired).
- No `.nvmrc` / `.node-version` — Node version only constrained via `engines` + CI matrix.
