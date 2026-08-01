// Byte arrays that are addresses, not text.
//
// Several Status blocks carry a MAC (`u1[6]`) or an IP (`u1[16]`). CMA has no
// byte type — cru's decision, and the right one for a JSON contract — so the
// honest `value` for such a field is the address in its documented human form,
// with the bytes still available in `raw`. These are the formatters the block
// tables point at.

const hex = (byte: number): string => byte.toString(16).padStart(2, '0')

// The first byte is the MSB of the address (§4.2.15 IPStatus).
export const formatMAC = (bytes: Uint8Array): string => Array.from(bytes, hex).join(':')

// "For future upgradability this field can contain a 128-bit IPv6 address. In the
// current firmware version, the first 12 bytes are always set to 0, and the last
// 4 bytes contain the IPv4 IP address, or are set to zero if the IP address is
// not known or not applicable."
//
// So: all-zero means "not known" (the block's own Do-Not-Use wording), a v4
// address is rendered dotted, and anything in the leading 12 bytes is rendered as
// IPv6 rather than silently dropped — a receiver that starts using them must not
// look like it has no address.
export const formatIP = (bytes: Uint8Array): string => {
  if (bytes.every((byte) => byte === 0)) return ''
  const leading = bytes.subarray(0, 12)
  if (leading.every((byte) => byte === 0)) return Array.from(bytes.subarray(12), String).join('.')
  const groups: string[] = []
  for (let index = 0; index < bytes.length; index += 2) {
    groups.push(((bytes[index] << 8) | bytes[index + 1]).toString(16))
  }
  return groups.join(':')
}
