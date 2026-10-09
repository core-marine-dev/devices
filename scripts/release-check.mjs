// Release check: prove every PUBLIC package works as a consumer gets it, not as the workspace sees it.
//
//   pnpm run release:check                                   → pack every public package of this repo
//   pnpm run release:check -- --registry @coremarine/x@1.2.3 … → test those versions straight from npm
//
// BUILD FIRST: it packs `dist/` as it is on disk. It works in a fresh temp folder and exits 1 on any
// failure. Why it exists: the 2026-08-01 release checked only `npm i` + one nmea-parser parse, so
// @coremarine/sbg-ecom@1.0.0 shipped a dist that imported the private, unpublished protocol-core —
// green in every workspace test (pnpm links the core there) and broken for every consumer.
//
// Stages: (1) static checks on each tarball, (2) a clean npm consumer, (3) a clean pnpm consumer (strict
// layout: catches undeclared deps npm hoisting hides), (4) in both: import() + require() + a real
// fake → parse round trip per parser, each Node-RED wrapper registers its nodes, and a consumer `tsc --strict`
// proves the parse output is not typed `any`.

// built-in
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RANGE = /^[\^~<>=*]|^workspace:|\sx\b|\|\||\s-\s|^latest$|^$/u
// Libraries ship dist/ only; Node-RED wrappers also ship their editor HTML, icons and example flows.
const ALLOWED_FILE = /^package\/(dist\/.+\.(c?js|d\.c?ts|html|png|svg)|examples\/[^/]+\.(json|ya?ml)|README\.md|LICENSE|package\.json)$/u
const failures = []
const escape = (text) => text.replaceAll(/[.*+?^${}()|[\]\\/]/gu, '\\$&')
const moduleReference = (name) => new RegExp(`(from\\s*|require\\(\\s*|import\\(\\s*|reference types=)['"]${escape(name)}(/[^'"]*)?['"]`, 'u')

const fail = (where, what) => {
  failures.push(`${where}: ${what}`)
  console.log(`  ✗ ${what}`)
}
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const readJSON = (file) => JSON.parse(readFileSync(file, 'utf8'))

const workspacePackages = (repo) => readdirSync(join(repo, 'packages')).map((dir) => {
  const manifest = readJSON(join(repo, 'packages', dir, 'package.json'))
  return { dir: join(repo, 'packages', dir), manifest, name: manifest.name, private: manifest.private === true }
})

const packAll = (repo, out) => {
  mkdirSync(out, { recursive: true })
  return workspacePackages(repo).filter((pkg) => !pkg.private).map((pkg) => {
    const before = new Set(readdirSync(out))
    run('pnpm', ['pack', '--pack-destination', out], pkg.dir)
    const tgz = readdirSync(out).find((file) => !before.has(file))
    return { name: pkg.name, tgz: join(out, tgz), version: pkg.manifest.version }
  })
}

// --prefer-online: npm's local metadata cache can lag a fresh publish by minutes, which is exactly
// when this mode runs. A version that cannot be fetched is a FAILURE to report, not a crash.
const fetchAll = (specs, out) => {
  mkdirSync(out, { recursive: true })
  return specs.flatMap((spec) => {
    try {
      const [{ filename, name, version }] = JSON.parse(run('npm', ['pack', spec, '--json', '--prefer-online', '--pack-destination', out], out))
      return [{ name, tgz: join(out, filename), version }]
    } catch (error) {
      fail(spec, `cannot be fetched from npm: ${error.stderr?.match(/npm error (?!A complete).*/u)?.[0] ?? error.message}`)
      return []
    }
  })
}

// --- (1) static: what is INSIDE the tarball -------------------------------------------------------
const checkManifest = (where, manifest, privateNames) => {
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (RANGE.test(range)) fail(where, `${field}.${dep} is "${range}" — not an exact version`)
      if (privateNames.includes(dep)) fail(where, `${field}.${dep} is a PRIVATE package`)
    }
  }
  if (Object.keys(manifest.peerDependencies ?? {}).length > 0) {
    fail(where, `has peerDependencies ${JSON.stringify(manifest.peerDependencies)} — use an exact regular dep`)
  }
}

