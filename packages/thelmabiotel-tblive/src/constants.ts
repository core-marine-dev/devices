// PROTOCOL KNOWLEDGE ------------------------------------------------------------------------------------------------
// Lookup tables transcribed from the TB Live datasheets. Everything else that used
// to live here (flag literals, field lengths, the help-text bodies) now lives in
// `definitions.ts` as part of the sentence table.

// `LM=nn` — which emitter transmit protocols the receiver decodes, and over how
// many frequency channels. From `receiver-1.0.1.pdf` §LM: the base value selects
// the protocol set, +30 makes it dual channel and +60 triple.
export const PROTOCOLS: Record<string, { channel: string, id: string[], data: string[] }> = {
  // Single channel
  '00': { channel: 'single', id: ['R256', 'R04K', 'R64K'], data: ['S256'] },
  '01': { channel: 'single', id: ['R64K', 'R01M'], data: ['S256', 'S64K'] },
  '02': { channel: 'single', id: ['R01M'], data: ['S64K'] },
  '03': { channel: 'single', id: ['R01M'], data: [] },
  '04': { channel: 'single', id: [], data: ['S64K'] },
  '05': { channel: 'single', id: [], data: ['HS256'] },
  '06': { channel: 'single', id: [], data: ['DS256'] },
  '07': { channel: 'single', id: ['OPi'], data: ['OPs'] },
  '08': { channel: 'single', id: ['R64K', 'R01M', 'OPi'], data: ['S256', 'S64K', 'OPs'] },
  // Dual channel
  '30': { channel: 'dual', id: ['R256', 'R04K', 'R64K'], data: ['S256'] },
  '31': { channel: 'dual', id: ['R64K', 'R01M'], data: ['S256', 'S64K'] },
  '32': { channel: 'dual', id: ['R01M'], data: ['S64K'] },
  '33': { channel: 'dual', id: ['R01M'], data: [] },
  '34': { channel: 'dual', id: [], data: ['S64K'] },
  '35': { channel: 'dual', id: [], data: ['HS256'] },
  '36': { channel: 'dual', id: [], data: ['DS256'] },
  '37': { channel: 'dual', id: ['OPi'], data: ['OPs'] },
  '38': { channel: 'dual', id: ['R64K', 'R01M', 'OPi'], data: ['S256', 'S64K', 'OPs'] },
  // Triple channel
  '60': { channel: 'triple', id: ['R256', 'R04K', 'R64K'], data: ['S256'] },
  '61': { channel: 'triple', id: ['R64K', 'R01M'], data: ['S256', 'S64K'] },
  '62': { channel: 'triple', id: ['R01M'], data: ['S64K'] },
  '63': { channel: 'triple', id: ['R01M'], data: [] },
  '64': { channel: 'triple', id: [], data: ['S64K'] },
  '65': { channel: 'triple', id: [], data: ['HS256'] },
  '66': { channel: 'triple', id: [], data: ['DS256'] },
  '67': { channel: 'triple', id: ['OPi'], data: ['OPs'] },
  '68': { channel: 'triple', id: ['R64K', 'R01M', 'OPi'], data: ['S256', 'S64K', 'OPs'] },
}

// `LI=nn` — the sensor log print-out interval.
export const LOG_INTERVALS = {
  '00': 'disabled',
  '01': '5 minutes',
  '02': '10 minutes',
  '03': '30 minutes',
  '04': '60 minutes',
  '05': '2 hours',
  '06': '12 hours',
  '07': '24 hours',
} as const
