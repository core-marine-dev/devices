const { SBGParser: Parser } = require('@coremarine/sbg-ecom')

const isString = value => typeof value === 'string' || value instanceof String
const isBoolean = value => typeof value === 'boolean' || value instanceof Boolean
const isNullOrUndefined = value => value === null || value === undefined
const isBuffer = value => Buffer.isBuffer(value)

const setParser = (parser, { memory, firmware }) => {
  if (isBoolean(memory)) {
    parser.memory = memory
  }
  if (isString(firmware)) {
    try {
      parser.firmware = firmware
    } catch (error) {
      console.error(`SBG Error: Invalid firmware ${firmware}`)
      console.error(error)
    }
  }
}

const getMemory = (parser, memory) => {
  // Not memory
  if (isNullOrUndefined(memory)) { return undefined }
  const { command, payload } = memory
  // Memory command
  if (!isNullOrUndefined(command)) {
    if (isString(command)) {
      // Memory set
      if (command === 'set') {
        if (!isBoolean(payload)) {
          return 'memory.payload should be boolean'
        }
        parser.memory = payload
        return {
          memory: parser.memory,
          characters: parser.bufferLimit
        }
      }
      // Memory get
      if (command === 'get') {
        return {
          memory: parser.memory,
          characters: parser.bufferLimit
        }
      }
    }
    return 'memory.command should be "get" or "set"'
  }
  // Invalid value
  return 'invalid memory input'
}

const getFirmware = (parser, firmware) => {
  // Not firmware
  if (isNullOrUndefined(firmware)) { return undefined }
  const { command, payload } = firmware
  // Firmware command
  if (!isNullOrUndefined(command)) {
    if (isString(command)) {
      // Firmware set
      if (command === 'set') {
        if (!isString(payload)) {
          return 'firmware.payload should be a string number'
        }
        try {
          parser.firmware = payload
          return { firmware: parser.firmware }
        } catch (error) {
          console.error(`invalid firmware -> ${firmware}`)
        }
      }
      // Firmware get
      if (command === 'get') {
        return { firmware: parser.firmware }
      }
    }
    return 'firmware.command should be "get" or "set"'
  }
  // Invalid value
  return 'invalid firmware input'
}

const getFirmwares = (parser, firmwares) => {
  // Not sentence
  if (isNullOrUndefined(firmwares)) { return undefined }
  // Sentence
  return parser.getAvailableFirmwares()
}

const getPayload = (parser, payload) => {
  // Not payload
  if (isNullOrUndefined(payload)) { return undefined }
  // Payload
  if (isBuffer(payload)) {
    parser.addData(payload)
    return parser.getFrames()
  }
  // Invalid payload
  return 'payload must be a Buffer'
}

const cleanUndefineds = (msg) => {
  Object.keys(msg).forEach(key => {
    if (msg[key] === undefined) {
      delete msg[key]
    }
  })
}

module.exports = function (RED) {
  // Component
  function SBGECom (config) {
    RED.nodes.createNode(this, config)
    const node = this
    Object.assign(node, config)
    // Logic
    let parser = null
    try {
      parser = new Parser()
      setParser(parser, config)
    } catch (err) {
      node.error(err, 'problem setting up NMEA parser')
    }
    // Input
    node.on('input', (msg, send, done) => {
      let error = null
      try {
        const { memory, firmwares, firmware, payload } = msg
        // Memory
        msg.memory = getMemory(parser, memory)
        if (msg.memory === undefined) { delete msg.memory }
        // Firmwares
        msg.firmwares = getFirmwares(parser, firmwares)
        // Firmware
        msg.firmware = getFirmware(parser, firmware)
        // Payload
        msg.payload = getPayload(parser, payload)
        // Clean undefined props
        cleanUndefineds(msg)
        // Send msg
        send(msg)
      } catch (err) {
        error = err
      } finally {
        // Finish
        if (done) { (error === null) ? done() : done(error) }
      }
    })
  }
  // Register
  RED.nodes.registerType('cma-sbg-ecom', SBGECom)
}
