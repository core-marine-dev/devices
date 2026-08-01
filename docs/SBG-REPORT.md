> # ⚠️ HISTORICAL — this document describes the PRE-1.0.0 legacy parser
>
> `@coremarine/sbg-ecom` was refactored onto CMA at **1.0.0** (2026-08-01). Nothing below reflects
> what the library emits now: the output is CMA, the API is `addData`/`parseData`, `SBGFrameResponse`
> is gone, and the knowledge base covers **all 34** class-0 logs rather than the 25 counted here
> (this document says 22 in its prose and lists 25 rows — one of the three different figures the old
> docs gave for the same thing).
>
> Kept because the "legacy output" section is the record of what a consumer on `0.0.1` sees, which is
> what makes the 1.0.0 break legible. For the current library read
> [`packages/sbg-ecom/README.md`](../packages/sbg-ecom/README.md).

# SBG ECOM - Library & Node-RED Wrapper Report

## 1. Supported sentences / frames

The library currently supports **22 LOG messages** (firmware 2.3) plus 5 other message classes with no parsers implemented yet:

| ID | Name | Description |
| -- | ---- | ----------- |
| 01 | `SBG_ECOM_LOG_STATUS` | Device status, power supplies, comms, aiding, heave |
| 02 | `SBG_ECOM_LOG_UTC_TIME` | UTC time reference |
| 03 | `SBG_ECOM_LOG_IMU_DATA` | Accelerometer, gyroscope, temperature, delta speeds/angles |
| 04 | `SBG_ECOM_LOG_MAG` | Magnetic data with accelerometer |
| 05 | `SBG_ECOM_LOG_MAG_CALIB` | Magnetometer calibration data (raw buffer) |
| 06 | `SBG_ECOM_LOG_EKF_EULER` | Roll, pitch, yaw with accuracies |
| 07 | `SBG_ECOM_LOG_EKF_QUAT` | Quaternion orientation |
| 08 | `SBG_ECOM_LOG_EKF_NAV` | Position & velocities in NED with accuracies |
| 09 | `SBG_ECOM_LOG_SHIP_MOTION` | Real-time heave, surge, sway |
| 13 | `SBG_ECOM_LOG_GPS1_VEL` | GNSS velocity (primary receiver) |
| 14 | `SBG_ECOM_LOG_GPS1_POS` | GNSS position (primary receiver) |
| 15 | `SBG_ECOM_LOG_GPS1_HDT` | GNSS true heading (primary receiver) |
| 16 | `SBG_ECOM_LOG_GPS2_VEL` | GNSS velocity (secondary receiver) |
| 17 | `SBG_ECOM_LOG_GPS2_POS` | GNSS position (secondary receiver) |
| 18 | `SBG_ECOM_LOG_GPS2_HDT` | GNSS true heading (secondary receiver) |
| 19 | `SBG_ECOM_LOG_ODO_VEL` | Odometer velocity |
| 29 | `SBG_ECOM_LOG_DVL_BOTTOM_TRACK` | DVL bottom tracking |
| 30 | `SBG_ECOM_LOG_DVL_WATER_TRACK` | DVL water layer |
| 31 | `SBG_ECOM_LOG_GPS1_RAW` | GNSS raw data (primary) |
| 32 | `SBG_ECOM_LOG_SHIP_MOTION_HP` | Delayed heave, surge, sway |
| 36 | `SBG_ECOM_LOG_AIR_DATA` | Barometric altimeter / airdata |
| 37 | `SBG_ECOM_LOG_USBL` | Raw USBL position (subsea) |
| 38 | `SBG_ECOM_LOG_GPS2_RAW` | GNSS raw data (secondary) |
| 44 | `SBG_ECOM_LOG_IMU_SHORT` | Async delta angles/velocities from IMU |
| 47 | `SBG_ECOM_LOG_DEPTH` | Depth sensor (subsea) |

**Empty classes** (placeholder, no parsers yet): `CMD` (0x10), `HIGH_FREQ` (0x01), `NMEA_STANDARD` (0x02), `NMEA_PROPIETARY` (0x03), `THIRD_PARTY` (0x04).

## 2. Library output (TypeScript)

```typescript
// --- What parser.getFrames() returns ---
type SBGFrameResponse[] // Array of:

interface SBGFrameResponse {
  name: string              // e.g. 'SBG_ECOM_LOG_STATUS'
  type: SBGFrameType        // 'log' | 'command' | 'high-frequency' | 'nmea-standard' | 'nmea-propietary' | 'thid-party' | 'unknown'
  format: SBGFrameFormat    // 'standard' | 'large'
  buffer: Buffer            // Raw bytes of the entire frame
  frame: SBGFrame
}

interface SBGFrame {
  header: SBGHeader
  data: object | null       // Parsed payload (shape depends on message type)
  footer: SBGFooter
}

interface SBGHeader {
  sync: Buffer              // 0xFF5A
  messageID: number
  messageClass: number      // 0x00=LOG, 0x01=HIGH_FREQ, etc.
  length: number            // Payload byte length
}

interface SBGFooter {
  crc: number               // CRC-16 Kermit
  ext: Buffer               // ETX 0x33
}

// Example: data for SBG_ECOM_LOG_STATUS
interface StatusData {
  timestamp: number           // µs since power-up
  generalStatus: number
  reserved1: number
  comStatus: number
  aidingStatus: number
  reserved2: number
  reserved3: number
  uptime: number
  metadata: {
    generalStatus: { mainPowerOK: boolean, imuPowerOK: boolean, gpsPowerOK: boolean, settingsOK: boolean, ... }
    comStatus: { portAValid: boolean, portBValid: boolean, ..., canBus: string }
    aidingStatus: { gps1Position: boolean, gps1Velocity: boolean, ..., airData: boolean }
  }
}
```

**Usage:**

```typescript
import { Parser } from '@coremarine/sbg-ecom'

const parser = new Parser('2.3', false)
parser.addData(buffer)              // Feed raw binary data
const frames: SBGFrameResponse[] = parser.getFrames()  // Get parsed frames
```

## 3. Node-RED wrapper output

The Node-RED node wraps the library and communicates through the standard `msg` object. It supports 4 properties:

```typescript
// --- Input msg ---
interface InputMsg {
  payload: Buffer                 // Raw SBG binary data
  // Optional configuration commands:
  memory?: { command: 'get' | 'set', payload?: boolean }
  firmware?: { command: 'get' | 'set', payload?: string }
  firmwares?: {}                  // Request available firmware list
}

// --- Output msg ---
interface OutputMsg {
  payload: SBGFrameResponse[]     // Array of parsed frames (same as library output)
  // Only present if the corresponding input property was set:
  memory?: { memory: boolean, characters: number }
  firmware?: { firmware: string }
  firmwares?: string[]            // e.g. ['2.3']
}
```

The Node-RED node is a thin wrapper — `msg.payload` output is **exactly the same `SBGFrameResponse[]`** as the library. The only additions are the `memory`, `firmware`, and `firmwares` properties for runtime configuration.

**Node configuration** (editor UI):

- **Memory** (checkbox, default: `true`) — concatenate buffers vs replace
- **Firmware** (text, default: `"2.3"`) — firmware version to use
