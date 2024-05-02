import { describe, expect, test } from 'vitest'

import { TBLive } from '../src'
import { Emitter, Receiver } from '../src/types'
import { CLOCK_ROUND, CLOCK_SET, COMMAND_MODE, FACTORY_RESET, FIRMWARES_AVAILABLE, FIRMWARE_START, FREQUENCY_START, LISTENING_MODE, LOG_INTERVAL_START, PING_END, PING_START, PROTOCOLS_START, RESTART_DEVICE, SERIAL_NUMBER_START, TIMESTAMP_START, UPGRADE_FIRMWARE } from '../src/constants'

describe('contructors_getters_setters',() => {
  test('constructor', () => {
    const firmware = '1.0.1'
    expect(new TBLive().firmware).toBe(firmware)
  })

  test('constructor with firmware', () => {
    let firmware = '1.0.1'
    // Known firmwares
    expect(new TBLive().firmware).toBe(firmware)
    FIRMWARES_AVAILABLE.forEach(fw => expect(new TBLive(fw).firmware).toBe(fw))
    // Uknown firmwares
    expect(() => new TBLive('1.o.1')).toThrow()
    expect(() => new TBLive('1.0.3')).toThrow()
    expect(() => new TBLive('2.2.0')).toThrow()
  })

  test('constructor with firmware and receiver', () => {
    let firmware = '1.0.1'
    // Receiver
    const receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 69,
      firmware: '1.0.1'
    }
    // wihout emitters
    firmware = '1.0.2'
    expect(new TBLive(firmware, receiver).firmware).toBe(firmware)
    expect(new TBLive(firmware, receiver).receiver).toEqual({ ...receiver, firmware })
    expect(new TBLive(firmware, receiver).receiver?.firmware).toEqual(firmware)
    // with emitters
    const emitters: Emitter[] = [
      { serialNumber: '0123456', frequency: 69 },
      { serialNumber: '0123457', frequency: receiver.frequency - 2 },
      { serialNumber: '0123458', frequency: receiver.frequency + 2 }
    ]
    receiver.emitters = [ ...emitters ]
    expect(new TBLive(firmware, receiver).receiver?.emitters).toEqual(emitters)
    // Invalid emitters - Frequency
    receiver.emitters[1].frequency = receiver.frequency - 1
    expect(() => new TBLive(firmware, receiver)).toThrow()
    receiver.emitters[1].frequency = receiver.frequency - 10
    expect(() => new TBLive(firmware, receiver)).toThrow()
    receiver.emitters[1].frequency = receiver.frequency - 2
    expect(() => new TBLive(firmware, receiver)).not.toThrow()
    // Invalid emitters - Serial Number
    receiver.emitters[1].serialNumber = '0123456'
    expect(() => new TBLive(firmware, receiver)).toThrow()
    receiver.emitters[1].serialNumber = '0123457'
    expect(() => new TBLive(firmware, receiver)).not.toThrow()
    // Invalid emitters - Invalid number of emiiters
    receiver.emitters[3] = { serialNumber: '01234569', frequency: 69 }
    expect(() => new TBLive(firmware, receiver)).toThrow()
    receiver.emitters.pop()
    expect(() => new TBLive(firmware, receiver)).not.toThrow()
    receiver.emitters.pop()
    expect(() => new TBLive(firmware, receiver)).not.toThrow()
    receiver.emitters.pop()
    expect(() => new TBLive(firmware, receiver)).not.toThrow()
    receiver.emitters.pop()
    expect(() => new TBLive(firmware, receiver)).toThrow()
  })

  test('getters-setters', () => {
    let firmware = '1.0.1'
    const frequency = 69
    const emitters: Emitter[] = [
      { serialNumber: '0123456', frequency },
      { serialNumber: '0123457', frequency: frequency - 2 },
      { serialNumber: '0123458', frequency: frequency + 2 }
    ]
    const receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 69,
      firmware: '1.0.2',
      emitters: [ ...emitters ]
    }
    const tblive = new TBLive(firmware, receiver)
    expect(tblive.firmware).toBe(firmware)
    expect(tblive.receiver?.firmware).toBe(firmware)
    // Firmware
    firmware = '1.0.2'
    tblive.firmware = firmware
    expect(tblive.firmware).toBe(firmware)
    expect(tblive.receiver?.firmware).toBe(firmware)
    expect(() => tblive.firmware = '1.0.3').toThrow()
    // Firmwares
    expect(tblive.firmwares).toEqual(FIRMWARES_AVAILABLE)
    // Receiver
    firmware = '1.0.1'
    receiver.firmware = firmware
    tblive.receiver = { ...receiver }
    expect(tblive.firmware).toBe(firmware)
    expect(tblive.receiver?.firmware).toBe(firmware)
    expect(tblive.receiver).toEqual(receiver)
    // Invalid emitters - Frequency
    receiver.emitters[1].frequency = frequency - 1
    expect(() => tblive.receiver = { ...receiver }).toThrow()
    receiver.emitters[1].frequency = frequency - 10
    expect(() => tblive.receiver = { ...receiver }).toThrow()
    receiver.emitters[1].frequency = frequency - 2
    expect(() => tblive.receiver = { ...receiver }).not.toThrow()
    // Invalid emitters - Serial Number
    receiver.emitters[1].serialNumber = '0123456'
    expect(() => tblive.receiver = { ...receiver }).toThrow()
    receiver.emitters[1].serialNumber = '0123457'
    expect(() => tblive.receiver = { ...receiver }).not.toThrow()
    // Invalid emitters - Invalid number of emiiters
    receiver.emitters[3] = { serialNumber: '01234569', frequency: 69 }
    expect(() => tblive.receiver = { ...receiver }).toThrow()
    receiver.emitters.pop()
    expect(() => tblive.receiver = { ...receiver }).not.toThrow()
    receiver.emitters.pop()
    expect(() => tblive.receiver = { ...receiver }).not.toThrow()
    receiver.emitters.pop()
    expect(() => tblive.receiver = { ...receiver }).not.toThrow()
    receiver.emitters.pop()
    expect(() => tblive.receiver = { ...receiver }).toThrow()
  })
})

