// installed
import { TBLiveParser } from '@coremarine/thelmabiotel-tblive'
import type { Firmware } from '@coremarine/thelmabiotel-tblive'
import type { Node, NodeAPI, NodeDef } from 'node-red'

// coded
import { applyFirmware, applyMemory, cleanUndefined, getDefinition, getFakeSentence, getIds, parsePayload } from './lib'

interface ParserConfig extends NodeDef {
  firmware?: Firmware
  memory: boolean
}

// Unchanged from 1.x on purpose. Renaming it to match the `cma-<device>-parser` shape
// the other two wrappers use would make this node vanish from every deployed flow,
// which is not a trade worth making for naming symmetry.
const NODE_TYPE = 'cma-thelmabiotel-tblive'

const init = (RED: NodeAPI): void => {
  function TBLiveParserNode(this: Node, config: ParserConfig): void {
    RED.nodes.createNode(this, config)
    // An invalid `firmware` is discarded inside the library, which never throws —
    // the parser then starts at `unknown` and learns from the stream instead.
    const parser = new TBLiveParser({ memory: config.memory ?? true, firmware: config.firmware })
    this.on('input', (msg: Record<string, unknown>, send, done) => {
      try {
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
  RED.nodes.registerType(NODE_TYPE, TBLiveParserNode)
}

export = init
