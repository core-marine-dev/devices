# pnpm migration (DONE)

**Why:** npm is considered a risk (supply-chain: install scripts run by default, lockfile churn).
pnpm gives strict node_modules isolation and lets us **deny all dependency build scripts** by
default (mirroring the Tracker repo decision).

Status: **complete** — migrated on 2026-07-08. This doc kept as historical reference.

## What was done

- `pnpm-workspace.yaml` with `packages: ['packages/*']`.
- Root `package.json`: added `"packageManager": "pnpm@11.10.0"`; dropped the npm `workspaces`
  field and `main: index.js`; rewrote ~36 proxy scripts to `pnpm --filter @coremarine/<pkg>
  run <action>`.
- Supply-chain hardening (mirrors Tracker repo):
  - `pnpm-workspace.yaml`: `strictDepBuilds: true` + `allowBuilds: { esbuild: true }` (tsup's
    bundler; trusted, dev-only; all other build scripts denied).
  - `.npmrc`: `engine-strict=true`.
- One `pnpm-lock.yaml` at root; all `package-lock.json` removed (5 tracked + untracked
  strays). `package-lock.json` added to `.gitignore`.
- Sibling deps converted to `workspace:^` protocol: `norsub-emru` → `@coremarine/nmea-parser`,
  all 5 nodered packages → their sibling library.
- septentrio-sbf `types` hack (copied `gpstime.d.ts` into root `node_modules/@types/`)
  **removed** — replaced with a local ambient declaration (`declare module 'gpstime'` without
  the `import 'gpstime'` line) included in `tsconfig.json`.
- valibot ERESOLVE dep rot fixed: `nmea-parser` `valibot: 1.1.0` → `^1.4.0`; `norsub-emru`
  peer `valibot: 1.1.0` → `>=1.0.0`.
- 10 CI workflows + 2 templates rewritten: `pnpm/action-setup@v4` step, `cache: 'pnpm'`,
  `pnpm install --frozen-lockfile`, `pnpm publish --filter --no-git-checks`.

## Verification (all passed)

- `pnpm install` clean from scratch.
- All 5 library builds produce dist ESM+CJS.
- All 4 library test suites with specs pass (nmea 60/60, septentrio 54/54, tblive 134/134,
  norsub 8/8; sbg-ecom has no specs — pre-existing).
- `norsub-emru` resolves workspace sibling `@coremarine/nmea-parser` via `workspace:^`.
- No peer dependency conflicts (valibot 1.4.2 installed).

## Not changed (deferred)

- Node-RED docker `Dockerfile`s still use `npm i` inside the container (installs the published
  package from the npm registry, not the workspace — unaffected, but inconsistent).
- `clean_monorepo.sh` still only covers library packages (not nodered).
