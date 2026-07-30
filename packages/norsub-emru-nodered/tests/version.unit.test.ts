// built-in
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// THE WRAPPER AND ITS LIBRARY SHARE A MAJOR, ON PURPOSE.
//
// A library major is inherently breaking for its wrapper — the wrapper's whole job is
// emitting the library's output — so the wrapper has to go major anyway. Locking the
// two means you can read the generation straight off the version:
// `@coremarine/norsub-emru-nodered@N.x` wraps `@coremarine/norsub-emru@N.x`.
//
// Minors stay independent: an additive library release often needs no wrapper change,
// and a wrapper-only feature should not drag the library into a pointless release.
//
// The MECHANISM is the `workspace:^` dependency, which pnpm packs as `^<library
// version>` — resolving to that major and never the next one. `latest` or `*` would
// break exactly this, letting a wrapper at N.x pull a library at (N+1).x.
//
// This test is the guard: bump one major without the other and it fails here.

const here = dirname(fileURLToPath(import.meta.url))
const read = (path: string): Record<string, string | Record<string, string>> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, string | Record<string, string>>

const LIBRARY = '@coremarine/norsub-emru'
const wrapper = read(join(here, '..', 'package.json'))
const library = read(join(here, '..', '..', 'norsub-emru', 'package.json'))

const major = (version: string): string => version.split('.')[0]

describe('wrapper / library version correlation', () => {
  test('the majors match', () => {
    const wrapperVersion = wrapper.version as string
    const libraryVersion = library.version as string
    assert.equal(
      major(wrapperVersion),
      major(libraryVersion),
      `wrapper ${wrapperVersion} and library ${libraryVersion} must share a major`,
    )
  })

  test('the dependency is declared `workspace:^`, which is what enforces it once packed', () => {
    const dependencies = wrapper.dependencies as Record<string, string>
    assert.equal(dependencies[LIBRARY], 'workspace:^')
  })

  test('the library is the one this wrapper claims to wrap', () => {
    assert.equal(library.name, LIBRARY)
  })
})
