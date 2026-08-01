// coded
import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* ExtEvent -> Number: 5924 => "OnChange" interval: each time an event is detected

  §4.2.12 External Event Blocks report the state of the receiver applicable at the
  instant of a level transition on one of its "Event" pins. The receiver time is
  reported in the ExtEvent SBF block, and the receiver position in the
  ExtEventPVTCartesian and ExtEventPVTGeodetic blocks.

  If enabled, upon detection of an event, these three blocks are output in the
  following order, with no other SBF blocks in between them:
    1. ExtEvent
    2. ExtEventPVTCartesian
    3. ExtEventPVTGeodetic
  All blocks referring to the same event contain the same time stamp in the TOW and
  WNc fields.

  The ExtEvent block contains the time tag of a voltage transition on one of the
  "Event" input pins.

  ExtEvent -------------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  Source         uint8                    Input pin where this external event has been detected:
                                            1: EventA
                                            2: EventB
  Polarity       uint8                    0: rising edge event
                                          1: falling edge event
  Offset       float32    1 s             Event time offset with respect to TOW, including the potential delay specified
                                          with the setEventParameters command.
                                          The time of week of the external event is: t_ext,rx [s] = TOW/1000 + Offset
                                          t_ext,rx refers to the receiver system time scale. Use RxClkBias to convert
                                          this time to the GNSS time scale.
  RxClkBias    float64    1 s  -2 * 10¹⁰  Receiver clock bias at the time of event, relative to the time system of the
                                          last PVT computation (see the TimeSystem field of PVTCartesian/PVTGeodetic).
                                          To get the time of week of the external event in GNSS time, use:
                                          t_ext,GNSS [s] = TOW/1000 + Offset - RxClkBias.
                                          The accuracy of the clock bias depends on the age of the last PVT solution.
                                          When the receiver has been unable to compute a PVT during the last 10 minutes,
                                          this field is set to its Do-Not-Use value.
Rev 1 PVTAge    uint16    1 s             Age of the last PVT solution. Clipped to 600 s.
  Padding         uint                    Padding bytes

  ⚠️ THE TIME STAMP OF THIS BLOCK IS AN **EXTERNAL** ONE (Appendix B: "E"), not a
  receiver epoch: TOW/WNc are the instant the voltage transition happened. That is
  why `timestamp: 'external'` — and because an external stamp is a real instant (a
  pulse, unlike a signal-in-space time that can be an hour old), it IS promoted to
  cma.timestamp like a receiver stamp.
  Sub-millisecond precision lives in `Offset`, so the CMA timestamp is the
  millisecond-resolution instant and the exact one is TOW/1000 + Offset.
*/
const REVISION_0: readonly FieldDefinition[] = [
  { name: 'Source', type: 'uint8', description: 'Input pin the event was detected on: 1 EventA, 2 EventB' },
  { name: 'Polarity', type: 'uint8', description: 'Edge that triggered the event: 0 rising, 1 falling' },
  { name: 'Offset', type: 'float32', units: 's', description: 'Event time offset with respect to TOW, including any delay set with setEventParameters. The event time of week is TOW/1000 + Offset, in the receiver time scale' },
  { name: 'RxClkBias', type: 'float64', units: 's', doNotUse: DO_NOT_USE_FLOAT, description: 'Receiver clock bias at the event; subtract it from TOW/1000 + Offset for GNSS time. Do-Not-Use when no PVT has been computed for 10 minutes' },
]

const REVISION_1: readonly FieldDefinition[] = [
  ...REVISION_0,
  { name: 'PVTAge', type: 'uint16', units: 's', description: 'Age of the last PVT solution, clipped to 600 s — how much to trust RxClkBias' },
]

export const EVENT_SOURCE: Readonly<Record<number, string>> = { 1: 'EVENT_A', 2: 'EVENT_B' }
export const EVENT_POLARITY: Readonly<Record<number, string>> = { 0: 'RISING_EDGE', 1: 'FALLING_EDGE' }

const decoders: Readonly<Record<string, Decoder>> = {
  Source: (value) => label(EVENT_SOURCE, value),
  Polarity: (value) => label(EVENT_POLARITY, value),
}

export const extEvent: BlockDefinition = {
  name: 'ExtEvent',
  number: 5924,
  description: 'Time tag of a voltage transition on one of the receiver\'s Event input pins',
  timestamp: 'external',
  revisions: [REVISION_0, REVISION_1],
  decoders,
}
