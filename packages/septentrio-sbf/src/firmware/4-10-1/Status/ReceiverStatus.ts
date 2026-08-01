// coded
import { DO_NOT_USE_UINT8 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, label } from '../../../utils'

/* ReceiverStatus -> Number: 4014 => "OnChange" interval: 1s
  The ReceiverStatus block provides general information on the status of the
  receiver.

  ReceiverStatus -------------------------------------------------------------
  Block fields   Type   Units  Do-Not-Use  Description
  CPULoad       uint8     1 %         255  Load on the receiver's CPU. The load should stay below 80% in normal
                                           operation. Higher loads might result in data loss.
  ExtError      uint8                      Bit field reporting external errors, i.e. errors detected in external data.
                                           Upon detection of an error, the corresponding bit is set for a duration of
                                           one second, and then resets.
                                             Bit 0:    SISERROR: set if a violation of the signal-in-space ICD has been
                                                       detected for at least one satellite while that satellite is reported
                                                       as healthy. Use the command "lif, SisError" for details.
                                             Bit 1:    DIFFCORRERROR: set when an anomaly has been detected in an
                                                       incoming differential correction stream, causing the receiver to
                                                       fail to decode the corrections. Use "lif, DiffCorrError".
                                             Bit 2:    EXTSENSORERROR: set when a malfunction has been detected on at
                                                       least one of the external sensors connected to the receiver.
                                                       Use "lif, ExtSensorError".
                                             Bit 3:    SETUPERROR: set when a configuration/setup error has been
                                                       detected. An example of such error is when a remote NTRIP Caster
                                                       is not reachable. Use "lif, SetupError".
                                             Bits 4-7: Reserved
  UpTime       uint32     1 s              Number of seconds elapsed since the start-up of the receiver, or since the
                                           last reset.
  RxState      uint32                      Bit field indicating the status of key components of the receiver:
                                             Bit  0: Reserved
                                             Bit  1: ACTIVEANTENNA: set when an active antenna is sensed at the main
                                                     antenna connector.
                                             Bit  2: EXT_FREQ: set if an external frequency reference is detected at the
                                                     10 MHz input, cleared if the receiver uses its own internal clock.
                                             Bit  3: EXT_TIME: set if a pulse has been detected on the TimeSync input.
                                             Bit  4: WNSET: see the corresponding bit in ReceiverTime's SyncLevel.
                                             Bit  5: TOWSET: see the corresponding bit in ReceiverTime's SyncLevel.
                                             Bit  6: FINETIME: see the corresponding bit in ReceiverTime's SyncLevel.
                                             Bit  7: INTERNALDISK_ACTIVITY: set for one second each time data is logged
                                                     to the internal disk (DSK1). Continuous above 1 Hz.
                                             Bit  8: INTERNALDISK_FULL: set when the internal disk (DSK1) is full — a
                                                     disk is full when it is filled to 95% of its total capacity.
                                             Bit  9: INTERNALDISK_MOUNTED: set when the internal disk (DSK1) is mounted.
                                             Bit 10: INT_ANT: set when the GNSS RF signal is taken from the internal
                                                     antenna input, cleared when it comes from the external one.
                                             Bit 11: REFOUT_LOCKED: if set, the 10-MHz frequency provided at the REF OUT
                                                     connector is locked to GNSS time. Otherwise it is free-running.
                                             Bit 12: LBAND_ANT: set when the L-band signal is tracked from the dedicated
                                                     L-band antenna.
                                             Bit 13: EXTERNALDISK_ACTIVITY: as bit 7, for the external disk (DSK2).
                                             Bit 14: EXTERNALDISK_FULL: as bit 8, for the external disk (DSK2).
                                             Bit 15: EXTERNALDISK_MOUNTED: as bit 9, for the external disk (DSK2).
                                             Bit 16: PPS_IN_CAL: set when PPS IN delay calibration is on-going. Only
                                                     applicable to PolaRx5TR receivers.
                                             Bit 17: DIFFCORR_IN: set for one second each time differential corrections
                                                     are decoded. Continuous above 1 Hz.
                                             Bit 18: INTERNET: set when the receiver has internet access. If not set,
                                                     there is either no internet access, or the receiver could not
                                                     reliably determine the status.
                                             Bits 19-31: Reserved
  RxError      uint32                      Bit field indicating whether an error occurred previously. If this field is
                                           not equal to zero, at least one error has been detected.
                                             Bits 0-2: Reserved
                                             Bit  3: SOFTWARE: set upon detection of a software warning or error. This
                                                     bit is reset by the command "lif, error".
                                             Bit  4: WATCHDOG: set when the watchdog expired at least once since the
                                                     last power-on.
                                             Bit  5: ANTENNA: set when an antenna overcurrent condition is detected.
                                             Bit  6: CONGESTION: set when an output data congestion has been detected on
                                                     at least one of the communication ports during the last second.
                                             Bit  7: Reserved
                                             Bit  8: MISSEDEVENT: set when an external event congestion has been
                                                     detected during the last second. It indicates that the receiver is
                                                     receiving too many events on its EVENTx pins.
                                             Bit  9: CPUOVERLOAD: set when the CPU load is larger than 90%.
                                             Bit 10: INVALIDCONFIG: set if one or more configuration file (e.g.
                                                     permissions) is invalid or absent.
                                             Bit 11: OUTOFGEOFENCE: set if the receiver is currently out of its
                                                     permitted region of operation (geofencing).
                                             Bits 12-31: Reserved
  N            uint8                       Number of AGCState sub-blocks this block contains.
  SBLength     uint8    1 byte             Length of a AGCState sub-block.
  CmdCount     uint8                    0  Command cyclic counter, incremented each time a command is entered that
                                           changes the receiver configuration. After the counter has reached 255, it
                                           resets to 1.
  Temperature  uint8     1 °C           0  Not applicable.
  AGCState                                 A succession of N AGCState sub-blocks
  Padding       uint                       Padding bytes

  AGCState -------------------------------------------------------------------
  Block fields   Type   Units  Do-Not-Use  Description
  FrontEndID    uint8                      Bit field indicating the frontend code and antenna ID:
                                             Bits 0-4: frontend code:
                                               0: GPSL1/E1     1: GLOL1     2: E6        3: GPSL2
                                               4: GLOL2        5: L5/E5a    6: E5b/B2I   7: E5(a+b)
                                               8: Combined GPS/GLONASS/SBAS/Galileo L1
                                               9: Combined GPS/GLONASS L2
                                              10: MSS/L-band  11: B1I      12: B3I      13: S-band
                                             Bits 5-7: Antenna ID: 0 for main, 1 for Aux1 and 2 for Aux2
  Gain           int8    1 dB        -128  AGC gain, in dB. The Do-Not-Use value indicates that the frontend PLL is
                                           not locked.
  SampleVar     uint8                   0  Normalized variance of the IF samples. The nominal value is 100.
  BlankingStat  uint8     1 %             Current percentage of samples being blanked by the pulse blanking unit.
                                           This field is always 0 for a receiver without a pulse blanking unit.
  Padding        uint                      Padding bytes

  Revision 1 (which is what real receivers send) changes only the MEANING of
  RxError bits, not the layout — hence two identical entries in `revisions`,
  which is how this table says "revision 1 is known" without claiming a
  degraded decode.

  Layout verified against a real 4014.1 frame: 18 fixed bytes + N(=14) × 4 =
  74-byte body, matching the frame's own Length of 88 exactly.
*/
const AGC_STATE: readonly FieldDefinition[] = [
  { name: 'FrontEndID', type: 'uint8', description: 'Bit field: bits 0-4 frontend code, bits 5-7 antenna ID (0 main, 1 Aux1, 2 Aux2)' },
  { name: 'Gain', type: 'int8', units: 'dB', doNotUse: -128, description: 'AGC gain; Do-Not-Use means the frontend PLL is not locked' },
  { name: 'SampleVar', type: 'uint8', doNotUse: 0, description: 'Normalized variance of the IF samples; the nominal value is 100' },
  { name: 'BlankingStat', type: 'uint8', units: '%', description: 'Percentage of samples being blanked by the pulse blanking unit; always 0 without one' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'CPULoad', type: 'uint8', units: '%', doNotUse: DO_NOT_USE_UINT8, description: 'Load on the receiver CPU; should stay below 80% in normal operation, higher loads might result in data loss' },
  { name: 'ExtError', type: 'uint8', description: 'Bit field of errors detected in EXTERNAL data: bit 0 signal-in-space, bit 1 differential corrections, bit 2 external sensor, bit 3 setup. Each stays set for one second' },
  { name: 'UpTime', type: 'uint32', units: 's', description: 'Seconds elapsed since receiver start-up or the last reset' },
  { name: 'RxState', type: 'uint32', description: 'Bit field with the status of key receiver components: antenna, frequency and time references, clock synchronization, disks, L-band antenna, differential corrections and internet access' },
  { name: 'RxError', type: 'uint32', description: 'Bit field of errors detected since power-on; non-zero means at least one error occurred. Bit 3 software, 4 watchdog, 5 antenna overcurrent, 6 congestion, 8 missed event, 9 CPU overload, 10 invalid config, 11 out of geofence' },
  { name: 'N', type: 'uint8', description: 'Number of AGCState sub-blocks in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one AGCState sub-block' },
  { name: 'CmdCount', type: 'uint8', doNotUse: 0, description: 'Cyclic counter incremented on every command that changes the receiver configuration; wraps from 255 to 1' },
  { name: 'Temperature', type: 'uint8', units: '°C', doNotUse: 0, description: 'Not applicable (per the datasheet)' },
  { name: 'AGCState', count: 'N', length: 'SBLength', fields: AGC_STATE, description: 'A succession of N AGCState sub-blocks, one per frontend' },
]

