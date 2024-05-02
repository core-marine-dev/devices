const { SBFParser: Parser } = require('@coremarine/sbf-parser')

const isString = value => (typeof value === 'string' || value instanceof String)
const isBoolean = value => (typeof value === "boolean")

module.exports = function(RED) {
  // Component
  function SBFParser(config) {
    RED.nodes.createNode(this, config)
    const node = this
    // Logic
    let parser = null
    try {
      const { name, firmware, memory } = config
      Object.assign(node, { name, firmware, memory })
      parser = new Parser(firmware, memory)
    } catch (err) {
      node.error(err, 'problem setting up SBF parser')
    }
    // Input
    node.on('input', (msg, send, done) => {
      let error = null
      const { command, payload } = msg
      switch(command) {
        // DATA --------------------------------------
        case 'addData':
          if (Buffer.isBuffer(payload)) { parser.addData(payload) }
          send(null)
          break
        case 'getData':
          msg.payload = parser.getFrames()
          msg.firmware = node.firmware
          send(msg)
          break
        // FIRMWARE ---------------------------------
        case 'setFirmware':
          if (isString(payload)) {
            const previousFirmware = parser.firmware
            try {
              parser.firmware = payload
            } catch (err) {
              error = err
              parser.firmware = previousFirmware
            }
          }
          send(null)
          break
        case 'getFirmware':
          msg.payload = parser.firmware
          send(msg)
          break
        // MEMORY ------------------------------------
        case 'setMemory':
          if (isBoolean(payload)) { parser.memory = memory }
          send(null)
          break
        case 'getMemory':
          msg.payload = parser.memory
          send(msg)
          break
      }
      // Finish
      if (done) { (error === null ) ? done() : done(error) }
    })
  }
  // Register
  RED.nodes.registerType('septentrio-parser', SBFParser)
}
