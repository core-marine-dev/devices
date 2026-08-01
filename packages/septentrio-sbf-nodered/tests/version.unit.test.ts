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
// `@coremarine/septentrio-sbf-nodered@N.x` wraps `@coremarine/septentrio-sbf@N.x`.
//
// Minors stay independent: an additive library release often needs no wrapper change,
// and a wrapper-only feature should not drag the library into a pointless release.
//
// The MECHANISM is the `workspace:^` dependency, which pnpm packs as `^<library
// version>` — resolving to that major and never the next one. `latest` or `*` would
// break exactly this, letting a wrapper at N.x pull a library at (N+1).x.
//
// THIS GUARD IS NOT THEORETICAL HERE. This wrapper spent the whole 2.0.0 library
// refactor sitting at 1.0.1 while its `workspace:^` dep quietly began resolving to
// `^2.0.0` — so a release would have shipped a wrapper calling `getFrames()`, an API
// 2.0.0 removed, against the very library that removed it. Nothing caught it, because
// this file did not exist and the CI test job was disabled. Both are fixed; this test is
// what keeps the pair honest from now on.

const here = dirname(fileURLToPath(import.meta.url))
const read = (path: string): Record<string, string | Record<string, string>> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, string | Record<string, string>>

const LIBRARY = '@coremarine/septentrio-sbf'
const wrapper = read(join(here, '..', 'package.json'))
const library = read(join(here, '..', '..', 'septentrio-sbf', 'package.json'))

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

  // The node type is what deployed flows reference by name. Renaming it would make the
  // node vanish from every flow already in production, so it is pinned here rather than
  // left to a future tidy-up.
  test('the node type is unchanged from 1.x, so deployed flows survive', () => {
    const nodeRed = wrapper['node-red'] as unknown as { nodes: Record<string, string> }
    assert.deepEqual(Object.keys(nodeRed.nodes), ['cma-septentrio-parser'])
    assert.equal(nodeRed.nodes['cma-septentrio-parser'], 'dist/parser.js')
  })

  // node-red writes `<flowfile>_cred.json` and a hidden `.<flowfile>.backup` next to any
  // flow it opens — including the SHIPPED example flow, whenever anyone runs the dev
  // server against it. `files` OVERRIDES .gitignore when packing, so a gitignore rule
  // alone does not stop them being published. This has bitten the repo three times.
  test('the packing exclusions for node-red runtime artefacts are declared', () => {
    const files = wrapper.files as unknown as string[]
    assert.ok(files.includes('!**/*.backup'), 'node-red backup files are excluded from the tarball')
    assert.ok(files.includes('!**/*_cred.json'), 'node-red credential files are excluded from the tarball')
  })
})
