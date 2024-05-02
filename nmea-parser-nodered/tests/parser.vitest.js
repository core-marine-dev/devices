import { describe, test, expect, afterEach, beforeAll } from 'vitest'
const helper = require("node-red-node-test-helper")
const NMEAParser = require("../src/parser.js")

// helper.init(require.resolve('node-red'))

describe('nmea-parser Node', function() {
  // beforeAll( () => {
  //   helper.init(require.resolve('node-red'))
  //   // console.log('helper')
  //   // console.log(helper)
  // })

  afterEach(() => {
    helper.unload();
  })

  test('Load component', async () => {
    const flow = [
      { id: "n1", type: "nmea-parser", name: "NMEAParser" }
    ]

    await helper.load(NMEAParser, flow, function () {
      const n1 = helper.getNode("n1")
      // n1.should.have.property('name')
      expect(n1).toHaveProperty('name', 'NMEAParser')
    })
  })

  test.skip('Memory', async () => {
    const flow = [
      { id: "n1", type: "nmea-parser", name: "NMEAParser", wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];

    await helper.load(NMEAParser, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");

      // Read Memory output
      n2.on("input", (msg) => {
        try {
          expect(msg.memory).toHaveProperty(memory)
          expect(msg.memory.memory).toBeTypeOf(Boolean)
          expect(msg.memory).toHaveProperty(characters, 1024)
        } catch (err) {
          console.error(err)
        }
        return null
      })
      
      // Set Memory input
      n1.receive({ memory: { command: 'set', payload: false}})
      // n1.receive({ memory: { command: 'set', payload: true}})
      // n1.receive({ memory: { command: 'get' } })
    })
  })

  test.skip('should inject data & parse', (done) => {
    const flow = [
      { id: "n1", type: "nmea-parser", name: "NMEAParser", wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load(NMEAParser, flow, function() {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      // Read Parsed data
      const response = sbfSample.output
      n2.on("input", function(msg) {
        expect(msg.payload).to.deep.equalInAnyOrder(response);
        done();
      });
      
      // Add data
      const data = sbfSample.input
      n1.receive({ command: 'addData', payload: data });
      // Parse
      n1.receive({ command: 'getData'})
    });
  });
});
