# NMEA-Parser-NodeRED

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/nmea-parser-nodered)
[![publish](https://github.com/core-marine-dev/devices/actions/workflows/nmea-parser-nodered.yml/badge.svg)](https://github.com/core-marine-dev/devices/actions/workflows/nmea-parser-nodered.yml)
![npm](https://img.shields.io/npm/dy/%40coremarine/nmea-parser-nodered)

Node-Red component to read NMEA 0183 sentences. It is a wrapper of [@coremarine/nmea-parser](https://www.npmjs.com/package/@coremarine/nmea-parser) (check it docs).

## Input

NMEA component uses 5 properties to work:

- `payload` is the main property with NMEA content.
- `protocols`, `sentence`, `memory` and `fake` are optionals.

| Input property         | Description                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------- |
| `payload` (string)     | NMEA ASCII content (important, it is an *ASCII* string, not other encoding).           |
| *`memory`* (object)    | Object to check or enabled / disabled parser memory state (look details below).        |
| *`protocols`* (object) | Object to get or set the protocols supported and their sentences (look details below). |
| *`sentence`* (string)  | Sentence ID to get if it is supported and its info (look details below).               |
| *`fake`* (string)      | Sentence ID to get a full fake NMEA-like sentence if it is supported.                  |

## Output

Each input proerty would be responded in the same output property

| Output property        | Description                                                                                                                    |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| payload (array)        | The parsing output of the CoreMarine NMEA Parser — an array of **CMA** objects (the unified CoreMarine output format), one per NMEA sentence. |
| *`memory`* (object)    | Response to the *memory* input (look details below).                                                                           |
| *`protocols`* (object) | Response to the *protocols* input (look details below).                                                                        |
| *`sentence`* (string)  | Response to the *sentence* input (look details below).                                                                         |
| *`fake`* (string)      | Response to the *fake* input (look details below).                                                                             |

## Details

NMEA parser translate NMEA ASCII string data into a JavaScript objects (one for each
NMEA 0183 sentence). Each time it receives data from payload input, it gives the parsed sentences to payload output.

It just a wrapper of the npm library [@coremarine/nmea-parser](https://www.npmjs.com/package/@coremarine/nmea-parser) (take a look on it).

To interact with the *memory* | *protocols* | *sentence* API is through the `memory` | `protocols` | `sentence` property:

- If you request something in `msg.memory` | `msg.protocols` | `msg.sentence` input
- The response will be in `msg.memory` | `msg.protocols` | `msg.sentence` output

### Memory

It is enabled by default:

- memory enabled: Every time you inject data, it's attached to the internal data.
- memory disabled: Every time you inject data, it clears internal data and add new one.

Internally it has a buffer with a max number of characters

|                          Input                           |                            Output                             |
| :------------------------------------------------------: | :-----------------------------------------------------------: |
| `memory`: { `command`: `"set"`, `payload`: **boolean** } | `memory`: { `memory`: **boolean**, `characters`: **number** } |
|             `memory`: { `command`: `"get"` }             | `memory`: { `memory`: **boolean**, `characters`: **number** } |

### Protocols

The parser can be fed or expanded to understand more NMEA sentences, standard or proprietary.
To do that, send an object with `command` equal to `"set"` and **one** of:

1. `content`: the YAML **string** of the protocols definitions.
2. `file`: a **string** file path to the protocols YAML file (read by the node).

If both are sent, `content` takes precedence over `file`. On error (invalid YAML/schema or unreadable file) the `protocols` output is an error **string**.

If you just want to know the known / supported sentences, use the command `get`.

|                           Input                            |         Output          |
| :--------------------------------------------------------: | :---------------------: |
| `protocols`: { `command`: `"set"`, `content`: **string** } | `protocols`: **object** |
|  `protocols`: { `command`: `"set"`, `file`: **string** }   | `protocols`: **object** |
|            `protocols`: { `command`: `"get"` }             | `protocols`: **object** |

### Sentence

If you want to know if a sentence is known / supported, you need to send the sentence id.
Response will be an `object` with the whole info or `null` if it's unknown / not supported yet.

|         Input          |              Output              |
| :--------------------: | :------------------------------: |
| `sentence`: **string** | `sentence`: **object** \| `null` |

### Fake

If you want to get a NMEA-like sentence, maybe just to do some tests, you need to send the sentence id.
Response will be a `string` with the whole ASCII sentence or `null` if it's unknown / not supported yet.
This fake sentence is correct in terms of NMEA requirements but each field has garbage.

|       Input        |            Output            |
| :----------------: | :--------------------------: |
| `fake`: **string** | `fake`: **string** \| `null` |

## Development

The node is authored in **TypeScript** and bundled to CommonJS (Node-RED loads nodes via
`require`) with **tsup**; `parser.html` + icons are copied into `dist/` alongside the JS.
The logic lives in a node-red-free module (`src/lib.ts`) with a thin RED adapter
(`src/parser.ts`), so the bulk is unit-testable without Node-RED.

```bash
pnpm run nmea-parser:nodered:build      # tsup -> dist/ + copy html/icons
pnpm run nmea-parser:nodered:test       # node:test — unit (src/lib) + integration (real node-red)
pnpm run nmea-parser:nodered:dev        # local Node-RED, edit a scratch flow (tests/dev.flows.json)
pnpm run nmea-parser:nodered:examples   # local Node-RED, edit the SHIPPED example (examples/*.json)
```

Tests use **`node:test`** (via `tsx`). The integration test boots a real headless Node-RED
through its public API and runs a flow through the node — no `node-red-node-test-helper`
(incompatible with Node-RED 5).

**`:dev` and `:examples`** launch a local Node-RED (a devDependency, no docker; welcome tour off) at
http://localhost:1880 with this node under the **CoreMarine** palette category, pinned first. (In the
monorepo dev instance the sibling `@coremarine/*-nodered` nodes also appear under CoreMarine — a
shared-workspace artifact, harmless; an end user who installs just this package never sees them.)
Node-RED reads/writes the on-disk flow file directly, so edits you make in the editor persist:

- **`:dev`** edits `tests/dev.flows.json` — a **committed** scratch flow (`inject → cma-nmea-parser →
  debug`) for quick manual checks; edit it freely.
- **`:examples`** edits the **committed, published** example under `examples/` (the flow-library
  requires examples; they're shipped via `files` and appear in Node-RED's *Import → Examples*). Set
  `EXAMPLE=<file>` to target a specific one. Examples live in `examples/`, **not** `dist/`.
