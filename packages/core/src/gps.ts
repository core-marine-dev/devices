// GNSS time helpers. Shared by any protocol whose sentences are time-tagged in
// the GPS time scale (Septentrio SBF: TOW + WNc on every block).
//
// Two things make this more than an addition:
//
//  1. GPS time has NO leap seconds; UTC does. A CMA timestamp is a Unix epoch
//     in milliseconds — i.e. UTC — so the current GPS-UTC offset (18 s since
//     2017-01-01) must be SUBTRACTED. Getting this wrong is silent: the value
//     still looks like a plausible date.
//  2. The week count is continuous. GPS's own 10-bit week number rolls over
//     every 1024 weeks; receivers that report a continuous count (Septentrio's
//     WNc) sidestep it, so nothing here needs an unrolling epoch.
//
// PREFER THE DEVICE. When a protocol reports its own GPS-UTC offset (SBF's
// ReceiverTime.DeltaLS), pass it as `leapSeconds` — it is authoritative and
// cannot go stale. The table below is the fallback for streams that never
// carry it.

// 1980-01-06T00:00:00Z, the instant WNc 0 / TOW 0 refers to.
export const GPS_EPOCH_MS = 315_964_800_000
export const GPS_WEEK_MS = 604_800_000

// UTC instants (epoch ms) at which a leap second was inserted, oldest first,
// counting only those after the GPS epoch — so the length of this list up to a
// given instant IS the GPS-UTC offset at that instant. Currently 18, and there
// has been no insertion since 2017-01-01.
export const GPS_LEAP_SECONDS_UTC: readonly number[] = [
  Date.UTC(1981, 6, 1), Date.UTC(1982, 6, 1), Date.UTC(1983, 6, 1), Date.UTC(1985, 6, 1),
  Date.UTC(1988, 0, 1), Date.UTC(1990, 0, 1), Date.UTC(1991, 0, 1), Date.UTC(1992, 6, 1),
  Date.UTC(1993, 6, 1), Date.UTC(1994, 6, 1), Date.UTC(1996, 0, 1), Date.UTC(1997, 6, 1),
  Date.UTC(1999, 0, 1), Date.UTC(2006, 0, 1), Date.UTC(2009, 0, 1), Date.UTC(2012, 6, 1),
  Date.UTC(2015, 6, 1), Date.UTC(2017, 0, 1),
]

// The GPS-UTC offset in whole seconds at a given GPS-scale instant. The i-th
// insertion (0-based) happens at GPS time `utc[i] + i` seconds, because by then
// the two scales have already diverged by i seconds.
export const gpsLeapSeconds = (gpsMs: number): number => {
  let offset = 0
  for (let index = 0; index < GPS_LEAP_SECONDS_UTC.length; index++) {
    if (gpsMs < GPS_LEAP_SECONDS_UTC[index] + (index * 1000)) break
    offset += 1
  }
  return offset
}

// GPS week + milliseconds-of-week -> Unix epoch ms (UTC).
// `leapSeconds` comes from the device when the protocol reports it; omit it to
// fall back to the table above.
export const gpsWeekTimeToUnix = (week: number, milliseconds: number, leapSeconds?: number): number => {
  const gpsMs = GPS_EPOCH_MS + (week * GPS_WEEK_MS) + milliseconds
  const offset = leapSeconds ?? gpsLeapSeconds(gpsMs)
  return gpsMs - (offset * 1000)
}
