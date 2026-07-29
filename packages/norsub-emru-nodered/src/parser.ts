// built-in
import { readFileSync } from 'node:fs'

// installed
import type { NorsubProtocol } from '@coremarine/norsub-emru'
import { NorsubParser } from '@coremarine/norsub-emru'
import type { Node, NodeAPI, NodeDef } from 'node-red'

// coded
import { applyMemory, applyProtocol, applySentences, cleanUndefined, getFakeSentence, getSentenceInfo, parsePayload } from './lib'

interface ParserConfig extends NodeDef {
  protocol?: NorsubProtocol
  memory: boolean
  file?: string
}

const NODE_TYPE = 'cma-norsub-parser'

const readFile = (path: string): string => readFileSync(path, 'utf8')

const init = (RED: NodeAPI): void => {
  function NorsubParserNode(this: Node, config: ParserConfig): void {
    RED.nodes.createNode(this, config)
    const node = this
    // An invalid `protocol` falls back to the default inside the library, never throws.
    const parser = new NorsubParser({ memory: config.memory ?? true, protocol: config.protocol })
    // Optional extra sentence definitions, read at setup (the node runs on Node.js).
    if (config.file) {
      try {
        const result = parser.parser.addSentences(readFile(config.file))
        if (!result.success) node.error(`problem loading sentences file: ${result.error.message}`)
      } catch (err) {
        node.error(err as Error, {})
      }
    }
    node.on('input', (msg: Record<string, unknown>, send, done) => {
      try {
        msg.memory = applyMemory(parser, msg.memory as never)
        msg.protocol = applyProtocol(parser, msg.protocol as never)
        msg.sentences = applySentences(parser, msg.sentences as never, readFile)
        msg.sentence = getSentenceInfo(parser, msg.sentence)
        msg.fake = getFakeSentence(parser, msg.fake)
        msg.payload = parsePayload(parser, msg.payload)
        cleanUndefined(msg)
        send(msg)
        done()
      } catch (err) {
        done(err as Error)
      }
    })
  }
  RED.nodes.registerType(NODE_TYPE, NorsubParserNode)
}

export = init