// Listening
const receiverSerialNumber = '1000042' as const
const receiverFrequency = 69
const emitterSerialNumber = '1001285' as const
const emitterFrequency = 69

const listeningEmitter101 = `$${receiverSerialNumber},0000002202,615,S64K,${emitterSerialNumber},52428,24,${emitterFrequency},11\r` as const
const listeningReceiver101 = `$${receiverSerialNumber},0000000600,TBR Sensor,297,15,29,69,6\r` as const

const listeningEmitter102 = `$${receiverSerialNumber},1551087572,897,OPs,${emitterSerialNumber},32,33,${emitterFrequency}\r` as const
const listeningReceiver102 = `$${receiverSerialNumber},1551087600,TBR Sensor,280,3,8,${receiverFrequency}\r` as const

const listeningPing = `${PING_START}${receiverSerialNumber}${PING_END}` as const
const listeningRoundClock = CLOCK_ROUND
const listeningSetClock = CLOCK_SET
// Command
const commandSerialNumber = `${SERIAL_NUMBER_START}${receiverSerialNumber}` as const
const commandFirmware101 = `${FIRMWARE_START}1.0.1` as const
const commandFirmware102 = `${FIRMWARE_START}1.0.2` as const
const commandFrequency70 = `${FREQUENCY_START}70` as const
const commandFrequency67 = `${FREQUENCY_START}67` as const
const commandLogInterval = `${LOG_INTERVAL_START}02` as const
const commandProtocols = `${PROTOCOLS_START}60` as const
const commandTimestamp = `${TIMESTAMP_START}${Date.now().toString().slice(0, -3)}` as const
const commandAPI = `In Command Mode
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
` as const
const commandRestart = RESTART_DEVICE
const commandFactoryReset = FACTORY_RESET
const commandUpgradeFirmware = UPGRADE_FIRMWARE
const commandModeON = COMMAND_MODE
const commandModeOFF = LISTENING_MODE
// Other
const garbage = 'lkashf'

