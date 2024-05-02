# nr-norsub-emru

![npm (scoped)](https://img.shields.io/npm/v/%40coremarine/nr-norsub-emru)
[![publish](https://github.com/core-marine-dev/nr-norsub-emru/actions/workflows/publish.yml/badge.svg)](https://github.com/core-marine-dev/nr-norsub-emru/actions/workflows/publish.yml)
![npm](https://img.shields.io/npm/dy/%40coremarine/nr-norsub-emru)

Node-Red component for the [Norsub-eMRU library](https://github.com/core-marine-dev/norsub-emru) to read NorSub NMEA propietary protocols and NMEA 0183 sentences. It is a wrapper of [@coremarine/norsub-emru](https://github.com/core-marine-dev/norsub-emru) (check it docs).

## Input

NorSub component uses 5 properties to work:

- `payload` is the main property with NMEA content.
- `protocols`, `sentence`, `memory` and `fake` are optionals.

| Input property         | Description                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------- |
| `payload` (string)     | NMEA ASCII content (important, it is an *ASCII* string, not other encoding).           |
| *`memory`* (object)    | Object to check or enabled / disabled parser memory state (look details below).        |
| *`protocols`* (object) | Object to get or set the protocols supported and their sentences (look details below). |
| *`sentence`* (string)  | Sentence ID to get if it is supported and its info (look details below).               |
| *`fake`* (string)      | Sentence ID to get a full fake NMEA-like sentence if it is supported.                  |

## Output

Each input proerty would be responded in the same output property

| Output property        | Description                                                                                                                    |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| payload (array)        | It gives you the same parsing output that the CoreMarine NMEA Parser (an array of object with the info of each NMEA sentence). |
| *`memory`* (object)    | Response to the *memory* input (look details below).                                                                           |
| *`protocols`* (object) | Response to the *protocols* input (look details below).                                                                        |
| *`sentence`* (string)  | Response to the *sentence* input (look details below).                                                                         |
| *`fake`* (string)      | Response to the *fake* input (look details below).                                                                             |

## Details

NorSub parser translate NMEA ASCII string data into a JavaScript objects (one for each
NMEA sentence). Each time it receives data from payload input, it gives the parsed sentences to payload output.

It just a wrapper of the npm library [@coremarine/norsub-emru](https://github.com/core-marine-dev/norsub-emru) (take a look on it).

To interact with the *memory* | *protocols* | *sentence* API is through the `memory` | `protocols` | `sentence` property:

- If you request something in `msg.memory` | `msg.protocols` | `msg.sentence` input
- The response will be in `msg.memory` | `msg.protocols` | `msg.sentence` output

### Memory

It is enabled by default:

- memory enabled: Every time you inject data, it's attached to the internal data.
- memory disabled: Every time you inject data, it clears internal data and add new one.

Internally it has a buffer with a max number of characters

|                          Input                           |                            Output                             |
| :------------------------------------------------------: | :-----------------------------------------------------------: |
| `memory`: { `command`: `"set"`, `payload`: **boolean** } | `memory`: { `memory`: **boolean**, `characters`: **number** } |
|             `memory`: { `command`: `"get"` }             | `memory`: { `memory`: **boolean**, `characters`: **number** } |

### Protocols

The parser can be feeded or expanded to understand more nmea sentences, standard or propietary.
To do that it should be passed an object with the property `command` equal to `"set"` and one this three properties:

1. `file`: It's the string file path to the protocols YAML file.
2. `content`: It's the string content of the protocols YAML file.
3. `protocols`: It's the JS object after parsing the protocols YAML file.

If you send more of them, parser only will read one (`file` upper other, `content` upper `protocols`)

If you just want to know what are the known or supported sentences, you just need the command `get`.

|                            Input                             |         Output         |
| :----------------------------------------------------------: | :--------------------: |
|   `protocols`: { `command`: `"set"`, `file`: **string** }    | `protocols`: **array** |
|  `protocols`: { `command`: `"set"`, `content`: **string** }  | `protocols`: **array** |
| `protocols`: { `command`: `"set"`, `protocols`: **object** } | `protocols`: **array** |
|             `protocols`: { `command`: `"get"` }              | `protocols`: **array** |

### Sentence

If you want to know if a sentence is known / supported, you need to send the sentence id.
Response will be an `object` with the whole info or `null` if it's unknown / not supported yet.

|         Input          |              Output             |
| :--------------------: | :-----------------------------: |
| `sentence`: **string** | `sentence`: **object** | `null` |

### Fake

If you want to get a NMEA-like sentence, maybe just to do some tests, you need to send the sentence id.
Response will be a `string` with the whole ASCII sentence or `null` if it's unknown / not supported yet.
This fake sentence is correct in terms of NMEA requirements but each field has garbage.

|       Input        |            Output           |
| :----------------: | :-------------------------: |
| `fake`: **string** | `fake`: **string** | `null` |
