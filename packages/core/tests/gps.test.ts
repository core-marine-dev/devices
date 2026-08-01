// installed
import { describe, expect, test } from 'vitest'

// coded
import { GPS_EPOCH_MS, GPS_LEAP_SECONDS_UTC, GPS_WEEK_MS, gpsLeapSeconds, gpsWeekTimeToUnix } from '../src/gps'

describe('constants', () => {
  test('the GPS epoch is 1980-01-06T00:00:00Z', () => {
    expect(new Date(GPS_EPOCH_MS).toISOString()).toBe('1980-01-06T00:00:00.000Z')
  })

  test('a week is 604800 s', () => {
    expect(GPS_WEEK_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })

  test('the leap-second table is sorted and currently 18 entries', () => {
    expect(GPS_LEAP_SECONDS_UTC).toHaveLength(18)
    const sorted = [...GPS_LEAP_SECONDS_UTC].sort((a, b) => a - b)
    expect([...GPS_LEAP_SECONDS_UTC]).toStrictEqual(sorted)
  })
})

describe('gpsLeapSeconds', () => {
  test('0 at the GPS epoch, 18 today', () => {
    expect(gpsLeapSeconds(GPS_EPOCH_MS)).toBe(0)
    expect(gpsLeapSeconds(Date.UTC(2026, 0, 1))).toBe(18)
  })

  test('steps by one at each insertion', () => {
    // just before / just after the first insertion (1981-07-01, offset 0 -> 1)
    expect(gpsLeapSeconds(Date.UTC(1981, 6, 1) - 1)).toBe(0)
    expect(gpsLeapSeconds(Date.UTC(1981, 6, 1))).toBe(1)
    // the last one so far (2017-01-01, offset 17 -> 18): in the GPS scale it
    // happens 17 s after the UTC instant, hence the offset in the assertion
    expect(gpsLeapSeconds(Date.UTC(2017, 0, 1) + (17 * 1000) - 1)).toBe(17)
    expect(gpsLeapSeconds(Date.UTC(2017, 0, 1) + (17 * 1000))).toBe(18)
  })
})

describe('gpsWeekTimeToUnix', () => {
  // The reference case, measured against the receiver's OWN clock: a
  // ReceiverTime block in misc/parsers/septentrio/samples/gnss.bin reports
  // UTC 2023-02-20 07:41:48 with DeltaLS 18, on a frame stamped
  // TOW 114126000 / WNc 2250.
  test('reproduces a real receiver UTC report to the second', () => {
    expect(new Date(gpsWeekTimeToUnix(2250, 114_126_000, 18)).toISOString()).toBe('2023-02-20T07:41:48.000Z')
  })

  test('the table fallback agrees with the device-reported offset', () => {
    expect(gpsWeekTimeToUnix(2250, 114_126_000)).toBe(gpsWeekTimeToUnix(2250, 114_126_000, 18))
  })

  test('week 0 / time 0 is the GPS epoch itself', () => {
    expect(gpsWeekTimeToUnix(0, 0)).toBe(GPS_EPOCH_MS)
  })

  test('milliseconds are milliseconds, not seconds', () => {
    // the legacy bug: TOW is 0.001 s, and treating it as seconds put this
    // frame in 2035 instead of 2023
    const ms = gpsWeekTimeToUnix(2264, 380_224_000, 18)
    expect(new Date(ms).getUTCFullYear()).toBe(2023)
  })

  test('an explicit leapSeconds of 0 is honoured, not treated as absent', () => {
    expect(gpsWeekTimeToUnix(2250, 0, 0) - gpsWeekTimeToUnix(2250, 0, 18)).toBe(18_000)
  })
})
