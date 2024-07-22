// COMMONS
export const FIELD_TYPES = [
  // Unsigned Integers
  'uint8', //  'char',
  'uint16', // 'unsigned short',
  'uint32', // 'unsigned int',
  'uint64', // 'unsigned long',
  // Integers
  'int8', //  'signed char',
  'int16', // 'short',
  'int32', // 'int',
  'int64', // 'long',
  // Floats
  'float32', // 'float',
  'float64', // 'double',
  // Strings
  'string',
  // Boolean
  'boolean' // 'bool'
] as const

// NMEA
export const START_FLAG = '$'
export const SEPARATOR = ','
export const DELIMITER = '*'
export const END_FLAG = '\r\n'

export const START_FLAG_LENGTH = START_FLAG.length
export const SEPARATOR_LENGTH = SEPARATOR.length
export const DELIMITER_LENGTH = DELIMITER.length
export const CHECKSUM_LENGTH = 2
export const END_FLAG_LENGTH = END_FLAG.length
export const MINIMAL_LENGTH = START_FLAG_LENGTH + DELIMITER_LENGTH + CHECKSUM_LENGTH + END_FLAG_LENGTH

export const NMEA_ID_LENGTH = 3
export const NMEA_TALKER_LENGTH = 2
export const NMEA_SENTENCE_LENGTH = NMEA_ID_LENGTH + NMEA_TALKER_LENGTH

export const TALKERS = [
  ['AB', 'Independent AIS Base Station'],
  ['AD', 'Dependent AIS Base Station'],
  ['AG', 'Autopilot - General'],
  ['AI', 'Mobile AIS Station'],
  ['AN', 'AIS Aid to Navigation'],
  ['AP', 'Autopilot - Magnetic'],
  ['AR', 'AIS Receiving Station'],
  ['AT', 'AIS Transmitting Station'],
  ['AX', 'AIS Simplex Repeater'],
  ['BD', 'BeiDou (China)'],
  ['BI', 'Bilge System'],
  ['BN', 'Bridge navigational watch alarm system'],
  ['CA', 'Central Alarm'],
  ['CC', 'Computer - Programmed Calculator (obsolete)'],
  ['CD', 'Communications - Digital Selective Calling (DSC)'],
  ['CM', 'Computer - Memory Data (obsolete)'],
  ['CR', 'Data Receiver'],
  ['CS', 'Communications - Satellite'],
  ['CT', 'Communications - Radio-Telephone (MF/HF)'],
  ['CV', 'Communications - Radio-Telephone (VHF)'],
  ['CX', 'Communications - Scanning Receiver'],
  ['DE', 'DECCA Navigation (obsolete)'],
  ['DF', 'Direction Finder'],
  ['DM', 'Velocity Sensor, Speed Log, Water, Magnetic'],
  ['DP', 'Dynamiv Position'],
  ['DU', 'Duplex repeater station'],
  ['EC', 'Electronic Chart Display & Information System (ECDIS)'],
  ['EP', 'Emergency Position Indicating Beacon (EPIRB)'],
  ['ER', 'Engine Room Monitoring Systems'],
  ['FD', 'Fire Door'],
  ['FS', 'Fire Sprinkler'],
  ['GA', 'Galileo Positioning System'],
  ['GB', 'BeiDou (China)'],
  ['GI', 'NavIC, IRNSS (India)'],
  ['GL', 'GLONASS, according to IEIC 61162-1'],
  ['GN', 'Combination of multiple satellite systems (NMEA 1083)'],
  ['GP', 'Global Positioning System receiver'],
  ['GQ', 'QZSS regional GPS augmentation system (Japan)'],
  ['HC', 'Heading - Magnetic Compass'],
  ['HD', 'Hull Door'],
  ['HE', 'Heading - North Seeking Gyro'],
  ['HF', 'Heading - Fluxgate'],
  ['HN', 'Heading - Non North Seeking Gyro'],
  ['HS', 'Hull Stress'],
  ['II', 'Integrated Instrumentation'],
  ['IN', 'Integrated Navigation'],
  ['JA', 'Alarm and Monitoring'],
  ['JB', 'Water Monitoring'],
  ['JC', 'Power Management'],
  ['JD', 'Propulsion Control'],
  ['JE', 'Engine Control'],
  ['JF', 'Propulsion Boiler'],
  ['JG', 'Aux Boiler'],
  ['JH', 'Engine Governor'],
  ['LA', 'Loran A (obsolete)'],
  ['LC', 'Loran C (obsolete)'],
  ['MP', 'Microwave Positioning System (obsolete)'],
  ['MX', 'Multiplexer'],
  ['NL', 'Navigation light controller'],
  ['OM', 'OMEGA Navigation System (obsolete)'],
  ['OS', 'Distress Alarm System (obsolete)'],
  ['QZ', 'QZSS regional GPS augmentation system (Japan)'],
  ['RA', 'RADAR and/or ARPA'],
  ['RB', 'Record Book'],
  ['RC', 'Propulsion Machinery'],
  ['RI', 'Rudder Angle Indicator'],
  ['SA', 'Physical Shore AUS Station'],
  ['SD', 'Depth Sounder'],
  ['SG', 'Steering Gear'],
  ['SN', 'Electronic Positioning System, other/general'],
  ['SS', 'Scanning Sounder'],
  ['ST', 'Skytraq debug output'],
  ['TC', 'Track Control'],
  ['TI', 'Turn Rate Indicator'],
  ['TR', 'TRANSIT Navigation System'],
  ['UP', 'Microprocessor controller'],
  ['VA', 'VHF Data Exchange System (VDES), ASM'],
  ['VD', 'Velocity Sensor, Doppler, other/general'],
  ['VM', 'Velocity Sensor, Speed Log, Water, Magnetic'],
  ['VR', 'Voyage Data recorder'],
  ['VS', 'VHF Data Exchange System (VDES), Satellite'],
  ['VT', 'VHF Data Exchange System (VDES), Terrestrial'],
  ['VW', 'Velocity Sensor, Speed Log, Water, Mechanical'],
  ['WD', 'Watertight Door'],
  ['WI', 'Weather Instruments'],
  ['WL', 'Water Level'],
  ['YC', 'Transducer - Temperature (obsolete)'],
  ['YD', 'Transducer - Displacement, Angular or Linear (obsolete)'],
  ['YF', 'Transducer - Frequency (obsolete)'],
  ['YL', 'Transducer - Level (obsolete)'],
  ['YP', 'Transducer - Pressure (obsolete)'],
  ['YR', 'Transducer - Flow Rate (obsolete)'],
  ['YT', 'Transducer - Tachometer (obsolete)'],
  ['YV', 'Transducer - Volume (obsolete)'],
  ['YX', 'Transducer'],
  ['ZA', 'Timekeeper - Atomic Clock'],
  ['ZC', 'Timekeeper - Chronometer'],
  ['ZQ', 'Timekeeper - Quartz'],
  ['ZV', 'Timekeeper - Radio Update, WWV or WWVH']
] as const

