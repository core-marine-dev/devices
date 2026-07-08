# Commands

All run from the repo root via workspace-proxy scripts in the root `package.json`.
Package names: `nmea-parser`, `norsub-emru`, `septentrio-sbf`, `sbg-ecom`, `thelmabiotel-tblive`.

## Libraries

```bash
pnpm run <package>:build           # format (ts-standard) + tsup transpile to ESM + CJS
pnpm run <package>:test            # vitest (watch mode)
pnpm run <package>:test:coverage   # vitest coverage (NOTE: sbg-ecom/septentrio use "<package>:coverage")
pnpm run <package>:lint            # ts-standard check
pnpm run <package>:format          # ts-standard --fix
pnpm run nmea-parser:protocols     # regenerate src/nmea.ts from protocols YAML (nmea-parser only)
```

## Node-RED components

```bash
pnpm run <package>:nodered:test    # mocha + node-red-node-test-helper
pnpm run <package>:nodered:docker  # launch local Node-RED docker env for manual testing
```

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

- `misc/tests/sbg/generate.ts` — generates the SBG binary corpus (`log_*.bin`, `all_logs.bin`)
- `misc/tests/sbg/sbg-to-cma.ts`, `sbg-cma-compare.ts` — legacy→CMA conversion + comparison
- `misc/tests/p08trident/` — P08-Trident FPSO simulation (NMEA @1Hz + SBG @10Hz synthetic
  logs); see its `REQUIREMENTS.md`
