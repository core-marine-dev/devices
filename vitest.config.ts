import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['./packages/**/*/vitest.config.ts']
  }
  // './packages/nmea-parser/vitest.config.ts',
  // './packages/nmea-parser-nodered/vitest.config.ts',
  // './packages/norsub-emru/vitest.config.ts',
  // './packages/norsub-emru-nodered/vitest.config.ts',
  // './packages/septentrio-sbf/vitest.config.ts',
  // './packages/septentrio-sbf-nodered/vitest.config.ts',
  // './packages/sbg-ecom/vitest.config.ts',
  // './packages/sbg-ecom-nodered/vitest.config.ts',
  // './packages/thelmabiotel-tblive/vitest.config.ts',
  // './todo/ublox-ubx/vitest.config.ts',
  // './todo/vectornav/vitest.config.ts',
  // './templates/nodered/vitest.config.ts',
  // './templates/library/vitest.config.ts',
})
