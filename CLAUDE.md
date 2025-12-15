# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the CoreMarine devices monorepo - a collection of open source TypeScript libraries for parsing marine/IoT device protocols and their corresponding Node-RED wrappers. It uses NPM workspaces.

All of them are inside `packages` folder.

`templates` is just a folder with some blurred guidelines of how to do it the TS libray and then its Node-RED component / wrapper.

`todo` is a folder just a reminder about what to do next.

**Curent state**: Deep refactor in progress -> The idea is that all the parser libraries from now on gives the same output format (CMA format) independent of the protocol it parses.

## CMA Format

It is not completely defined but the goal is to have the same structure of a JSON which gives information about which protocol and which data contains.

A first draft of this format:

```typescript
type CMA = {
  timestamp: Timestamp,
  raw: Raw,
  protocol: Protocol,
  id: ID,
  payload: Field[],
  errors?: Error[],
  metadata?: Metadata,
  description?: string,
}

type Timestamp = number | string // Unix Epoch in millis or ISO String UTC format
type Raw = string // UTF-8 or ASCII for text protocols or Base64 for binary protocols
type Protocol = {
  name: string,
  version?: string
} & Record<string, any>
type Field = {
  raw: Raw,
  name: string,
  type: 'bool' | 'char' | 'string' | 'int8'  | ... |  'int64' | 'uint8' | ... | 'uint64' | 'float32' | 'float64',
  value: boolean | string | number | null,
  units?: string,
  description?: string,
  errors?: Error[],
  metadata?: Metadata
}
type Error = string // For now on is just an string but it could be an object in the future
type Metada = Record<string, any>
```

All the data sources / hardware devices just gives sentences in a raw format (NMEA, propietary binary / text), so its parser gives and agnostic output just telling which sentence is parsed and what is its information (payload mainly).
Payload is an array instead of an object because as a user I can go to the protocol definition and know what is the order of the fields but the name could be a problematic convention to define (what name, what case, etc).

## Commands

### Working with a specific package

All commands are run from the repository root using npm workspace scripts:

```bash
# Build a library (formats code first, then transpiles to ESM + CJS)
npm run <package-name>:build
# Example: npm run nmea-parser:build

# Run tests (runs vitest in watch mode)
npm run <package-name>:test
# Example: npm run septentrio-sbf:test

# Run tests with coverage
npm run <package-name>:test:coverage

# Lint check
npm run <package-name>:lint

# Format code (auto-fix linting)
npm run <package-name>:format

# Run Node-RED component tests (uses mocha)
npm run <package-name>:nodered:test

# Launch Node-RED docker environment for manual testing
npm run <package-name>:nodered:docker
```

Package names: `nmea-parser`, `norsub-emru`, `septentrio-sbf`, `sbg-ecom`, `thelmabiotel-tblive`

### Running a single test file

```bash
# Using npm from root with workspace flag
npm run <package-name>:test <file or pattern>

# Using npx from root with workspace flag
npm run --workspace=@coremarine/<package-name> vitest run tests/<test-file>.test.ts


# Or cd into the package and run directly
cd packages/<package-name>
npx vitest run tests/<specific-test>.test.ts
```

## Architecture

### Package Structure

Each device has two packages:

1. **TypeScript library** (`packages/<device>`) - Core parsing logic, transpiled to ESM + CJS but the focus is on ESM estandard
2. **Node-RED component** (`packages/<device>-nodered`) - Wrapper using the CJS library

### Library Internal Structure

Libraries follow a consistent pattern:

- `src/index.ts` - Public exports
- `src/parser.ts` - Main Parser class
- `src/schemas.ts` - Valibot schemas for runtime type validation
- `src/types.ts` - TypeScript type definitions
- `src/constants.ts` - Protocol constants
- `tests/` - Vitest test files

### Node-RED Component Structure

- `src/parser.js` - Node implementation
- `src/parser.html` - Node-RED editor UI
- `src/icons/` - Component icons
- `tests/nodered/` - Docker-based test environment
- `docker-compose.yml` + `Dockerfile` - Local Node-RED testing setup

## Tech Stack

- **Build**: tsup (ESM + CJS dual output)
- **Testing**: Vitest (libraries), Mocha + node-red-node-test-helper (Node-RED components)
- **Linting/Formatting**: ts-standard (StandardJS style)
- **Schema Validation**: Valibot (runtime type checking)
- **Node requirement**: >= 18

If we had a whislist, some goals would be:

- Runtime agnostic -> to run in browser, node, deno, bun, etc or at least in node-deno-bun (browser is not the main target but it would be nice)
- Type / Schema validation agnostic -> At this moment it is used mainly Valibot but it would be nice to be able to change for another without deep refactor. For that purpose one dev (the main contributor of this repo) create a side project called SchemasJS with custom schemas and a Validator (a Schema validator wrapper for Valibot and Zod) -> [SchemasJS](https://github.com/crisconru/schemasjs)

## Creating New Packages

It is not fully documented, this is just an starting point but:

Use templates from `templates/` folder. See CONTRIBUTING.md for detailed steps. Look for `TODO:` markers in template files for required customizations.

## Git Workflow

- Create branches from `dev`
- PRs go to `dev` branch
- Packages publish when PRs merge to `main`
