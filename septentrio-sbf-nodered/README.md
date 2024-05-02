# @coremarine/nr-sbf-parser

SBF parser component for Septentrio binary protocol.

## Installation

Install via the Palette Manager or cli -> `@coremarine/nr-sbf-parser`

## Usage

This component is just a wrap of the library [@coremarine/sbf-parser](https://github.com/core-marine-dev/sbf-parser), so please check its info to understand how works the pipes.

The component needs two properties to work:

- `command`: to tell what do you want.
- `payload`: the data of the command.

The main commands to parser data are:

1. `addData`: To add binary data (`payload`) to parser, which must be `Buffer`.
2. `getData`: To get parsed data (`payload` it's not necessary).

There are 4 commands more to setup `firmware` and `memory`:

> At this moment the only Firmware supported (and not completely) is "4.10.1"

- `setFirmware`: To set the firmware (`payload`), which must be `string`.
- `getFirmware`: To get the firmware (`payload` it's not neccesary).
- `setMemory`: To set the memory (`payload`), which must be `boolean`.
- `getMemory`: To get the memory (`payload` it's not neccesary).

The output gives the result in the `payload`. For `getData` it add the `firmware` property too, just to for information.
