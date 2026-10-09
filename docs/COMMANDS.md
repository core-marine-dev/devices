# Commands

All run from the repo root via workspace-proxy scripts in the root `package.json`.
Package names: `nmea-parser`, `norsub-emru`, `septentrio-sbf`, `sbg-ecom`, `thelmabiotel-tblive`.

## Libraries

```bash
pnpm run <package>:build           # format (eslint) + tsup transpile to ESM + CJS
pnpm run <package>:test            # vitest (watch mode; runs once under CI=1)
pnpm run <package>:test:coverage   # vitest coverage — uniform across all six libraries
pnpm run <package>:lint            # eslint check
pnpm run <package>:format          # eslint --fix
pnpm run nmea-parser:protocols     # regenerate src/nmea.ts from protocols YAML
pnpm run norsub-emru:protocols     # same, for norsub's own definitions
                                   # (septentrio-sbf has a package-level `protocols` script too,
                                   #  run by its own `test`; there is no root alias for it)
pnpm lint                          # eslint — whole monorepo
pnpm lint:fix                      # eslint --fix — whole monorepo
```

## Release check — MANDATORY before any release PR

```bash
# build everything first: it packs dist/ as it is on disk
for p in protocol-core nmea-parser norsub-emru septentrio-sbf thelmabiotel-tblive sbg-ecom; do pnpm run "${p}:build"; done
for p in nmea-parser norsub-emru septentrio-sbf thelmabiotel-tblive sbg-ecom; do pnpm run "${p}:nodered:build"; done
pnpm run release:check                                          # every public package, from its packed tarball
pnpm run release:check -- --registry @coremarine/sbg-ecom@1.0.1 # AFTER publishing: the same, straight from npm
```

`scripts/release-check.mjs` installs every public package from its packed tarball into a clean npm AND
a clean pnpm folder (pnpm's strict layout catches undeclared deps that npm hoisting hides) and fails on:
a range or a peer in a published manifest (exact pins only), an import of a PRIVATE package in `dist/`,
an unexpected file in a tarball, `import()`/`require()` failing, any parser that cannot fake → parse
round-trip through the shared `DeviceParser` interface, a wrapper that does not register its nodes, a
package resolving to a version other than the one under test, or parse output typed `any` in a consumer
`tsc --strict`. ~20 s. CI runs it on every PR into `main` (`release-check.yml`).

## Local CI (act) — run workflows locally before pushing

```bash
pnpm run act:list                  # list workflows/jobs act can run (needs docker/podman)
pnpm run nmea-parser:ci:local      # run nmea-parser's Test job locally via nektos/act
```

Requires the gh extension once: `gh extension install nektos/gh-act`. Details + raw `gh act`
usage: [`docs/TOOLING.md`](TOOLING.md) §Local CI (act).

## Node-RED components

All five wrappers now have the same script set — TS + tsup + `node:test`, no docker, no
`node-red-node-test-helper` (which is incompatible with node-red 5):

```bash
pnpm run <package>:nodered:build      # tsup -> dist/ + copy parser.html and icons
pnpm run <package>:nodered:test       # node --test: unit + a REAL headless node-red run
pnpm run <package>:nodered:lint       # eslint
pnpm run <package>:nodered:dev        # local Node-RED on :1880 with a scratch flow
pnpm run <package>:nodered:examples   # the same, editing the SHIPPED example flow
```

⚠️ **The wrapper suites run against the library's BUILT `dist`, not its source** — build the library
first or you are testing a stale copy. And `tsx` strips types **without checking them**, so a green
suite says nothing about the types: run `npx tsc --noEmit -p tsconfig.json` inside a wrapper whenever
its library changes shape.

## Single test file

```bash
pnpm --filter @coremarine/<package> run vitest run tests/<file>.test.ts
# or
cd packages/<package> && pnpm vitest run tests/<file>.test.ts
```

## Housekeeping

```bash
./clean_monorepo.sh   # rm -rf all dist/node_modules/coverage (library packages only)
```

## CMA scratch harness (local only)

`misc/tests/` (gitignored) holds the synthetic-data generators used to design the CMA format:

- `misc/tests/sbg/generate.ts`, `sbg-to-cma.ts`, `sbg-cma-compare.ts` — the pre-1.0.0 SBG scratch
  harness, now superseded: the corpus lives in `packages/sbg-ecom/tests/fixtures/` (committed, with a
  README stating what each file must parse to) and the comparison is moot now that the library emits CMA
- `misc/tests/p08trident/` — P08-Trident FPSO simulation (NMEA @1Hz + SBG @10Hz synthetic
  logs); see its `REQUIREMENTS.md`
