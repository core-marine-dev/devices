// built-in
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// The committed capture corpus. Every frame in these three files was CRC-checked
// before it was committed, and tests/fixtures/README.md states exactly what each one
// must parse to — that file is the authority, these are the bytes.
export const capture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join(HERE, 'fixtures', name)))

export const STREAM_MIXED = 'stream-mixed.bin'
export const STREAM_LOSSY = 'stream-lossy.bin'
export const STREAM_LOGS = 'stream-logs.bin'
