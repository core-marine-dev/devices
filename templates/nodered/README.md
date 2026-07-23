# TODO:-nodered

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/TODO:-nodered)
[![publish](https://github.com/core-marine-dev/devices/actions/workflows/TODO:-nodered.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/TODO:-nodered.yml)
![npm](https://img.shields.io/npm/dy/%40coremarine/TODO:-nodered)

> **Template.** Node-RED wrapper scaffold. Replace every `TODO:` and see
> [`CONTRIBUTING.md`](../../CONTRIBUTING.md) → *How to create a NodeRED component*. The finished
> reference is [`packages/nmea-parser-nodered`](../../packages/nmea-parser-nodered).

TODO: one-line description. A Node-RED wrapper of
[`@coremarine/TODO:`](https://www.npmjs.com/package/@coremarine/TODO:).

## Structure

- `src/parser.ts` — thin Node-RED adapter (`RED.nodes.createNode` / `registerType`, `on('input')`).
- `src/lib.ts` — pure, node-red-free message handlers (unit-testable). Keep only what your parser supports.
- `src/parser.html` — editor UI + help.
- Built with **tsup** to `dist/` (CJS); `parser.html` + icons copied alongside.

## Input / Output

The node reads `msg.payload` (protocol input) and writes the parsed **CMA[]** back to `msg.payload`.
`msg.memory` (get/set) is supported by every parser; document any protocol-specific properties
(e.g. NMEA's `protocols`/`sentence`/`fake`) that your `src/lib.ts` implements.

## Development

```bash
pnpm run TODO::nodered:build      # tsup -> dist/ + copy html/icons
pnpm run TODO::nodered:test       # node:test — unit (src/lib) + integration (real node-red)
pnpm run TODO::nodered:dev        # local Node-RED, edit a scratch flow (tests/dev.flows.json)
pnpm run TODO::nodered:examples   # local Node-RED, edit the SHIPPED example (examples/*.json)
```

Tests use **`node:test`** (via `tsx`). The integration test boots a real headless Node-RED through
its public API and runs a flow through the node — no `node-red-node-test-helper` (incompatible with
Node-RED 5).

**`:dev` and `:examples`** launch a local Node-RED (devDependency, no docker; welcome tour off) at
http://localhost:1880 with only this node in the palette. Node-RED reads/writes the on-disk flow file
directly, so editor edits persist: `:dev` -> tracked scratch `tests/dev.flows.json`;
`:examples` -> the committed, published example in `examples/` (shipped via `files`,
appears in Node-RED's *Import → Examples*; set `EXAMPLE=<file>` to pick one). Examples live in
`examples/`, **not** `dist/`.
