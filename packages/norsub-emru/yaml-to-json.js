import fs from 'node:fs'
import yaml from 'js-yaml'

const SRC_FILE = process.argv[2]
const DST_FILE = process.argv[3]

const YAML = fs.readFileSync(SRC_FILE, 'utf-8')
const OBJ = yaml.load(YAML)
const CONTENT = JSON.stringify(OBJ, null, 2)
const PROTOCOLS = `export const PROTOCOLS = ${CONTENT}\n`
fs.writeFileSync(DST_FILE, PROTOCOLS, { encoding: 'utf-8', flag: 'w+' })
