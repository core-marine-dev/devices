# CoreMarine Devices

This is a collection of the CoreMarine open source JS libraries and its NodeRED component wrappers. It is organised as a NPN Workspaces monorepository.

All devices are inside `packages` folder. Each device usually has two packages:

1. TypeScript library which is transpiled into ESM + CJS modules.
2. NodeRED component which is a wrapper of the CJS library.

<details>
  <summary>Devices</summary>
  <ul>
    <li><a href="packages/nmea-parser/README.md">NMEA parser</a> - <a href="packages/nmea-parser-nodered/README.md">NodeRED component</a></li>
    <li><a href="packages/norsub-emru/README.md">Norsub eMRU</a> - <a href="packages/norsub-emru-nodered/README.md">NodeRED component</a></li>
    <li><a href="packages/septentrio-sbf/README.md">Septentrio SBF</a> - <a href="packages/septentrio-sbf-nodered/README.md">NodeRED component</a></li>
    <li><a href="packages/thelmabiotel-tblive/README.md">Thelmabiotel TB-Live</a> - <a href="packages/thelmabiotel-tblive-nodered/README.md">NodeRED component</a></li>
  </ul>
</details>

If you want to contribute take a look on the [CONTRIBUTING](CONTRIBUTING.md) document.
