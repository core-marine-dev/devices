import { describe, expect, test } from 'vitest'
import { getFrameToParse, getFramesIndexCommand, getFramesIndexListening, parser } from '../../../src/firmware/1.0.2'
import { API_START, CLOCK_ROUND, CLOCK_SET, FACTORY_RESET, FIRMWARE_START, FLAGS_COMMAND, FLAGS_LISTENING, FREQUENCY_START, LOG_INTERVAL_START, PING_END, PING_START, PROTOCOLS_START, RESTART_DEVICE, SAMPLE_START, SERIAL_NUMBER_START, TIMESTAMP_START, UPGRADE_FIRMWARE } from '../../../src/constants'

// Listening
const receiverSerialNumber = '1000042' as const
const listeningEmitter = `$${receiverSerialNumber},1551087572,897,OPs,15,32,33,69\r` as const
const listeningReceiver = `$${receiverSerialNumber},1551087600,TBR Sensor,280,3,8,69\r` as const
const listeningPing = `${PING_START}${receiverSerialNumber}${PING_END}` as const
const listeningRoundClock = CLOCK_ROUND
const listeningSetClock = CLOCK_SET
// Command
const commandSerialNumber = `${SERIAL_NUMBER_START}${receiverSerialNumber}` as const
const commandFirmware = `${FIRMWARE_START}1.0.1` as const
const commandFrequency = `${FREQUENCY_START}70` as const
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
// Other
const garbage = 'lkashf'

describe('getFramesIndex', () => {

  test('listening', () => {
    [
      // sample - emitter
      [SAMPLE_START, garbage + listeningEmitter + listeningRoundClock + listeningPing + garbage + listeningReceiver + listeningSetClock],
      // sample - receiver
      [SAMPLE_START, garbage + listeningReceiver + listeningRoundClock + listeningPing + garbage + listeningEmitter + listeningSetClock],
      // ping
      [PING_START, garbage + listeningPing + listeningEmitter + listeningRoundClock + garbage + listeningReceiver + listeningSetClock],
      // roundClock
      [CLOCK_ROUND, garbage + listeningRoundClock + listeningEmitter + listeningPing + garbage + listeningReceiver + listeningSetClock],
      // setClock
      [CLOCK_SET, garbage + listeningSetClock + listeningEmitter + listeningPing + garbage + listeningReceiver + listeningRoundClock],
    ].forEach(([flagStart, fr]) => {
      const output = getFramesIndexListening(fr)
      expect(output).not.toBeNull()
      if (output !== null) {
        const { index, flag, last } = output
        expect(index).toBe(garbage.length)
        expect(FLAGS_LISTENING.includes(flag as typeof FLAGS_LISTENING[number])).toBeTruthy()
        expect(flag).toBe(flagStart)
        expect(last).toBeFalsy()
      }
    })
  })

  test('command', () => {
    [
      // serial number
      [SERIAL_NUMBER_START, garbage + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset + commandUpgradeFirmware],
      // firmware
      [FIRMWARE_START, garbage + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset + commandUpgradeFirmware + commandSerialNumber],
      // frequency
      [FREQUENCY_START, garbage + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset + commandUpgradeFirmware + commandSerialNumber + commandFirmware],
      // log intervals
      [LOG_INTERVAL_START, garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset + commandUpgradeFirmware + commandSerialNumber + commandFirmware + commandFrequency + garbage],
      // listening protocols
      [PROTOCOLS_START, garbage + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset + commandUpgradeFirmware + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval],
      // device time
      [TIMESTAMP_START, garbage + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset + commandUpgradeFirmware + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols],
      // api
      [API_START, garbage + commandAPI + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + garbage + commandRestart + commandFactoryReset + commandUpgradeFirmware],
      // restart device
      [RESTART_DEVICE, garbage + commandRestart + commandAPI + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandFactoryReset + commandUpgradeFirmware],
      // factory reset
      [FACTORY_RESET, garbage + commandFactoryReset + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandUpgradeFirmware],
      // upgrade firmware
      [UPGRADE_FIRMWARE, garbage + commandUpgradeFirmware + commandSerialNumber + commandFirmware + commandFrequency + garbage + commandLogInterval + commandProtocols + commandTimestamp + commandAPI + garbage + commandAPI + commandRestart + commandFactoryReset],
    ].forEach(([flagStart, fr]) => {
      const output = getFramesIndexCommand(fr)
      expect(output).not.toBeNull()
      if (output !== null) {
        const { index, flag, last } = output
        expect(index).toBe(garbage.length)
        expect(FLAGS_COMMAND.includes(flag as typeof FLAGS_COMMAND[number])).toBeTruthy()
        expect(flag).toBe(flagStart)
        expect(last).toBeFalsy()
      }
    })
  })

})