export const TALKERS_SPECIAL = {
  P: 'Vendor specific',
  U: 'U# where \'#\' is a digit 0 …​ 9; User Configured'
}

// GENERATE ASCII STRING
export const CODE = {
  A: 'A'.charCodeAt(0),
  Z: 'Z'.charCodeAt(0),
  a: 'a'.charCodeAt(0),
  z: 'z'.charCodeAt(0),
  0: '0'.charCodeAt(0),
  9: '9'.charCodeAt(0)
} as const

// GENERATE NUMBERS
export const UINT8_MAX = Uint8Array.from([0b1111_1111])[0]
export const UINT16_MAX = Uint16Array.from([0b1111_1111_1111_1111])[0]
export const UINT32_MAX = Uint32Array.from([0b1111_1111_1111_1111_1111_1111_1111_1111])[0]
// export const UINT64_MAX = Uint64Array.from([0b11111111_11111111_11111111_11111111_11111111_11111111_11111111_11111111])[0]

export const [INT8_MIN, INT8_MAX] = Int8Array.from([0b1000_0000, 0b0111_1111])
export const [INT16_MIN, INT16_MAX] = Int16Array.from([0b1000_0000_0000_0000, 0b0111_1111_1111_1111])
export const [INT32_MIN, INT32_MAX] = Int32Array.from([0b1000_0000_0000_0000_0000_0000_0000_0000, 0b0111_1111_1111_1111_1111_1111_1111_1111])
// export const [INT64_MIN, INT64_MAX] = Int64Array.from([0b10000000_00000000_00000000_00000000_00000000_00000000_00000000_00000000, 0b01111111_11111111_11111111_11111111_11111111_11111111_11111111_11111111])

export const MAX_FLOAT = 999999999999999
export const MIN_FLOAT = -999999999999999

// PARSER
export const MAX_CHARACTERS = 1024
export const MAX_NMEA_CHARACTERS = 82

export const UNKNOWN_NMEA_SENTENCE_SCAFOLDING = {
  id: 'unknown',
  protocol: {
    name: 'unknown',
    standard: false
  },
  description: 'unknown nmea sentence'
}