const checkTarball = (tarball, privateNames) => {
  console.log(`· ${tarball.name}@${tarball.version}`)
  const files = run('tar', ['-tzf', tarball.tgz]).trim().split('\n')
  files.filter((file) => !ALLOWED_FILE.test(file)).forEach((file) => fail(tarball.name, `unexpected file ${file}`))
  const manifest = JSON.parse(run('tar', ['-xzOf', tarball.tgz, 'package/package.json']))
  checkManifest(tarball.name, manifest, privateNames)
  for (const file of files.filter((one) => one.startsWith('package/dist/'))) {
    const text = run('tar', ['-xzOf', tarball.tgz, file])
    // A module reference, not a mention: comments may name the core, imports may not.
    privateNames.filter((name) => moduleReference(name).test(text)).forEach((name) => fail(tarball.name, `${file} imports ${name}`))
  }
  return { ...tarball, manifest }
}

// --- (2)(3)(4) consumers --------------------------------------------------------------------------
const CONSUMER_JS = `
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { libraries, wrappers } = JSON.parse(readFileSync('./targets.json', 'utf8'))
const bad = []
const isParser = (value) => typeof value === 'function' && 'getFakeSentence' in (value.prototype ?? {})
// Only the shared DeviceParser interface is used: some parsers need a protocol to fake (tblive wants its
// version), and getSentenceDefinition() says which protocols an id has.
const firstFake = (parser) => {
  for (const id of parser.sentenceIds) {
    const definitions = parser.getSentenceDefinition(id)
    const protocols = definitions.success ? definitions.value.flatMap((one) => [one.protocol?.version, one.protocol?.name]) : []
    for (const protocol of [undefined, ...protocols]) {
      const result = parser.getFakeSentence(id, protocol)
      if (result.success) return { id, value: result.value }
    }
  }
  return undefined
}
const roundTrip = (lib, how, name) => {
  const classes = Object.entries(lib).filter(([, value]) => isParser(value))
  if (classes.length === 0) bad.push(name + ' ' + how + ': no parser class exported')
  for (const [cls, Parser] of classes) {
    const parser = new Parser()
    const fake = firstFake(parser)
    if (fake === undefined) { bad.push(name + ' ' + cls + ': no sentence could be faked'); continue }
    const { id, value } = fake
    const out = parser.parseData(value)
    const hit = out.find((one) => one.id === id && !one.errors)
    if (!hit) bad.push(name + ' ' + how + ' ' + cls + ': fake ' + id + ' did not parse back: ' + JSON.stringify(out[0]))
  }
  return classes.length
}
for (const name of libraries) {
  try { roundTrip(await import(name), 'import()', name) } catch (error) { bad.push(name + ' import(): ' + error.message) }
  try { roundTrip(require(name), 'require()', name) } catch (error) { bad.push(name + ' require(): ' + error.message) }
}
for (const { name, nodes } of wrappers) {
  const registered = []
  const RED = { nodes: { createNode: () => {}, registerType: (type) => registered.push(type) } }
  try { require(name)(RED) } catch (error) { bad.push(name + ' load: ' + error.message) }
  for (const type of nodes) if (!registered.includes(type)) bad.push(name + ': node ' + type + ' not registered')
}
console.log(JSON.stringify(bad))
`

const consumerTypes = (libraries) => libraries.map((name, index) => [
  `import * as lib${index} from '${name}'`,
  `type Out${index} = { [K in keyof typeof lib${index}]: (typeof lib${index})[K] extends abstract new (...args: never[]) => { parseData: (...args: never[]) => infer R } ? R : never }[keyof typeof lib${index}]`,
  `export const notAny${index}: IsAny<Out${index}> = false`,
  `export const names${index} = (out: Out${index}): string[] => out.flatMap((one) => one.payload.map((field) => field.name))`
].join('\n')).join('\n')

