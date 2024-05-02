import { describe, expect, test } from 'vitest'
import * as v from 'valibot'
import { serialNumber, firmware, frequency, logInterval, protocols, timestamp, api, restart, factoryReset, upgradeFirmware, commandModeON, commandModeOFF } from '../../../src/firmware/1.0.2/command'
import { API_END, API_START, COMMAND_MODE, FACTORY_RESET, FIRMWARES_AVAILABLE, FIRMWARE_START, FREQUENCY_START, LISTENING_MODE, LOG_INTERVALS, LOG_INTERVAL_START, PROTOCOLS, PROTOCOLS_START, RESTART_DEVICE, SERIAL_NUMBER_START, TIMESTAMP_START, UPGRADE_FIRMWARE } from '../../../src/constants'
import { FrequencySchema, SerialNumberSchema } from '../../../src/schemas'
import type { ParsedFrame } from '../../../src/types'

describe('serial number', () => {
  const name = 'serial number'

  test('happy path', () => {
    const sn = '1234567'
    const input = SERIAL_NUMBER_START + sn
    const output = serialNumber(input)
    const expected: ParsedFrame = {
      remainder: '',
      frame: {
        name,
        raw: input,
        data: [sn],
        fields: [{ name: 'serial number', type: 'string', data: sn }],
        metadata: {
          receiver: sn
        }
      }
    }
    expect(output).toEqual(expected)
  })

  test('incomplete serial numbers', () => {
    const sn = '123456'
    const input = SERIAL_NUMBER_START + sn
    const output = serialNumber(input)
    const expected: ParsedFrame = {
      remainder: sn,
      frame: {
        name,
        raw: input,
        error: 'frame incomplete'
      }
    }
    expect(output).toEqual(expected)
  })

  test('wrong serial numbers', () => {
    const sn = '123456a'
    const input = SERIAL_NUMBER_START + sn
    const output = serialNumber(input)
    const parsed = v.safeParse(SerialNumberSchema, sn)
    expect(parsed.success).toBeFalsy()
    if (!parsed.success) {
      const expected: ParsedFrame = {
        remainder: sn,
        frame: {
          name,
          raw: input,
          error: parsed.issues[0].message
        }
      }
      expect(output).toEqual(expected)
    }
  })
})

describe('firmware', () => {
  const name = 'firmware'

  test('happy path', () => {
    ['1.0.1', 'v1.0.1', 'v1.0.1aslfkjh'].forEach(sample => {
      const input = FIRMWARE_START + sample
      const output = firmware(input)
      const fw = '1.0.1'
      const expected: ParsedFrame = {
        remainder: sample.slice(sample.indexOf(fw) + fw.length),
        frame: {
          name,
          raw: (sample.startsWith('v')) ? 'v' + fw : fw,
          data: [fw],
          fields: [{ name: 'firmware', type: 'string', data: fw }],
          metadata: {
            firmware: fw
          }
        }
      }
      expect(output).toEqual(expected)
    })

    ;['1.0.2', 'v1.0.2', 'v1.0.2aslfkjh'].forEach(sample => {
      const input = FIRMWARE_START + sample
      const output = firmware(input)
      const fw = '1.0.2'
      const expected: ParsedFrame = {
        remainder: sample.slice(sample.indexOf(fw) + fw.length),
        frame: {
          name,
          raw: (sample.startsWith('v')) ? 'v' + fw : fw,
          data: [fw],
          fields: [{ name: 'firmware', type: 'string', data: fw }],
          metadata: {
            firmware: fw
          }
        }
      }
      expect(output).toEqual(expected)
    })
  })

  test('incomplete firmware', () => {
    const task = (fw, error) => {
      const input = FIRMWARE_START + fw
      const output = firmware(input)
      const expected: ParsedFrame = {
        remainder: fw,
        frame: {
          name,
          raw: input,
          error
        }
      }
      expect(output).toEqual(expected)
    }
    ;[
      ['1', 'frame incomplete - no major version'],
      ['1.0', 'frame incomplete - no minor version'],
      ['1.0.', 'frame incomplete - no patch version'],
    ].forEach(([fw, error]) => task(fw, error))
  })

  test('non available firmware', () => {
    const task = (fw: string) => {
      const input = FIRMWARE_START + fw
      const output = firmware(input)
      const dots = fw.match(/\./g)?.length
      const raw = (dots === 3) ? fw.slice(0, fw.lastIndexOf('.')) : fw
      const expected: ParsedFrame = {
        remainder: fw,
        frame: {
          name,
          raw,
          error: `Firmware: available firmwares are ${FIRMWARES_AVAILABLE}`
        }
      }
      expect(output).toEqual(expected)
    }
    ;['2.2.0', 'v1.0.3', 'v2.2.0.live700'].forEach((fw) => task(fw))
  })
})

