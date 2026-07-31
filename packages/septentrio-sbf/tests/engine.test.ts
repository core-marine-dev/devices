// installed
import { toBase64 } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { decodeBody } from '../src/engine'
import type { FieldDefinition } from '../src/types'

// The engine is what replaced ~100 hand-written offset chains, so these specs
// pin the derivations it performs: offsets from types, raw slices, Do-Not-Use,
// padding boundaries, sub-block runs and truncation.

const body = (bytes: number[]): Uint8Array => new Uint8Array(bytes)

describe('offsets are derived from the declared types', () => {
  const definitions: readonly FieldDefinition[] = [
    { name: 'A', type: 'uint8' },
    { name: 'B', type: 'uint16' },
    { name: 'C', type: 'uint32' },
    { name: 'D', type: 'float32' },
    { name: 'E', type: 'float64' },
  ]

  test('each field reads its own bytes, little-endian', () => {
    const bytes = new Uint8Array(1 + 2 + 4 + 4 + 8)
    const view = new DataView(bytes.buffer)
    view.setUint8(0, 0x2A)
    view.setUint16(1, 0x1234, true)
    view.setUint32(3, 0xDEADBEEF, true)
    view.setFloat32(7, 1.5, true)
    view.setFloat64(11, -2.25, true)
    const { payload, padding } = decodeBody(bytes, definitions)
    expect(payload.map((entry) => entry.value)).toStrictEqual([0x2A, 0x1234, 0xDEADBEEF, 1.5, -2.25])
    expect(padding.byteLength).toBe(0)
  })

  test('every field carries its own raw slice, in wire order', () => {
    const bytes = body([1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const { payload } = decodeBody(bytes, definitions)
    expect(payload[0].raw).toBe(toBase64(bytes.subarray(0, 1)))
    expect(payload[1].raw).toBe(toBase64(bytes.subarray(1, 3)))
    expect(payload[2].raw).toBe(toBase64(bytes.subarray(3, 7)))
  })

  test('a signed type is read signed', () => {
    const { payload } = decodeBody(body([0x80, 0xFF]), [
      { name: 'A', type: 'int8' },
      { name: 'B', type: 'int8' },
    ])
    expect(payload.map((entry) => entry.value)).toStrictEqual([-128, -1])
  })
})

describe('Do-Not-Use', () => {
  test('becomes null, and says why in metadata (§4.1.7)', () => {
    const { payload } = decodeBody(body([255, 7]), [
      { name: 'NrSV', type: 'uint8', doNotUse: 255 },
      { name: 'Other', type: 'uint8', doNotUse: 255 },
    ])
    expect(payload[0].value).toBeNull()
    expect(payload[0].metadata).toStrictEqual({ doNotUse: true, value: 255 })
    expect(payload[1].value).toBe(7)
    expect(payload[1].metadata).toBeUndefined()
  })

  test('a sentinel of 0 is still detected (a falsy sentinel would not be)', () => {
    const { payload } = decodeBody(body([0]), [{ name: 'WACorrInfo', type: 'uint8', doNotUse: 0 }])
    expect(payload[0].value).toBeNull()
    expect(payload[0].metadata).toStrictEqual({ doNotUse: true, value: 0 })
  })

  test('a Do-Not-Use field is never handed to a decoder', () => {
    const { payload } = decodeBody(body([255]), [{ name: 'X', type: 'uint8', doNotUse: 255 }], {
      X: () => ({ label: 'DECODED' }),
    })
    expect(payload[0].metadata).toStrictEqual({ doNotUse: true, value: 255 })
  })
})

describe('padding', () => {
  test('is whatever the table does not cover, and is never read as a value', () => {
    const { payload, padding } = decodeBody(body([1, 9, 9, 9]), [{ name: 'A', type: 'uint8' }])
    expect(payload).toHaveLength(1)
    expect([...padding]).toStrictEqual([9, 9, 9])
  })

  test('more than 6 padding bytes is not a problem', () => {
    // The 1.x parser read padding with Buffer.readUIntLE, which throws above 6
    // bytes — reachable in the field the moment a firmware adds fields where
    // padding used to be.
    const { padding } = decodeBody(new Uint8Array(40), [{ name: 'A', type: 'uint8' }])
    expect(padding.byteLength).toBe(39)
  })
})

describe('sub-blocks', () => {
  const definitions: readonly FieldDefinition[] = [
    { name: 'N', type: 'uint8' },
    { name: 'SBLength', type: 'uint8' },
    { name: 'Sub', count: 'N', length: 'SBLength', fields: [
      { name: 'Id', type: 'uint8' },
      { name: 'Value', type: 'uint16' },
    ] },
  ]

  test('are flattened into the payload in wire order and grouped in subBlocks', () => {
    // N = 2, SBLength = 4 (3 declared bytes + 1 the table does not know)
    const { payload, subBlocks } = decodeBody(body([2, 4, 1, 0x10, 0x00, 0xFF, 2, 0x20, 0x00, 0xFF]), definitions)
    expect(payload.map((entry) => entry.name)).toStrictEqual(['N', 'SBLength', 'Id', 'Value', 'Id', 'Value'])
    expect(payload.map((entry) => entry.value)).toStrictEqual([2, 4, 1, 0x10, 2, 0x20])
    expect(subBlocks).toHaveLength(2)
    expect(subBlocks[1].map((entry) => entry.value)).toStrictEqual([2, 0x20])
  })

  test('SBLength is honoured, so unknown trailing sub-block bytes are skipped', () => {
    // Same data with SBLength = 6: two extra bytes per occurrence to step over.
    const { payload } = decodeBody(body([2, 6, 1, 0x10, 0x00, 0, 0, 0, 2, 0x20, 0x00, 0, 0, 0]), definitions)
    expect(payload.map((entry) => entry.value)).toStrictEqual([2, 6, 1, 0x10, 2, 0x20])
  })

  test('N = 0 yields no sub-block fields at all', () => {
    const { payload, subBlocks } = decodeBody(body([0, 4]), definitions)
    expect(payload.map((entry) => entry.name)).toStrictEqual(['N', 'SBLength'])
    expect(subBlocks).toStrictEqual([])
  })
})

describe('problems are reported, never thrown', () => {
  test('a body shorter than its definition reports which field ran out', () => {
    const { payload, errors } = decodeBody(body([1, 2]), [
      { name: 'A', type: 'uint8' },
      { name: 'B', type: 'uint32' },
    ])
    expect(payload).toHaveLength(1)
    expect(errors).toStrictEqual(['Body truncated: field B needs bytes 1-4 of 2'])
  })

  test('an empty body against an empty table is fine', () => {
    expect(decodeBody(new Uint8Array(0), [])).toMatchObject({ payload: [], errors: [], subBlocks: [] })
  })

  test('a non-finite float becomes null with an error, never NaN in the output', () => {
    const bytes = new Uint8Array(4)
    new DataView(bytes.buffer).setFloat32(0, Number.NaN, true)
    const { payload } = decodeBody(bytes, [{ name: 'X', type: 'float32' }])
    expect(payload[0].value).toBeNull()
    expect(payload[0].errors).toStrictEqual(['X: not a finite number'])
  })
})

describe('decoders', () => {
  test('add to field metadata and can read sibling values', () => {
    const { payload } = decodeBody(body([2, 10]), [
      { name: 'Kind', type: 'uint8' },
      { name: 'Raw', type: 'uint8', units: '0.1 m' },
    ], {
      Raw: (value, values) => ({ value: value / 10, units: 'm', kind: values.Kind }),
    })
    expect(payload[1].metadata).toStrictEqual({ value: 1, units: 'm', kind: 2 })
  })

  test('a reserved field is flagged so a consumer knows to ignore it (§4.1.6)', () => {
    const { payload } = decodeBody(body([5]), [{ name: 'Reserved', type: 'uint8', reserved: true }])
    expect(payload[0].value).toBe(5)
    expect(payload[0].metadata).toStrictEqual({ reserved: true })
  })
})
