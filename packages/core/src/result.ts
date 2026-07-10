// Result<T, E> — no-exceptions-as-control-flow (mirrors the Tracker repo).
// Parsers never throw for expected failures: a function that can fail returns
// a Result instead. Bare object literals by design — no ok()/err() helpers.
export type Result<T, E> =
  | { success: true, value: T }
  | { success: false, error: E }
