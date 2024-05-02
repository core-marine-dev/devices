# Norsub eMRU Parser

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/norsub-emru)
[![publish](https://github.com/core-marine-dev/norsub-emru/actions/workflows/publish.yml/badge.svg)](https://github.com/core-marine-dev/norsub-emru/actions/workflows/publish.yml)
![npm](https://img.shields.io/npm/dy/%40coremarine/norsub-emru)

Library to read NMEA-like sentences of Norsub eMRU devices. It works same as [NMEA-Parser library](https://github.com/core-marine-dev/nmea-parser/) and it has the same API. The only nuance is it gives metadata of the device status if the sentence bring that info.

To understand how it works, please look the info of [NMEA-Parser library](https://github.com/core-marine-dev/nmea-parser/).

The complete output with metadata it is shown below.

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

type NMEASentence = {
  // Sentence ID
  sentence: string,
  // Array just with the data of each field (easier to just read data and not fields metadata)
  data: Array<string | number | boolean | null>,
  // Array with ordered fields and their metadata
  fields: Array<{
    name: string,
    data: string | number | boolean | null,
    metadata?: Status,
    units?: string,
    note?: string,
  }>,
  // Protocol information
  protocol: {
    name: string,
    standard: boolean,
    version: string,
  },
  // UTC timestamp when the sentence was parsed
  timestamp: number,
  // Whole ASCII string sentence
  raw: string,
  // Sentence checksum
  checksum: number
  // Sentence talker
  talker?: null | { id: string, description: string }
}
```
