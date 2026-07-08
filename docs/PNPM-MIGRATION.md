# pnpm migration (planned, NOT started)

**Why:** npm is considered a risk (supply-chain: install scripts run by default, lockfile churn).
pnpm gives strict node_modules isolation and (as done in the Tracker repo) lets us **deny all
dependency build scripts** by default.

Status: **not started** — this doc is the plan + hit-list gathered on 2026-07-08.

## Target setup

- `pnpm-workspace.yaml` with `packages: ['packages/*']`.
- Root `package.json`: add `"packageManager": "pnpm@<pinned>"`; drop the npm `workspaces` field
  (pnpm ignores it; keep only if npm compatibility is wanted).
- Supply-chain hardening (mirror the Tracker repo decision): `.npmrc` with `ignore-scripts=true`
  (or pnpm >=10 default) and explicit `allowBuilds`/`onlyBuiltDependencies` review — deny by default.
- One `pnpm-lock.yaml` at root; **no per-package lockfiles**.

## Hit-list (everything that references npm mechanics)

1. **Root `package.json`** — ~36 proxy scripts use `npm run <action> --workspace=@coremarine/<pkg>`
   → `pnpm --filter @coremarine/<pkg> run <action>` (or replace the whole proxy-script pattern
   with direct `pnpm --filter` usage).
2. **`.github/workflows/*.yml` (10)** + **`templates/library.yml` / `nodered.yml`**:
   - add `pnpm/action-setup` step; `setup-node` `cache: 'npm'` → `cache: 'pnpm'`
   - `npm install` → `pnpm install --frozen-lockfile`
   - `npm publish --access public --workspace=@coremarine/<pkg>` → `pnpm publish --filter @coremarine/<pkg> --access public --no-git-checks`
3. **Lockfiles** — tracked `package-lock.json` remain at root, `packages/nmea-parser/`,
   `packages/thelmabiotel-tblive-nodered/`, and two docker `tests/nodered/data/` folders
   → remove all, commit only the root `pnpm-lock.yaml`. (Untracked lockfile noise was already
   purged in the 2026-07-08 triage.)
4. **septentrio-sbf `types` script** — copies `gpstime.d.ts` into `../../node_modules/@types/`;
   pnpm's strict store breaks this. Replace with a proper local ambient declaration
   (`typesVersions`/`files` inside the package, or vendor the types in `src/`).
5. **Docs** — CONTRIBUTING.md, docs/COMMANDS.md, AGENTS.md command examples.
6. **Node-RED docker envs** — `tests/nodered/` Dockerfiles/scripts run npm installs inside
   containers; check each `Dockerfile` + `manual_tests.sh`.

## Verification checklist (after migrating)

- `pnpm install` clean from scratch → `clean_monorepo.sh` first (extend it to nodered packages).
- All 5 library test suites pass; all 5 builds produce dist ESM+CJS.
- `norsub-emru` resolves workspace sibling `@coremarine/nmea-parser` correctly
  (consider `workspace:^` protocol for internal deps).
- Mocha nodered tests still resolve the sibling library CJS build.
- One dry-run publish (`pnpm publish --dry-run`) per package.
