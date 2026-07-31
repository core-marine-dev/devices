// coded
import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { degrees } from '../../../utils'

/* ReceiverSetup -> Number: 5902 => "OnChange" interval: block generated each time
   a user-command is entered to change one or more values in the block (e.g. when
   entering the setMarkerParameters command)

  The ReceiverSetup block contains parameters related to the receiver and its
  installation. When generating RINEX files, this block defines the RINEX file
  name and the contents of the header.

  For all fields containing a string, if the length of the string is lower than
  the size of the corresponding field, the unused bytes are set to zero.

  ReceiverSetup --------------------------------------------------------------
  Block fields          Type  Units Do-Not-Use  Description
  Reserved            uint8[2]                  2 bytes reserved for future use, to be ignored by decoding software
  MarkerName         char[60]                   Marker name (set with setMarkerParameters)
  MarkerNumber       char[20]                   Marker number (set with setMarkerParameters)
  Observer           char[20]                   Observer name (set with setObserverParameters)
  Agency             char[40]                   Observer agency (set with setObserverParameters)
  RxSerialNumber     char[20]                   Receiver serial number
  RxName             char[20]                   Receiver GNSS engine name
  RxVersion          char[20]                   Receiver firmware version
  AntSerialNbr       char[20]                   Serial number of the main antenna (set with setAntennaOffset)
  AntType            char[20]                   Type of the main antenna (set with setAntennaOffset)
  deltaH              float32    1 m            δH offset of the main antenna (set with setAntennaOffset)
  deltaE              float32    1 m            δE offset of the main antenna (set with setAntennaOffset)
  deltaN              float32    1 m            δN offset of the main antenna (set with setAntennaOffset)
Rev 1 MarkerType     char[20]                   Marker type (set with the setMarkerParameters command)
Rev 2 GNSSFWVersion  char[40]                   Version of the firmware installed on the receiver
Rev 3 ProductName    char[40]                   Product name
Rev 4 Latitude       float64  1 rad  -2 * 10¹⁰  Latitude of the reference position, from -π/2 to +π/2, positive North of
                                                Equator. Use the setPVTMode command to set the reference position.
Rev 4 Longitude      float64  1 rad  -2 * 10¹⁰  Longitude of the reference position, from -π to +π, positive East of
                                                Greenwich. Use the setPVTMode command to set the reference position.
Rev 4 Height         float32    1 m  -2 * 10¹⁰  Ellipsoidal height of the reference position (with respect to the WGS84
                                                ellipsoid). Use the setPVTMode command to set the reference position.
Rev 4 StationCode   char[10]                    Station code (set with setMarkerParameters). This field can for example
                                                contain the four-letter IGS station code assigned to the receiver.
Rev 4 MonumentIdx    uint8                      Monument index (set with setMarkerParameters). Identifies the monument
                                                when there are multiple monuments at the same station.
Rev 4 ReceiverIdx    uint8                      Receiver index (set with setMarkerParameters). Identifies the receiver
                                                when there are multiple receivers at the same monument.
Rev 4 CountryCode   char[3]                     ISO 3-character country code (set with setMarkerParameters)
Rev 4 Reserved1     char[21]                    Reserved
  Padding              uint                     Padding bytes

  ⭐ WHY THIS BLOCK MATTERS BEYOND ITS CONTENTS: `RxVersion` is the receiver's OWN
  firmware version. The parser LEARNS from it (see protocol-sbf.ts), so
  `protocol.version` stops being "whatever the constructor was told" and becomes
  "what the device says it is" — the same move tblive makes with its `FV=`
  response. A receiver on 4.14 fed to a parser configured for 4.10.1 is then
  visible in the output instead of silently mis-decoded.
*/
const REVISION_0: readonly FieldDefinition[] = [
  { name: 'Reserved', type: 'uint16', reserved: true, description: '2 bytes reserved for future use, to be ignored by decoding software' },
  { name: 'MarkerName', type: 'string', length: 60, description: 'Marker name, set with setMarkerParameters' },
  { name: 'MarkerNumber', type: 'string', length: 20, description: 'Marker number, set with setMarkerParameters' },
  { name: 'Observer', type: 'string', length: 20, description: 'Observer name, set with setObserverParameters' },
  { name: 'Agency', type: 'string', length: 40, description: 'Observer agency, set with setObserverParameters' },
  { name: 'RxSerialNumber', type: 'string', length: 20, description: 'Receiver serial number' },
  { name: 'RxName', type: 'string', length: 20, description: 'Receiver GNSS engine name' },
  { name: 'RxVersion', type: 'string', length: 20, description: 'Receiver firmware version — the parser learns protocol.version from this' },
  { name: 'AntSerialNbr', type: 'string', length: 20, description: 'Serial number of the main antenna, set with setAntennaOffset' },
  { name: 'AntType', type: 'string', length: 20, description: 'Type of the main antenna, set with setAntennaOffset' },
  { name: 'deltaH', type: 'float32', units: 'm', description: 'Height offset of the main antenna, set with setAntennaOffset' },
  { name: 'deltaE', type: 'float32', units: 'm', description: 'East offset of the main antenna, set with setAntennaOffset' },
  { name: 'deltaN', type: 'float32', units: 'm', description: 'North offset of the main antenna, set with setAntennaOffset' },
]

