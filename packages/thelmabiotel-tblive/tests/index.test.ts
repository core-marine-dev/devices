import { describe, expect, test } from 'vitest'
import { TBLive, tbliveFirmwares, FIRMWARES_AVAILABLE } from '../src/index'

describe('firmwares available', () => {
  test('tbliveFirmwares', () => {
    const firmwares = tbliveFirmwares()
    expect(firmwares).toEqual(FIRMWARES_AVAILABLE)
  })
  
  test('TBLive.firmwares', () => {
    const tblive = new TBLive()
    expect(tblive.firmwares).toEqual(FIRMWARES_AVAILABLE)
    // Check it includes known firmware versions
    expect(tblive.firmwares).toContain('1.0.1')
    expect(tblive.firmwares).toContain('1.0.2')
  })
})

describe('TBLive', () => {

  const firmwareSentence = 'FV=1.0.1alpha'
  const pingSentence = 'SN=1234567><>\r'
  const serialnumberSentence = 'SN=1234567'

  test('should parse firmware info in command mode', () => {
    const tblive = new TBLive()
    const input = firmwareSentence + pingSentence + serialnumberSentence + 'sdlkjghsdkl'
    const results = tblive.parseData(input)
    
    expect(results).toHaveLength(3)
  })

  test('should handle serial number ping in listening mode', () => {
    const tblive = new TBLive()
    const input = ';aslfj;' + pingSentence + 'lsdfjghl'
    tblive.addData(input)
    const results = tblive.parseData()
    
    expect(results).toHaveLength(1)
    const [result] = results
    expect(result.id).toBe('ping')
    expect(result.mode).toBe('listening')
  })

  test('should accumulate with memory enabled and parse data', () => {
    const tblive = new TBLive({ memory: true })
    
    // Send partial data
    tblive.addData(pingSentence.slice(0, 5))
    expect(tblive.parseData()).toHaveLength(0) // Incomplete data, nothing to parse yet
    
    // Complete the data
    tblive.addData(pingSentence.slice(5))
    const results = tblive.parseData()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('ping')
  })

  test('should not accumulate with memory disabled and parse data', () => {
    const tblive = new TBLive({ memory: false })
    
    // Send partial data
    tblive.addData(pingSentence.slice(0, 5))
    expect(tblive.parseData()).toHaveLength(0) // Incomplete data, nothing to parse yet
    
    // Complete the data
    tblive.addData(pingSentence.slice(5))
    const results = tblive.parseData()
    expect(results).toHaveLength(0)
  })
})
