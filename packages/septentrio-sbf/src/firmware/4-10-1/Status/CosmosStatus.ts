// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* CosmosStatus -> Number: 4243 => "OnChange" interval: 1s
  The CosmosStatus block provides information on the status of the Cosmos receiver
  service.

  CosmosStatus ---------------------------------------------------------------
  Block fields  Type  Units Do-Not-Use  Description
  Status       uint8                    The status of Cosmos receiver service:
                                          0: Disabled
                                          1: Running
  Padding       uint                    Padding bytes

  (Cosmos is Septentrio's fleet monitoring dashboard; the receiver reports whether
  its local service is running. See the setCosmosConfig command.)
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Status', type: 'uint8', description: 'Status of the Cosmos receiver service: 0 disabled, 1 running' },
]

export const COSMOS_STATUS: Readonly<Record<number, string>> = {
  0: 'DISABLED',
  1: 'RUNNING',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Status: (value) => label(COSMOS_STATUS, value),
}

export const cosmosStatus: BlockDefinition = {
  name: 'CosmosStatus',
  number: 4243,
  description: 'Status of the Cosmos receiver service',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