describe('getFrameToParse', () => {

  test('listening + command without Ping-SerialNumber conflict', () => {
    const index = garbage.length
    ;[
      // LISTENING - sample - emitter
      [{ index, flag: SAMPLE_START, last: false, mode: 'listening' }, garbage + listeningEmitter + commandAPI],
      // LISTENING - sample - receiver
      [{ index, flag: SAMPLE_START, last: false, mode: 'listening' }, garbage + listeningReceiver + commandLogInterval],
      // LISTENING - ping
      [{ index, flag: PING_START, last: false, mode: 'listening' }, garbage + listeningPing + commandSerialNumber],
      // LISTENING - roundClock
      [{ index, flag: CLOCK_ROUND, last: false, mode: 'listening' }, garbage + listeningRoundClock + commandProtocols],
      // LISTENING - setClock
      [{ index, flag: CLOCK_SET, last: false, mode: 'listening' }, garbage + listeningSetClock + commandFrequency],
      // COMMAND - serial number
      [{ index, flag: SERIAL_NUMBER_START, last: false, mode: 'command' }, garbage + commandSerialNumber + listeningEmitter],
      // COMMAND - firmware
      [{ index, flag: FIRMWARE_START, last: false, mode: 'command' }, garbage + commandFirmware + listeningReceiver],
      // COMMAND - frequency
      [{ index, flag: FREQUENCY_START, last: false, mode: 'command' }, garbage + commandFrequency + listeningPing],
      // COMMAND - log intervals
      [{ index, flag: LOG_INTERVAL_START, last: false, mode: 'command' }, garbage + commandLogInterval + listeningRoundClock],
      // COMMAND - listening protocols
      [{ index, flag: PROTOCOLS_START, last: false, mode: 'command' }, garbage + commandProtocols + listeningSetClock],
      // COMMAND - device time
      [{ index, flag: TIMESTAMP_START, last: false, mode: 'command' }, garbage + commandTimestamp + listeningReceiver],
      // COMMAND - api
      [{ index, flag: API_START, last: false, mode: 'command' }, garbage + commandAPI + listeningEmitter],
      // COMMAND - restart device
      [{ index, flag: RESTART_DEVICE, last: false, mode: 'command' }, garbage + commandRestart + listeningRoundClock],
      // COMMAND - factory reset
      [{ index, flag: FACTORY_RESET, last: false, mode: 'command' }, garbage + commandFactoryReset + listeningSetClock],
      // COMMAND - upgrade firmware
      [{ index, flag: UPGRADE_FIRMWARE, last: false, mode: 'command' }, garbage + commandUpgradeFirmware + listeningPing]
    ].forEach(([response, frame]) => {
      const output = getFrameToParse(frame as string)
      expect(output).not.toBeNull()
      if (output !== null) {
        if(output.last) {
          console.log(frame)
        }
        expect(output).toEqual(response)
      }
    })
  })

  test('listening + command with Ping-SerialNumber conflict', () => {
    const index = garbage.length
    ;[
      // LISTENING - ping
      [{ index, flag: PING_START, last: false, mode: 'listening' }, garbage + listeningPing + commandSerialNumber],
      // COMMAND - serial number
      [{ index, flag: SERIAL_NUMBER_START, last: false, mode: 'command' }, garbage + commandSerialNumber + listeningEmitter],
    ].forEach(([response, frame]) => {
      const output = getFrameToParse(frame as string)
      expect(output).not.toBeNull()
      if (output !== null) {
        expect(output).toEqual(response)
      }
    })
  })

  test('last frame', () => {
    const index = garbage.length
    ;[
      // LISTENING - sample - emitter
      [{ index, flag: SAMPLE_START, last: true, mode: 'listening' }, garbage + listeningEmitter],
      // LISTENING - sample - receiver
      [{ index, flag: SAMPLE_START, last: true, mode: 'listening' }, garbage + listeningReceiver],
      // LISTENING - ping
      [{ index, flag: PING_START, last: true, mode: 'listening' }, garbage + listeningPing],
      // LISTENING - roundClock
      [{ index, flag: CLOCK_ROUND, last: true, mode: 'listening' }, garbage + listeningRoundClock],
      // LISTENING - setClock
      [{ index, flag: CLOCK_SET, last: true, mode: 'listening' }, garbage + listeningSetClock],
      // COMMAND - serial number
      [{ index, flag: SERIAL_NUMBER_START, last: true, mode: 'command' }, garbage + commandSerialNumber],
      // COMMAND - firmware
      [{ index, flag: FIRMWARE_START, last: true, mode: 'command' }, garbage + commandFirmware],
      // COMMAND - frequency
      [{ index, flag: FREQUENCY_START, last: true, mode: 'command' }, garbage + commandFrequency],
      // COMMAND - log intervals
      [{ index, flag: LOG_INTERVAL_START, last: true, mode: 'command' }, garbage + commandLogInterval],
      // COMMAND - listening protocols
      [{ index, flag: PROTOCOLS_START, last: true, mode: 'command' }, garbage + commandProtocols],
      // COMMAND - device time
      [{ index, flag: TIMESTAMP_START, last: true, mode: 'command' }, garbage + commandTimestamp],
      // COMMAND - api
      [{ index, flag: API_START, last: true, mode: 'command' }, garbage + commandAPI],
      // COMMAND - restart device
      [{ index, flag: RESTART_DEVICE, last: true, mode: 'command' }, garbage + commandRestart],
      // COMMAND - factory reset
      [{ index, flag: FACTORY_RESET, last: true, mode: 'command' }, garbage + commandFactoryReset],
      // COMMAND - upgrade firmware
      [{ index, flag: UPGRADE_FIRMWARE, last: true, mode: 'command' }, garbage + commandUpgradeFirmware]
    ].forEach(([response, frame]) => {
      const output = getFrameToParse(frame as string)
      expect(output).not.toBeNull()
      if (output !== null) {
        if (!output.last) {
          console.log("output")
          console.log(output)
        }
        expect(output).toEqual(response)
      }
    })
  })
})

