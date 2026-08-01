// Deterministic value generation for FAKE sentences.
//
// A fake sentence exists to be committed: into a spec, into a Node-RED example
// flow, into a bug report. So with no options it must be IDEMPOTENT — the same
// call returns the same bytes forever — otherwise a fixture drifts between runs
// and a diff becomes unreadable. Randomness is opt-in (`{ random: true }`) for
// the cases where you want to hammer a decoder with varied input.
//
// This lives in core because two parsers need the SAME numbers from the same
// seed: nmea-parser (text fields) and septentrio-sbf (binary fields).

// A 32-bit hash of a string (FNV-1a). Stable across runtimes — no `hashCode`
// quirks, no dependency on object key order.
export const hashSeed = (text: string): number => {
  let hash = 0x811C9DC5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    // 16777619, as 32-bit multiply via shifts to stay in integer range.
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

// mulberry32: a tiny, well-distributed PRNG. Given a seed it always yields the
// same sequence, which is the whole point — `seeded(hashSeed('GGA:3'))` is a
// stable "random-looking" number for field 3 of a GGA.
export const seeded = (seed: number): () => number => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

// The generator a fake-sentence builder should use: seeded from a label (so it
// is reproducible per sentence and per field), or genuinely random when the
// caller asks for it.
export const generator = (label: string, random = false): () => number =>
  random ? Math.random : seeded(hashSeed(label))
