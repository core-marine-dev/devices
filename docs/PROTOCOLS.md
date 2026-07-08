# Protocols

## NMEA

ASCII string protocol.

PATTERN: -> `$[Talker]ID,Payload*CHECKSUM\r\n`

Standard:

- ASCII
- Whole sentence < 82 characteres -> ignore
- Start -> `$`
- Talker 2 characters
- ID -> 3 characters
- Payload -> \<field1>,\<field2>,...,\<fieldn>
- \*
- Checksum -> 2 characters
- End -> `\r\n`

Propietary / Non-standard

- ASCII
- ~~Whole sentence < 84 characteres -> ignore~~
- Start -> `$`
- Talker typically starts with P -> ignore => custom
- ID -> ~~3 characters~~
- Payload -> \<field1>,\<field2>,...,\<fieldn>
- \*
- Checksum -> 2 characters
- End -> `\r\n`

| Field | Value | Size | Description |
| :-    | :-:   | :-:  | :-          |
| START | '$'   | 1 char  | |
| TAG |  unknown  | >= 3 char  | |
| PAYLOAD | unknown   | >= 1 char  | |
| DELIMITER | '*'   | 1 char  | |
| CHECKSUM | 'XY'   | 2 hex char  | |
| END | '\r\n'   | 2 char  | |

## Septentrio SBF

Binary protocol.

PATTERN -> Header + TimeStamp + Payload

- Header:
  - 2 bytes = 2 char -> Sync => `$@` (ASCII) | 0x24 0x40 (Hexadecimal) | 36 64 (Decimal)
  - 2 bytes = 1 uint16 -> CRC => CRC-16 XMODEM
  - 2 bytes = 1 uint16 -> ID => 0-12 bits = number, 13-15 revision
  - 2 bytes = 1 uint16 -> Length => Multiple of 4
- TimeStamp:
  - 4 bytes = 1 uint32 -> TOW
  - 2 bytes = 1 uint16 -> WNc
- Payload:
  - Header.Length bytes
  - If data is not multiple of 4, it is filled with padding bytes (null bytes)

| Field | Value | Size | Description |
| :-    | :-:   | :-:  | :-          |
| SYNC | '$@' (ASCII) = 0x24 0x40 (hex) = 36 64 (dec)  | 2 bytes | |
| CRC | unknown | 2 bytes = 1 uint16 | |
| ID | unknown | 2 bytes = 1 uint16 | 0-12 bits = number, 13-15 revision |
| Length | unknown | 2 bytes = 1 uint16 | Multiple of 4 |
| TOW | unknown | 4 bytes = 1 uint32 | |
| WNc | unknown | 2 bytes = 1 uint16 | |
| PAYLOAD | unknown | LENGTH bytes | Multiple of 4 [padding bytes in the end] |

## SBG

Binary protocol.

2 kind of frames:

Standard Frame:

- 2 bytes = 2 char -> Sync => 0xFF 0x5A
- 1 byte = 1 uni8 -> ID
- 1 byte = 1 uint8 -> Class =>
  - 0x10 Commands
  - 0x00 Logs
  - 0x01 High Frequency
  - 0x02 NMEA Standard
  - 0x03 NMEA Propietary
  - 0x04 3rd Party
- 2 bytes = 1 unit16 -> Length
- 0 to Length <= 4086 bytes -> Payload
- 2 bytes = 1 uint16 -> CRC => CRC-16 Kermit
- 1 byte = 1 char -> ETX => 0x33

| Field | Value | Size | Description |
| :-    | :-:   | :-:  | :-          |
| SYNC | 0xFF 0x5A | 2 bytes | |
| ID | unknown | 1 byte = 1 uint8 | |
| CLASS | unknown | 1 byte = 1 uint8 | |
| LENGTH | unknown | 2 bytes = 1 uint16 | |
| PAYLOAD | unknown | LENGTH bytes | |
| CRC | unknown | 2 bytes = 1 uint16 | CRC-16 Kermit |
| ETX | 0x33 | 1 byte = 1 char |  |

Large Frame:

- 2 bytes = 2 char -> Sync => 0xFF 0x5A
- 1 byte = 1 uni8 -> ID
- 1 byte = 1 uint8 -> Class =>
  - 0x10 Commands
  - 0x00 Logs
  - 0x01 High Frequency
  - 0x02 NMEA Standard
  - 0x03 NMEA Propietary
  - 0x04 3rd Party
- 2 bytes = 1 unit16 -> Length => Payload length + 5
- 1 byte = 1 uni8 -> TX ID
- 2 bytes = 1 uint16 -> Page ID
- 2 bytes = 1 uint16 -> Nr Pages => Total number of pages
- 0 to Length <= 4081 bytes -> Payload
- 2 bytes = 1 uint16 -> CRC
- 1 byte = 1 char -> ETX => 0x33

| Field | Value | Size | Description |
| :-    | :-:   | :-:  | :-          |
| SYNC | 0xFF 0x5A | 2 bytes | |
| ID | unknown | 1 byte = 1 uint8 | |
| CLASS | unknown | 1 byte = 1 uint8 | |
| LENGTH | unknown | 2 bytes = 1 uint16 | |
| CRC | unknown | 2 bytes = 1 uint16 | CRC-16 Kermit |
| ETX | 0x33 | 1 byte = 1 char | |

## UBLOX UBX

Binary protocol.

- 2 bytes = 2 char -> Sync => 0xB5 0x62 (Hexadecimal) | `µb` (ISO 8859-1) | 181 98 (Decimal)
- 1 byte = 1 uint8 -> Class =>
- 1 byte = 1 uni8 -> ID
- 2 bytes = 1 unit16 -> Length
- Length bytes -> Payload
- 2 bytes = 2 uint8 -> Checksum => CRC-8 Fletcher

| Field | Value | Size | Description |
| :-    | :-:   | :-:  | :-          |
|       |       |      |             |

## Vectornav

Binary and NMEA protocol.

Binary protocol.

- Header:
  - 1 byte = 1 uint8 -> Sync => 0xFA
  - ¿N x 1 byte = N x 1 uint8 -> Groups?
    - Group is bits from 0-6
    - Each bit represent if its group is activated
      - Bit 0 = Group 1 activated
      - Bit 1 = Group 2 activated
      - ...
      - Bit 6 = Group 7 activated
    - If bit 7 = 1 -> the next byte is another Group
      - Bit 1 = Group 8 activated
      - ...
  - ¿M X 2 bytes = M x 1 uint16 -> GroupField?
    - GroupField is bits from 0-14
    - If bit 15 = 1 -> the next two bytes are another GroupField field.
    - GroupFields follow the same rule than Groups while Groups have 1 byte, GroupFields have 2 bytes.
- Payload:
  - Depends on what Group + GroupField are selected
  - They are in order
- Checksum:
  - 2 bytes = 1 uint16

| Field | Value | Size | Description |
| :-    | :-:   | :-:  | :-          |
|       |       |      |             |
