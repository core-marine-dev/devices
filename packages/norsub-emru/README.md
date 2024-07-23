# Norsub eMRU Parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/norsub-emru) [![publish](https://github.com/core-marine-dev/norsub-emru/actions/workflows/publish.yml/badge.svg)](https://github.com/core-marine-dev/norsub-emru/actions/workflows/publish.yml) ![npm](https://img.shields.io/npm/dy/%40coremarine/norsub-emru)

Library to read NMEA-like sentences of Norsub eMRU devices. It works same as [NMEA-Parser library](https://www.npmjs.com/package/@coremarine/nmea-parser) and it has the same API. The only nuance is it gives metadata of the device status if the sentence bring that info.

To understand how it works, please look the info of [NMEA-Parser library](https://www.npmjs.com/package/@coremarine/nmea-parser).

`PNORSUBx` sentences contains `status` property in the metada as

```typescript
type Status = {
  main: {
    ok: boolean,
    health: boolean,
  },
  system: {
    ok: boolean,
    health: boolean,
    synchronized: {
      time: boolean,
      clock: boolean,
    },
    cpu: boolean,
  },
  sensor: {
    ok: boolean,
    health: boolean,
    limits: boolean,
    environmental: {
      vibration: boolean,
      temperature: boolean,
    }
  },
  algorithms: {
    ok: boolean,
    health: boolean,
    initialization: {
      observer: boolean,
      heading: boolean
    },
    roll_pitch: {
      ok: boolean,
      health: boolean,
    },
    heading: {
      ok: boolean,
      health: boolean,
    },
    surge_sway: {
      ok: boolean,
      health: boolean,
    },
    heave: {
      ok: boolean,
      health: boolean,
    },
  },
  aiding: {
    received: {
      position: boolean,
      velocity: boolean,
      heading: boolean,
    },
    valid: {
      position: boolean,
      velocity: boolean,
      heading: boolean,
      vertical: boolean,
      horizontal: boolean,
    }
  }
}
```

The complete output with metadata it is shown below.

```typescript
type NMEASentence = {
  // Sentence ID
  id: string,
  // Array with ordered fields and their metadata
  payload: Array<{
    name: string,
    value: string | number | bigint | boolean | null,
    type: 'string' | 'boolean' | 'uint8' | 'uint16' | 'uint32' | 'uint64' | 'int8' | 'int16' | 'int32' | 'int64' | 'float32' | 'float64' | 'unknown',
    units?: string,
    description?: string,
    metadata?: any
  }>,
  // Metadata which can be computed fields from payload fields
  metadata?: any,
  // Protocol information
  protocol: {
    name: string,
    standard: boolean,
    version: string,
  },
  // UTC timestamp when the sentence was parsed
  received: number,
  // Whole ASCII string sentence
  sample: string,
  // Sentence checksum
  checksum: {
    sample: string,
    value: number
  }
  // Sentence talker
  talker?: {
    value: string,
    description: string
  }
}
```