describe('frequency', () => {
  const name = 'frequency'

  test('happy path', () => {
    const fq = '65'
    const input = FREQUENCY_START + fq
    const output = frequency(input)
    const freq = parseInt(fq)
    const expected: ParsedFrame = {
      remainder: '',
      frame: {
        name,
        raw: input,
        data: [freq],
        fields: [{ name: 'frequency', type: 'uint8', units: 'kHz', data: freq }],
        metadata: {
          frequency: freq
        }
      }
    }
    expect(output).toEqual(expected)
  })

  test('incomplete frequency', () => {
    const fq = '1'
    const input = FREQUENCY_START + fq
    const output = frequency(input)
    const expected: ParsedFrame = {
      remainder: fq,
      frame: {
        name,
        raw: input,
        error: 'frame incomplete'
      }
    }
    expect(output).toEqual(expected)
  })

  test('wrong frequency', () => {
    const fq = '7a'
    const input = FREQUENCY_START + fq
    const output = frequency(input)
    const parsed = v.safeParse(FrequencySchema, fq)
    expect(parsed.success).toBeFalsy()
    if (!parsed.success) {
      const expected: ParsedFrame = {
        remainder: fq,
        frame: {
          name,
          raw: input,
          error: `${fq} is not a number`
        }
      }
      expect(output).toEqual(expected)
    }
  })
})

describe('log interval', () => {
  const name = 'log interval'

  test('happy path', () => {
    Object.entries(LOG_INTERVALS).forEach(([li, time]) => {
      const input = LOG_INTERVAL_START + li
      const output = logInterval(input)
      const expected: ParsedFrame = {
        remainder: '',
        frame: {
          name,
          raw: input,
          data: [li],
          fields: [{ name: 'log interval', type: 'string', data: li, metadata: time }],
          metadata: {
            logInterval: li,
            time
          }
        }
      }
      expect(output).toEqual(expected)
    })

  })

  test('incomplete log interval', () => {
    const li = '1'
    const input = LOG_INTERVAL_START + li
    const output = logInterval(input)
    const expected: ParsedFrame = {
      remainder: li,
      frame: {
        name,
        raw: input,
        error: 'frame incomplete'
      }
    }
    expect(output).toEqual(expected)
  })

  test('wrong log interval', () => {
    const li = '7a'
    const input = LOG_INTERVAL_START + li
    const output = logInterval(input)
    const expected: ParsedFrame = {
      remainder: li,
      frame: {
        name,
        raw: input,
        error: `${li} is not a number`
      }
    }
    expect(output).toEqual(expected)
  })
})

describe('protocols', () => {
  const name = 'listening protocols'

  test('happy path', () => {
    Object.entries(PROTOCOLS).forEach(([lm, info]) => {
      const input = PROTOCOLS_START + lm
      const output = protocols(input)
      const expected: ParsedFrame = {
        remainder: '',
        frame: {
          name,
          raw: input,
          data: [lm],
          fields: [{ name: 'protocols', type: 'string', data: lm, metadata: info }],
          metadata: {
            lm,
            channel: info.channel,
            protocols: {
              id: [...info.id],
              data: [...info.data]
            }
          }
        }
      }
      expect(output).toEqual(expected)

    })
  })

  test('incomplete protocols', () => {
    const lm = '1'
    const input = PROTOCOLS_START + lm
    const output = protocols(input)
    const expected: ParsedFrame = {
      remainder: lm,
      frame: {
        name,
        raw: input,
        error: 'frame incomplete'
      }
    }
    expect(output).toEqual(expected)
  })

  test('wrong protocols', () => {
    const lm = '7a'
    const input = PROTOCOLS_START + lm
    const output = protocols(input)
    const expected: ParsedFrame = {
      remainder: lm,
      frame: {
        name,
        raw: input,
        error: `${lm} is not a number`
      }
    }
    expect(output).toEqual(expected)
  })
})

describe('timestamp', () => {
  const name = 'device time'

  test('happy path', () => {
    const seconds = String(Math.floor(Date.now() / 1000))
    const input = TIMESTAMP_START + seconds
    const output = timestamp(input)
    const ts = Number(seconds) * 1000
    const date = (new Date(ts)).toISOString()
    const expected: ParsedFrame = {
      remainder: '',
      frame: {
        name,
        raw: input,
        data: [seconds],
        fields: [{ name: 'timestamp', type: 'uint16', units: 'seconds', data: seconds, metadata: date }],
        metadata: {
          timestamp: ts,
          date
        }
      }
    }
    expect(output).toEqual(expected)
  })

  test('incomplete timestamp', () => {
    const seconds = String(Math.floor(Date.now() / 100000))
    const input = TIMESTAMP_START + seconds
    const output = timestamp(input)
    const expected: ParsedFrame = {
      remainder: seconds,
      frame: {
        name,
        raw: input,
        error: 'frame incomplete'
      }
    }
    expect(output).toEqual(expected)
  })

  test('wrong timestamp', () => {
    const seconds = '123456789a'
    const input = TIMESTAMP_START + seconds
    const output = timestamp(input)
    const expected: ParsedFrame = {
      remainder: seconds,
      frame: {
        name,
        raw: input,
        error: `${seconds} is not a string-number`
      }
    }
    expect(output).toEqual(expected)
  })
})

