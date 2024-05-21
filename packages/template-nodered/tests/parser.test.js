const NMEAParser = require("../src/parser.js")

const should = require("should")

const helper = require("node-red-node-test-helper")
// helper.init(require.resolve('node-red'))

describe('nmea-parser Node', function() {

  // beforeEach(function (done) {
  //   helper.startServer(done);
  // });

  // afterEach(function (done) {
  //   helper.unload();
  //   helper.stopServer(done);
  // });
  afterEach(function () {
      helper.unload();
      // helper.stopServer(done);
  });

  it('Load component', (done) => {
    const flow = [
      { id: "n1", type: "nmea-parser", name: "NMEAParser" }
    ];

    helper.load(NMEAParser, flow, function () {
      const n1 = helper.getNode("n1");
      try {
        n1.should.have.property('name', 'NMEAParser');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  // it('Memory', () => {
  //   const flow = [
  //     { id: "n1", type: "nmea-parser", name: "NMEAParser", wires:[["n2"]] },
  //     { id: "n2", type: "helper" }
  //   ];

  //   helper.load(NMEAParser, flow, () => {
  //     const n1 = helper.getNode("n1");
  //     const n2 = helper.getNode("n2");

  //     // Read Memory output
  //     n2.on("input", (msg) => {
  //       msg.memory.should.to.have.property(memory)
  //       msg.memory.memory.should.be.Boolean()
  //       msg.memory.should.to.have.property(characters, 1024)
  //     })
      
  //     // Set Memory input
  //     n1.receive({ memory: { command: 'set', payload: false}})
  //     n1.receive({ memory: { command: 'set', payload: true}})
  //     n1.receive({ memory: { command: 'get' } })
  //   })
  // })

  // it('Protocols', () => {
  //   const flow = [
  //     { id: "n1", type: "nmea-parser", name: "NMEAParser", wires:[["n2"]] },
  //     { id: "n2", type: "helper" }
  //   ];

  //   helper.load(NMEAParser, flow, () => {
  //     const n1 = helper.getNode("n1");
  //     const n2 = helper.getNode("n2");

  //     // Read Memory output
  //     n2.on("input", (msg) => {
  //       // msg.memory.should.to.have.property(memory)
  //       console.log(msg)
  //       msg.protocols.should.be.Array()
  //       // msg.memory.should.to.have.property(characters, 1024)

  //     })
      
  //     // Set Memory input
  //     n1.receive({ protocols: { command: 'get' }})
  //     // n1.receive({ memory: { command: 'set', payload: true}})
  //     // n1.receive({ memory: { command: 'get' } })
  //   })
  // })

})