describe('parse', () => {

  test('happy path', () => {
    [
      `${garbage}${listeningRoundClock}${listeningEmitter}${listeningPing}${garbage}${listeningReceiver}${listeningSetClock}`,
      `${garbage}${listeningSetClock}${listeningEmitter}${listeningPing}${garbage}${listeningReceiver}${listeningRoundClock}`,
      `${garbage}${listeningPing}${listeningEmitter}${listeningRoundClock}${garbage}${listeningReceiver}${listeningSetClock}`,
      `${garbage}${listeningEmitter}${listeningRoundClock}${listeningPing}${garbage}${listeningReceiver}${listeningSetClock}`,
      `${garbage}${listeningReceiver}${listeningRoundClock}${listeningPing}${garbage}${listeningEmitter}${listeningSetClock}`,
    ].forEach((fr) => {
      const { frames, nonparsed, firmwareChange } = parser(fr)
      expect(frames).toHaveLength(5)
      expect(nonparsed).toHaveLength(0)
      expect(firmwareChange).toBeFalsy()
    })
  })

  test('happy path with ping in the middle', () => {
    [
      `${garbage}${listeningRoundClock}${listeningEmitter}${listeningPing}${garbage}${listeningReceiver}${listeningSetClock}`,
      `${garbage}${listeningSetClock}${listeningEmitter}${listeningPing}${garbage}${listeningReceiver}${listeningRoundClock}`,
      `${garbage}${listeningPing}${listeningEmitter}${listeningRoundClock}${garbage}${listeningReceiver}${listeningSetClock}`,
      `${garbage}${listeningEmitter}${listeningRoundClock}${listeningPing}${garbage}${listeningReceiver}${listeningSetClock}`,
      `${garbage}${listeningReceiver}${listeningRoundClock}${listeningPing}${garbage}${listeningReceiver}${listeningSetClock}`,
    ].forEach((fr) => {
      const { frames, nonparsed, firmwareChange } = parser(fr)
      expect(frames).toHaveLength(5)
      expect(nonparsed).toHaveLength(0)
      expect(firmwareChange).toBeFalsy()
    })
  })
})
