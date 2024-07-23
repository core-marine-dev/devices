import type { ProtocolsFileContent } from '@coremarine/nmea-parser'

export const NORSUB_SENTENCES: ProtocolsFileContent = {
  protocols: [
    {
      protocol: 'GYROCOMPAS1',
      standard: false,
      sentences: [
        {
          id: 'HEHDT',
          payload: [
            {
              name: 'heading',
              type: 'float32',
              units: 'deg'
            },
            {
              name: 'symbol',
              type: 'string'
            }
          ]
        },
        {
          id: 'PHTRO',
          payload: [
            {
              name: 'pitch',
              type: 'float32',
              units: 'deg'
            },
            {
              name: 'pitch_direction',
              type: 'string',
              description: 'M bow up, P bow down'
            },
            {
              name: 'roll',
              type: 'float32',
              units: 'deg'
            },
            {
              name: 'roll_direction',
              type: 'string',
              description: 'M bow up, P bow down'
            }
          ]
        },
        {
          id: 'PHINF',
          payload: [
            {
              name: 'status',
              type: 'string'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB',
      standard: false,
      sentences: [
        {
          id: 'PNORSUB',
          payload: [
            {
              name: 'time',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'delay',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: '0 - 360'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'z-down'
            },
            {
              name: 'status',
              type: 'uint32',
              description: '0 - Error\n\n1 - No Error'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB2',
      standard: false,
      sentences: [
        {
          id: 'PNORSUB2',
          payload: [
            {
              name: 'time',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'delay',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: '0 - 360'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'z-down'
            },
            {
              name: 'heave_velocity',
              type: 'float64',
              units: 'm/s',
              description: 'z-down'
            },
            {
              name: 'status',
              type: 'uint32',
              description: '0 - Error\n\n1 - No Error'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB6',
      standard: false,
      sentences: [
        {
          id: 'PNORSUB6',
          payload: [
            {
              name: 'time',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'delay',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: '0 - 360'
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'float64',
              units: 'm/s',
              description: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'status',
              type: 'uint32',
              description: '0 - Error\n\n1 - No Error'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB7',
      standard: false,
      sentences: [
        {
          id: 'PNORSUB7',
          payload: [
            {
              name: 'time',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'delay',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: '0 - 360'
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'float64',
              units: 'm/s',
              description: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'period_x',
              type: 'float64',
              units: 's'
            },
            {
              name: 'period_y',
              type: 'float64',
              units: 's'
            },
            {
              name: 'period_z',
              type: 'float64',
              units: 's'
            },
            {
              name: 'amplitude_x',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'amplitude_y',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'amplitude_z',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'status',
              type: 'uint32'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB7b',
      standard: false,
      sentences: [
        {
          id: 'PNORSUB7b',
          payload: [
            {
              name: 'time',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'delay',
              type: 'uint32',
              units: 'ms'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: '0 - 360'
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'float64',
              units: 'm/s',
              description: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'period_x',
              type: 'float64',
              units: 's'
            },
            {
              name: 'period_y',
              type: 'float64',
              units: 's'
            },
            {
              name: 'period_z',
              type: 'float64',
              units: 's'
            },
            {
              name: 'amplitude_x',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'amplitude_y',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'amplitude_z',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'status_a',
              type: 'uint16'
            },
            {
              name: 'status_b',
              type: 'uint16'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB8',
      standard: false,
      sentences: [
        {
          id: 'PNORSUB8',
          description: 'The whole regular attitude information from the MRU',
          payload: [
            {
              name: 'time',
              type: 'uint32',
              units: 'us'
            },
            {
              name: 'delay',
              type: 'uint32',
              units: 'us'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg',
              description: 'From 0 to 360'
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'float64',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'float64',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'float64',
              units: 'm/s',
              description: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'float64',
              units: 'm/s2'
            },
            {
              name: 'period_x',
              type: 'float64',
              units: 's'
            },
            {
              name: 'period_y',
              type: 'float64',
              units: 's'
            },
            {
              name: 'period_z',
              type: 'float64',
              units: 's'
            },
            {
              name: 'amplitude_x',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'amplitude_y',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'amplitude_z',
              type: 'float64',
              units: 'm'
            },
            {
              name: 'status',
              type: 'uint32'
            }
          ]
        }
      ]
    },
    {
      protocol: 'NORSUB PRDID',
      standard: false,
      sentences: [
        {
          id: 'PRDID',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg'
            }
          ]
        }
      ]
    },
    {
      protocol: 'Tokimek PTVG',
      standard: false,
      sentences: [
        {
          id: 'PTVG',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 'Multiplied by 100, a [-] bow up / a [space] bow down'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 'Multiplied by 100, a [-] bow up / a [space] bow down'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg'
            }
          ]
        }
      ]
    },
    {
      protocol: 'RDI ADCP',
      standard: false,
      sentences: [
        {
          id: 'PRDID',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: 's if [+] is bow up / s is [-] if bow down, leading zeros'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: 's if [+] is bow up / s is [-] if bow down, leading zeros'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'deg'
            }
          ]
        }
      ]
    },
    {
      protocol: 'SMCA',
      standard: false,
      sentences: [
        {
          id: 'PSMCA',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'heading',
              type: 'float64',
              units: 'm',
              description: '±10 m, resolution 0.01 m'
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm',
              description: '±10 m, resolution 0.01 m'
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm',
              description: '±10 m, resolution 0.01 m'
            }
          ]
        }
      ]
    },
    {
      protocol: 'SMCC',
      standard: false,
      sentences: [
        {
          id: 'PSMCC',
          payload: [
            {
              name: 'pitch',
              type: 'float64',
              units: 'deg',
              description: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'roll',
              type: 'float64',
              units: 'deg',
              description: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'yaw',
              type: 'float64',
              units: 'deg',
              description: '0-359.9 degs, resolution 0.1 degs'
            },
            {
              name: 'surge',
              type: 'float64',
              units: 'm',
              description: '±10 m, resolution 0.01 m'
            },
            {
              name: 'sway',
              type: 'float64',
              units: 'm',
              description: '±10 m, resolution 0.01 m'
            },
            {
              name: 'heave',
              type: 'float64',
              units: 'm',
              description: '±10 m, resolution 0.01 m'
            },
            {
              name: 'surge_velocity',
              type: 'float64',
              units: 'm/s',
              description: '±100 m/s, resolution 0.01 m/s'
            },
            {
              name: 'sway_velocity',
              type: 'float64',
              units: 'm/s',
              description: '±100 m/s, resolution 0.01 m/s'
            },
            {
              name: 'heave_velocity',
              type: 'float64',
              units: 'm/s',
              description: '±100 m/s, resolution 0.01 m/s'
            },
            {
              name: 'acceleration_x',
              type: 'float64',
              units: 'm/s2',
              description: '±100 m/s2, resolution 0.01 m/s2'
            },
            {
              name: 'acceleration_y',
              type: 'float64',
              units: 'm/s2',
              description: '±100 m/s2, resolution 0.01 m/s2'
            },
            {
              name: 'acceleration_z',
              type: 'float64',
              units: 'm/s2',
              description: '±100 m/s2, resolution 0.01 m/s2'
            }
          ]
        }
      ]
    }
  ]
}
