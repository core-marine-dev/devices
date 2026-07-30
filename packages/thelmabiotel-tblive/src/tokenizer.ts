// coded
import { ERROR_UNRECOGNISED, TOKENS, errorInterrupted } from './definitions'
import type { TokenSpec } from './definitions'

// SEGMENTING A FRAMELESS STREAM --------------------------------------------------------------------------------------
// TB Live has no framing: only some listening sentences self-delimit, command
// traffic has neither a start flag nor a terminator, and every response echoes
// its request byte for byte. So the only way to segment a stream is to try every
// known token at every offset and then reconcile the overlaps. Three rules do it:
//
//   1. LONGEST MATCH WINS at the same offset — `SN=` opens both a ping
//      (`SN=000745><>\r`) and a serial-number response (`SN=1000045`).
//   2. AN OPAQUE SENTENCE SWALLOWS ITS INTERIOR — the `HE?` help dump prints the
//      whole API as prose, so tokens inside it are text, not sentences.
//   3. OTHERWISE, A TOKEN STARTING INSIDE ANOTHER'S EXTENT IS INTERFERENCE — the
//      half-duplex collision. The inner sentence transmitted intact and is kept;
//      the sentence it wrecked is reported as garbage and never recomposed.

export interface Match {
  spec: TokenSpec
  start: number
  // Exclusive.
  end: number
}

export type Segment =
  | { kind: 'sentence', match: Match }
  | { kind: 'garbage', start: number, end: number, error: string }

export interface ScanResult {
  segments: Segment[]
  // Everything from here on is still streaming — never an error.
  remainder: number
}

type MatchResult =
  | { kind: 'none' }
  | { kind: 'match', end: number }
  // A token started but cannot be completed with the data available yet.
  | { kind: 'pending' }

const NONE: MatchResult = { kind: 'none' }
const PENDING: MatchResult = { kind: 'pending' }

const isDigit = (char: string): boolean => char >= '0' && char <= '9'

const digitRun = (buffer: string, from: number, max: number): number => {
  let length = 0
  while (length < max && from + length < buffer.length && isDigit(buffer[from + length])) {
    length++
  }
  return length
}

// Is this token's start flag here? A flag that runs off the end of the buffer is
// STILL ARRIVING, not junk — the device sends one character per millisecond in
// listening mode, so a sentence split inside its own start flag is routine. Treating
// that as garbage would consume the fragment and destroy the sentence.
type StartState = 'yes' | 'pending' | 'no'

const startsHere = (buffer: string, index: number, start: string): StartState => {
  if (buffer.startsWith(start, index)) return 'yes'
  return start.startsWith(buffer.slice(index)) ? 'pending' : 'no'
}

const matchLiteral = (buffer: string, index: number, spec: TokenSpec): MatchResult => {
  const state = startsHere(buffer, index, spec.start)
  if (state === 'yes') return { kind: 'match', end: index + spec.start.length }
  return (state === 'pending') ? PENDING : NONE
}

const matchDelimited = (buffer: string, index: number, spec: TokenSpec): MatchResult => {
  const state = startsHere(buffer, index, spec.start)
  if (state !== 'yes') return (state === 'pending') ? PENDING : NONE
  const end = buffer.indexOf(spec.end as string, index + spec.start.length)
  if (end === -1) return PENDING
  return { kind: 'match', end: end + (spec.end as string).length }
}

const matchDigits = (buffer: string, index: number, spec: TokenSpec): MatchResult => {
  const state = startsHere(buffer, index, spec.start)
  if (state !== 'yes') return (state === 'pending') ? PENDING : NONE
  const from = index + spec.start.length
  const run = digitRun(buffer, from, spec.maxDigits as number)
  if (run >= (spec.minDigits as number)) return { kind: 'match', end: from + run }
  // Too few digits so far: still arriving if we ran out of buffer, junk otherwise.
  return (from + run === buffer.length) ? PENDING : NONE
}

