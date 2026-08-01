// installed
import { SBGParser } from '@coremarine/sbg-ecom'
import type { Node, NodeAPI, NodeDef } from 'node-red'

// coded
import { applyFirmware, applyMemory, cleanUndefined, getDefinition, getFakeSentence, getIds, parsePayload } from './lib'

interface ParserConfig extends NodeDef {
  firmware?: string
  memory: boolean
}

// Unchanged from 0.0.x on purpose: renaming it would make this node vanish from every
// deployed flow, which is not a trade worth making for a tidier name.
const NODE_TYPE = 'cma-sbg-ecom'

const init = (RED: NodeAPI): void => {
  function SBGParserNode(this: Node, config: ParserConfig): void {
    RED.nodes.createNode(this, config)
    // An unsupported `firmware` is discarded inside the library, which never throws —
    // the 0.0.x wrapper needed a try/catch here precisely because the old one did.
    const parser = new SBGParser({ memory: config.memory ?? true, firmware: config.firmware })
    this.on('input', (msg: Record<string, unknown>, send, done) => {
      try {
        // Order matters: the control channels are applied BEFORE the payload, so a
        // message that both reconfigures and feeds data parses under the new settings.
        msg.memory = applyMemory(parser, msg.memory as never)
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
  RED.nodes.registerType(NODE_TYPE, SBGParserNode)
}

export = init
