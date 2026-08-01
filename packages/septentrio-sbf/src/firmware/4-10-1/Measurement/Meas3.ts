// coded
import type { BlockDefinition } from '../../../types'

/* The FIVE Meas3 blocks of §4.2.1 — Meas3Ranges (4109), Meas3CN0HiRes (4110),
  Meas3Doppler (4111), Meas3PP (4112) and Meas3MP (4113).

  Septentrio does not publish their layout. The reference guide says so in as many
  words, once per block: "The detailed definition of this block is not available in
  this document." For Meas3Ranges it explains why, and what to do instead:

    "This block contains all the code, carrier phase and C/N0 observables at a
    given measurement epoch. The resolution is 0.001m, 0.001cycles and 1dB-Hz for
    the code, carrier and C/N0 measurements respectively.

    The advantage of this block compared to the MeasEpoch SBF block is its reduced
    size while offering the full resolution for the code and carrier measurements.
    One of the techniques used to reduce the size is to only encode full
    measurements (reference epochs) every N epochs. Between these reference
    epochs, Meas3Ranges contains delta epochs where the difference between the
    current measurements and the ones at the applicable reference epoch is
    encoded. The decoder must have received and stored the applicable reference
    epoch to be able to decode delta epochs. When streaming SBF over an unreliable
    communication link, if the reference epoch is lost, subsequent Meas3Ranges
    blocks cannot be decoded until the next reference epoch is received. The
    interval at which reference epochs are encoded can be controlled with the
    setMeas3MaxRefInterval command.

    The format of this block and of the other Meas3 blocks is complex and is not
    provided here. Details can be obtained from Septentrio Support. The RxTools
    installation contains the complete source code of a decoder in C language,
    together with sbf2asc [...] Users interested in decoding the Meas3 blocks are
    strongly advised to use the provided source code instead of writing their own
    decoder."

  And the four companions, each an extension of Meas3Ranges:

    Meas3CN0HiRes  "the fractional part of the C/N0 values", raising the
                   resolution from 1 dB-Hz to 0.0625 dB-Hz.
    Meas3Doppler   "the range-rate (Doppler) values", to 1 mm/s.
    Meas3PP        "various Septentrio-proprietary flags and values needed for
                   accurate post-processing or re-processing of the PVT".
    Meas3MP        "the multipath correction applied by the receiver [...] to undo
                   the receiver multipath mitigation and revert to unmitigated
                   data."
  All four "must be logged together with Meas3Ranges".

  ---------------------------------------------------------------------------
  SO THESE ARE OPAQUE, and that is a finding rather than a shortcut. The earlier
  plan for this package listed the Meas3 family as the hard case that might need a
  block-supplied body decoder — bit-packed differential compression that no field
  table can describe. Reading the datasheet settles it differently and more
  simply: there is no layout to transcribe in the first place, so there is nothing
  for an escape hatch to decode. No new engine capability is needed.

  They therefore take the same treatment as PVTSupport/PVTSupportA: the body is
  published as OPAQUE bytes at metadata.body, the frame is in cma.raw, and no
  field is invented. Note this is NOT the same as being undecodable in principle —
  the format is documented, just not here, and it is also STATEFUL: a delta epoch
  is meaningless without the reference epoch that preceded it, so a correct
  decoder needs cross-frame memory that no per-block field table could express
  either. Anyone who needs these observables has two supported routes: log
  MeasEpoch + MeasExtra instead (same information, larger frames, fully modelled
  here), or run Septentrio's own RxTools decoder over cma.raw.
*/
const opaqueMeas3 = (name: string, number: number, description: string): BlockDefinition => ({
  name,
  number,
  description: `${description}; Septentrio publishes no field definition for the Meas3 family`,
  timestamp: 'receiver',
  revisions: [[]],
  opaque: true,
})

export const meas3Ranges = opaqueMeas3(
  'Meas3Ranges',
  4109,
  'Code, carrier-phase and C/N0 observables of one epoch, in the compressed differential encoding Septentrio does not publish',
)

export const meas3CN0HiRes = opaqueMeas3(
  'Meas3CN0HiRes',
  4110,
  'Extension of Meas3Ranges carrying the fractional part of the C/N0 values, for 0.0625 dB-Hz resolution',
)

export const meas3Doppler = opaqueMeas3(
  'Meas3Doppler',
  4111,
  'Extension of Meas3Ranges carrying the range-rate (Doppler) observables, to 1 mm/s',
)

export const meas3PP = opaqueMeas3(
  'Meas3PP',
  4112,
  'Extension of Meas3Ranges carrying Septentrio-proprietary flags needed to post-process or re-process the PVT',
)

export const meas3MP = opaqueMeas3(
  'Meas3MP',
  4113,
  'Extension of Meas3Ranges carrying the multipath correction the receiver applied, so it can be undone',
)
