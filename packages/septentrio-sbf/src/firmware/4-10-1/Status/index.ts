// coded
import { channelStatus } from './ChannelStatus'
import { cosmosStatus } from './CosmosStatus'
import { diskStatus } from './DiskStatus'
import { dynDNSStatus } from './DynDNSStatus'
import { inputLink } from './InputLink'
import { ipStatus } from './IPStatus'
import { ntripClientStatus } from './NTRIPClientStatus'
import { ntripServerStatus } from './NTRIPServerStatus'
import { outputLink } from './OutputLink'
import { p2ppStatus } from './P2PPStatus'
import { qualityInd } from './QualityInd'
import { receiverStatus } from './ReceiverStatus'
import { rfStatus } from './RFStatus'
import { satVisibility } from './SatVisibility'

import type { BlockDefinition } from '../../../types'

// §4.2.15 Status Blocks.
//
// COMPLETE for firmware 4.10.1, except LBandTrackerStatus 4201 which lives with
// the other L-band blocks in §4.2.14.
export const blocks: readonly BlockDefinition[] = [
  channelStatus,
  satVisibility,
  receiverStatus,
  qualityInd,
  diskStatus,
  rfStatus,
  ipStatus,
  dynDNSStatus,
  ntripClientStatus,
  ntripServerStatus,
  inputLink,
  outputLink,
  p2ppStatus,
  cosmosStatus,
]