describe('Firmware 1.0.1 - parse data', () => {
  const firmware = '1.0.1'

  test('Listening mode - without receiver - happy path', () => {
    const tblive = new TBLive()
    // Listening - 1 frame 
    ;[
      ['ping', garbage + listeningPing],
      ['emitter', garbage + listeningEmitter101],
      ['receiver', garbage + listeningReceiver101],
      ['round clock', garbage + listeningRoundClock],
      ['set clock', garbage + listeningSetClock],
    ].forEach(([name, frame]) => {
      const output = tblive.parseData(frame)
      expect(output).toHaveLength(1)
      expect(output[0].name).toBe(name)
    })
    // Listening - X frames
    ;[
      [
        ['ping', 'emitter', 'receiver', 'round clock', 'set clock'],
        [garbage, listeningPing, listeningEmitter101, listeningReceiver101, listeningRoundClock, listeningSetClock],
      ],
      [
        ['emitter', 'receiver', 'round clock', 'ping', 'set clock'],
        [garbage, listeningEmitter101, listeningReceiver101, listeningRoundClock, listeningPing, listeningSetClock],
      ],
      [
        ['receiver', 'round clock', 'set clock', 'ping', 'emitter', 'receiver'],
        [garbage, listeningReceiver101, listeningRoundClock, listeningSetClock, listeningPing, listeningEmitter101, listeningReceiver101],
      ],
    ].forEach(([names, frames]) => {
      const input = frames.join('')
      const output = tblive.parseData(input)
      expect(output).toHaveLength(frames.length - 1)
      output.forEach((out, idx) => {
        expect(out).not.toHaveProperty('error')
        expect(out.name).toBe(names[idx])
      })
    })
  })

  test('Listening mode - with receiver - happy path', () => {
    const emitters: Emitter[] = [
      { serialNumber: emitterSerialNumber, frequency: emitterFrequency },
      { serialNumber: emitterSerialNumber.replace('0', '1'), frequency: emitterFrequency - 2 },
      { serialNumber: emitterSerialNumber.replace('0', '2'), frequency: emitterFrequency + 2 },
    ]
    const receiver: Receiver = {
      firmware,
      serialNumber: receiverSerialNumber,
      frequency: receiverFrequency,
      emitters: [...emitters]
    }
    const tblive = new TBLive(firmware, receiver)
    // Listening - 1 frame 
    ;[
      ['ping', garbage + listeningPing],
      ['emitter', garbage + listeningEmitter101],
      ['receiver', garbage + listeningReceiver101],
      ['round clock', garbage + listeningRoundClock],
      ['set clock', garbage + listeningSetClock],
    ].forEach(([name, frame]) => {
      const output = tblive.parseData(frame)
      expect(output).toHaveLength(1)
      expect(output[0].name).toBe(name)
    })
    // Listening - X frames
    ;[
      [
        ['ping', 'emitter', 'receiver', 'round clock', 'set clock'],
        [garbage, listeningPing, listeningEmitter101, listeningReceiver101, listeningRoundClock, listeningSetClock],
      ],
      [
        ['emitter', 'receiver', 'round clock', 'ping', 'set clock'],
        [garbage, listeningEmitter101, listeningReceiver101, listeningRoundClock, listeningPing, listeningSetClock],
      ],
      [
        ['receiver', 'round clock', 'set clock', 'ping', 'emitter', 'receiver'],
        [garbage, listeningReceiver101, listeningRoundClock, listeningSetClock, listeningPing, listeningEmitter101, listeningReceiver101],
      ],
    ].forEach(([names, frames]) => {
      const input = frames.join('')
      const output = tblive.parseData(input)
      expect(output).toHaveLength(frames.length - 1)
      output.forEach((out, idx) => {
        expect(out).not.toHaveProperty('error')
        expect(out.name).toBe(names[idx])
      })
    })
  })

  test('Command mode - without receiver - happy path', () => {
    const tblive = new TBLive()
    // Command - 1 frame 
    ;[
      ['serial number', garbage + commandSerialNumber],
      ['frequency', garbage + commandFrequency70],
      ['firmware', garbage + commandFirmware101],
      ['listening protocols', garbage + commandProtocols],
      ['log interval', garbage + commandLogInterval],
      ['api', garbage + commandAPI],
      ['restart device', garbage + commandRestart],
      ['factory reset', garbage + commandFactoryReset],
      ['upgrade firmware', garbage + commandUpgradeFirmware],
      ['command mode on', garbage + commandModeON],
      ['command mode off', garbage + commandModeOFF],
    ].forEach(([name, frame]) => {
      const output = tblive.parseData(frame)
      expect(output).toHaveLength(1)
      expect(output[0].name).toBe(name)
    })
    // Command - X frames
    ;[
      [
        ['serial number', 'frequency', 'firmware', 'listening protocols', 'log interval', 'api', 'restart device', 'factory reset', 'upgrade firmware', 'command mode on', 'command mode off'],
        [garbage, commandSerialNumber, commandFrequency70, commandFirmware101, commandProtocols, commandLogInterval, commandAPI, commandRestart, commandFactoryReset, commandUpgradeFirmware, commandModeON, commandModeOFF],
      ],
      [
        ['listening protocols', 'log interval', 'api', 'restart device', 'factory reset', 'upgrade firmware', 'command mode on', 'command mode off', 'serial number', 'frequency', 'firmware'],
        [garbage, commandProtocols, commandLogInterval, commandAPI, commandRestart, commandFactoryReset, commandUpgradeFirmware, commandModeON, commandModeOFF, commandSerialNumber, commandFrequency70, commandFirmware101],
      ],
      [
        ['factory reset', 'upgrade firmware', 'command mode on', 'serial number', 'frequency', 'firmware', 'listening protocols', 'log interval', 'api', 'restart device', 'command mode off'],
        [garbage, commandFactoryReset, commandUpgradeFirmware, commandModeON, commandSerialNumber, commandFrequency70, commandFirmware101, commandProtocols, commandLogInterval, commandAPI, commandRestart, commandModeOFF],
      ],
    ].forEach(([names, frames]) => {
      const input = frames.join('')
      const output = tblive.parseData(input)
      expect(output).toHaveLength(frames.length - 1)
      output.forEach((out, idx) => {
        expect(out).not.toHaveProperty('error')
        expect(out.name).toBe(names[idx])
      })
    })
  })

  test.todo('Command mode - with receiver - happy path', () => {

  })
})

