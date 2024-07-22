import { Float64, NMEASentence, Uint8 } from './types'

const metadataGGA = (sentence: NMEASentence): NMEASentence => {
  const getLatitudeDegrees = (latitude: string, letter: string): Float64 => {
    const [left, minutesRight] = latitude.split('.')
    const degrees = left.slice(0, -2)
    // console.log(`Lat: Degrees = ${degrees}`)
    const minutesLeft = left.slice(-2)
    const sign = (letter === 'S') ? -1 : 1
    const minutes = `${minutesLeft}.${minutesRight}`
    // console.log(`Lat: Minutes ${minutes}`)
    return sign * (Number(degrees) + (Number(minutes) / 60))
  }

  const getLongitudeDegrees = (longitude: string, letter: string): Float64 => {
    const [left, minutesRight] = longitude.split('.')
    const degrees = left.slice(0, -2)
    // console.log(`Lon: Degrees = ${degrees}`)
    const minutesLeft = left.slice(-2)
    const sign = (letter === 'W') ? -1 : 1
    const minutes = `${minutesLeft}.${minutesRight}`
    // console.log(`Lon: Minutes ${minutes}`)
    return sign * (Number(degrees) + (Number(minutes) / 60))
  }

  const getQuality = (quality: Uint8): string => {
    const QUALITIES = {
      0: 'Fix not valid',
      1: 'GPS fix',
      2: 'Differential GPS fix (DGNSS), SBAS, OmniSTAR VBS, Beacon, RTX in GVBS mode',
      3: 'Not applicable',
      4: 'RTK Fixed, xFill',
      5: 'RTK Float, OmniSTAR XP/HP, Location RTK, RTX',
      6: 'INS Dead reckoning',
      7: 'Manual Input Mode',
      8: 'Simulator Mode'
    }
    return QUALITIES[quality as keyof typeof QUALITIES] ?? 'unknown'
  }

  sentence.payload.forEach((field, index) => {
    // Latitude
    if (field.name === 'latitude') {
      const latitude = field.value as string
      const letter = sentence.payload[index + 1].value as string
      const degrees = getLatitudeDegrees(latitude, letter)
      sentence.metadata = { latitude: degrees }
      return
    }
    // Longitude
    if (field.name === 'longitude') {
      const longitude = field.value as string
      const letter = sentence.payload[index + 1].value as string
      const degrees = getLongitudeDegrees(longitude, letter)
      sentence.metadata = { longitude: degrees }
      return
    }
    // Quality
    if (field.name === 'quality') {
      sentence.metadata = { quality: getQuality(field.value as Uint8) }
      // return
    }
    // Rest
    // return
  })
  return { ...sentence }
}

const METADATA = {
  GGA: metadataGGA
}

export const addMetadata = (sentence: NMEASentence): NMEASentence => {
  if (sentence.id in METADATA) { return METADATA[sentence.id as keyof typeof METADATA](sentence) }
  return sentence
}