const installConsumer = (manager, dir, tarballs) => {
  rmSync(dir, { force: true, recursive: true })
  mkdirSync(dir, { recursive: true })
  const manifest = { name: 'release-check-consumer', private: true, type: 'module' }
  // pnpm resolves a dep's dep from the registry even when a tarball of it is installed alongside, so pin
  // every package under test to its tarball — otherwise pnpm would test what is ALREADY on npm.
  // pnpm 11 reads overrides from pnpm-workspace.yaml only (the package.json "pnpm" field is ignored).
  if (manager === 'pnpm') {
    const overrides = tarballs.map((one) => `  '${one.name}': 'file:${one.tgz}'`).join('\n')
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), `overrides:\n${overrides}\n`)
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest, null, 2))
  const args = [...tarballs.map((one) => one.tgz), 'typescript@6.0.3']
  if (manager === 'npm') run('npm', ['i', '--ignore-scripts', '--no-audit', '--no-fund', ...args], dir)
  else run('pnpm', ['add', '--ignore-scripts', ...args], dir)
}

const checkResolvedVersions = (manager, dir, tarballs) => {
  const tree = run(manager, ['ls', '--json', ...(manager === 'pnpm' ? ['--depth', 'Infinity'] : ['--all'])], dir)
  for (const { name, version } of tarballs) {
    const seen = new Set([...tree.matchAll(new RegExp(`"${name}":\\s*\\{[^{}]*?"version":\\s*"([^"]+)"`, 'gu'))].map((match) => match[1]))
    seen.delete(version)
    if (seen.size > 0) fail(manager, `${name} also resolved to ${[...seen].join(', ')} — not the version under test`)
  }
}

const checkConsumer = (manager, dir, tarballs) => {
  console.log(`· ${manager} consumer`)
  try {
    installConsumer(manager, dir, tarballs)
  } catch (error) {
    fail(manager, `install failed: ${error.stderr?.split('\n').slice(0, 5).join(' ') ?? error.message}`)
    return
  }
  checkResolvedVersions(manager, dir, tarballs)
  const libraries = tarballs.filter((one) => !one.manifest['node-red']).map((one) => one.name)
  const wrappers = tarballs.filter((one) => one.manifest['node-red']).map((one) => ({ name: one.name, nodes: Object.keys(one.manifest['node-red'].nodes) }))
  writeFileSync(join(dir, 'targets.json'), JSON.stringify({ libraries, wrappers }))
  writeFileSync(join(dir, 'consumer.mjs'), CONSUMER_JS)
  JSON.parse(run('node', ['consumer.mjs'], dir).trim().split('\n').at(-1)).forEach((problem) => fail(manager, problem))
  writeFileSync(join(dir, 'types.ts'), `type IsAny<T> = 0 extends (1 & T) ? true : false\n${consumerTypes(libraries)}\n`)
  try {
    run('npx', ['tsc', '--noEmit', '--strict', '--skipLibCheck', '--module', 'nodenext', '--moduleResolution', 'nodenext', 'types.ts'], dir)
  } catch (error) {
    error.stdout.trim().split('\n').forEach((line) => fail(manager, `tsc: ${line}`))
  }
}

// --- main -----------------------------------------------------------------------------------------
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const work = mkdtempSync(join(tmpdir(), 'coremarine-release-check-'))
const [flag, ...specs] = process.argv.slice(2).filter((arg) => arg !== '--')
const privateNames = workspacePackages(repo).filter((pkg) => pkg.private).map((pkg) => pkg.name)
console.log(`work dir: ${work}\nprivate (must never be imported): ${privateNames.join(', ')}\n(1) tarballs`)
const fetched = flag === '--registry' ? fetchAll(specs, join(work, 'tarballs')) : packAll(repo, join(work, 'tarballs'))
const tarballs = fetched.map((tarball) => checkTarball(tarball, privateNames))
console.log('(2)(3)(4) consumers')
checkConsumer('npm', join(work, 'npm'), tarballs)
checkConsumer('pnpm', join(work, 'pnpm'), tarballs)
console.log(failures.length === 0 ? `\n✅ ${tarballs.length} packages pass` : `\n❌ ${failures.length} failure(s)`)
process.exitCode = failures.length === 0 ? 0 : 1
