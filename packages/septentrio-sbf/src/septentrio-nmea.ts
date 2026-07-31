// installed
import type { ProtocolsFileContent } from '@coremarine/nmea-parser'

export const SEPTENTRIO_SENTENCES: ProtocolsFileContent = {
  protocols: [
    {
      protocol: 'SEPTENTRIO',
      version: '4.10.1',
      standard: false,
      sentences: [
        {
          id: 'PSSNHRP',
          description: 'Heading, Roll, Pitch — the attitude solution from a multi-antenna setup, with a standard deviation per axis. Appendix C.1.1.',
          payload: [
            {
              name: 'submessage_id',
              type: 'string',
              description: 'Submessage type: HRP',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the attitude solution (hhmmss.ss)',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy. A string: the ddmmyy order and 2-digit year make a numeric type misleading.',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'Heading, degrees True',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll. EMPTY in modes 1, 2 and 5 — those solutions carry no roll, so an empty field here means NOT MEASURED, never level.',
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'heading_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'roll_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'pitch_standard_deviation',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used for the attitude computation',
            },
            {
              name: 'mode_indicator',
              type: 'uint8',
              description: '0: No attitude available\n 1: Heading, Pitch with float ambiguities\n 2: Heading, Pitch with fixed ambiguities\n 3: Heading, Pitch, Roll with float ambiguities\n 4: Heading, Pitch, Roll with fixed ambiguities\n 5: Heading, Pitch from velocity (dead-reckoning)',
            },
            {
              name: 'magnetic_variation',
              type: 'float64',
              units: 'deg',
              description: 'Magnitude of the magnetic variation; the direction is the NEXT field. Set with the receiver\'s setMagneticVariance command.',
            },
            {
              name: 'magnetic_variation_direction',
              type: 'string',
              description: 'E = East\n W = West',
            },
          ],
        },
        {
          id: 'PSSNRBD',
          description: 'Rover-Base Direction — where the base station is, as seen from the rover. Appendix C.1.2.',
          payload: [
            {
              name: 'submessage_id',
              type: 'string',
              description: 'Submessage type: RBD',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the direction solution (hhmmss.ss)',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy',
            },
            {
              name: 'base_azimuth',
              type: 'float64',
              units: 'deg',
              description: 'Azimuth of the base as seen from the rover, degrees True — 0 to 360, increasing towards east',
            },
            {
              name: 'base_elevation',
              type: 'float64',
              units: 'deg',
              description: 'Elevation of the base as seen from the rover, -90 to 90',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used for the baseline computation',
            },
            {
              name: 'quality_indicator',
              type: 'uint8',
              description: '0: Invalid\n 2: DGPS\n 4: RTK\n 5: Float RTK',
            },
            {
              name: 'base_motion_indicator',
              type: 'uint8',
              description: '0: Static base\n 1: Moving base',
            },
            {
              name: 'correction_age',
              type: 'float64',
              units: 'sec',
            },
            {
              name: 'rover_serial_number',
              type: 'string',
              description: 'Rover serial number. A STRING: serial numbers are identifiers, and the firmware\'s padding is not consistent enough to survive a numeric type.',
            },
            {
              name: 'base_station_id',
              type: 'uint16',
            },
          ],
        },
        {
          id: 'PSSNRBP',
          description: 'Rover-Base Position — the baseline vector from rover to base, as north/east/up components. Appendix C.1.3.',
          payload: [
            {
              name: 'submessage_id',
              type: 'string',
              description: 'Submessage type: RBP',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the baseline solution (hhmmss.ss)',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy',
            },
            {
              name: 'baseline_north',
              type: 'float64',
              units: 'm',
              description: 'North (True) baseline component, positive when the base is north of the rover',
            },
            {
              name: 'baseline_east',
              type: 'float64',
              units: 'm',
              description: 'East baseline component, positive when the base is east of the rover',
            },
            {
              name: 'baseline_up',
              type: 'float64',
              units: 'm',
              description: 'Up baseline component, positive when the base is higher than the rover',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used for the baseline computation',
            },
            {
              name: 'quality_indicator',
              type: 'uint8',
              description: '0: Invalid\n 2: DGPS\n 4: RTK\n 5: Float RTK',
            },
            {
              name: 'base_motion_indicator',
              type: 'uint8',
              description: '0: Static base\n 1: Moving base',
            },
            {
              name: 'correction_age',
              type: 'float64',
              units: 'sec',
            },
            {
              name: 'rover_serial_number',
              type: 'string',
              description: 'Rover serial number. A STRING, see PSSNRBD.',
            },
            {
              name: 'base_station_id',
              type: 'uint16',
            },
          ],
        },
        {
          id: 'PSSNRBV',
          description: 'Rover-Base Velocity — the RATE OF CHANGE of the rover-to-base baseline vector. Same tail as RBP; only the three components differ. Appendix C.1.4.',
          payload: [
            {
              name: 'submessage_id',
              type: 'string',
              description: 'Submessage type: RBV',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the velocity solution (hhmmss.ss)',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy',
            },
            {
              name: 'baseline_north_rate',
              type: 'float64',
              units: 'm/s',
              description: 'Rate of change of the baseline vector (rover to base), north component',
            },
            {
              name: 'baseline_east_rate',
              type: 'float64',
              units: 'm/s',
              description: 'Rate of change of the baseline vector (rover to base), east component',
            },
            {
              name: 'baseline_up_rate',
              type: 'float64',
              units: 'm/s',
              description: 'Rate of change of the baseline vector (rover to base), up component',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used for the baseline computation',
            },
            {
              name: 'quality_indicator',
              type: 'uint8',
              description: '0: Invalid\n 2: DGPS\n 4: RTK\n 5: Float RTK',
            },
            {
              name: 'base_motion_indicator',
              type: 'uint8',
              description: '0: Static base\n 1: Moving base',
            },
            {
              name: 'correction_age',
              type: 'float64',
              units: 'sec',
            },
            {
              name: 'rover_serial_number',
              type: 'string',
              description: 'Rover serial number. A STRING, see PSSNRBD.',
            },
            {
              name: 'base_station_id',
              type: 'uint16',
            },
          ],
        },
        {
          id: 'PSSNTFM',
          description: 'Used RTCM Coordinate Transformation Messages — which RTCM transformation messages were received and used in the position computation. Appendix C.1.6.',
          payload: [
            {
              name: 'submessage_id',
              type: 'string',
              description: 'Submessage type: TFM',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time (hhmmss.ss)',
            },
            {
              name: 'height_indicator',
              type: 'uint8',
              description: 'A copy of the Height Indicator field of RTCM message 1021 or 1022. NULL when unknown.',
            },
            {
              name: 'message_1021_1022',
              type: 'uint16',
              description: 'Which of the two exclusive messages was used. 1021 = message type 1021 used, 1022 = message type 1022 used, NULL = neither used. The value IS the RTCM message number, so null here means "no transformation of this kind", not zero.',
            },
            {
              name: 'message_1023_1024',
              type: 'uint16',
              description: '1023 = message type 1023 used, 1024 = message type 1024 used, NULL = neither used',
            },
            {
              name: 'message_1025_1026_1027',
              type: 'uint16',
              description: '1025, 1026 or 1027 = that message type was used, NULL = none of them used',
            },
          ],
        },
      ],
    },
  ],
}
