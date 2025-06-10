# Thelmabiotel-TBLive

Library to work with ThelmaBiotel TB-Lives devices (hydrophones receivers and acoustic sensors emitters)

It just parses TB-Live sentences

```ts
import { TBLive } from '@@coremarine/thelmabiotel-tblive'

const tblive = new TBLive()

const input1: string = '...'
// ...
tblive.addData(input)
// ...
const input2: string = '...'
const sentences = tblive.parseData(input2)

```