// `FV=1.0.2`, and `FV=v1.0.1` because the 1.0.1 datasheet prints both forms.
const VERSION = /^v?\d+\.\d+\.\d+/

const matchVersion = (buffer: string, index: number, spec: TokenSpec): MatchResult => {
  const state = startsHere(buffer, index, spec.start)
  if (state !== 'yes') return (state === 'pending') ? PENDING : NONE
  const from = index + spec.start.length
  const found = VERSION.exec(buffer.slice(from))
  if (found !== null) return { kind: 'match', end: from + found[0].length }
  // A partial version (`FV=1.0`) at the tail is still arriving.
  return /^v?[\d.]*$/.test(buffer.slice(from)) ? PENDING : NONE
}

const MATCHERS: Record<TokenSpec['kind'], (buffer: string, index: number, spec: TokenSpec) => MatchResult> = {
  literal: matchLiteral,
  delimited: matchDelimited,
  digits: matchDigits,
  version: matchVersion,
}

// All matches that START at `index`, longest first — rule 1.
const matchesAt = (buffer: string, index: number): { matches: Match[], pending: boolean } => {
  const matches: Match[] = []
  let pending = false
  for (const spec of TOKENS) {
    const result = MATCHERS[spec.kind](buffer, index, spec)
    if (result.kind === 'match') {
      matches.push({ spec, start: index, end: result.end })
      continue
    }
    if (result.kind === 'pending') {
      pending = true
    }
  }
  matches.sort((a, b) => b.end - a.end)
  return { matches, pending }
}

// The first offset strictly inside (start, end) at which some token begins.
// Rule 3: that token is the interference.
const firstInterference = (buffer: string, match: Match): Match | undefined => {
  for (let index = match.start + 1; index < match.end; index++) {
    const { matches } = matchesAt(buffer, index)
    if (matches.length > 0) return matches[0]
  }
  return undefined
}

// Whitespace between sentences is normal on a serial line — reporting it would be
// the very noise this model exists to avoid.
const isBlank = (text: string): boolean => text.trim().length === 0

const pushGarbage = (segments: Segment[], buffer: string, start: number, end: number, error: string): void => {
  if (start >= end) return
  if (isBlank(buffer.slice(start, end))) return
  const previous = segments.at(-1)
  // Coalesce adjacent junk so a noisy burst is one report, not a flood.
  if (previous?.kind === 'garbage' && previous.end === start && previous.error === error) {
    previous.end = end
    return
  }
  segments.push({ kind: 'garbage', start, end, error })
}

export const scanBuffer = (buffer: string): ScanResult => {
  const segments: Segment[] = []
  let index = 0
  let junkFrom = 0
  while (index < buffer.length) {
    const { matches, pending } = matchesAt(buffer, index)
    if (matches.length === 0) {
      // Nothing starts here. If a token STARTED but is incomplete, everything
      // from here on is the still-arriving tail.
      if (pending) break
      index++
      continue
    }
    const match = matches[0]
    // Rule 3 — interference. The wrecked sentence is NOT recomposed: real
    // collisions arrive as corrupted bytes, so its true extent is unknowable.
    const inner = (match.spec.opaque === true) ? undefined : firstInterference(buffer, match)
    if (inner !== undefined) {
      pushGarbage(segments, buffer, junkFrom, inner.start, errorInterrupted(inner.spec.id ?? inner.spec.token))
      index = inner.start
      junkFrom = inner.start
      continue
    }
    pushGarbage(segments, buffer, junkFrom, match.start, ERROR_UNRECOGNISED)
    segments.push({ kind: 'sentence', match })
    index = match.end
    junkFrom = index
  }
  // Junk running to the very end is reported now; only a genuinely pending token
  // is held back, because it is still streaming.
  if (index >= buffer.length) {
    pushGarbage(segments, buffer, junkFrom, buffer.length, ERROR_UNRECOGNISED)
    return { segments, remainder: buffer.length }
  }
  pushGarbage(segments, buffer, junkFrom, index, ERROR_UNRECOGNISED)
  return { segments, remainder: index }
}
