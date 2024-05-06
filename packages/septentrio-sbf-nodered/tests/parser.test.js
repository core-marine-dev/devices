const helper = require("node-red-node-test-helper")
const SBFParser = require("../src/parser.js")
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const chai = require('chai');

chai.use(deepEqualInAnyOrder);

const { expect } = chai;

const sbfSample = {
  input: Buffer.from([36, 64, 221, 226, 167, 79, 96, 0, 112, 136, 215, 27, 219, 8, 1, 0, 25, 100, 17, 79, 149, 146, 230, 63, 244, 255, 188, 118, 114, 163, 176, 191, 198, 152, 182, 50, 84, 16, 133, 64, 236, 186, 78, 66, 229, 135, 156, 187, 164, 172, 80, 56, 99, 167, 142, 187, 249, 2, 149, 208, 184, 78, 200, 18, 157, 251, 197, 191, 7, 245, 17, 190, 0, 19, 6, 0, 246, 3, 100, 0, 9, 9, 0, 0, 1, 1, 0, 0, 75, 0, 44, 3, 174, 7, 96, 0]),
  output: [
    {
      frame: {
        header: {
          sync: "$@",
          crc: 58077,
          id: {
            blockNumber: 4007,
            blockRevision: 2,
          },
          length: 96,
        },
        time: {
          tow: 467110000,
          wnc: 2267,
          timestamp: 2154156400000,
          date: "2038-04-06T08:46:40.000Z",
        },
        body: {
          revision: 2,
          mode: 1,
          error: 0,
          latitude: 0.7053934616370753,
          longitude: -0.06499400519260218,
          height: 674.0411123528836,
          undulation: 51.68254089355469,
          vn: -0.004776942078024149,
          ve: 0.000049751848564483225,
          vu: -0.004353450145572424,
          cog: null,
          rxClkBias: -0.17174113671409486,
          rxClkDrift: -0.14253626763820648,
          timeSystem: 0,
          datum: 19,
          nrSV: 6,
          waCorrInfo: null,
          referenceID: 1014,
          meanCorrAge: 100,
          signalInfo: 2313,
          alertFlag: 1,
          padding: null,
          metadata: {
            mode: {
              pvtSolution: "STANDALONE",
              reserved45: 0,
              determiningPosition: false,
              flag2D3D: false,
            },
            error: "NO_ERROR",
            timesytem: "GPS",
            datum: "DGNSS/RTK base station",
            waCorrInfo: null,
            signalInfo: {
              "0": {
                signal: "L1CA",
                constellation: "GPS",
                carrierFrequency: 1575.42,
                rinexCode: "1C",
              },
              "3": {
                signal: "L2C",
                constellation: "GPS",
                carrierFrequency: 1227.6,
                rinexCode: "2L",
              },
              "8": {
                signal: "L1CA",
                constellation: "GLONASS",
                carrierFrequency: 1602,
                rinexCode: "1C",
              },
              "11": {
                signal: "L2CA",
                constellation: "GLONASS",
                carrierFrequency: 1246,
                rinexCode: "2C",
              },
            },
            alertFlag: {
              raimIntegrityFlag: "RAIM_SUCCESSFULL",
              galileoIntegrityFailed: false,
              galileoIonosphericStorm: false,
              reserved4: false,
              reserved57: 0,
            },
            pppInfo: null,
            misc: {
              baselinePointingBasestationARP: false,
              phaseCenterOffsetCompensated: false,
              propietary2: false,
              propietary3: false,
              propietary45: 2,
              arpPosition: "ARP-to-marker offset is zero",
            },
          },
          nrBases: 1,
          pppInfo: null,
          latency: 75,
          hAccuracy: 812,
          vAccuracy: 1966,
          misc: 96,
        },
      },
      buffer: Buffer.from([36, 64, 221, 226, 167, 79, 96, 0, 112, 136, 215, 27, 219, 8, 1, 0, 25, 100, 17, 79, 149, 146, 230, 63, 244, 255, 188, 118, 114, 163, 176, 191, 198, 152, 182, 50, 84, 16, 133, 64, 236, 186, 78, 66, 229, 135, 156, 187, 164, 172, 80, 56, 99, 167, 142, 187, 249, 2, 149, 208, 184, 78, 200, 18, 157, 251, 197, 191, 7, 245, 17, 190, 0, 19, 6, 0, 246, 3, 100, 0, 9, 9, 0, 0, 1, 1, 0, 0, 75, 0, 44, 3, 174, 7, 96, 0]),
      number: 4007,
      version: 2,
      name: "PVTGeodetic",
    },
  ]
}

describe('septentrio-parser Node', function () {

  afterEach(function () {
    helper.unload();
  });

  it('should be loaded', function(done){
    const flow = [
      { id: "n1", type: "septentrio-parser", name: "Septentrio" }
    ]; 
    helper.load(SBFParser, flow, function() {
      const n1 = helper.getNode("n1");
      n1.should.have.property('name', 'Septentrio');
      done();
    });
  });

  it('should inject data & parse', (done) => {
    const flow = [
      { id: "n1", type: "septentrio-parser", name: "Septentrio", wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load(SBFParser, flow, function() {
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
