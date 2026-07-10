export const calculateChecksum = (data: string): number => Array.from(data).reduce((acc, cur) => acc ^ cur.charCodeAt(0), 0)

export const stringChecksumToNumber = (checksum: string): number => Number.parseInt(checksum, 16)

export const numberChecksumToString = (checksum: number): string => checksum
  .toString(16)
  .padStart(2, '0')
  .toUpperCase()
