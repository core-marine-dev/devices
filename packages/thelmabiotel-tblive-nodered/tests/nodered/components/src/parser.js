const { TBLive: Parser } = require('@coremarine/thelmabiotel-tblive')

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
      parser.memory = config.memory
    } catch (err) {
      node.error(err, 'problem setting up TBLive parser')
    }
    // Input
    node.on('input', (msg, send, done) => {
      let error = null
      try {
        const { payload, memory } = msg
        // Memory
        if (memory !== undefined) {
          console.log('Using memory from msg:', memory)
          parser.memory = memory
        }
        msg.memory = parser.memory
        msg.firmwares = parser.firmwares
        // Payload
        if (payload) {
          msg.payload = parser.parseData(payload)
        }
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