describe('Firmware 1.0.2 - parse data', () => {
  const firmware = '1.0.2'

  test('Listening mode - without receiver - happy path', () => {
    const tblive = new TBLive(firmware)
    // Listening - 1 frame 
    ;[
      ['ping', garbage + listeningPing],
      ['emitter', garbage + listeningEmitter102],
      ['receiver', garbage + listeningReceiver102],
      ['round clock', garbage + listeningRoundClock],
      ['set clock', garbage + listeningSetClock],
    ].forEach(([name, frame]) => {
      const output = tblive.parseData(frame)
      expect(output).toHaveLength(1)
      expect(output[0].name).toBe(name)
    })
    // Listening - X frames
    ;[
      [
        ['ping', 'emitter', 'receiver', 'round clock', 'set clock'],
        [garbage, listeningPing, listeningEmitter102, listeningReceiver102, listeningRoundClock, listeningSetClock],
      ],
      [
        ['emitter', 'receiver', 'round clock', 'ping', 'set clock'],
        [garbage, listeningEmitter102, listeningReceiver102, listeningRoundClock, listeningPing, listeningSetClock],
      ],
      [
        ['receiver', 'round clock', 'set clock', 'ping', 'emitter', 'receiver'],
        [garbage, listeningReceiver102, listeningRoundClock, listeningSetClock, listeningPing, listeningEmitter102, listeningReceiver102],
      ],
    ].forEach(([names, frames]) => {
      const input = frames.join('')
      const output = tblive.parseData(input)
      expect(output).toHaveLength(frames.length - 1)
      output.forEach((out, idx) => {
        expect(out).not.toHaveProperty('error')
        expect(out.name).toBe(names[idx])
      })
    })
  })

  test('Listening mode - with receiver - happy path', () => {
    const emitters: Emitter[] = [
      { serialNumber: emitterSerialNumber, frequency: emitterFrequency },
      { serialNumber: emitterSerialNumber.replace('0', '1'), frequency: emitterFrequency - 2 },
      { serialNumber: emitterSerialNumber.replace('0', '2'), frequency: emitterFrequency + 2 },
    ]
    const receiver: Receiver = {
      firmware,
      serialNumber: receiverSerialNumber,
      frequency: receiverFrequency,
      emitters: [...emitters]
    }
    const tblive = new TBLive(firmware, receiver)
    // Listening - 1 frame 
    ;[
      ['ping', garbage + listeningPing],
      ['emitter', garbage + listeningEmitter102],
      ['receiver', garbage + listeningReceiver102],
      ['round clock', garbage + listeningRoundClock],
      ['set clock', garbage + listeningSetClock],
    ].forEach(([name, frame]) => {
      const output = tblive.parseData(frame)
      expect(output).toHaveLength(1)
      expect(output[0].name).toBe(name)
    })
    // Listening - X frames
    ;[
      [
        ['ping', 'emitter', 'receiver', 'round clock', 'set clock'],
        [garbage, listeningPing, listeningEmitter102, listeningReceiver102, listeningRoundClock, listeningSetClock],
      ],
      [
        ['emitter', 'receiver', 'round clock', 'ping', 'set clock'],
        [garbage, listeningEmitter102, listeningReceiver102, listeningRoundClock, listeningPing, listeningSetClock],
      ],
      [
        ['receiver', 'round clock', 'set clock', 'ping', 'emitter', 'receiver'],
        [garbage, listeningReceiver102, listeningRoundClock, listeningSetClock, listeningPing, listeningEmitter102, listeningReceiver102],
      ],
    ].forEach(([names, frames]) => {
      const input = frames.join('')
      const output = tblive.parseData(input)
      expect(output).toHaveLength(frames.length - 1)
      output.forEach((out, idx) => {
        expect(out).not.toHaveProperty('error')
        expect(out.name).toBe(names[idx])
      })
    })
  })

  test('Command mode - without receiver - happy path', () => {
    const tblive = new TBLive()
    // Command - 1 frame 
    ;[
      ['serial number', garbage + commandSerialNumber],
      ['frequency', garbage + commandFrequency70],
      ['firmware', garbage + commandFirmware101],
      ['listening protocols', garbage + commandProtocols],
      ['log interval', garbage + commandLogInterval],
      ['api', garbage + commandAPI],
      ['restart device', garbage + commandRestart],
      ['factory reset', garbage + commandFactoryReset],
      ['upgrade firmware', garbage + commandUpgradeFirmware],
      ['command mode on', garbage + commandModeON],
      ['command mode off', garbage + commandModeOFF],
    ].forEach(([name, frame]) => {
      const output = tblive.parseData(frame)
      expect(output).toHaveLength(1)
      expect(output[0].name).toBe(name)
    })
    // Command - X frames
    ;[
      [
        ['serial number', 'frequency', 'firmware', 'listening protocols', 'log interval', 'api', 'restart device', 'factory reset', 'upgrade firmware', 'command mode on', 'command mode off'],
        [garbage, commandSerialNumber, commandFrequency70, commandFirmware101, commandProtocols, commandLogInterval, commandAPI, commandRestart, commandFactoryReset, commandUpgradeFirmware, commandModeON, commandModeOFF],
      ],
      [
        ['listening protocols', 'log interval', 'api', 'restart device', 'factory reset', 'upgrade firmware', 'command mode on', 'command mode off', 'serial number', 'frequency', 'firmware'],
        [garbage, commandProtocols, commandLogInterval, commandAPI, commandRestart, commandFactoryReset, commandUpgradeFirmware, commandModeON, commandModeOFF, commandSerialNumber, commandFrequency70, commandFirmware101],
      ],
      [
        ['factory reset', 'upgrade firmware', 'command mode on', 'serial number', 'frequency', 'firmware', 'listening protocols', 'log interval', 'api', 'restart device', 'command mode off'],
        [garbage, commandFactoryReset, commandUpgradeFirmware, commandModeON, commandSerialNumber, commandFrequency70, commandFirmware101, commandProtocols, commandLogInterval, commandAPI, commandRestart, commandModeOFF],
      ],
    ].forEach(([names, frames]) => {
      const input = frames.join('')
      const output = tblive.parseData(input)
      expect(output).toHaveLength(frames.length - 1)
      output.forEach((out, idx) => {
        expect(out).not.toHaveProperty('error')
        expect(out.name).toBe(names[idx])
      })
    })
  })

  test.todo('Command mode - with receiver - happy path', () => {

  })
})