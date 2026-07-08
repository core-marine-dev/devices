import { readFileSync } from 'fs'
import path from 'node:path'

import { SBGParser } from '../src/index'

const DIR = path.join(__dirname, '..')
const SBG_FILE = path.join(DIR, 'tests', 'sbg-raw.bin')
console.log(`FILE -> ${SBG_FILE}`)

const content: Buffer = readFileSync(SBG_FILE)
const parser = new SBGParser()

// console.log(content.toString('ascii'))
// const firmwares = Array.from(availableFirmwares())
const firmwares = Array.from(parser.getAvailableFirmwares())
console.log(`Available firmwares = ${firmwares.join(', ')}`)
// const firmware = '2.3'

console.log('Leer el fichero')
parser.addData(content)
const response = parser.getFrames()
console.log('parsed')
// console.log(response)
console.log(`responses = ${response.length}`)
let unknown = 0
let known = 0
response.forEach((res) => {
  // if (res.name !== 'unknown') { console.dir(res) }
  (res.name !== 'unknown') ? known++ : unknown++
})

console.log(`Unknown frames -> ${unknown}`)
console.log(`Known   frames -> ${known}`)