export const FRONTEND: Readonly<Record<number, string>> = {
  0: 'GPSL1/E1',
  1: 'GLOL1',
  2: 'E6',
  3: 'GPSL2',
  4: 'GLOL2',
  5: 'L5/E5a',
  6: 'E5b/B2I',
  7: 'E5(a+b)',
  8: 'COMBINED_GPS_GLONASS_SBAS_GALILEO_L1',
  9: 'COMBINED_GPS_GLONASS_L2',
  10: 'MSS/L-BAND',
  11: 'B1I',
  12: 'B3I',
  13: 'S-BAND',
}

export const ANTENNA: Readonly<Record<number, string>> = {
  0: 'MAIN',
  1: 'AUX1',
  2: 'AUX2',
}

const decoders: Readonly<Record<string, Decoder>> = {
  ExtError: (value) => ({
    signalInSpaceError: bitState(value, 0),
    differentialCorrectionError: bitState(value, 1),
    externalSensorError: bitState(value, 2),
    setupError: bitState(value, 3),
  }),
  RxState: (value) => ({
    activeAntenna: bitState(value, 1),
    externalFrequency: bitState(value, 2),
    externalTime: bitState(value, 3),
    wnSet: bitState(value, 4),
    towSet: bitState(value, 5),
    fineTime: bitState(value, 6),
    internalDiskActivity: bitState(value, 7),
    internalDiskFull: bitState(value, 8),
    internalDiskMounted: bitState(value, 9),
    internalAntenna: bitState(value, 10),
    referenceOutputLocked: bitState(value, 11),
    lbandAntenna: bitState(value, 12),
    externalDiskActivity: bitState(value, 13),
    externalDiskFull: bitState(value, 14),
    externalDiskMounted: bitState(value, 15),
    ppsInCalibration: bitState(value, 16),
    differentialCorrectionsIn: bitState(value, 17),
    internet: bitState(value, 18),
  }),
  RxError: (value) => ({
    software: bitState(value, 3),
    watchdog: bitState(value, 4),
    antennaOvercurrent: bitState(value, 5),
    congestion: bitState(value, 6),
    missedEvent: bitState(value, 8),
    cpuOverload: bitState(value, 9),
    invalidConfiguration: bitState(value, 10),
    outOfGeofence: bitState(value, 11),
  }),
  FrontEndID: (value) => ({
    ...label(FRONTEND, bits(value, 0, 4)),
    antenna: ANTENNA[bits(value, 5, 7)] ?? 'UNKNOWN',
  }),
}

export const receiverStatus: BlockDefinition = {
  name: 'ReceiverStatus',
  number: 4014,
  description: 'General status of the receiver: CPU load, uptime, external errors, component states, error history and per-frontend AGC',
  timestamp: 'receiver',
  revisions: [FIELDS, FIELDS],
  decoders,
  // "Is this receiver healthy?" should not require reading 26 booleans.
  payloadMetadata: ({ RxError, ExtError, CPULoad }) => {
    const errors = Number(RxError ?? 0) !== 0
    const external = Number(ExtError ?? 0) !== 0
    const load = Number(CPULoad ?? 0)
    return { health: { errors, externalErrors: external, cpuOverloaded: load > 80, healthy: !errors && !external && load <= 80 } }
  },
}
