# Tooling, CI & templates

## Tech stack

| Concern | Tool | Notes |
| --- | --- | --- |
| Package manager | **pnpm 12.x** (workspaces) | `packageManager: pnpm@12.8.2` (since 2026-10-09; pnpm 12 is the Rust rewrite — same settings, flags and lockfile format as 11; `pnpm/action-setup@v6` supports it). Supply-chain hardened: **exact pins + a 7-day release cooldown** (§"Exact pins" below) (`strictDepBuilds` + `allowBuilds` in `pnpm-workspace.yaml`, `engine-strict` in `.npmrc`). **`packageManager` is what `pnpm/action-setup` reads in CI**, so bumping it bumps CI too — there is no version pinned in the workflows. |
| Build | tsup 8.5.1 (patched) | dual ESM + CJS output; ESM is the focus. Patched to not inject `baseUrl` (TS 6 deprecation, see `patches/tsup@8.5.1.patch`) |
| Test (libraries) | Vitest 5.0.3 | root `vitest.config.ts` aggregates per-package configs via `test.projects`. Vitest 5 made `vite` a REQUIRED peer, so `vite` 8.3.2 is a root devDependency — listed explicitly so it is pinned, not auto-installed from a range |
| Test (Node-RED) | `node:test` + `node-red-node-test-helper` | run through `tsx`; `node:assert/strict` throughout. **Mocha is gone** from every wrapper (dropped 2026-08-01). ⚠️ `tsx` strips types WITHOUT checking them, so a green suite proves nothing about types — see the typecheck note under CI. |
| Lint/format | ESLint 10 (flat config) | `@stylistic` (house style: no-semi, single-quotes, 2-space, K&R) + `eslint-plugin-sonarjs` (code quality: complexity, cognitive-load, etc.) + `eslint-plugin-perfectionist` (import ordering). See [`eslint.config.js`](../eslint.config.js). Mirrors the Tracker repo setup. |
| Runtime validation | Valibot 1.5.0 via [SchemasJS](https://github.com/crisconru/schemasjs) | `@schemasjs/validator` 2.0.5 + `@schemasjs/valibot-numbers` 1.1.1 (2.0.6 / 1.1.2 exist but were inside the 7-day cooldown on 2026-10-09). valibot is a REGULAR exact dependency everywhere — never a peer; keeps us validator-agnostic (Zod swappable). septentrio-sbf & sbg-ecom have NO validation yet |
| TypeScript | **6.0.3 — and this is the ceiling** | root tsconfig: clean modern config (`moduleResolution: bundler`, `types: ["node"]`). ⛔ **TypeScript 7 is NOT possible yet**, see below. 6.0.3 is the newest release `typescript-eslint` accepts (`>=4.8.4 <6.1.0`), and no 6.1.x exists, so we are already at the top of the supported range. |
| Node | **>= 22** (`engines.node`, uniform across all 11 packages) | CI tests **22.x + 24.x** — the two current LTS lines (Jod and Krypton) — and publishes on **24**. Node 26 exists but is not LTS yet, so it is deliberately not in the matrix. |

Wishlist (long-term): runtime-agnostic libraries (node / deno / bun, maybe browser).

### ⛔ TypeScript 7 — tried on 2026-08-01, still blocked by the SAME thing

`typescript@7.0.2` is out (the native Go compiler). It was installed and tested; the blocker has not
moved:

- **`tsc` itself is fine** — `tsc --noEmit` at 7.0.2 typechecks our packages with exit 0, so the source
  and the tsconfig are ready.
- **`typescript-eslint` refuses it outright.** With the whole eslint stack at latest (eslint 10.8.0,
  typescript-eslint 8.65.0, sonarjs 4.2.0) the lint run dies on a deliberate guard:
  `Error: typescript-eslint does not support TS 7.0.` Its peer range is still `>=4.8.4 <6.1.0` — it does
  not even accept a hypothetical 6.1.
- On the older sonarjs 4.1.0 the failure was messier — a crash inside the plugin reading a TS AST enum
  (`Cannot read properties of undefined (reading 'FunctionType')`) — which is the same root cause one
  layer down.

**Re-checked 2026-10-09: still blocked** — `typescript-eslint` 8.71.x keeps `typescript: >=4.8.4 <6.1.0`.

**So the answer is unchanged: not yet, and it is not our code holding it back.** Re-test by bumping
`typescript-eslint` and re-reading its `peerDependencies.typescript`; when that range admits 7, try
again. Nothing else in the stack objected — tsup/esbuild never typecheck, and vitest was untouched.

## CI / publishing (`.github/workflows/`, 12 files)

**`release-check.yml`** (added 2026-10-09) runs on every PR into `main`: it builds everything and runs
`pnpm run release:check`, which installs every public package from its PACKED TARBALL in clean npm and
pnpm folders (see [`COMMANDS.md`](COMMANDS.md)). ⚠️ It only blocks a merge once it is a **required status
check** in the branch protection rule for `main` — a GitHub setting cru has to turn on.

The other eleven: one workflow per package, originally copied from `templates/library.yml` / `templates/nodered.yml`:

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
- `templates/library.yml` / `nodered.yml` — workflow blueprints (`TODO:` markers to replace),
  **regenerated 2026-10-09** from the real `thelmabiotel-tblive` pair (they had drifted to Node 18/20).
- ⚠️ `templates/library/` `package.json` + `tsup.config.ts` were rebuilt the same day (exact pins, the
  private core as a BUNDLED devDependency), but its example `src/` still predates CMA — it does not
  extend `StringParser`/`BinaryParser` yet. Start a new device from a real package's src until it does.

New package checklist: copy template → replace `TODO:` markers → add the workspace-proxy
scripts to root `package.json` → copy + rename the workflow yml into `.github/workflows/`.

## Supply-chain hardening

Mirrors the Tracker repo decision — defense-in-depth for dependency lifecycle scripts:

- **`pnpm-workspace.yaml`** — `strictDepBuilds: true` makes any unreviewed build-script dep FAIL
  the install (`ERR_PNPM_IGNORED_BUILDS`). `allowBuilds` explicitly lists reviewed packages:
  `esbuild: true` (tsup's bundler; trusted, dev-only).
- **`.npmrc`** — `engine-strict=true` fails fast on Node version mismatches.
- **`overrides`** — patched versions of transitive deps carrying CVEs that cannot be bumped
  directly, each pinned to an EXACT version (the full list and the reason for each is in
  `pnpm-workspace.yaml`). All dev-only: on 2026-10-09 every one of the 36 advisories ran through
  node-red, eslint or vite, none through a published tarball.
  **An override is only worth keeping while something still pulls the package** — check with
  `pnpm why <dep> -r`. `serialize-javascript` was dropped on 2026-08-01 because mocha was its only
  route into the tree; `diff` was kept, because `node-red-node-test-helper` still reaches it through
  `sinon` even though mocha is gone.

### Exact pins (cru, 2026-10-09)

**Every dependency is an EXACT version — no `^`, `~`, `>=` ranges anywhere**, because a range lets a
compromised new release of a dependency reach an install without anyone choosing it. Concretely:

- **Published `dependencies`** — exact (`valibot: 1.5.0`, `crc: 4.3.2`, …). The release check FAILS a
  tarball that declares a range.
- **Internal links are `workspace:*`**, which pnpm packs as the exact version (`6.0.1`), not
  `workspace:^` (packed as `^6.0.1`). Consequence: **releases are lockstep** — an nmea-parser fix only
  reaches consumers once norsub-emru, septentrio-sbf, sbg-ecom and the five wrappers are republished.
- **No `peerDependencies` in a published package.** An exact peer is a guaranteed `ERESOLVE` for any
  consumer on another version — that is what norsub-emru@6.0.0's `valibot: 1.4.2` peer did. A peer
  cannot be pinned safely, so it becomes an exact regular dependency instead.
- **devDependencies, overrides and `packageManager`** — exact too.
- **`minimumReleaseAge: 10080`** in `pnpm-workspace.yaml` — a 7-day cooldown: pnpm refuses any version
  younger than that, so pick "the newest release at least 7 days old". An urgent fix goes into
  `minimumReleaseAgeExclude` as one `name@version`, deliberately, with a reason.
- **`@coremarine/*` is excluded from the cooldown** (cru, 2026-10-09): we publish our own packages via
  OIDC with provenance, so a cooldown only delays our own fixes. Proven: under a strict 7-day cooldown
  a fresh `sbg-ecom@1.0.1` fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`; with the exclusion it
  installs. **Every consumer of `@coremarine/*` (Tracker) should carry the same exclusion.**

**What pins cannot do — know this before relying on them:**

- **They stop at our direct dependencies.** A consumer still resolves our dependencies' OWN deps by
  range. Our published runtime tree is nearly all covered — valibot, both `@schemasjs` packages and
  `crc` have zero dependencies — but `js-yaml` brings `argparse` `^2.0.1`. Only a shrinkwrap could pin
  that, and shrinkwraps are wrong for libraries.
- **Security fixes no longer flow to consumers by themselves.** js-yaml's HIGH advisory in August
  reached consumers through a range; with a pin it needs a republish from us. So `pnpm audit` is part
  of every release, and an advisory in a PUBLISHED dependency is a reason to release.
- `engines.node` (`>=22`) and the wrappers' `node-red.version` (`>=4.0.0`) stay ranges on purpose: they
  declare what we support, not what gets installed.

### Dependencies deliberately NOT here (audited 2026-08-01)

`chai`, `mocha` and `deep-equal-in-any-order` were removed: **zero references anywhere in the repo**,
left over from when the wrappers ran Mocha + chai, before they moved to `node:test`. Together with
their subtrees that is **46 packages** gone from the install.

`sinon` is **not** ours and cannot be removed — it arrives transitively under
`node-red-node-test-helper`, which the wrapper integration tests genuinely need.

`@valibot/to-json-schema` was also removed, and it mattered more than the dev deps: it was a
**runtime** dependency of the published `@coremarine/nmea-parser`, added during a 2.2.0 schemas
refactor, never imported, and absent from the built `dist` — so every consumer was installing it for
nothing.

What looks unused but is **required**, so nobody removes it on a second pass: `@types/node`
(`tsconfig.json` sets `types: ["node"]`), `@types/node-red` (node-red ships no types and all five
wrappers `import type … from 'node-red'`), `@types/js-yaml` (js-yaml ships no types either), and
`@vitest/coverage-v8` (the provider `--coverage` needs). None appears in an import statement, which is
exactly why a text search alone is not enough to justify a removal.

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
