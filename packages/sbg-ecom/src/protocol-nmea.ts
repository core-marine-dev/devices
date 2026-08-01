// installed
import { NMEAParser } from '@coremarine/nmea-parser'
import type { CMA } from '@coremarine/protocol-core'

/* The NMEA half of the stream.

   An SBG device does NOT wrap its NMEA output in an eCom frame. §2.1.4 says so for
   all three NMEA/third-party classes: "This class is only used for identification
   purpose and does not contain any sbgECom message" — the class ids exist so you can
   CONFIGURE which sentence goes out, not to carry it. The sentences arrive as plain
   ASCII interleaved with the binary frames on the same wire, which §2.1.1 Note 4
   also warns about: "It belongs to the user to decode the different formats if
   several protocols are used at the same time."

   MEASURED, not inferred: `tests/fixtures/stream-mixed.bin` holds three `$GPGGA`
   sentences sitting between binary frames with ZERO gap on either side, and every
   frame in the source capture is class 0 — the device never wrapped one.

   ⚠️ THIS PARSER MUST NEVER HOLD A TAIL. `SBGParser` owns the one buffer; if this
   one also kept an unterminated sentence, the continuation would be parsed twice
   when the next chunk arrived. So it runs with `memory: false` and is handed only
   text runs the caller has already delimited — and the caller checks `buffer`
   afterwards and reports anything left over rather than letting it vanish. */

class SBGNMEAParser extends NMEAParser {
  constructor() {
    // memory: false — see the note above. The buffer limit is the facade's job.
    super({ memory: false })
  }
}

export interface NMEARun {
  sentences: CMA[]
  // Whatever nmea-parser could not finish. Non-empty means the run we handed it was
  // not self-contained, which is a bug in the caller's delimiting — so it is
  // returned rather than swallowed, and the caller reports it as garbage.
  leftover: string
}

export const createNMEAParser = (): NMEAParser => new SBGNMEAParser()

// Parse one delimited run of ASCII. Returns the sentences plus anything the parser
// still had pending, which for a correctly delimited run is ''.
export const parseRun = (parser: NMEAParser, run: string): NMEARun => {
  const sentences = parser.parseData(run)
  return { sentences, leftover: parser.buffer }
}
