// Default maximum characters kept in a string parser's buffer. Protocol
// parsers may override via the constructor `bufferLimit` option or by
// overriding the `defaultBufferLimit` getter.
export const MAX_CHARACTERS = 1024

// Default maximum bytes kept in a binary parser's buffer.
export const MAX_BYTES = 1024

// The value every mandatory CMA string takes when it could not be determined.
// Used for undecodable input: the CMA contract has no optional `id` or
// `protocol`, so a garbage sentence fills them with this instead of being
// dropped. See `GarbageSentence` in types.ts.
export const UNKNOWN = 'unknown'
