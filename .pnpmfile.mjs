// pnpm hooks for this monorepo.
//
// beforePacking: strip the private, unpublished @coremarine/protocol-core from any
// package's published manifest. It is bundled into each parser's dist via tsup
// `noExternal` (and its types inlined via tsup `dts.resolve`), so consumers never
// install it — leaving it in the manifest only dangles a reference to a package that
// isn't on npm. It stays in the workspace package.json (needed for local build).
const PRIVATE_BUNDLED = '@coremarine/protocol-core'

const beforePacking = (pkg) => {
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (pkg[field]) {
      delete pkg[field][PRIVATE_BUNDLED]
    }
  }
  return pkg
}

export const hooks = {
  beforePacking
}
