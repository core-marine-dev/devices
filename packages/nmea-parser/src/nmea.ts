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
          id: 'GBS',
          description: 'GNSS Satellite Fault Detection — the RAIM residual test. Reports which satellite is most likely faulty and the expected 1-sigma position error. The NMEA 4.11 form adds System ID and Signal ID; see the NMEA 4.11 protocol block.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time of the GGA or GNS fix this sentence belongs to',
            },
            {
              name: 'latitude_error',
              type: 'float64',
              units: 'm',
              description: 'Expected 1-sigma error in latitude',
            },
            {
              name: 'longitude_error',
              type: 'float64',
              units: 'm',
              description: 'Expected 1-sigma error in longitude',
            },
            {
              name: 'altitude_error',
              type: 'float64',
              units: 'm',
              description: 'Expected 1-sigma error in altitude',
            },
            {
              name: 'failed_satellite_id',
              type: 'uint8',
              description: 'ID of the most likely failed satellite. Null when no failure is suspected.',
            },
            {
              name: 'probability_of_missed_detection',
              type: 'float64',
              description: 'Probability of missed detection for the most likely failed satellite',
            },
            {
              name: 'bias_estimate',
              type: 'float64',
              units: 'm',
              description: 'Estimate of the bias on the most likely failed satellite',
            },
            {
              name: 'bias_standard_deviation',
              type: 'float64',
              units: 'm',
              description: 'Standard deviation of the bias estimate',
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
          id: 'GLL',
          description: 'Geographic Position - Latitude/Longitude. Six-field form, without the NMEA 2.3 mode indicator.',
          payload: [
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
              description: 'E: East\n W: West',
            },
            {
              name: 'utc_time',
              type: 'string',
            },
            {
              name: 'status',
              type: 'string',
              description: 'A = data valid\n V = data invalid',
            },
          ],
        },
        {
          id: 'GLL',
          description: 'Geographic Position - Latitude/Longitude. Seven-field form, with the mode indicator added in NMEA 2.3.',
          payload: [
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
              description: 'E: East\n W: West',
            },
            {
              name: 'utc_time',
              type: 'string',
            },
            {
              name: 'status',
              type: 'string',
              description: 'A = data valid\n V = data invalid',
            },
            {
              name: 'mode_indicator',
              type: 'string',
              description: 'Mode indicator (NMEA 2.3+)\n A = Autonomous\n D = Differential\n E = Estimated (dead reckoning)\n M = Manual input\n N = Data not valid',
            },
          ],
        },
        {
          id: 'GNS',
          description: 'GNSS Fix Data — the multi-constellation counterpart of GGA. Unlike GGA it carries one mode-indicator character PER constellation. Twelve-field form; the NMEA 4.1 form adds a navigational status field, see the NMEA 4.11 protocol block.',
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
              description: 'E: East\n W: West',
            },
            {
              name: 'mode_indicator',
              type: 'string',
              description: 'ONE CHARACTER PER CONSTELLATION, in the order GPS, GLONASS, Galileo, BeiDou, ... — so the field length tells you how many constellations the receiver reports.\n N = No fix\n A = Autonomous\n D = Differential\n P = Precise (no degradation, e.g. no SA)\n R = RTK integer (fixed) ambiguities\n F = RTK float ambiguities\n E = Estimated (dead reckoning)\n M = Manual input\n S = Simulator',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Total number of satellites in use, 00 to 99',
            },
            {
              name: 'hdop',
              type: 'float64',
            },
            {
              name: 'altitude',
              type: 'float64',
              units: 'm',
              description: 'Antenna altitude above/below mean-sea-level (geoid)',
            },
            {
              name: 'geoid_separation',
              type: 'float64',
              units: 'm',
              description: 'Difference between the WGS-84 ellipsoid surface and the mean-sea-level (geoid) surface',
            },
            {
              name: 'age_of_differential_data',
              type: 'uint32',
              units: 'sec',
              description: 'Age of the differential corrections; null when differential is not used',
            },
            {
              name: 'reference_station_id',
              type: 'uint16',
              description: 'Reference station ID; null when no corrections are received',
            },
          ],
        },
        {
          id: 'GRS',
          description: 'GNSS Range Residuals — one residual per satellite, in the SAME ORDER as the satellites listed in the matching GSA sentence. Fourteen-field form; the NMEA 4.11 form adds System ID and Signal ID, see the NMEA 4.11 protocol block.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time of the GGA or GNS fix this sentence belongs to',
            },
            {
              name: 'residuals_mode',
              type: 'uint8',
              description: '0 = residuals were used to calculate the position given in the matching GGA/GNS\n 1 = residuals were recomputed after the position was computed',
            },
            {
              name: 'residual_1',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_2',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_3',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_4',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_5',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_6',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_7',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_8',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_9',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_10',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_11',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_12',
              type: 'float64',
              units: 'm',
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
          id: 'RMC',
          description: 'Recommended Minimum Specific GNSS Data. Eleven-field form, without the NMEA 2.3 mode indicator. Carries date and speed, which GGA does not, but no fix quality or altitude.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
            },
            {
              name: 'status',
              type: 'string',
              description: 'A = data valid\n V = navigation receiver warning',
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
              description: 'E: East\n W: West',
            },
            {
              name: 'speed_knots',
              type: 'float64',
              units: 'knots',
              description: 'Speed over ground',
            },
            {
              name: 'track_degrees_true',
              type: 'float64',
              units: 'deg',
              description: 'Track made good, degrees True',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy. Kept as a string: the two-digit year and the ddmmyy order make a numeric type misleading.',
            },
            {
              name: 'magnetic_variation',
              type: 'float64',
              units: 'deg',
              description: 'Magnitude of the magnetic variation; the direction is the next field',
            },
            {
              name: 'magnetic_variation_direction',
              type: 'string',
              description: 'E = East\n W = West',
            },
          ],
        },
        {
          id: 'RMC',
          description: 'Recommended Minimum Specific GNSS Data. Twelve-field form, with the mode indicator added in NMEA 2.3.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
            },
            {
              name: 'status',
              type: 'string',
              description: 'A = data valid\n V = navigation receiver warning',
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
              description: 'E: East\n W: West',
            },
            {
              name: 'speed_knots',
              type: 'float64',
              units: 'knots',
              description: 'Speed over ground',
            },
            {
              name: 'track_degrees_true',
              type: 'float64',
              units: 'deg',
              description: 'Track made good, degrees True',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy. Kept as a string: the two-digit year and the ddmmyy order make a numeric type misleading.',
            },
            {
              name: 'magnetic_variation',
              type: 'float64',
              units: 'deg',
              description: 'Magnitude of the magnetic variation; the direction is the next field',
            },
            {
              name: 'magnetic_variation_direction',
              type: 'string',
              description: 'E = East\n W = West',
            },
            {
              name: 'mode_indicator',
              type: 'string',
              description: 'Mode indicator (NMEA 2.3+)\n A = Autonomous\n D = Differential\n E = Estimated (dead reckoning)\n M = Manual input\n N = Data not valid',
            },
          ],
        },
        {
          id: 'ROT',
          description: 'Rate of Turn',
          payload: [
            {
              name: 'rate_of_turn',
              type: 'float64',
              units: 'deg/min',
              description: 'Rate of turn. NEGATIVE means the bow turns to port.',
            },
            {
              name: 'status',
              type: 'string',
              description: 'A = data valid\n V = data invalid',
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
      version: '4.11',
      standard: true,
      sentences: [
        {
          id: 'GBS',
          description: 'GNSS Satellite Fault Detection, ten-field form: NMEA 4.11 appended System ID and Signal ID so the failed satellite can be attributed to a constellation and a signal.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time of the GGA or GNS fix this sentence belongs to',
            },
            {
              name: 'latitude_error',
              type: 'float64',
              units: 'm',
              description: 'Expected 1-sigma error in latitude',
            },
            {
              name: 'longitude_error',
              type: 'float64',
              units: 'm',
              description: 'Expected 1-sigma error in longitude',
            },
            {
              name: 'altitude_error',
              type: 'float64',
              units: 'm',
              description: 'Expected 1-sigma error in altitude',
            },
            {
              name: 'failed_satellite_id',
              type: 'uint8',
              description: 'ID of the most likely failed satellite. Null when no failure is suspected.',
            },
            {
              name: 'probability_of_missed_detection',
              type: 'float64',
              description: 'Probability of missed detection for the most likely failed satellite',
            },
            {
              name: 'bias_estimate',
              type: 'float64',
              units: 'm',
              description: 'Estimate of the bias on the most likely failed satellite',
            },
            {
              name: 'bias_standard_deviation',
              type: 'float64',
              units: 'm',
              description: 'Standard deviation of the bias estimate',
            },
            {
              name: 'system_id',
              type: 'uint8',
              description: 'GNSS System ID (NMEA 4.11). 1 = GPS, 2 = GLONASS, 3 = Galileo, 4 = BeiDou; see the NMEA 4.11 System ID table for the rest.',
            },
            {
              name: 'signal_id',
              type: 'uint8',
              description: 'GNSS Signal ID (NMEA 4.11) — which signal of that constellation. The meaning is per-constellation; see the NMEA 4.11 Signal ID table.',
            },
          ],
        },
        {
          id: 'GNS',
          description: 'GNSS Fix Data, thirteen-field form: NMEA 4.1 appended a navigational status field for safety-of-life use.',
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
              description: 'E: East\n W: West',
            },
            {
              name: 'mode_indicator',
              type: 'string',
              description: 'ONE CHARACTER PER CONSTELLATION, in the order GPS, GLONASS, Galileo, BeiDou, ...\n N = No fix\n A = Autonomous\n D = Differential\n P = Precise\n R = RTK integer (fixed) ambiguities\n F = RTK float ambiguities\n E = Estimated (dead reckoning)\n M = Manual input\n S = Simulator',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Total number of satellites in use, 00 to 99',
            },
            {
              name: 'hdop',
              type: 'float64',
            },
            {
              name: 'altitude',
              type: 'float64',
              units: 'm',
              description: 'Antenna altitude above/below mean-sea-level (geoid)',
            },
            {
              name: 'geoid_separation',
              type: 'float64',
              units: 'm',
              description: 'Difference between the WGS-84 ellipsoid surface and the mean-sea-level (geoid) surface',
            },
            {
              name: 'age_of_differential_data',
              type: 'uint32',
              units: 'sec',
              description: 'Age of the differential corrections; null when differential is not used',
            },
            {
              name: 'reference_station_id',
              type: 'uint16',
              description: 'Reference station ID; null when no corrections are received',
            },
            {
              name: 'navigational_status',
              type: 'string',
              description: 'Navigational status (NMEA 4.1+)\n S = Safe\n C = Caution\n U = Unsafe\n V = Navigational status not valid',
            },
          ],
        },
        {
          id: 'GRS',
          description: 'GNSS Range Residuals, sixteen-field form: NMEA 4.11 appended System ID and Signal ID, so the residuals can be attributed to a constellation and signal.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC time of the GGA or GNS fix this sentence belongs to',
            },
            {
              name: 'residuals_mode',
              type: 'uint8',
              description: '0 = residuals were used to calculate the position given in the matching GGA/GNS\n 1 = residuals were recomputed after the position was computed',
            },
            {
              name: 'residual_1',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_2',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_3',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_4',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_5',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_6',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_7',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_8',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_9',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_10',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_11',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'residual_12',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'system_id',
              type: 'uint8',
              description: 'GNSS System ID (NMEA 4.11). 1 = GPS, 2 = GLONASS, 3 = Galileo, 4 = BeiDou; see the NMEA 4.11 System ID table for the rest.',
            },
            {
              name: 'signal_id',
              type: 'uint8',
              description: 'GNSS Signal ID (NMEA 4.11) — which signal of that constellation.',
            },
          ],
        },
        {
          id: 'RMC',
          description: 'Recommended Minimum Specific GNSS Data, thirteen-field form: NMEA 4.1 appended a navigational status field.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
            },
            {
              name: 'status',
              type: 'string',
              description: 'A = data valid\n V = navigation receiver warning',
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
              description: 'E: East\n W: West',
            },
            {
              name: 'speed_knots',
              type: 'float64',
              units: 'knots',
              description: 'Speed over ground',
            },
            {
              name: 'track_degrees_true',
              type: 'float64',
              units: 'deg',
              description: 'Track made good, degrees True',
            },
            {
              name: 'date',
              type: 'string',
              description: 'Date as ddmmyy. Kept as a string: the two-digit year and the ddmmyy order make a numeric type misleading.',
            },
            {
              name: 'magnetic_variation',
              type: 'float64',
              units: 'deg',
              description: 'Magnitude of the magnetic variation; the direction is the next field',
            },
            {
              name: 'magnetic_variation_direction',
              type: 'string',
              description: 'E = East\n W = West',
            },
            {
              name: 'mode_indicator',
              type: 'string',
              description: 'Mode indicator (NMEA 2.3+)\n A = Autonomous\n D = Differential\n E = Estimated (dead reckoning)\n M = Manual input\n N = Data not valid',
            },
            {
              name: 'navigational_status',
              type: 'string',
              description: 'Navigational status (NMEA 4.1+)\n S = Safe\n C = Caution\n U = Unsafe\n V = Navigational status not valid',
            },
          ],
        },
        {
          id: 'TXT',
          description: 'Text Transmission — free-form text from the device, used for status and error reporting. Septentrio emits it as TXTbase to relay text from a base station in RTCM message 1029, with the text identifier set to 1 and the text formatted "nnnn:<base txt>" where nnnn is the base station ID.',
          payload: [
            {
              name: 'total_messages',
              type: 'uint8',
              description: 'Total number of messages in this transmission, 01 to 99',
            },
            {
              name: 'message_number',
              type: 'uint8',
              description: 'Number of this message within the transmission, 01 to 99',
            },
            {
              name: 'text_identifier',
              type: 'uint8',
              description: 'Text identifier — what kind of message this is\n 00 = Error\n 01 = Warning\n 02 = Notice\n 07 = User',
            },
            {
              name: 'text',
              type: 'string',
              description: 'The message text itself. ASCII only, and commas cannot appear in it — they would be read as field separators.',
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
    {
      protocol: 'KONGSBERG SEATEX',
      version: '15',
      standard: false,
      sentences: [
        {
          id: 'PSXN20',
          description: 'The proprietary PSXN20 NMEA sentence contains quality indicators for roll, pitch, heading and position. The sentence destination is positioning reference systems. The sentence is based on NMEA sentence format.',
          payload: [
            {
              name: 'message_number',
              type: 'uint8',
              description: 'Message number: 20',
            },
            {
              name: 'horizontal_quality',
              type: 'uint8',
              description: 'Horizontal position and velocity quality\n0 = Normal\n1 = Reduced performance\n2 = Invalid data',
            },
            {
              name: 'height_quality',
              type: 'uint8',
              description: 'Height and vertical velocity quality\n0 = Normal\n1 = Reduced performance\n2 = Invalid data',
            },
            {
              name: 'heading_quality',
              type: 'uint8',
              description: 'Heading quality\n0 = Normal\n1 = Reduced performance\n2 = Invalid data',
            },
            {
              name: 'roll_pitch_quality',
              type: 'uint8',
              description: 'Roll and pitch quality\n0 = Normal\n1 = Reduced performance\n2 = Invalid data',
            },
          ],
        },
        {
          id: 'PSXN23',
          description: 'The proprietary PSXN23 NMEA sentence contains attitude and heave data calculated in the MGC system. The sentence destination is PRS monitoring systems. The sentence is based on NMEA sentence format.',
          payload: [
            {
              name: 'message_number',
              type: 'uint8',
              description: 'Message number: 23',
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Roll in degrees. Positive with port side up.',
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Pitch in degrees. Positive with bow up.',
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'Heading, degrees true.',
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'Heave. Positive down.',
            },
          ],
        },
      ],
    },
    {
      protocol: 'TRIMBLE',
      version: '1',
      standard: false,
      sentences: [
        {
          id: 'PTNLAVR',
          description: 'Trimble proprietary $PTNL,AVR — yaw, tilt and the antenna baseline, computed from the moving-baseline vector. Requires a two-antenna system.',
          payload: [
            {
              name: 'message_id',
              type: 'string',
              description: 'Message type: AVR',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the vector fix (hhmmss.ss)',
            },
            {
              name: 'yaw',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'yaw_indicator',
              type: 'string',
              description: 'Constant text: Yaw',
            },
            {
              name: 'tilt',
              type: 'float64',
              units: 'deg',
            },
            {
              name: 'tilt_indicator',
              type: 'string',
              description: 'Constant text: Tilt',
            },
            {
              name: 'reserved_1',
              type: 'string',
              description: 'NOT DOCUMENTED by Trimble. Both of Trimble\'s own field tables skip fields 7 and 8, and both are empty in Trimble\'s own example sentence. Left as an unnamed passthrough rather than guessed at — the raw value is still here if a device turns out to fill it.',
            },
            {
              name: 'reserved_2',
              type: 'string',
              description: 'NOT DOCUMENTED by Trimble — see reserved_1.',
            },
            {
              name: 'range',
              type: 'float64',
              units: 'm',
              description: 'Distance between the two antennas',
            },
            {
              name: 'gps_quality',
              type: 'int8',
              description: '0 = Invalid\n 1 = Autonomous\n 2 = RTK Float\n 3 = RTK Fixed\n 4 = DGPS',
            },
            {
              name: 'pdop',
              type: 'float64',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used in the solution',
            },
          ],
        },
        {
          id: 'PTNLGGK',
          description: 'Trimble proprietary $PTNL,GGK — position fix with an ELLIPSOIDAL height, unlike GGA\'s mean-sea-level altitude. Longer than the NMEA 0183 80-character limit.',
          payload: [
            {
              name: 'message_id',
              type: 'string',
              description: 'Message type: GGK',
            },
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the position fix (hhmmss.ss)',
            },
            {
              name: 'utc_date',
              type: 'string',
              description: 'Date as mmddyy — MONTH FIRST, unlike RMC\'s ddmmyy. Kept as a string for that reason.',
            },
            {
              name: 'latitude',
              type: 'string',
              units: 'deg',
              description: 'Degrees and decimal minutes (ddmm.mmmmmmm)',
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
              description: 'Degrees and decimal minutes (dddmm.mmmmmmm)',
            },
            {
              name: 'longitude_direction',
              type: 'string',
              description: 'E: East\n W: West',
            },
            {
              name: 'gps_quality',
              type: 'int8',
              description: '0 = Invalid\n 1 = Autonomous\n 2 = RTK Float\n 3 = RTK Fixed\n 4 = DGPS\n 5 = SBAS\n 6 = RTK 3D Float\n 7 = RTK 3D Fixed\n 8 = RTK 2D Float\n 9 = RTK 2D Fixed\n 10 = OmniSTAR HP/XP\n 11 = OmniSTAR VBS\n 12 = Location RTK\n 13 = Beacon DGPS\n 14 = CenterPoint RTX\n 15 = xFill',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used in the solution',
            },
            {
              name: 'dop',
              type: 'float64',
              description: 'Dilution of precision of the fix',
            },
            {
              name: 'ellipsoidal_height',
              type: 'string',
              units: 'm',
              description: 'Ellipsoidal height — antenna height above the ellipsoid, NOT above mean sea level. A STRING because the value carries an EHT prefix on the wire (e.g. EHT150.790), so it does not parse as a number.',
            },
            {
              name: 'height_units',
              type: 'string',
              description: 'M = meters',
            },
          ],
        },
      ],
    },
    {
      protocol: 'LEICA',
      version: '1',
      standard: false,
      sentences: [
        {
          id: 'LLQ',
          description: 'Leica local position and quality — position as GRID coordinates (easting/northing in metres in a local projection), not latitude/longitude.',
          payload: [
            {
              name: 'utc_time',
              type: 'string',
              description: 'UTC of the position (hhmmss.ss)',
            },
            {
              name: 'utc_date',
              type: 'string',
              description: 'Date as ddmmyy',
            },
            {
              name: 'grid_easting',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'easting_units',
              type: 'string',
              description: 'M = meters',
            },
            {
              name: 'grid_northing',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'northing_units',
              type: 'string',
              description: 'M = meters',
            },
            {
              name: 'gps_quality',
              type: 'int8',
              description: '0 = Position not valid\n 1 = GPS navigation fix\n 2 = DGPS fix\n 3 = RTK fix',
            },
            {
              name: 'satellites',
              type: 'uint8',
              description: 'Number of satellites used in the computation',
            },
            {
              name: 'position_quality',
              type: 'float64',
              units: 'm',
              description: 'Coordinate quality of the position',
            },
            {
              name: 'height',
              type: 'float64',
              units: 'm',
            },
            {
              name: 'height_units',
              type: 'string',
              description: 'M = meters',
            },
          ],
        },
      ],
    },
  ],
}
