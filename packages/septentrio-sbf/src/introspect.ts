// installed
import type { Result } from '@coremarine/protocol-core'

// coded
import { PROTOCOL_NAME } from './constants'
import { isSubBlock } from './types'
import type { BlockDefinition, BlockRegistry, FieldDefinition, FieldSpec, SBFError, SBFSentenceDefinition, ScalarSpec, SubBlockSpec } from './types'

// SELF-DESCRIPTION ----------------------------------------------------------
// Ask the parser what it believes a block looks like: its fields, their types,
// units, Do-Not-Use values and descriptions, per revision.
//
// This exists for DIAGNOSIS, the same reason tblive has it. These parsers run on
// remote installations with restricted internet access for years, so an operator
// who can ask the deployed binary "what do you think block 4007 revision 1
// contains?" settles a question that would otherwise need the datasheets.
//
// Deliberately CMA-shaped: the same keys a parsed sentence has, minus the ones
// only a real parse can fill (no `raw`, no `timestamp`, no `errors`), with
// `payload` holding field DEFINITIONS instead of decoded values.

const describeField = (definition: FieldDefinition): FieldSpec => {
  if (isSubBlock(definition)) {
    const spec: SubBlockSpec = { name: definition.name, count: definition.count, fields: describeFields(definition.fields) }
    if (definition.length !== undefined) spec.length = definition.length
    if (definition.description !== undefined) spec.description = definition.description
    return spec
  }
  const spec: ScalarSpec = { name: definition.name, type: definition.type }
  if (definition.units !== undefined) spec.units = definition.units
  if (definition.description !== undefined) spec.description = definition.description
  if (definition.doNotUse !== undefined) spec.doNotUse = definition.doNotUse
  if (definition.reserved !== undefined) spec.reserved = definition.reserved
  return spec
}

const describeFields = (definitions: readonly FieldDefinition[]): FieldSpec[] => definitions.map(describeField)

// One definition per revision, newest last. A block's revisions are supersets of
// each other (§4.1.6), so seeing them side by side is how you tell which fields
// a given receiver generation will actually send.
const describe = (definition: BlockDefinition, firmware: string): SBFSentenceDefinition[] =>
  definition.revisions.map((fields, revision) => ({
    id: String(definition.number),
    name: definition.name,
    protocol: { name: PROTOCOL_NAME, version: firmware },
    revision,
    timestamp: definition.timestamp,
    payload: describeFields(fields),
    description: definition.description,
    opaque: definition.opaque,
  }))

export const describeSentence = (blocks: BlockRegistry, firmware: string, id: number | string): Result<SBFSentenceDefinition[], SBFError[]> => {
  const definition = blocks.get(Number(id))
  if (definition === undefined) {
    return { success: false, error: [{ kind: 'unknown-block', message: `Block ${String(id)} is not modelled for firmware ${firmware}` }] }
  }
  return { success: true, value: describe(definition, firmware) }
}
