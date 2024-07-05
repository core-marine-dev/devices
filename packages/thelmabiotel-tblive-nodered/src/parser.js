const v = require('valibot')
const { TBLive: Parser, ReceiverSchema, EmitterSchema } = require('@coremarine/thelmabiotel-tblive')

// const isString = value => (typeof value === 'string' || value instanceof String)
// const isBoolean = value => (typeof value === 'boolean')
// const isNullOrUndefined = value => value === null || value === undefined

const setParser = (parser, config) => {
  parser.firmware = config.firmware
  // Receiver
  if (config.receiverRequired) {
    const receiver = v.parse(
      ReceiverSchema,
      {
        firmware: config.firmware,
        serialNumber: config.receiverSerialNumber
      }
    )
    // Emitters
    const emitters = []
    if (config.emitter1Required) {
      const emitter1 = v.parse(
        EmitterSchema,
        {
          serialNumber: config.emitter1SerialNumber,
          frequency: config.emitter1Frequency
        }
      )
      emitters.push(emitter1)
    }
    if (config.emitter2Required) {
      const emitter2 = v.parse(
        EmitterSchema,
        {
          serialNumber: config.emitter2SerialNumber,
          frequency: config.emitter2Frequency
        }
      )
      emitters.push(emitter2)
    }
    if (config.emitter3Required) {
      const emitter3 = v.parse(
        EmitterSchema,
        {
          serialNumber: config.emitter3SerialNumber,
          frequency: config.emitter3Frequency
        }
      )
      emitters.push(emitter3)
    }
    parser.receiver = (emitters.length === 0) ? { ...receiver } : v.parse(ReceiverSchema, { ...receiver, emitters })
  }
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
  function TBLiveParser (config) {
    RED.nodes.createNode(this, config)
    const node = this
    Object.assign(node, config)
    // Logic
    let parser = null
    try {
      parser = new Parser()
      setParser(parser, config)
    } catch (err) {
      node.error(err, 'problem setting up TBLive parser')
    }
    // Input
    node.on('input', (msg, send, done) => {
      let error = null
      try {
        const { payload } = msg
        // Payload
        msg.payload = parser.parseData(payload)
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
  RED.nodes.registerType('cma-thelmabiotel-tblive', TBLiveParser)
}
