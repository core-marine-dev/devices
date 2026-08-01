// installed
import type { MetadataAggregator, MetadataAggregators, Metadata } from '@coremarine/nmea-parser'

// coded
import { bitState } from './utils'

/* Derived metadata for the proprietary NMEA sentences, registered on the NMEA
   protocol parser via `registerAggregators`. Keyed `${id}:${payloadLength}` — the
   stable identity of a definition, since field names are unofficial — so
   aggregators read the payload BY INDEX.

   Only PHINF needs one. Every other §3.3 sentence is already scalar fields with
   units, and inventing derived values for them would add nothing a consumer
   cannot read off the payload. */

// PHINF — THE 32-BIT OCTANS STATUS WORD --------------------------------------------------------------------------------
/* §3.3.8. The one sentence in §3.3 whose whole content is an encoding: a single
   field of 8 hex characters standing for 28 named flags. Decoding it is the entire
   value of the sentence, so it is decoded here rather than left to the consumer.

   Bit  Datasheet name                       Meaning when SET
     0  IXBLUE_STAT_HEADING_UNVALID          heading invalid or still converging
     1  IXBLUE_STAT_ROLL_UNVALID             roll invalid or still converging
     2  IXBLUE_STAT_PITCH_UNVALID            pitch invalid or still converging
     3  IXBLUE_STAT_HEAVE_INIT               heave filter initializing (not fully accurate)
     4  -                                    RESERVED, not used
     5  IXBLUE_STAT_ALIGNMENT                alignment phase (not fully accurate)
     6  IXBLUE_STAT_CONFIG_SAVED             NOT IMPLEMENTED
     7  IXBLUE_STAT_COMPUTATION_OVERLOAD     CPU overloaded
     8  IXBLUE_STAT_FOG_X1_ANOMALY           gyroscope X built-in test failed
     9  IXBLUE_STAT_FOG_X2_ANOMALY           gyroscope Y built-in test failed
    10  IXBLUE_STAT_FOG_X3_ANOMALY           gyroscope Z built-in test failed
    11  IXBLUE_STAT_FOG_ACQ_ERROR            at least one gyroscope out of range
    12  IXBLUE_STAT_ACC_X1_ANOMALY           accelerometer X built-in test failed
    13  IXBLUE_STAT_ACC_X2_ANOMALY           accelerometer Y built-in test failed
    14  IXBLUE_STAT_ACC_X3_ANOMALY           accelerometer Z built-in test failed
    15  IXBLUE_STAT_SENSOR_ERROR             at least one sensor failing or out of range
    16  IXBLUE_STAT_SERIAL_IN_A_ERROR        errors on serial port A rx
    17  IXBLUE_STAT_SERIAL_IN_B_ERROR        errors on serial port B rx
    18  IXBLUE_STAT_SERIAL_IN_C_ERROR        errors on serial port C rx
    19  IXBLUE_STAT_OUTPUT_OVERLOADED        at least one serial output overloaded
    20  IXBLUE_STAT_SERIAL_OUT_A_FULL        serial output A overloaded
    21  IXBLUE_STAT_SERIAL_OUT_B_FULL        serial output B overloaded
    22  IXBLUE_STAT_SERIAL_OUT_C_FULL        serial output C overloaded
    23  IXBLUE_STAT_SERIAL_OUT_D_FULL        NOT IMPLEMENTED
    24  IXBLUE_STAT_MANUAL_LOG_USED          NOT IMPLEMENTED
    25  IXBLUE_STAT_MANUAL_LAT_USED          NOT IMPLEMENTED
    26  -                                    undefined (absent from the table)
    27  IXBLUE_STAT_HRP_INVALID              at least one of roll, pitch, heading invalid
    28  -                                    undefined (absent from the table)
    29  -                                    undefined (absent from the table)
    30  -                                    undefined (absent from the table)
    31  IXBLUE_STAT_RESTART_SYSTEM           NOT IMPLEMENTED

   The gaps are the datasheet's own: 4 is explicitly "Reserved, not used" and
   26, 28, 29 and 30 simply have no row. They are NOT decoded, because a name
   invented for an undocumented bit would be indistinguishable from a real one.

   The FOG_X1/X2/X3 and ACC_X1/X2/X3 names read as if they were three axes of one
   sensor called X; the DESCRIPTION column is what says they are X, Y and Z, and
   the description is what is followed here.

   Names marked NOT IMPLEMENTED are decoded anyway, and deliberately: the flag
   exists in the word, and reporting it as permanently false is more honest than
   omitting it and leaving a consumer to wonder whether we simply missed it.

   ⚠️ These are OCTANS definitions. SBG's own caveat: "As these status are defined
   for a different product than an SBG Systems AHRS or INS, some status couldn't be
   directly translated." A set bit names the OCTANS condition. */

// Exactly the wire format of §3.3.8 (hhhhhhhh), but tolerant of a short field: a
// firmware that drops leading zeros still decodes, while anything that is not hex
// is refused outright rather than becoming NaN and then a word of false flags.
const HEX_STATUS = /^[0-9a-f]{1,8}$/i

const decodeStatus = (value: number): Metadata => ({
  headingInvalid: bitState(value, 0),
  rollInvalid: bitState(value, 1),
  pitchInvalid: bitState(value, 2),
  heaveInitializing: bitState(value, 3),
  alignment: bitState(value, 5),
  configSaved: bitState(value, 6),
  computationOverload: bitState(value, 7),
  gyroscopeXAnomaly: bitState(value, 8),
  gyroscopeYAnomaly: bitState(value, 9),
  gyroscopeZAnomaly: bitState(value, 10),
  gyroscopeAcquisitionError: bitState(value, 11),
  accelerometerXAnomaly: bitState(value, 12),
  accelerometerYAnomaly: bitState(value, 13),
  accelerometerZAnomaly: bitState(value, 14),
  sensorError: bitState(value, 15),
  serialInAError: bitState(value, 16),
  serialInBError: bitState(value, 17),
  serialInCError: bitState(value, 18),
  outputOverloaded: bitState(value, 19),
  serialOutAFull: bitState(value, 20),
  serialOutBFull: bitState(value, 21),
  serialOutCFull: bitState(value, 22),
  serialOutDFull: bitState(value, 23),
  manualLogUsed: bitState(value, 24),
  manualLatitudeUsed: bitState(value, 25),
  hrpInvalid: bitState(value, 27),
  restartSystem: bitState(value, 31),
})

/* Both levels, following the three locked CMA placement rules and norsub's
   identical case: the field decodes on its own, so it carries its own decode
   (rule 1), and a device status describes the DEVICE rather than that one field,
   so it is mirrored at payload level (rules 2 and 3) — which is what gives a
   consumer ONE read path for device status across sentences. See docs/CMA.md. */
const aggregateStatus: MetadataAggregator = (sentence) => {
  const raw = sentence.payload[0]?.value
  if (typeof raw !== 'string') return {}
  const trimmed = raw.trim()
  if (!HEX_STATUS.test(trimmed)) return {}
  // Base 16 explicitly: `Number()` would read '08030027' as decimal.
  const status = decodeStatus(Number.parseInt(trimmed, 16))
  return { fields: { 0: { status } }, payload: { status } }
}

// REGISTRY -------------------------------------------------------------------------------------------------------------
export const SBG_NMEA_AGGREGATORS: MetadataAggregators = {
  'PHINF:1': aggregateStatus,
}
