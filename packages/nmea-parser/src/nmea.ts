// coded
import type { ProtocolsFileContent } from './types'

export const PROTOCOLS: ProtocolsFileContent = {
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
              description: 'BOOLEAN\n\nA = arrival circle entered\n\nV = arrival circle not passed',
            },
            {
              name: 'status',
              type: 'string',
              description: 'BOOLEAN\n\nA = perpendicular passed at waypoint\n\nV = perpendicular not passed',
            },
            {
              name: 'arrival_circle_radius',
              type: 'float64',
            },
            {
              name: 'radius_units',
              type: 'string',
              units: 'nautical miles',
            },
            {
              name: 'waypoint_id',
              type: 'string',
            },
          ],
        },
        {
          id: 'DTM',
          description: 'The DTM message identifies the local geodetic datum and datum offsets from a reference datum. This sentence is used to define the datum to which a position location, and geographic locations in subsequent sentences, is referenced.',
          payload: [
            {
              name: 'local_datum_code',
              type: 'string',
              description: 'Local datum code (CCC):\n W84 - WGS-84\n W72 - WGS-72\n S85 - SGS85\n P90 - PE90\n 999 - User-defined\n IHO datum code',
            },
            {
              name: 'local_datum_subdivision_code',
              type: 'string',
              description: 'Local datum subdivision code (x)',
            },
            {
              name: 'latitude_offset',
              type: 'float64',
              units: 'minutes',
              description: 'Latitude offset, in minutes (x.x)',
            },
            {
              name: 'latitude_direction',
              type: 'string',
              description: 'N/S (x)',
            },
            {
              name: 'longitude_offset',
              type: 'float64',
              units: 'minutes',
              description: 'Longitude offset, in minutes (x.x)',
            },
            {
              name: 'longitude_direction',
              type: 'string',
              description: 'E/W (x)',
            },
            {
              name: 'altitude_offset',
              type: 'float64',
              units: 'meters',
              description: 'Altitude offset, in meters (x.x)',
            },
            {
              name: 'datum_code',
              type: 'string',
              description: 'Reference datum code (CCC):\n W84 - WGS-84\n W72 - WGS-72\n S85 - SGS85\n P90 - PE90',
            },
          ],
        },
        {
          id: 'GGA',
          description: 'Global Positioning System Fix Data',
          payload: [
            {
              name: 'utc_position',
              type: 'string',
              units: 'ms',
            },
            {
              name: 'latitude',
              type: 'string',
              units: 'deg',
            },
            {
              name: 'latitude_direction',
              type: 'string',
              description: 'N: North\n S: South',
            },
            {
              name: 'longitude',
              type: 'string',
              units: 'deg',
            },
            {
              name: 'longitude_direction',
              type: 'string',
              description: 'E - East\n W - West',
            },
            {
              name: 'gps_quality',
              type: 'int8',
              description: '0: Fix not valid\n 1: GPS fix\n 2: Differential GPS fix (DGNSS), SBAS, OmniSTAR VBS, Beacon, RTX in GBAS mode\n 3: Not applicable\n 4: RTK Fixed, xFill\n 5: RTK Float, OmniSTAR XP/HP, Location RTK, RTX\n 6: INS Dead reckoning\n 7: Manual Input Mode\n 8: Simulator Mode',
            },
            {
              name: 'satellites',
              type: 'uint8',
            },
            {
              name: 'hdop',
              type: 'float64',
            },
            {
              name: 'altitude',
              type: 'float64',
              units: 'm',
              description: 'Orthometric height Mean-Sea-Level (MSL reference)',
            },
            {
              name: 'altitude_units',
              type: 'string',
              units: 'm',
            },
            {
              name: 'geoid_separation',
              type: 'float64',
              units: 'm',
              description: 'Geoidal Separation: the difference between the WGS-84 earth ellipsoid surface and mean-sea-level (geoid) surface, "-" = mean-sea-level surface below WGS-84 ellipsoid surface.',
            },
            {
              name: 'geoid_separation_units',
              type: 'string',
              units: 'm',
            },
            {
              name: 'age_of_differential_gps_data',
              type: 'uint32',
              units: 'sec',
              description: 'Time in seconds since last SC104 Type 1 or 9 update, null field when DGPS is not used',
            },
            {
              name: 'reference_station_id',
              type: 'uint16',
              description: 'Reference station ID, range 0000 to 4095. A null field when any reference station ID is selected and no corrections are received. See table below for a description of the field values.\n\n0002 CenterPoint or ViewPoint RTX\n\n0005 RangePoint RTX\n\n0006 FieldPoint RTX\n\n0100 VBS\n\n1000 HP\n\n1001 HP/XP (Orbits)\n\n1002 HP/G2 (Orbits)\n\n1008 XP (GPS)\n\n1012 G2 (GPS)\n\n1013 G2 (GPS/GLONASS)\n\n1014 G2 (GLONASS)\n\n1016 HP/XP (GPS)\n\n1020 HP/G2 (GPS)\n\n1021 HP/G2 (GPS/GLONASS)',
            },
          ],
        },
        {
          id: 'GSA',
          description: 'GPS DOP and active satellites',
          payload: [
            {
              name: 'mode',
              type: 'string',
              description: 'Mode 1:\n M = Manual\n A = Automatic',
            },
            {
              name: 'fix',
              type: 'uint8',
              description: 'Mode 2: Fix type:\n 1 = not available\n 2 = 2D\n 3 = 3D',
            },
            {
              name: 'satellite_id_1',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_2',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_3',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_4',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_5',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_6',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_7',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_8',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_9',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_10',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_11',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'satellite_id_12',
              type: 'uint8',
              description: 'PRN number:\n 01 to 32 for GPS\n 33 to 64 for SBAS\n 64+ for GLONASS',
            },
            {
              name: 'pdop',
              type: 'float64',
              description: 'PDOP: 0.5 to 99.9',
            },
            {
              name: 'hdop',
              type: 'float64',
              description: 'HDOP: 0.5 to 99.9',
            },
            {
              name: 'vdop',
              type: 'float64',
              description: 'VDOP: 0.5 to 99.9',
            },
          ],
        },
        {
          id: 'GST',
          description: 'Position error statistics',
          payload: [
            {
              name: 'utc_position_fix',
              type: 'string',
              units: 'hhmmss.ss',
              description: 'UTC time of associated GGA fix',
            },
            {
              name: 'total_rms',
              type: 'float64',
              description: 'RMS value of the pseudorange residuals; includes carrier phase residuals during periods of RTK (float) and RTK (fixed) processing',
            },
            {
              name: 'semi_major_standard_deviation',
              type: 'float64',
              units: 'meters',
              description: 'Standard deviation (meters) of semi-major axis of error ellipse',
            },
            {
              name: 'semi_minor_standard_deviation',
              type: 'float64',
              units: 'meters',
              description: 'Standard deviation (meters) of semi-minor axis of error ellipse',
            },
            {
              name: 'ellipse_orientation',
              type: 'float64',
              units: 'true north degrees',
              description: 'Orientation of semi-major axis of error ellipse (true north degrees)',
            },
            {
              name: 'latitude_standard_deviation',
              type: 'float64',
              units: 'meters',
              description: 'Standard deviation (meters) of latitude error',
            },
            {
              name: 'longitude_standard_deviation',
              type: 'float64',
              units: 'meters',
              description: 'Standard deviation (meters) of longitude error',
            },
            {
              name: 'altitude_standard_deviation',
              type: 'float64',
              units: 'meters',
              description: 'Standard deviation (meters) of altitude error',
            },
          ],
        },
        {
          id: 'GSV',
          description: 'GNSS Satellites in View',
          payload: [
            {
              name: 'total_messages',
              type: 'uint8',
              description: 'Total number of GSV messages in this cycle (1 to 9)',
            },
            {
              name: 'message_number',
              type: 'uint8',
              description: 'Current message number (1 to 9)',
            },
            {
              name: 'satellites_in_view',
              type: 'uint16',
              description: 'Total number of satellites in view',
            },
            {
              name: 'satellite_id_1',
              type: 'uint8',
              description: 'Satellite PRN/ID number:\n 01 to 32 for GPS\n 33 to 64 for SBAS (add 87 to get actual SBAS PRN)\n 65 to 96 for GLONASS (subtract 64 to get GLONASS slot number)',
            },
            {
              name: 'elevation_1',
              type: 'int8',
              units: 'deg',
              description: 'Satellite elevation, -90 to 90 degrees',
            },
            {
              name: 'azimuth_1',
              type: 'uint16',
              units: 'deg',
              description: 'Satellite azimuth from true north, 000 to 359 degrees',
            },
            {
              name: 'snr_1',
              type: 'uint8',
              units: 'dB-Hz',
              description: 'Signal-to-noise ratio (C/No), 00 to 99 dB-Hz (null when not tracking)',
            },
            {
              name: 'satellite_id_2',
              type: 'uint8',
              description: 'Satellite PRN/ID number:\n 01 to 32 for GPS\n 33 to 64 for SBAS (add 87 to get actual SBAS PRN)\n 65 to 96 for GLONASS (subtract 64 to get GLONASS slot number)',
            },
            {
              name: 'elevation_2',
              type: 'int8',
              units: 'deg',
              description: 'Satellite elevation, -90 to 90 degrees',
            },
            {
              name: 'azimuth_2',
              type: 'uint16',
              units: 'deg',
              description: 'Satellite azimuth from true north, 000 to 359 degrees',
            },
            {
              name: 'snr_2',
              type: 'uint8',
              units: 'dB-Hz',
              description: 'Signal-to-noise ratio (C/No), 00 to 99 dB-Hz (null when not tracking)',
            },
            {
              name: 'satellite_id_3',
              type: 'uint8',
              description: 'Satellite PRN/ID number:\n 01 to 32 for GPS\n 33 to 64 for SBAS (add 87 to get actual SBAS PRN)\n 65 to 96 for GLONASS (subtract 64 to get GLONASS slot number)',
            },
            {
              name: 'elevation_3',
              type: 'int8',
              units: 'deg',
              description: 'Satellite elevation, -90 to 90 degrees',
            },
            {
              name: 'azimuth_3',
              type: 'uint16',
              units: 'deg',
              description: 'Satellite azimuth from true north, 000 to 359 degrees',
            },
            {
              name: 'snr_3',
              type: 'uint8',
              units: 'dB-Hz',
              description: 'Signal-to-noise ratio (C/No), 00 to 99 dB-Hz (null when not tracking)',
            },
            {
              name: 'satellite_id_4',
              type: 'uint8',
              description: 'Satellite PRN/ID number:\n 01 to 32 for GPS\n 33 to 64 for SBAS (add 87 to get actual SBAS PRN)\n 65 to 96 for GLONASS (subtract 64 to get GLONASS slot number)',
            },
            {
              name: 'elevation_4',
              type: 'int8',
              units: 'deg',
              description: 'Satellite elevation, -90 to 90 degrees',
            },
            {
              name: 'azimuth_4',
              type: 'uint16',
              units: 'deg',
              description: 'Satellite azimuth from true north, 000 to 359 degrees',
            },
            {
              name: 'snr_4',
              type: 'uint8',
              units: 'dB-Hz',
              description: 'Signal-to-noise ratio (C/No), 00 to 99 dB-Hz (null when not tracking)',
            },
          ],
        },
        {
          id: 'HDT',
          description: 'Heading - True',
          payload: [
            {
              name: 'heading',
              type: 'float64',
              description: 'Heading, degrees True',
            },
            {
              name: 'true',
              type: 'string',
              description: 'T = True',
            },
          ],
        },
        {
          id: 'MWV',
          description: 'Wind Speed and Angle',
          payload: [
            {
              name: 'wind_angle',
              type: 'float64',
              units: 'deg',
              description: 'Wind angle, 0.0 to 359.9 degrees relative to the vessel\'s bow/centerline',
            },
            {
              name: 'reference',
              type: 'string',
              description: 'Reference: R = Relative, T = True',
            },
            {
              name: 'wind_speed',
              type: 'float64',
              description: 'Wind speed to the nearest tenth of a unit',
            },
            {
              name: 'wind_speed_units',
              type: 'string',
              description: 'Wind speed units: K = km/h, M = m/s, N = knots, S = statute miles/h',
            },
            {
              name: 'status',
              type: 'string',
              description: 'Data validity: A = Valid, V = Invalid',
            },
          ],
        },
        {
          id: 'THS',
          description: 'True Heading and Status',
          payload: [
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'Heading in degrees True, 0.00 to 359.99',
            },
            {
              name: 'mode',
              type: 'string',
              description: 'Mode indicator:\n A = Autonomous\n E = Estimated (dead reckoning)\n M = Manual input\n S = Simulator\n V = Data not valid',
            },
          ],
        },
        {
          id: 'VTG',
          description: 'Track Made Good and Ground Speed',
          payload: [
            {
              name: 'track_degrees_true',
              type: 'float64',
              units: 'deg',
              description: 'Track angle in degrees True',
            },
            {
              name: 'true_indicator',
              type: 'string',
              description: 'T = True',
            },
            {
              name: 'track_degrees_magnetic',
              type: 'float64',
              units: 'deg',
              description: 'Track angle in degrees Magnetic',
            },
            {
              name: 'magnetic_indicator',
              type: 'string',
              description: 'M = Magnetic',
            },
            {
              name: 'speed_knots',
              type: 'float64',
              units: 'knots',
              description: 'Speed over ground in knots',
            },
            {
              name: 'knots_indicator',
              type: 'string',
              description: 'N = Knots',
            },
            {
              name: 'speed_kilometers_per_hour',
              type: 'float64',
              units: 'km/h',
              description: 'Speed over ground in kilometers per hour',
            },
            {
              name: 'kmh_indicator',
              type: 'string',
              description: 'K = Kilometers per hour',
            },
            {
              name: 'mode_indicator',
              type: 'string',
              description: 'Mode indicator (NMEA 2.3+)\n A = Autonomous\n D = Differential\n E = Estimated (dead reckoning)\n M = Manual input\n N = Data not valid',
            },
          ],
        },
        {
          id: 'ZDA',
          description: 'Time & Date - UTC, day, month, year and local time zone',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time (hours, minutes, seconds, may have fractional subseconds)',
            },
            {
              name: 'day',
              type: 'int8',
              description: 'Day, 01 to 31',
            },
            {
              name: 'month',
              type: 'int8',
              description: 'Month, 01 to 12',
            },
            {
              name: 'year',
              type: 'int16',
              description: 'Year (4 digits)',
            },
            {
              name: 'local_zone_hours',
              type: 'int8',
              description: 'Local zone description, 00 to +- 13 hours',
            },
            {
              name: 'local_zone_minutes',
              type: 'int8',
              description: 'Local zone minutes description, 00 to 59, apply same sign as local hours',
            },
          ],
        },
      ],
    },
    {
      protocol: 'NMEA',
      version: '3.1',
      standard: false,
      sentences: [
        {
          id: 'PMIRWM',
          description: 'Miros wave parameters (WM data block rev3)',
          payload: [
            {
              name: 'timestamp',
              type: 'string',
              description: 'UTC timestamp hhmmss or hhmmss.sss',
            },
            {
              name: 'day',
              type: 'uint8',
              description: 'Day of month, 01-31',
            },
            {
              name: 'month',
              type: 'uint8',
              description: 'Month, 01-12',
            },
            {
              name: 'year',
              type: 'uint16',
              description: 'Year',
            },
            {
              name: 'sequence_number',
              type: 'string',
              description: 'Sequence number (max 8 chars)',
            },
            {
              name: 'SDp1',
              type: 'float64',
              units: 'm²/Hz',
              description: 'Primary wave spectral density',
            },
            {
              name: 'SDp1_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Hm0',
              type: 'float64',
              units: 'm',
              description: 'Significant wave height',
            },
            {
              name: 'Hm0_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Hmax',
              type: 'float64',
              units: 'm',
              description: 'Maximum wave height',
            },
            {
              name: 'Hmax_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'HTmax',
              type: 'float64',
              units: 'm',
              description: 'Wave height of maximum wave period',
            },
            {
              name: 'HTmax_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tp1',
              type: 'float64',
              units: 's',
              description: 'Primary wave peak period',
            },
            {
              name: 'Tp1_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tp2',
              type: 'float64',
              units: 's',
              description: 'Secondary wave peak period',
            },
            {
              name: 'Tp2_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tpc',
              type: 'float64',
              units: 's',
              description: 'Calculated wave peak period',
            },
            {
              name: 'Tpc_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Ts',
              type: 'float64',
              units: 's',
              description: 'Significant wave period',
            },
            {
              name: 'Ts_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tm0_1',
              type: 'float64',
              units: 's',
              description: 'Energy wave period (Te)',
            },
            {
              name: 'Tm0_1_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tm0_2',
              type: 'float64',
              units: 's',
              description: 'Integral wave period',
            },
            {
              name: 'Tm0_2_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tm02',
              type: 'float64',
              units: 's',
              description: 'Mean zero up-crossing period',
            },
            {
              name: 'Tm02_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tm01',
              type: 'float64',
              units: 's',
              description: 'Mean period',
            },
            {
              name: 'Tm01_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Tmax',
              type: 'float64',
              units: 's',
              description: 'Maximum wave period',
            },
            {
              name: 'Tmax_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'THmax',
              type: 'float64',
              units: 's',
              description: 'Wave period of maximum wave height',
            },
            {
              name: 'THmax_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'steepness',
              type: 'float64',
              description: '(?) Wave steepness',
            },
            {
              name: 'steepness_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Dp1_t',
              type: 'float64',
              units: 'degrees',
              description: '(?) Primary wave peak direction, true north',
            },
            {
              name: 'Dp1_t_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Dm_t',
              type: 'float64',
              units: 'degrees',
              description: '(?) Total energy mean direction, true north',
            },
            {
              name: 'Dm_t_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'spread1',
              type: 'float64',
              units: 'degrees',
              description: '(?) Primary directional spreading',
            },
            {
              name: 'spread1_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Dp2_t',
              type: 'float64',
              units: 'degrees',
              description: '(?) Secondary wave peak direction, true north',
            },
            {
              name: 'Dp2_t_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'Dm2_t',
              type: 'float64',
              units: 'degrees',
              description: '(?) Secondary mean direction, true north',
            },
            {
              name: 'Dm2_t_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'spread2',
              type: 'float64',
              units: 'degrees',
              description: '(?) Secondary directional spreading',
            },
            {
              name: 'spread2_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'epsilon',
              type: 'float64',
              description: '(?) Spectral narrowness parameter',
            },
            {
              name: 'epsilon_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'nu',
              type: 'float64',
              description: '(?) Spectral bandwidth parameter',
            },
            {
              name: 'nu_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'kappa',
              type: 'float64',
              description: '(?) Spectral peakedness parameter',
            },
            {
              name: 'kappa_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'm0',
              type: 'float64',
              units: 'm²',
              description: '(?) Zeroth spectral moment',
            },
            {
              name: 'm0_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'm1',
              type: 'float64',
              units: 'm²·s',
              description: '(?) First spectral moment',
            },
            {
              name: 'm1_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'm2',
              type: 'float64',
              units: 'm²·s²',
              description: '(?) Second spectral moment',
            },
            {
              name: 'm2_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'm3',
              type: 'float64',
              units: 'm²·s³',
              description: '(?) Third spectral moment',
            },
            {
              name: 'm3_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'm4',
              type: 'float64',
              units: 'm²·s⁴',
              description: '(?) Fourth spectral moment',
            },
            {
              name: 'm4_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_030',
              type: 'float64',
              description: 'Unknown — sample value 3.70',
            },
            {
              name: 'param_030_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_031',
              type: 'float64',
              description: 'Unknown — sample value 52.51',
            },
            {
              name: 'param_031_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_032',
              type: 'float64',
              description: 'Unknown — sample value 15.69',
            },
            {
              name: 'param_032_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_033',
              type: 'float64',
              description: 'Unknown — sample value 157.7',
            },
            {
              name: 'param_033_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_034',
              type: 'float64',
              description: 'Unknown — sample value 7.85',
            },
            {
              name: 'param_034_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_035',
              type: 'float64',
              description: 'Unknown — sample value 45',
            },
            {
              name: 'param_035_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_036',
              type: 'float64',
              description: 'Unknown — sample value 50',
            },
            {
              name: 'param_036_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'param_037',
              type: 'float64',
              description: 'Unknown — sample value 45',
            },
            {
              name: 'param_037_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'reserved_038',
              type: 'float64',
              description: 'Reserved (always empty)',
            },
            {
              name: 'reserved_038_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'reserved_039',
              type: 'float64',
              description: 'Reserved (always empty)',
            },
            {
              name: 'reserved_039_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'reserved_040',
              type: 'float64',
              description: 'Reserved (always empty)',
            },
            {
              name: 'reserved_040_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'reserved_041',
              type: 'float64',
              description: 'Reserved (always empty)',
            },
            {
              name: 'reserved_041_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'reserved_042',
              type: 'float64',
              description: 'Reserved (always empty)',
            },
            {
              name: 'reserved_042_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'reserved_043',
              type: 'float64',
              description: 'Reserved (always empty)',
            },
            {
              name: 'reserved_043_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
          ],
        },
        {
          id: 'PMIRCV',
          description: 'Miros surface current parameters (CV data block)',
          payload: [
            {
              name: 'timestamp',
              type: 'string',
              description: 'UTC timestamp hhmmss or hhmmss.sss',
            },
            {
              name: 'day',
              type: 'uint8',
              description: 'Day of month, 01-31',
            },
            {
              name: 'month',
              type: 'uint8',
              description: 'Month, 01-12',
            },
            {
              name: 'year',
              type: 'uint16',
              description: 'Year',
            },
            {
              name: 'sequence_number',
              type: 'string',
              description: 'Sequence number (max 8 chars)',
            },
            {
              name: 'current_speed_dir1',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 1',
            },
            {
              name: 'current_speed_dir1_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir2',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 2',
            },
            {
              name: 'current_speed_dir2_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir3',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 3',
            },
            {
              name: 'current_speed_dir3_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir4',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 4',
            },
            {
              name: 'current_speed_dir4_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir5',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 5',
            },
            {
              name: 'current_speed_dir5_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir6',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 6',
            },
            {
              name: 'current_speed_dir6_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir7',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 7',
            },
            {
              name: 'current_speed_dir7_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed_dir8',
              type: 'float64',
              units: 'm/s',
              description: 'Current speed, direction 8',
            },
            {
              name: 'current_speed_dir8_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_speed',
              type: 'float64',
              units: 'm/s',
              description: 'Aggregated surface current speed',
            },
            {
              name: 'current_speed_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_direction_vessel',
              type: 'float64',
              units: 'degrees',
              description: 'Current direction relative to vessel heading',
            },
            {
              name: 'current_direction_vessel_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
            {
              name: 'current_direction_true',
              type: 'float64',
              units: 'degrees',
              description: 'Current direction relative to true north',
            },
            {
              name: 'current_direction_true_status',
              type: 'uint8',
              description: 'Status code (0-9)',
            },
          ],
        },
        {
          id: 'PMIRLD',
          description: 'Miros wave spectrum (directional + point spectrum) — variable length',
          payload: [
            {
              name: 'timestamp',
              type: 'string',
              description: 'UTC timestamp hhmmss or hhmmss.sss',
            },
            {
              name: 'day',
              type: 'uint8',
              description: 'Day of month, 01-31',
            },
            {
              name: 'month',
              type: 'uint8',
              description: 'Month, 01-12',
            },
            {
              name: 'year',
              type: 'uint16',
              description: 'Year',
            },
            {
              name: 'sequence_number',
              type: 'string',
              description: 'Sequence number (max 8 chars)',
            },
            {
              name: 'num_frequencies',
              type: 'uint8',
              description: 'Number of frequency bins',
            },
            {
              name: 'start_frequency',
              type: 'float64',
              units: 'Hz',
              description: 'Start frequency',
            },
            {
              name: 'frequency_resolution',
              type: 'float64',
              units: 'Hz',
              description: 'Frequency resolution',
            },
            {
              name: 'num_directions',
              type: 'uint8',
              description: 'Number of direction bins',
            },
            {
              name: 'spectrum_data',
              type: 'float64',
              description: 'Variable-length array: num_frequencies * (1 + num_directions) floats. Parser must read num_frequencies and num_directions from header. First block = point spectrum, then one block per direction.',
            },
            {
              name: 'spectrum_status',
              type: 'uint8',
              description: 'Status code for the spectrum (0-9)',
            },
            {
              name: 'average_vessel_heading',
              type: 'float64',
              units: 'degrees',
              description: 'Average vessel heading during measurement',
            },
            {
              name: 'reserved_1',
              type: 'string',
              description: 'Reserved (empty)',
            },
            {
              name: 'reserved_2',
              type: 'string',
              description: 'Reserved (empty)',
            },
            {
              name: 'reserved_3',
              type: 'string',
              description: 'Reserved (empty)',
            },
            {
              name: 'reserved_4',
              type: 'string',
              description: 'Reserved (empty)',
            },
            {
              name: 'reserved_5',
              type: 'string',
              description: 'Reserved (empty, last field before checksum)',
            },
          ],
        },
      ],
    },
  ],
}
