// installed
import {
  Float32Schema as ValibotFloat32Schema,
  Float64Schema as ValibotFloat64Schema,
  Int16Schema as ValibotInt16Schema,
  Int32Schema as ValibotInt32Schema,
  Int8Schema as ValibotInt8Schema,
  Uint16Schema as ValibotUint16Schema,
  Uint32Schema as ValibotUint32Schema,
  Uint8Schema as ValibotUint8Schema,
} from '@schemasjs/valibot-numbers'
import { type Schema, ValibotValidator } from '@schemasjs/validator'
import * as v from 'valibot'

// coded
import type { Type, Value } from './types'

// CONFIG — used by the parser base for its options, not for field values.
const ValibotBooleanSchema = v.boolean()
export const BooleanSchema = ValibotValidator<v.InferInput<typeof ValibotBooleanSchema>>(ValibotBooleanSchema)

const ValibotNaturalSchema = v.pipe(
  v.number('It should be a number'),
  v.integer('It should be an integer'),
  v.minValue(0, 'It should be a positive integer number greater or equal to 0'),
)
export const NaturalSchema = ValibotValidator<v.InferInput<typeof ValibotNaturalSchema>>(ValibotNaturalSchema)

// FIELD VALUE TYPES — one validator per CMA `Type`. A parser validates a
// decoded field value against its declared type via these (see TYPE_SCHEMAS).

const ValibotStringSchema = v.string()
export const StringSchema = ValibotValidator<v.InferOutput<typeof ValibotStringSchema>>(ValibotStringSchema)

const ValibotCharSchema = v.pipe(
  v.string(),
  v.check((input) => input.length === 1, 'Char: it should be a single character'),
)
export const CharSchema = ValibotValidator<v.InferOutput<typeof ValibotCharSchema>>(ValibotCharSchema)

export const Uint8Schema = ValibotValidator<v.InferOutput<typeof ValibotUint8Schema>>(ValibotUint8Schema)
export const Uint16Schema = ValibotValidator<v.InferOutput<typeof ValibotUint16Schema>>(ValibotUint16Schema)
export const Uint32Schema = ValibotValidator<v.InferOutput<typeof ValibotUint32Schema>>(ValibotUint32Schema)

export const Int8Schema = ValibotValidator<v.InferOutput<typeof ValibotInt8Schema>>(ValibotInt8Schema)
export const Int16Schema = ValibotValidator<v.InferOutput<typeof ValibotInt16Schema>>(ValibotInt16Schema)
export const Int32Schema = ValibotValidator<v.InferOutput<typeof ValibotInt32Schema>>(ValibotInt32Schema)

export const Float32Schema = ValibotValidator<v.InferOutput<typeof ValibotFloat32Schema>>(ValibotFloat32Schema)
export const Float64Schema = ValibotValidator<v.InferOutput<typeof ValibotFloat64Schema>>(ValibotFloat64Schema)

// 64-bit integers are represented as decimal strings — no bigint, so the CMA
// stays JSON-serializable. No current protocol uses them, but the type tags
// exist for completeness.
const ValibotInt64Schema = v.pipe(
  v.string(),
  v.check((input) => /^-?\d+$/.test(input), 'Int64: it should be a signed integer string'),
)
export const Int64Schema = ValibotValidator<v.InferOutput<typeof ValibotInt64Schema>>(ValibotInt64Schema)

const ValibotUint64Schema = v.pipe(
  v.string(),
  v.check((input) => /^\d+$/.test(input), 'Uint64: it should be an unsigned integer string'),
)
export const Uint64Schema = ValibotValidator<v.InferOutput<typeof ValibotUint64Schema>>(ValibotUint64Schema)

// Lookup: CMA `Type` → its value validator. Lets every parser validate field
// values the same way — `TYPE_SCHEMAS[field.type].parse(field.value)`.
export const TYPE_SCHEMAS: Record<Type, Schema<Value>> = {
  char: CharSchema,
  string: StringSchema,
  boolean: BooleanSchema,
  int8: Int8Schema,
  int16: Int16Schema,
  int32: Int32Schema,
  int64: Int64Schema,
  uint8: Uint8Schema,
  uint16: Uint16Schema,
  uint32: Uint32Schema,
  uint64: Uint64Schema,
  float32: Float32Schema,
  float64: Float64Schema,
}
