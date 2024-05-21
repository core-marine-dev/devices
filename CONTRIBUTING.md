# Contributing

The whole repository it is an opinionated monorepository:

- [NPM workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) to manage monorepo:
    - Flat learning curve
    - No depedencies, just npm
- Schema validation to guarantee runtime type checking
    - Type validation in TypeScript is only true at devtime not in runtime so it is necessary a schema validator
    - Before was [Zod](https://zod.dev/), now is [Valibot](https://valibot.dev/), then who knows
- [ts-standard](https://github.com/standard/ts-standard) as linter + formatter
    - No dealing with complicated setup
    - [StandardJS](https://standardjs.com/) as code style
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
    - Example: `@coremarine/nmea-parser` and `@coremarine/nmea-parser-ndoered`

## Create new Component

1. Create well-tested and battle tested TypeScript library.
2. Create a NodeRED wrapper / compoment which uses that library.

### How to create a TypeScript library

1. Copy the `template-library` folder inside packages and paste as a new folder
2. Look for the keyword `TODO:` in your IDE / Editor inside that folder, this is a hint to places you need to setup.
3. Setup npm package -> Modify library `package.json` (`packages/<your-library>/package.json`)
    1. `name` to `@coremarine/<your-library>`
    2. `description`
    3. `homepage`
    4. `keywords`
4. Setup npm workspaces -> Add scripts in global / monorepo `package.json`:
    1. `lint`
    2. `format`
    3. `build`
    4. `test`
    5. `test:coverage`
5. Setup CI/CD (Github Actions)
    1. Go to `.github/workflows` folder
    2. Copy `template-library.yml` file and paste as a new yml file `<your-library>.yml`
    3. Change all TODO:
6. Document your library -> Modify `README.md` (`packages/<your-library>/README.md`)
7. Start with your library by coding in `src` and testing in `tests`

### How to create a NodeRED component

1. Copy the `template-nodered` folder inside packages and paste as a new folder ending with `-nodered` -> `packages/<your-library>-nodered`
2. Look for the keyword `TODO:` in your IDE / Editor inside that folder, this is a hint to places you need to setup.
3. Setup npm package -> Modify library `package.json` (`packages/<your-library>/package.json`)
    1. `name` to `@coremarine/<your-library>`
    2. `description`
    3. `homepage`
    4. `keywords`
    5. `node-red.nodes.cma-<your-component>`
    6. `dependencies.@coremarine/<your-library>`
4. Setup npm workspaces -> Add scripts in global / monorepo `package.json`:
    1. `nodered:docker`
    2. `nodered:test`
5. Setup CI/CD (Github Actions)
    1. Go to `.github/workflows` folder
    2. Copy `template-nodered.yml` file and paste as a new yml file `<your-library>-nodered.yml`
    3. Change all TODO:
6. Document your library -> Modify `README.md` (`packages/<your-library>-nodered/README.md`)
7. Add component dependencies to package `Dockerfile` file
8. Rename project into package `docker-compose.yml` file
9. Start with your library by coding in `src` and testing in `tests` and seeing results with docker (all files there has a minimal scaffolding to start working on it).
