// built-in
import { readFileSync } from 'node:fs'

// installed
import type { Node, NodeAPI, NodeDef } from 'node-red'
// TODO: import your wrapped library's parser class (e.g. NMEAParser, SBGParser…)
import { NMEAParser as Parser } from '@coremarine/TODO:'

// coded
import { applyMemory, cleanUndefined, parsePayload } from './lib'

interface ParserConfig extends NodeDef {
  memory: boolean
  file?: string // TODO: NMEA family only (built-in protocols file); drop if unused
}

// TODO: your node type — must match parser.html registerType + data-*-name
const NODE_TYPE = 'cma-TODO:'

const readFile = (path: string): string => readFileSync(path, 'utf8')

const init = (RED: NodeAPI): void => {
  function TemplateNode(this: Node, config: ParserConfig): void {
    RED.nodes.createNode(this, config)
    const node = this
    const parser = new Parser({ memory: config.memory ?? true })
    // TODO: NMEA family only — load a built-in protocols file at setup. Drop if unused.
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
        // TODO: wire any protocol-specific handlers here (see nmea-parser-nodered)
        msg.payload = parsePayload(parser, msg.payload)
        cleanUndefined(msg)
        send(msg)
        done()
      } catch (err) {
        done(err as Error)
      }
    })
  }
  RED.nodes.registerType(NODE_TYPE, TemplateNode)
}

export = init
