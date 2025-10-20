import { describe, test, expect } from 'vitest'
import { VersionSchema } from '../src/schemas'


describe('Version Schema', () => {
  test('Proper versions', () => {
    for (const version of ['3.2.1', '3.2', '3']) {
      expect(VersionSchema.parse(version)).toStrictEqual(version)
    }
  })

  test('Failure versions', () => {
    for (const version of ['3.2.1.0', '3.a', 'asdfa', '-1', '3.-2']) {
      expect(VersionSchema.is(version)).toBeFalsy()
    }
  })
})