# Contributing

The whole repository it is an opinionated monorepository:

- [pnpm workspaces](https://pnpm.io/workspaces) to manage monorepo:
    - Fast, disk-efficient, strict node_modules isolation
    - Supply-chain hardened: dependency build scripts denied by default (`strictDepBuilds`
      + `allowBuilds` in `pnpm-workspace.yaml`)
- Schema validation to guarantee runtime type checking
    - Type validation in TypeScript is only true at devtime not in runtime so it is necessary a schema validator
    - Before was [Zod](https://zod.dev/), now is [Valibot](https://valibot.dev/), then who knows
- [ESLint](https://eslint.org/) (flat config) as linter + formatter with 4 plugins:
    - No dealing with complicated setup
    - [StandardJS](https://standardjs.com/) as code style (via `@stylistic`)
    - [SonarLint](https://github.com/SonarSource/eslint-plugin-sonarjs) rules for code quality
    - [Perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for import ordering
- [Vitest](https://vitest.dev/) as test suite
    - Faster
    - Quite easy to setup
- [tsup](https://tsup.egoist.dev/) as build layer on top of tsc
    - Transpile to ESM + CJS
    - Quite easy to setup
- Naming has some rules:
    - All packages are published with scope `@coremarine`
    - The library is called typically as `<manufacturer>-<protocol>` or something like that
    - The NodeRED component is called the same as the library with `-nodered` ending
    - Example: `@coremarine/nmea-parser` and `@coremarine/nmea-parser-nodered`

## Create new Component

1. Create well-tested and battle tested TypeScript library.
2. Create a NodeRED wrapper / compoment which uses that library.

Always you have to create a custom branch and make pull requests to `dev` branch. Once the branch is merged, you should remove it.

New packages will be publish when a pull request into `main` branch is accepted.

### How to create a TypeScript library

1. Copy the `library` folder inside `templates` and paste as a new folder inside `packages` -> `packages/<your-library>`
2. Look for the keyword `TODO:` in your IDE / Editor inside that folder, this is a hint to places you need to setup.
3. Setup pnpm package -> Modify library `package.json` (`packages/<your-library>/package.json`)
    1. `name` to `@coremarine/<your-library>`
    2. `description`
    3. `homepage`
    4. `keywords`
4. Setup pnpm workspaces -> Add scripts in global / monorepo `package.json`:
    1. `lint`
    2. `format`
    3. `build`
    4. `test`
    5. `test:coverage`
5. Setup CI/CD (Github Actions)
    1. Copy `library.yml` file inside `templates` and paste as a new yml file `<your-library>.yml` inside `.github/workflows` folder
    2. Change all TODO:
6. Document your library -> Modify `README.md` (`packages/<your-library>/README.md`)
7. Start with your library by coding in `src` and testing in `tests`
8. Link your new library in the global / monorepo README

### How to create a NodeRED component

The reference implementation is [`packages/nmea-parser-nodered`](packages/nmea-parser-nodered) —
copy patterns from it. The node is authored in **TypeScript**, bundled to **CJS with tsup**
(node-red loads via `require`), split into a node-red-free `src/lib.ts` (unit-testable) + a thin
`src/parser.ts` adapter, and tested with **`node:test`** (no `node-red-node-test-helper` — it is
incompatible with node-red 5).

1. Copy the `nodered` folder inside `templates` as a new folder ending in `-nodered` inside
   `packages` -> `packages/<your-library>-nodered`.
2. Look for the keyword `TODO:` throughout that folder — each marks something to set up.
3. `package.json`: set `name` (`@coremarine/<your-library>-nodered`), `description`, `homepage`,
   `keywords`, `node-red.nodes.cma-<your-component>` (-> `dist/parser.js`), and
   `dependencies.@coremarine/<your-library>: workspace:^`.
4. Add proxy scripts to the monorepo `package.json`: `<your-library>:nodered:build`,
   `<your-library>:nodered:test`, `<your-library>:nodered:dev`, `<your-library>:nodered:examples`,
   `<your-library>:nodered:ci:local`.
5. CI/CD: copy `templates/nodered.yml` to `.github/workflows/<your-library>-nodered.yml` and
   replace every `TODO:` (incl. the "Build monorepo deps" step — build the wrapped library and any
   private deps it bundles).
6. Code in `src/` (start from `lib.ts` + `parser.ts`), test in `tests/` (`node:test`: `*.unit.test.ts`
   + the real-node-red `*.integration.test.ts`). Keep only the msg handlers your parser supports.
7. See it live (no docker): `pnpm run <your-library>:nodered:dev` -> http://localhost:1880 (edits a
   tracked scratch flow `tests/dev.flows.json`). Author the shipped **example flows** the same way
   with `pnpm run <your-library>:nodered:examples` — the flow-library requires an `examples/` dir; it
   is shipped via `files` and shows under Node-RED's *Import → Examples*. Examples live in `examples/`,
   never `dist/`.
8. Document `README.md`, then link the new component in the monorepo README.
