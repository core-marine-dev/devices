// installed
import { SeptentrioParser } from '@coremarine/septentrio-sbf'
import type { Node, NodeAPI, NodeDef } from 'node-red'

// coded
import { applyFirmware, applyMemory, applyProtocol, cleanUndefined, getDefinition, getFakeSentence, getIds, parsePayload } from './lib'

interface ParserConfig extends NodeDef {
  firmware?: string
  memory: boolean
}

// Unchanged from 1.x on purpose. It already matches the `cma-<device>-parser` shape the
// nmea and norsub wrappers use, and renaming it would make this node vanish from every
// deployed flow — not a trade worth making.
const NODE_TYPE = 'cma-septentrio-parser'

const init = (RED: NodeAPI): void => {
  function SeptentrioParserNode(this: Node, config: ParserConfig): void {
    RED.nodes.createNode(this, config)
    // An unsupported `firmware` is discarded inside the library, which never throws — the
    // parser keeps its default and lets `ReceiverSetup` correct it from the stream.
    const parser = new SeptentrioParser({ memory: config.memory ?? true, firmware: config.firmware })
    this.on('input', (msg: Record<string, unknown>, send, done) => {
      try {
        // Order matters: the control channels are applied BEFORE the payload, so a
        // message that both reconfigures and feeds data parses under the new settings.
        msg.memory = applyMemory(parser, msg.memory as never)
        msg.protocol = applyProtocol(parser, msg.protocol as never)
        msg.firmware = applyFirmware(parser, msg.firmware as never)
        msg.ids = getIds(parser, msg.ids)
        msg.definition = getDefinition(parser, msg.definition)
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
  RED.nodes.registerType(NODE_TYPE, SeptentrioParserNode)
}

export = init
