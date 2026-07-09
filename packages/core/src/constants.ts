// Default maximum characters kept in a string parser's buffer. Protocol
// parsers may override via the constructor `bufferLimit` option or by
// overriding the `defaultBufferLimit` getter.
export const MAX_CHARACTERS = 1024

// Default maximum bytes kept in a binary parser's buffer.
export const MAX_BYTES = 1024
