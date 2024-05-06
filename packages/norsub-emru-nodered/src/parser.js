const { z } = require('zod')
const { NorsubParser: Parser } = require('@coremarine/norsub-emru')

const isString = value => z.string().safeParse(value).success
const isBoolean = value => z.boolean().safeParse(value).success
const isNullOrUndefined = value => value === null || value === undefined

const setParser = (parser, { memory, file }) => {
  if (isBoolean(memory)) {
    parser.memory = memory
  }
  if (file?.length) {
    parser.addProtocols({ file })
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
          return "memory.payload should be boolean"
        }
        parser.memory = payload
        return {
            memory: parser.memory,
            characters: parser.bufferLimit
        }
      }
      // Memory get
      if (command ==='get') {
        return {
          memory: parser.memory,
          characters: parser.bufferLimit
        }
      }
    }
    return "memory.command should be \"get\" or \"set\""
  }
  // Invalid value
  return "invalid memory input"
}

const getProtocols = (parser, _protocols) => {
  // Not protocols
  if (isNullOrUndefined(_protocols)) { return undefined }
  const { command, file, content, protocols } = _protocols
  // Protocols command
  if (!isNullOrUndefined(command)) {
    if (isString(command)) {
      // SET
      if (command === 'set') {
        parser.addProtocols({ file, content, protocols })
        return parser.getProtocols()
      }
      // GET
      if (command === 'get') {
        return parser.getProtocols()
      }
    }
    return "protocols.command should be \"get\" or \"set\""
  }
  // Invalid value
  return "invalid protocols input"

}

const getSentence = (parser, sentence) => {
  // Not sentence
  if (isNullOrUndefined(sentence)) { return undefined }
  // Sentence
  if (isString(sentence)) {
    return parser.getSentence(sentence)
  }
  // Invalid sentence
  return "sentence must be a string"
}

const getFake = (parser, id) => {
  // Not sentence
  if (isNullOrUndefined(id)) { return undefined }
  // Sentence
  if (isString(id)) {
    return parser.getFakeSentenceByID(id)
  }
  // Invalid sentence
  return "sentence id must be a string"
}

const getPayload = (parser, payload) => {
  // Not payload
  if (isNullOrUndefined(payload)) { return undefined }
  // Payload
  if (isString(payload)) {
    return parser.parseData(payload)
  }
  // Invalid payload
  return "payload must be an ASCII string"
}

const cleanUndefineds = (msg) => {
  Object.keys(msg).forEach(key => {
    if (msg[key] === undefined) {
      delete msg[key]
    }
  })
}

module.exports = function(RED) {
  // Component
  function NorsubParser(config) {
    RED.nodes.createNode(this, config)
    const node = this
    Object.assign(node, config)
    // Logic
    let parser = null
    try {
      parser = new Parser(true)
      setParser(parser, config)
    } catch (err) {
      node.error(err, 'problem setting up NorSub parser')
    }
    // Input
    node.on('input', (msg, send, done) => {
      let error = null
      try {
        const { memory, protocols, sentence, fake, payload } = msg
        // Memory
        msg.memory = getMemory(parser, memory)
        if (msg.memory === undefined) { delete msg.memory }
        // Protocols
        msg.protocols = getProtocols(parser, protocols)
        // Sentence
        msg.sentence = getSentence(parser, sentence)
        // Fake
        msg.fake = getFake(parser, fake)
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
        if (done) { (error === null ) ? done() : done(error) }
      }
    })
  }
  // Register
  RED.nodes.registerType('norsub-parser', NorsubParser)
}
