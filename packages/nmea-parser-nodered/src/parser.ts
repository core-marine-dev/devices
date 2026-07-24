// built-in
import { readFileSync } from 'node:fs'

// installed
import { NMEAParser } from '@coremarine/nmea-parser'
import type { Node, NodeAPI, NodeDef } from 'node-red'

// coded
import { applyMemory, applyProtocols, cleanUndefined, getFakeSentence, getSentenceInfo, parsePayload } from './lib'

interface ParserConfig extends NodeDef {
  memory: boolean
  file?: string
}

const NODE_TYPE = 'cma-nmea-parser'

const readFile = (path: string): string => readFileSync(path, 'utf8')

const init = (RED: NodeAPI): void => {
  function NMEAParserNode(this: Node, config: ParserConfig): void {
    RED.nodes.createNode(this, config)
    const node = this
    const parser = new NMEAParser({ memory: config.memory ?? true })
    // Optional built-in protocols file, read at setup (node runs on Node.js).
    if (config.file) {
      try {
        const result = parser.addSentences(readFile(config.file))
        if (!result.success) node.error(`problem loading protocols file: ${result.error.message}`)
      } catch (err) {
        node.error(err as Error, {})
      }
    }
    node.on('input', (msg: Record<string, unknown>, send, done) => {
      try {
        msg.memory = applyMemory(parser, msg.memory as never)
        msg.protocols = applyProtocols(parser, msg.protocols as never, readFile)
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
  RED.nodes.registerType(NODE_TYPE, NMEAParserNode)
}

export = init
