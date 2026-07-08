import { readFileSync } from 'fs'
import path from 'node:path'

import { SBGParser } from '../src/index'
import type { SBGFrameResponse } from '../src/types'

const DIR = path.join(__dirname, '..')

const parser = new SBGParser()
parser.memory = true

const parseFile = (path: string): SBGFrameResponse[] => {
  const content = readFileSync(path, 'ascii')
  // console.log(content)
  const map = new Map<string, any>()

  const lines = content.split('\n')
  lines.forEach((line, lineNumber) => {
    if (line.length && lineNumber) {
      const [, timestamp, data] = line.split(',')
      if (data.includes('x')) {
        const buffer = Buffer.from(data.split('x')[1], 'hex')
        map.set(timestamp, buffer)
      }
      // console.log(`${lineNumber}. ${line}`)
    }
  })
  // const parser = new SBGParser()
  // parser.memory = true
  map.forEach((value) => {
    parser.addData(value)
    // console.log(`Added data of ${key}`)
  })
  return parser.getFrames()
}

const infoFrames = (frames: SBGFrameResponse[]): void => {
  // console.log('parsed')
  // // console.log(frames)
  // console.log(`frames = ${frames.length}`)
  let unknown = 0
  let known = 0
  frames.forEach((frame) => {
    // if (res.name !== 'unknown') { console.dir(res) }
    (frame.name !== 'unknown') ? known++ : unknown++
    // if (frame.name.includes('POS')) { console.dir(frame) }
  })
  console.log(`Unknown frames -> ${unknown}`)
  console.log(`Known   frames -> ${known}`)
}

const sbgframes = new Map<string, number>()

const updateFramesCounter = (frames: SBGFrameResponse[]): void => {
  frames.forEach((frame) => {
    const { name, type, format } = frame
    const key = `${type}_${format}_${name}`
    const prevCounter = sbgframes.get(key)
    const counter = (prevCounter === undefined) ? 0 : prevCounter + 1
    sbgframes.set(key, counter)
  })
}

// const SBG_CSV = 'test/sbg_50.csv'
// const SBG_CSV = 'test/sbg_100.csv'
// const SBG_CSV = 'test/sbg_1000.csv'
const SBG_CSV = path.join(DIR, 'tests', 'sbg_2000.csv')
console.log(`CSV -> ${SBG_CSV}`)
const parsedFrames = parseFile(SBG_CSV)
infoFrames(parsedFrames)
updateFramesCounter(parsedFrames)
console.log('----------------------------------------------')
