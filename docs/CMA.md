# CMA format

**Goal of the ongoing deep refactor:** every parser library emits the same JSON structure —
the CMA format — no matter which protocol it parses. Consumers (Tracker) then handle one shape.

## Current draft (authoritative)

**This section is the draft of record** (originally sketched in the local scratch harness
`misc/tests/cma.ts`; `misc/` is gitignored, so this doc is the committed source of truth).
It supersedes older sketches (previous AGENTS.md inline draft, the frame-model draft now in
`misc/archive/`):

```typescript
type Timestamp = number   // Unix epoch in milliseconds
type Base64 = string

interface Protocol { name: string, version: string }

type Type = 'char' | 'string' | 'boolean'
          | 'int8' | 'int16' | 'int32' | 'int64'
          | 'uint8' | 'uint16' | 'uint32' | 'uint64'
          | 'float32' | 'float64'

type Errors = string[]
type Metadata = Record<string, unknown>   // FIELD-level metadata (payload[i].metadata) — free-form

// Sentence-level timestamp metadata (cma.metadata.timestamp) — common to EVERY parser.
interface TimestampMetadata {
  received: Timestamp    // when the input reached the parser (the addData call). Core-stamped.
  parsed: Timestamp      // when the sentence was decoded (=== cma.timestamp). Core-stamped.
  sentence?: Timestamp   // OPTIONAL: the sentence's own time if it carries one (NMEA GGA, SBF TOW+WNc). Protocol-supplied.
}
// Sentence-level metadata (cma.metadata) — a LOOSE object: the typed `timestamp`
// block is always present; other keys (checksum, talker, crc, payload aggregates…) are free-form.
type SentenceMetadata = { timestamp: TimestampMetadata } & Record<string, unknown>

interface Field {
  raw: string | Base64      // this field's raw slice (Base64 for binary protocols)
  name: string
  type: Type
  value: string | number | boolean | null   // null = present but empty (e.g. NMEA); int64/uint64 ride as decimal string
  units?: string
  description?: string
  errors?: Errors
  metadata?: Metadata
}

interface CMA {
  raw: string | Base64      // whole frame: UTF-8/ASCII for text protocols, Base64 for binary
  timestamp: Timestamp      // decode time (=== metadata.timestamp.parsed)
  id: string                // sentence/frame identifier, e.g. 'GGA', 'SBG_ECOM_LOG_DEPTH'
  protocol: Protocol        // e.g. { name: 'sbgECom', version: '2.3' }
  payload: Field[]
  metadata: SentenceMetadata  // ALWAYS present: the timestamp block + protocol extras (checksum, talker, crc…)
  errors?: Errors
  description?: string
}
```

## Design rationale

- **`payload` is an array, not an object** — field ORDER is defined by the protocol spec, while
  field NAMES would force a naming convention (which name? which case?). Users can map by order
  against the protocol definition.
- **`raw` at both levels** — full traceability from any parsed value back to its exact bytes.
- **Errors as `string[]`** for now; could become objects later.

## Locked decisions (2026-07-09, cru)

The draft above is the **definitive format**. The previously-open questions are settled:

- **`timestamp`: epoch ms only** — no ISO string variant.
- **`protocol` is closed and `version` is required** — no `& Record<string, any>`; per-protocol
  extras go in `metadata`, never as extra top-level keys.
- **`thelmabiotel-tblive`'s `mode`/`firmware`** must move into `metadata` (they are not
  top-level keys) — alignment happens when tblive is refactored in the rollout.
- **`Type` uses `boolean`**, not `bool`.
- **Field `value` is `string | number | boolean | null`** (2026-07-09, cru): `null` represents a
  field that is present but empty (pervasive in NMEA). **No `bigint`** — 64-bit integers
  (`int64`/`uint64`) are carried as **decimal strings** so the whole shape stays
  JSON-serializable. (No current protocol actually uses 64-bit integers; the type tags remain
  for completeness.)
- **Per-`Type` value validators live in core** —
  [`packages/core/src/schemas.ts`](../packages/core/src/schemas.ts) exports one validator per
  `Type` (`CharSchema`, `StringSchema`, `Uint8Schema`…`Float64Schema`, `Int64Schema`/`Uint64Schema`
  as strings) plus a `TYPE_SCHEMAS: Record<Type, Schema<Value>>` lookup so every parser validates
  field values the same way. Numerics reuse `@schemasjs/valibot-numbers`.
