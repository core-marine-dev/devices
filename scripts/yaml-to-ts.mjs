// Generate a TypeScript knowledge module from a protocol YAML file.
//
// Shared by every parser package that bundles its protocol definitions (nmea-parser,
// norsub-emru). ONE copy on purpose: the two per-package `yaml-to-json.js` scripts it
// replaces had silently diverged from the files they were supposed to generate —
// norsub's `src/norsub.ts` was hand-adapted to a typed const the generator never
// emitted, so `pnpm run norsub-emru:protocols` had in fact never regenerated it.
//
// The object is serialised as JSON and then run through the repo's OWN ESLint --fix,
// so the output is byte-identical to what `pnpm run format` would produce. That makes
// regeneration idempotent — `protocols` can run on test as well as build without ever
// dirtying a clean tree (verify with `git diff`).
//
// Usage (run from a package dir):
//   node ../../scripts/yaml-to-ts.mjs <src.yml> <dst.ts> \
//     [--name=PROTOCOLS] [--type=ProtocolsFileContent --type-from=./types]

// built-in
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

// installed
import { ESLint } from 'eslint'
// NAMED import: js-yaml 5 removed the default export.
import { load } from 'js-yaml'

const USAGE = 'usage: yaml-to-ts.mjs <src.yml> <dst.ts> [--name=NAME] [--type=Type --type-from=specifier]'

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string', default: 'PROTOCOLS' },
    type: { type: 'string' },
    'type-from': { type: 'string' },
  },
})

const [src, dst] = positionals
const { name, type, 'type-from': typeFrom } = values

if (src === undefined || dst === undefined) fail(USAGE)
if ((type === undefined) !== (typeFrom === undefined)) fail('--type and --type-from must be given together')

// A relative specifier is one of ours (// coded); anything else is a package (// installed).
const importGroup = (specifier) => specifier.startsWith('.') ? 'coded' : 'installed'

const header = type === undefined
  ? ''
  : `// ${importGroup(typeFrom)}\nimport type { ${type} } from '${typeFrom}'\n\n`
const annotation = type === undefined ? '' : `: ${type}`

const content = load(readFileSync(resolve(src), 'utf-8'))
const target = resolve(dst)
writeFileSync(target, `${header}export const ${name}${annotation} = ${JSON.stringify(content, null, 2)}\n`, { encoding: 'utf-8', flag: 'w+' })

// Reformat in place with the repo's own rules so the emitted file is house-style and
// stable across runs. Anything left unfixed is a real problem with the DATA (or the
// annotation) — surface it and fail rather than committing a file that fails `lint`.
const eslint = new ESLint({ fix: true })
const results = await eslint.lintFiles([target])
await ESLint.outputFixes(results)

if (results.some((result) => result.messages.length > 0)) {
  const formatter = await eslint.loadFormatter('stylish')
  fail(await formatter.format(results))
}

console.log(`generated ${dst} from ${src} (export const ${name}${annotation})`)
