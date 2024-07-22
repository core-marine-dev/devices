import { ProtocolsFileContent } from './types'

export const NMEA_SENTENCES: ProtocolsFileContent = {
  protocols: [
    {
      protocol: 'NMEA',
      version: '3.1',
      standard: true,
      sentences: [
        {
          id: 'AAM',
          description: 'Waypoint Arrival Alarm',
          payload: [
            {
              name: 'status',
              type: 'string',
              description: 'BOOLEAN\n\nA = arrival circle entered\n\nV = arrival circle not passed'
            },
            {
              name: 'status',
              type: 'string',
              description: 'BOOLEAN\n\nA = perpendicular passed at waypoint\n\nV = perpendicular not passed'
            },
            {
              name: 'arrival_circle_radius',
              type: 'float32'
            },
            {
              name: 'radius_units',
              type: 'string',
              units: 'nautic miles'
            },
            {
              name: 'waypoint_id',
              type: 'string'
            }
          ]
        },
        {
          id: 'GGA',
          description: 'Global Positioning System Fix Data',
          payload: [
            {
              name: 'utc_position',
              type: 'string',
              units: 'ms'
            },
            {
              name: 'latitude',
              type: 'string',
              units: 'deg-min'
            },
            {
              name: 'latitude_direction',
              type: 'string',
              description: 'N: North\n S: South'
            },
            {
              name: 'longitude',
              type: 'string',
              units: 'deg-min'
            },
            {
              name: 'longitude_direction',
              type: 'string',
              description: 'E - East\n W - West'
            },
            {
              name: 'quality',
              type: 'int8',
              description: '0: Fix not valid\n 1: GPS fix\n 2: Differential GPS fix (DGNSS), SBAS, OmniSTAR VBS, Beacon, RTX in GVBS mode\n 3: Not applicable\n 4: RTK Fixed, xFill\n 5: RTK Float, OmniSTAR XP/HP, Location RTK, RTX\n 6: INS Dead reckoning\n 7: Manual Input Mode\n 8: Simulator Mode'
            },
            {
              name: 'satellites',
              type: 'uint8'
            },
            {
              name: 'hdop',
              type: 'float64'
            },
            {
              name: 'altitude',
              type: 'float64',
              units: 'm',
              description: 'Orthometric height Mean-Sea-Level (MSL reference)'
            },
            {
              name: 'altitude_units',
              type: 'string',
              units: 'm'
            },
            {
              name: 'geoid_separation',
              type: 'float64',
              units: 'm',
              description: 'Geoidal Separation: the difference between the WGS-84 earth ellipsoid surface and mean-sea-level (geoid) surface, "-" = mean-sea-level surface below WGS-84 ellipsoid surface.'
            },
            {
              name: 'geoid_separation_units',
              type: 'string',
              units: 'm'
            },
            {
              name: 'age_of_differential_gps_data',
              type: 'uint32',
              units: 'sec',
              description: 'Time in seconds since last SC104 Type 1 or 9 update, null field when DGPS is not used300'
            },
            {
              name: 'reference_station_id',
              type: 'uint16',
              description: 'Reference station ID, range 0000 to 4095. A null field when any reference station ID is selected and no corrections are received. See table below for a description of the field values.\n\n0002 CenterPoint or ViewPoint RTX\n\n0005 RangePoint RTX\n\n0006 FieldPoint RTX\n\n0100 VBS\n\n1000 HP\n\n1001 HP/XP (Orbits)\n\n1002 HP/G2 (Orbits)\n\n1008 XP (GPS)\n\n1012 G2 (GPS)\n\n1013 G2 (GPS/GLONASS)\n\n1014 G2 (GLONASS)\n\n1016 HP/XP (GPS)\n\n1020 HP/G2 (GPS)\n\n1021 HP/G2 (GPS/GLONASS)'
            }
          ]
        },
        {
          id: 'HDT',
          description: 'Heading - True',
          payload: [
            {
              name: 'heading',
              type: 'float32',
              description: 'Heading, degrees True'
            },
            {
              name: 'true',
              type: 'string',
              description: 'T = True'
            }
          ]
        },
        {
          id: 'ZDA',
          description: 'Time & Date - UTC, day, month, year and local time zone',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time (hours, minutes, seconds, may have fractional subseconds)'
            },
            {
              name: 'day',
              type: 'int8',
              description: 'Day, 01 to 31'
            },
            {
              name: 'month',
              type: 'int8',
              description: 'Month, 01 to 12'
            },
            {
              name: 'year',
              type: 'int16',
              description: 'Year (4 digits)'
            },
            {
              name: 'local_zone_hours',
              type: 'int8',
              description: 'Local zone description, 00 to +- 13 hours'
            },
            {
              name: 'local_zone_minutes',
              type: 'int8',
              description: 'Local zone minutes description, 00 to 59, apply same sign as local hours'
            }
          ]
        }
      ]
    }
  ]
}