describe('api', () => {
  const name = 'api'
  const apiWithGarbage = `In Command Mode
  Read values
    SN?	-	-	->	TBR serial number
    FV?	-	-	->	Firmware version
    FC?	-	-	->	Listening freq. in kHz
    LM?	-	-	->	Listening Mode. Determines active protocols
    LI?	-	-	->	TBR sensor log interval (00=never,01=once every 5 min,02=10 min,03=30 min, 04=1 hour, 05=2 hours, 06=12 hours, 07=24 hours)
    UT?	-	-	->	Current UNIX timestamp (UTC)
  Set values
    FC=69	-	->	Set freq. channel (base frequency)
    LM=01	-	-	->	Listening Mode. Sets active protocols.
    LI=00	-	->	Set TBR sensor log interval (00=never,01=once every 5 min,02=10 min,03=30 min, 04=1 hour, 05=2 hours, 06=12 hours, 07=24 hours)
    UT=1234567890	->	Set UNIX timestamp (UTC)
  Actions
    EX!	-	-	->	Exit command mode and resume listening for signals
    RR!	-	-	->	Restart TBR
    FS!	-	-	->	Warning: Restores factory settings and deletes all tag detections and TBR sensor logs from flash memory
    UF!	-	-	->	Warning: Puts TBR in bootloader mode. Firmware must be written after activating this action
  
  In Listening mode
  Note: Minimum 1 ms betwee
  n input characters
    TBRC		->	 Enter Command Mode
    (+)			->	 Sync Time
    (+)XXXXXXXXXL	->	 Sync and set new time (UTC) with the least significant digit being 10 seconds. L is Luhn's verification number.
  `

  test('happy path', () => {
    const input = apiWithGarbage
    const output = api(input)
    const endIndex = input.indexOf(API_END) + API_END.length
    const fullAPI = input.slice(0, endIndex)
    const remainder = input.slice(endIndex)
    const expected: ParsedFrame = {
      remainder,
      frame: {
        name,
        raw: fullAPI,
        data: [fullAPI],
        fields: [{ name: 'api', type: 'string', data: fullAPI }],
        metadata: {
          api: fullAPI,
        }
      }
    }
    expect(output).toEqual(expected)
  })

  test('incomplete api', () => {
    const input = apiWithGarbage.slice(0, apiWithGarbage.length - 10)
    const output = api(input)
    const expected: ParsedFrame = {
      remainder: input.slice(API_START.length),
      frame: {
        name,
        raw: input,
        error: 'frame incomplete'
      }
    }
    expect(output).toEqual(expected)
  })
})

test('restart', () => {
  const input = RESTART_DEVICE
  const output = restart(input)
  const expected: ParsedFrame = {
    remainder: '',
    frame: {
      name: 'restart device',
      raw: input,
    }
  }
  expect(output).toEqual(expected)
})

test('factory reset', () => {
  const input = FACTORY_RESET
  const output = factoryReset(input)
  const expected: ParsedFrame = {
    remainder: '',
    frame: {
      name: 'factory reset',
      raw: input,
    }
  }
  expect(output).toEqual(expected)
})

test('upgrade firmware', () => {
  const input = UPGRADE_FIRMWARE
  const output = upgradeFirmware(input)
  const expected: ParsedFrame = {
    remainder: '',
    frame: {
      name: 'upgrade firmware',
      raw: input,
    }
  }
  expect(output).toEqual(expected)
})

test('command mode ON', () => {
  [COMMAND_MODE, 'TBRC'].forEach(input => {
    const output = commandModeON(input)
    const expected: ParsedFrame = {
      remainder: '',
      frame: {
        name: 'command mode on',
        raw: COMMAND_MODE,
      }
    }
    expect(output).toEqual(expected)
  })
})

test('command mode OFF', () => {
  const input = LISTENING_MODE
  const output = commandModeOFF(input)
  const expected: ParsedFrame = {
    remainder: '',
    frame: {
      name: 'command mode off',
      raw: input,
    }
  }
  expect(output).toEqual(expected)
})
