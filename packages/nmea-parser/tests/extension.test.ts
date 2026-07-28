// installed
import type { DeviceParser, Metadata } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import type { MetadataAggregators } from '../src/metadata'
import { NMEAParser } from '../src/parser'
import { ProtocolsFileContentSchema } from '../src/schemas'
import type { ProtocolsFileContent } from '../src/types'

// The two extension points a device parser built on NMEA needs: register its own
// bundled sentence definitions, and derive metadata for them. This is exactly the
// seam `@coremarine/norsub-emru` uses — proprietary sentences + a status bitfield
// decoded into field and payload metadata.
const DEVICE_PROTOCOLS = {
  protocols: [
    {
      protocol: 'DEVICE',
      standard: false,
      sentences: [
        {
          id: 'PDEV',
          payload: [
            { name: 'value', type: 'uint16' },
            { name: 'status', type: 'uint32' },
          ],
        },
      ],
    },
  ],
}

const decodeStatus = (status: number): Metadata => ({ ok: (status & 1) !== 0, healthy: (status & 2) !== 0 })

class DeviceParserImpl extends NMEAParser {
  constructor() {
    super()
    const builtin = ProtocolsFileContentSchema.safeParse(DEVICE_PROTOCOLS)
    if (builtin.success) this.registerProtocols(builtin.value as ProtocolsFileContent)
    this.registerAggregators(this.aggregators())
  }

  // Keyed `${id}:${payloadLength}` — one entry per definition, as for built-ins.
  private aggregators(): MetadataAggregators {
    return {
      'PDEV:2': (sentence) => {
        const status = sentence.payload[1].value
        if (typeof status !== 'number') return {}
        const decoded = decodeStatus(status)
        // Self-sufficient single field -> field metadata; mirrored at payload
        // level so a variant that splits it across fields reads the same.
        return { fields: { 1: { status: decoded } }, payload: { status: decoded } }
      },
    }
  }
}

describe('extension points for device parsers', () => {
  test('a subclass registers its own protocol definitions', () => {
    const parser = new DeviceParserImpl()
    const sentence = parser.getSentence('PDEV')
    expect(sentence?.protocol.name).toBe('DEVICE')
    expect(sentence?.payload).toHaveLength(2)
  })

  test('the standard NMEA built-ins are still loaded', () => {
    const parser = new DeviceParserImpl()
    expect(parser.getSentence('GGA')?.protocol.name).toBe('NMEA')
    expect(Object.keys(parser.getSentencesByProtocol())).toContain('NMEA')
  })

  test('a subclass-registered aggregator produces field + payload metadata', () => {
    const parser = new DeviceParserImpl()
    const [pdev] = parser.parseData('$PDEV,42,3*32\r\n')
    expect(pdev.id).toBe('PDEV')
    expect(pdev.payload[0].value).toBe(42)
    expect(pdev.payload[1].metadata?.status).toEqual({ ok: true, healthy: true })
    expect((pdev.metadata.payload as Metadata).status).toEqual({ ok: true, healthy: true })
  })

  test('the built-in GGA aggregator is untouched by a subclass registration', () => {
    const parser = new DeviceParserImpl()
    const [gga] = parser.parseData('$INGGA,132247.95,7118.690092,N,02215.039776,E,2,12,0.8,66.48,M,26.96,M,20.0,1006*56\r\n')
    expect((gga.metadata.payload as Metadata).latitude as number).toBeCloseTo(71.3115015, 6)
  })

  test('a base parser is unaffected by the subclass registry', () => {
    const base = new NMEAParser()
    expect(base.getSentence('PDEV')).toBeNull()
    const [unknown] = base.parseData('$PDEV,42,3*32\r\n')
    // Unknown to the base parser: generic decode, no aggregated metadata.
    expect(unknown.protocol.version).toBe('unknown')
    expect(unknown.payload[1].metadata).toBeUndefined()
    expect(unknown.metadata.payload).toBeUndefined()
  })

  test('NMEAParser satisfies the shared DeviceParser contract', () => {
    const parsers: DeviceParser<string>[] = [new NMEAParser(), new DeviceParserImpl()]
    for (const parser of parsers) {
      expect(parser.parseData('$INHDT,123.456,T*22\r\n')).toHaveLength(1)
    }
  })
})
