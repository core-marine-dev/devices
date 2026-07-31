// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bitState, label } from '../../../utils'

/* DiskStatus -> Number: 4059 => "OnChange" interval: 1s
  This block reports the size and usage of the disks mounted on the receiver.

  DiskStatus -----------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  N                 uint8                     Number of DiskData sub-blocks this block contains.
  SBLength          uint8  1 byte             Length of one DiskData sub-block in bytes.
  Reserved       uint8[4]                     Reserved for future use
  DiskData                                    A succession of N DiskData sub-blocks
  Padding            uint                     Padding bytes

  DiskData -------------------------------------------------------------------
  Block fields            Type   Units  Do-Not-Use  Description
  DiskID                 uint8                      ID of the disk, starting at 1 for the internal SD Memory Card.
  Status                 uint8                      Bit field:
                                                      Bit 0: DISK_MOUNTED: set when the disk is mounted.
                                                      Bit 1: DISK_FULL: set when the disk is full. A disk is full when it is
                                                             filled to 95% of its total capacity.
                                                      Bit 2: DISK_ACTIVITY: set for one second each time data is written to
                                                             the disk. Continuous above 1 Hz.
                                                      Bit 3: LOGGING_ENABLED: set when at least one file is open on the disk,
                                                             regardless of the logging rate.
                                              Rev 1   Bit 4: MOUNTING: set when the disk is being mounted.
                                              Rev 1   Bit 5: FORMATTING: set when the disk is being formatted.
                                                      Bits 6-7: Reserved
  DiskUsageMSB          uint16            65535 (7)  16 MSB of the total disk usage. The usage in bytes is
                                                     DiskUsageMSB * 4294967296 + DiskUsageLSB.
  DiskUsageLSB          uint32       4294967295 (7)  32 LSB of the total disk usage.
  DiskSize              uint32  1 Mbyte          0   Total size of the disk, in megabytes.
  CreateDeleteCount      uint8                      Counter incremented by one each time a file or a folder is created or
                                                     deleted on this disk. Starts at zero at receiver start-up and restarts at
                                                     zero after having reached 255.
Rev 1 Error              uint8                 255  Disk error:
                                                      0:   No error
                                                      1:   Disk partition is too large
                                                      2:   Disk does not have any partition
                                                      3:   File system check and recovery failed
                                                      4:   Disk in use over USB
                                                      254: Disk mount failed due to unknown error
  Padding                 uint                      Padding bytes

  (7) The disk usage is invalid if both DiskUsageMSB is 65535 AND DiskUsageLSB is
      4294967295 — so neither field alone can be declared Do-Not-Use, and the
      combined value is computed at payload level where both are visible.

  This is the first block whose REVISION changes a SUB-BLOCK: rev 1 appends
  `Error` to DiskData (and gives Status two more bits). The two field lists
  therefore differ only in the sub-block's nested fields.
*/
const DISK_DATA_REVISION_0: readonly FieldDefinition[] = [
  { name: 'DiskID', type: 'uint8', description: 'ID of the disk, starting at 1 for the internal SD memory card' },
  { name: 'Status', type: 'uint8', description: 'Bit field: bit 0 mounted, bit 1 full (95% of capacity), bit 2 activity, bit 3 logging enabled, bit 4 mounting, bit 5 formatting' },
  { name: 'DiskUsageMSB', type: 'uint16', description: '16 most-significant bits of the total disk usage in bytes' },
  { name: 'DiskUsageLSB', type: 'uint32', description: '32 least-significant bits of the total disk usage in bytes' },
  { name: 'DiskSize', type: 'uint32', units: 'MB', doNotUse: 0, description: 'Total size of the disk' },
  { name: 'CreateDeleteCount', type: 'uint8', description: 'Counter incremented on every file or folder created or deleted on this disk; wraps at 255' },
]

const DISK_DATA_REVISION_1: readonly FieldDefinition[] = [
  ...DISK_DATA_REVISION_0,
  { name: 'Error', type: 'uint8', doNotUse: 255, description: 'Disk error: 0 none, 1 partition too large, 2 no partition, 3 file-system check and recovery failed, 4 in use over USB, 254 mount failed for an unknown reason' },
]

const header = (fields: readonly FieldDefinition[]): readonly FieldDefinition[] => [
  { name: 'N', type: 'uint8', description: 'Number of DiskData sub-blocks in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one DiskData sub-block' },
  { name: 'Reserved', type: 'string', length: 4, reserved: true, description: 'Reserved for future use' },
  { name: 'DiskData', count: 'N', length: 'SBLength', fields, description: 'A succession of N DiskData sub-blocks, one per mounted disk' },
]

export const DISK_ERROR: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'PARTITION_TOO_LARGE',
  2: 'NO_PARTITION',
  3: 'FILE_SYSTEM_CHECK_AND_RECOVERY_FAILED',
  4: 'IN_USE_OVER_USB',
  254: 'MOUNT_FAILED_UNKNOWN_ERROR',
}

// Neither half is Do-Not-Use on its own: only the PAIR (65535, 4294967295) means
// "invalid", which is why this is computed where both are visible.
const USAGE_MSB_INVALID = 65535
const USAGE_LSB_INVALID = 4294967295
const USAGE_MSB_SCALE = 4294967296

const decoders: Readonly<Record<string, Decoder>> = {
  Status: (value) => ({
    mounted: bitState(value, 0),
    full: bitState(value, 1),
    activity: bitState(value, 2),
    loggingEnabled: bitState(value, 3),
    mounting: bitState(value, 4),
    formatting: bitState(value, 5),
  }),
  Error: (value) => label(DISK_ERROR, value),
  DiskSize: (value) => ({ value: value / 1024, units: 'GB' }),
}

export const diskStatus: BlockDefinition = {
  name: 'DiskStatus',
  number: 4059,
  description: 'Size and usage of the disks mounted on the receiver',
  timestamp: 'receiver',
  revisions: [header(DISK_DATA_REVISION_0), header(DISK_DATA_REVISION_1)],
  decoders,
  // The usage is a 48-bit value split across two fields, so it can only be
  // assembled where both are visible — the textbook case for payload metadata.
  payloadMetadata: ({ DiskUsageMSB, DiskUsageLSB, DiskSize }) => {
    if (typeof DiskUsageMSB !== 'number' || typeof DiskUsageLSB !== 'number') return {}
    if (DiskUsageMSB === USAGE_MSB_INVALID && DiskUsageLSB === USAGE_LSB_INVALID) {
      return { disk: { usage: null, invalid: true } }
    }
    const bytes = (DiskUsageMSB * USAGE_MSB_SCALE) + DiskUsageLSB
    const disk: Record<string, unknown> = { usage: { value: bytes, units: 'bytes' } }
    if (typeof DiskSize === 'number' && DiskSize > 0) {
      const capacity = DiskSize * 1024 * 1024
      disk.capacity = { value: capacity, units: 'bytes' }
      disk.used = { value: Math.round((bytes / capacity) * 1000) / 10, units: '%' }
    }
    return { disk }
  },
}