const REVISION_1: readonly FieldDefinition[] = [
  ...REVISION_0,
  { name: 'MarkerType', type: 'string', length: 20, description: 'Marker type, set with setMarkerParameters' },
]

const REVISION_2: readonly FieldDefinition[] = [
  ...REVISION_1,
  { name: 'GNSSFWVersion', type: 'string', length: 40, description: 'Version of the firmware installed on the receiver' },
]

const REVISION_3: readonly FieldDefinition[] = [
  ...REVISION_2,
  { name: 'ProductName', type: 'string', length: 40, description: 'Product name' },
]

const REVISION_4: readonly FieldDefinition[] = [
  ...REVISION_3,
  { name: 'Latitude', type: 'float64', units: 'rad', doNotUse: DO_NOT_USE_FLOAT, description: 'Latitude of the reference position, from -π/2 to +π/2, positive North of the Equator' },
  { name: 'Longitude', type: 'float64', units: 'rad', doNotUse: DO_NOT_USE_FLOAT, description: 'Longitude of the reference position, from -π to +π, positive East of Greenwich' },
  { name: 'Height', type: 'float32', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Ellipsoidal height of the reference position, with respect to the WGS84 ellipsoid' },
  { name: 'StationCode', type: 'string', length: 10, description: 'Station code, set with setMarkerParameters; may hold the four-letter IGS station code' },
  { name: 'MonumentIdx', type: 'uint8', description: 'Monument index: identifies the monument when a station has several' },
  { name: 'ReceiverIdx', type: 'uint8', description: 'Receiver index: identifies the receiver when a monument has several' },
  { name: 'CountryCode', type: 'string', length: 3, description: 'ISO 3-character country code, set with setMarkerParameters' },
  { name: 'Reserved1', type: 'string', length: 21, reserved: true, description: 'Reserved' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  Latitude: (value) => degrees(value),
  Longitude: (value) => degrees(value),
}

// The identity keys, and which field each one comes from. A table rather than a
// chain of ifs so the aggregate stays one readable place as revisions add more.
const IDENTITY: Readonly<Record<string, string>> = {
  name: 'RxName',
  product: 'ProductName',
  serialNumber: 'RxSerialNumber',
  firmware: 'RxVersion',
  gnssFirmware: 'GNSSFWVersion',
  antenna: 'AntType',
  marker: 'MarkerName',
}

export const receiverSetup: BlockDefinition = {
  name: 'ReceiverSetup',
  number: 5902,
  description: 'General information about the receiver installation: marker, observer, antenna, firmware version and reference position',
  timestamp: 'receiver',
  revisions: [REVISION_0, REVISION_1, REVISION_2, REVISION_3, REVISION_4],
  decoders,
  // The identity of the box, as one object: this is what an operator wants when
  // asking "what am I actually connected to?".
  payloadMetadata: (values) => {
    const receiver: Record<string, string> = {}
    for (const [key, field] of Object.entries(IDENTITY)) {
      const value = values[field]
      // An unset string field is 60 NUL bytes, i.e. '' — not worth publishing.
      if (typeof value === 'string' && value !== '') receiver[key] = value
    }
    return (Object.keys(receiver).length === 0) ? {} : { receiver }
  },
}
