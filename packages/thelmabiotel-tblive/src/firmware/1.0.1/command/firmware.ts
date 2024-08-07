import { FirmwareSchema } from '../../../schemas'
import { FIRMWARE_START } from '../../../constants'
import type { CommandFirmwareFrame, Firmware, Frame } from '../../../types'
import { getParsedSchema } from '../../../utils'

const getMajor = (text: string): { major?: string, error?: string } => {
  const major = parseInt(text)
  if (isNaN(major)) { return { error: `Invalid major ${text}` } }
  return { major: text }
}

const getMinor = (text: string): { minor?: string, error?: string } => {
  const minor = parseInt(text)
  if (isNaN(minor)) { return { error: `Invalid minor ${text}` } }
  return { minor: text }
}

const getPatch = (text: string): { patch?: string, error?: string } => {
  let data = ''
  for (const char of text) {
    if (isNaN(parseInt(char))) { break }
    data += char
  }
  if (data.length === 0) { return { error: 'frame incomplete - no patch version' } }
  const patch = parseInt(data)
  if (isNaN(patch)) { return { error: `Invalid patch ${data}` } }
  return { patch: data }
}

export const parseFirmware = (text: string): CommandFirmwareFrame | Frame => {
  const name = 'firmware'
  let data = text.replace(FIRMWARE_START, '')
  ;['v', 'V'].forEach(char => {
    if (data.startsWith(char)) {
      data = data.replace(char, '')
    }
  })
  // Incomplete Frame
  const majorLimit = data.indexOf('.')
  if (majorLimit === -1) { return { name, raw: text, error: 'frame incomplete - no major version' } }
  // Major
  const majorText = data.slice(0, majorLimit)
  const { major, error: errorMajor } = getMajor(majorText)
  if (errorMajor !== undefined) { return { name, raw: text, error: errorMajor } }
  // Minor
  const minorLimit = data.indexOf('.', majorLimit + 1)
  if (minorLimit === -1) { return { name, raw: text, error: 'frame incomplete - no minor version' } }
  const minorText = data.slice(majorLimit + 1, minorLimit)
  const { minor, error: errorMinor } = getMinor(minorText)
  if (errorMinor !== undefined) { return { name, raw: text, error: errorMinor } }
  // Patch
  const patchText = data.slice(minorLimit + 1)
  const { patch, error: errorPatch } = getPatch(patchText)
  if (errorPatch !== undefined) { return { name, raw: text, error: errorPatch } }
  // Get Firmware
  const firmware = `${major as string}.${minor as string}.${patch as string}`
  const endIndex = text.indexOf(firmware) + firmware.length
  const raw = text.slice(FIRMWARE_START.length, endIndex)
  const { data: dataParsed, error } = getParsedSchema(FirmwareSchema, firmware)
  if (error !== undefined) { return { raw, name, error } }
  const fw = dataParsed as Firmware
  return {
    name,
    raw,
    data: [fw],
    fields: [{ name: 'firmware', type: 'string', data: fw }],
    metadata: {
      firmware: fw
    }
  }
}