- **Terminology: "sentence", not "frame"** — a unit of input data is a *sentence* (NMEA
  sentences, Norsub sentences, …). Code and docs use `sentence` throughout.

The canonical schema + inferred types now live in code:
[`packages/core/src/cma.ts`](../packages/core/src/cma.ts) — every parser
imports `CMA`/`CMASchema` from `@coremarine/protocol-core` rather than re-declaring them.

## Metadata levels (LOCKED 2026-07-10, cru)

Metadata exists at three levels. Field and payload metadata are free-form `Record<string,
unknown>`; sentence metadata (`cma.metadata`) is a **loose** object — a typed, always-present
`timestamp` block plus free-form extras. This applies to every parser, not just NMEA.

| Level | Where | Contents | When |
| --- | --- | --- | --- |
| **Sentence** | `cma.metadata` | `timestamp` (always — see below), plus protocol-level facts: `checksum`, `talker` (optional), crc, class… | every sentence |
| **Field** | `cma.payload[i].metadata` | a **single** field decoded into a richer form / converted units | known sentences, on demand |
| **Payload** | `cma.metadata.payload` (flat) | a value **aggregated from ≥2 fields** (e.g. GGA lat/long in decimal degrees) | known sentences, on demand |

- **Mandatory output is the fields' `value`**; field/payload metadata is a nice-to-have added
  deliberately by devs.
- Field/payload metadata is produced by **dev-authored aggregators registered by `id + payload
  length`** (the stable identity) that read fields **by index** — field *names* are unofficial and
  may change, so they are never used as keys. See [`docs/NMEA.md`](NMEA.md) for the
  `MetadataAggregator` contract + "How to add an aggregator" recipe (nmea-parser is the reference).

### Timestamp metadata (LOCKED 2026-07-13, cru)

`cma.metadata.timestamp` is present on **every** emitted sentence, for every parser, and holds
up to three epoch-ms timings (`TimestampMetadata` above):

- **`received`** (required) — when the input reached the parser: the `Date.now()` of the `addData`
  call that completed the sentence. Because `addData` parses immediately, `received` and `parsed`
  sit microseconds apart in the happy path — a visible gap is a built-in "the pipeline is lagging"
  signal.
- **`parsed`** (required) — when the sentence was decoded. Equals the top-level `cma.timestamp`.
- **`sentence`** (optional) — the sentence's own time, only when the protocol carries one (NMEA:
  GGA's UTC; Septentrio SBF: TOW + WNc, for every sentence). Absent otherwise.

**Ownership:** the shared core base owns `received`/`parsed` — it stamps them for every parser in
`addData`, which is the *only* place a `CMA` gains its timestamp. A protocol supplies the optional
`sentence` value through the `protected sentenceTimestamp(sentence)` hook (default: none). To keep
the CMA type the single source of truth without a placeholder, `extractSentences` returns a
`DraftCMA` (a `CMA` minus its metadata timestamp) that the core turns into a `CMA` — so the
required-`timestamp` contract can never be violated by a protocol. nmea-parser overrides the hook
to promote a field-level timestamp (GGA) up to `metadata.timestamp.sentence`.

## Result pattern (LOCKED 2026-07-10, cru)

Parsers **never throw**. `Result<T,E> = { success: true, value: T } | { success: false, error: E }`
lives in `@coremarine/protocol-core` and is shared by all parsers (ported from the Tracker repo:
bare literals, structured `{ kind, message }` errors, `await p.then(ok).catch(err)` + early-return
chaining; `try/catch` nested only where strictly necessary, never propagated). Any function that
threw before the refactor returns a `Result` after it.

## Reference material

- `misc/tests/sbg/` (local, gitignored) — SBG binary corpus + `sbg-to-cma.ts` /
  `sbg-cma-compare.ts` (legacy output vs target CMA output, side by side).
- `misc/archive/sbg2cma-comparison-dump.txt` (local) — captured comparison dump per SBG log type.
- [SBG-REPORT.md](SBG-REPORT.md) — what sbg-ecom's legacy output looks like today.

## Conformance state (2026-07)

| Library | Output today |
| --- | --- |
| thelmabiotel-tblive | **CMA-shaped** (+extra `mode`/`firmware` top-level keys) |
| nmea-parser | legacy `NMEASentence` (`received`/`sample` instead of `timestamp`/`raw`) |
| norsub-emru | inherits nmea-parser legacy shape |
| septentrio-sbf | legacy `SBFResponse` (frame header/time/body) |
| sbg-ecom | legacy `SBGFrameResponse` (frame header/data/footer) |
