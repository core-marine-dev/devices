export const PROTOCOLS = {
  protocols: [
    {
      protocol: 'GYROCOMPAS1',
      standard: false,
      sentences: [
        {
          sentence: 'HEHDT',
          fields: [
            {
              name: 'heading',
              type: 'float',
              units: 'deg'
            },
            {
              name: 'symbol',
              type: 'string'
            }
          ]
        },
        {
          sentence: 'PHTRO',
          fields: [
            {
              name: 'pitch',
              type: 'float',
              units: 'deg'
            },
            {
              name: 'pitch_direction',
              type: 'string',
              note: 'M bow up, P bow down'
            },
            {
              name: 'roll',
              type: 'float',
              units: 'deg'
            },
            {
              name: 'roll_direction',
              type: 'string',
              note: 'M bow up, P bow down'
            }
          ]
        },
        {
          sentence: 'PHINF',
          fields: [
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
          sentence: 'PNORSUB',
          fields: [
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
              type: 'double',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'deg',
              note: '0 - 360'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: 'z-down'
            },
            {
              name: 'status',
              type: 'uint32',
              note: '0 - Error\n\n1 - No Error'
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
          sentence: 'PNORSUB2',
          fields: [
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
              type: 'double',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'deg',
              note: '0 - 360'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: 'z-down'
            },
            {
              name: 'heave_velocity',
              type: 'double',
              units: 'm/s',
              note: 'z-down'
            },
            {
              name: 'status',
              type: 'uint32',
              note: '0 - Error\n\n1 - No Error'
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
          sentence: 'PNORSUB6',
          fields: [
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
              type: 'double',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'deg',
              note: '0 - 360'
            },
            {
              name: 'surge',
              type: 'double',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'double',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'double',
              units: 'm/s',
              note: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'status',
              type: 'uint32',
              note: '0 - Error\n\n1 - No Error'
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
          sentence: 'PNORSUB7',
          fields: [
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
              type: 'double',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'deg',
              note: '0 - 360'
            },
            {
              name: 'surge',
              type: 'double',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'double',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'double',
              units: 'm/s',
              note: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'period_x',
              type: 'double',
              units: 's'
            },
            {
              name: 'period_y',
              type: 'double',
              units: 's'
            },
            {
              name: 'period_z',
              type: 'double',
              units: 's'
            },
            {
              name: 'amplitude_x',
              type: 'double',
              units: 'm'
            },
            {
              name: 'amplitude_y',
              type: 'double',
              units: 'm'
            },
            {
              name: 'amplitude_z',
              type: 'double',
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
          sentence: 'PNORSUB7b',
          fields: [
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
              type: 'double',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'deg',
              note: '0 - 360'
            },
            {
              name: 'surge',
              type: 'double',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'double',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'double',
              units: 'm/s',
              note: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'period_x',
              type: 'double',
              units: 's'
            },
            {
              name: 'period_y',
              type: 'double',
              units: 's'
            },
            {
              name: 'period_z',
              type: 'double',
              units: 's'
            },
            {
              name: 'amplitude_x',
              type: 'double',
              units: 'm'
            },
            {
              name: 'amplitude_y',
              type: 'double',
              units: 'm'
            },
            {
              name: 'amplitude_z',
              type: 'double',
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
          sentence: 'PNORSUB8',
          description: 'The whole regular attitude information from the MRU',
          fields: [
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
              type: 'double',
              units: 'deg'
            },
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'deg',
              note: 'From 0 to 360'
            },
            {
              name: 'surge',
              type: 'double',
              units: 'm'
            },
            {
              name: 'sway',
              type: 'double',
              units: 'm'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: 'z-down'
            },
            {
              name: 'roll_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'pitch_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'yaw_rate',
              type: 'double',
              units: 'deg/s'
            },
            {
              name: 'surge_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'sway_velocity',
              type: 'double',
              units: 'm/s'
            },
            {
              name: 'heave_velocity',
              type: 'double',
              units: 'm/s',
              note: 'z-down'
            },
            {
              name: 'acceleration_x',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_y',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'acceleration_z',
              type: 'double',
              units: 'm/s2'
            },
            {
              name: 'period_x',
              type: 'double',
              units: 's'
            },
            {
              name: 'period_y',
              type: 'double',
              units: 's'
            },
            {
              name: 'period_z',
              type: 'double',
              units: 's'
            },
            {
              name: 'amplitude_x',
              type: 'double',
              units: 'm'
            },
            {
              name: 'amplitude_y',
              type: 'double',
              units: 'm'
            },
            {
              name: 'amplitude_z',
              type: 'double',
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
          sentence: 'PRDID',
          fields: [
            {
              name: 'pitch',
              type: 'double',
              units: 'deg'
            },
            {
              name: 'roll',
              type: 'double',
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
          sentence: 'PTVG',
          fields: [
            {
              name: 'pitch',
              type: 'number',
              units: 'deg',
              note: 'Multiplied by 100, a [-] bow up / a [space] bow down'
            },
            {
              name: 'roll',
              type: 'number',
              units: 'deg',
              note: 'Multiplied by 100, a [-] bow up / a [space] bow down'
            },
            {
              name: 'heading',
              type: 'number',
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
          sentence: 'PRDID',
          fields: [
            {
              name: 'pitch',
              type: 'double',
              units: 'deg',
              note: 's if [+] is bow up / s is [-] if bow down, leading zeros'
            },
            {
              name: 'roll',
              type: 'double',
              units: 'deg',
              note: 's if [+] is bow up / s is [-] if bow down, leading zeros'
            },
            {
              name: 'heading',
              type: 'double',
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
          sentence: 'PSMCA',
          fields: [
            {
              name: 'pitch',
              type: 'double',
              units: 'deg',
              note: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'roll',
              type: 'double',
              units: 'deg',
              note: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'heading',
              type: 'double',
              units: 'm',
              note: '±10 m, resolution 0.01 m'
            },
            {
              name: 'surge',
              type: 'double',
              units: 'm',
              note: '±10 m, resolution 0.01 m'
            },
            {
              name: 'sway',
              type: 'double',
              units: 'm',
              note: '±10 m, resolution 0.01 m'
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
          sentence: 'PSMCC',
          fields: [
            {
              name: 'pitch',
              type: 'double',
              units: 'deg',
              note: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'roll',
              type: 'double',
              units: 'deg',
              note: '±100 degs, resolution 0.001 degs'
            },
            {
              name: 'yaw',
              type: 'double',
              units: 'deg',
              note: '0-359.9 degs, resolution 0.1 degs'
            },
            {
              name: 'surge',
              type: 'double',
              units: 'm',
              note: '±10 m, resolution 0.01 m'
            },
            {
              name: 'sway',
              type: 'double',
              units: 'm',
              note: '±10 m, resolution 0.01 m'
            },
            {
              name: 'heave',
              type: 'double',
              units: 'm',
              note: '±10 m, resolution 0.01 m'
            },
            {
              name: 'surge_velocity',
              type: 'double',
              units: 'm/s',
              note: '±100 m/s, resolution 0.01 m/s'
            },
            {
              name: 'sway_velocity',
              type: 'double',
              units: 'm/s',
              note: '±100 m/s, resolution 0.01 m/s'
            },
            {
              name: 'heave_velocity',
              type: 'double',
              units: 'm/s',
              note: '±100 m/s, resolution 0.01 m/s'
            },
            {
              name: 'acceleration_x',
              type: 'double',
              units: 'm/s2',
              note: '±100 m/s2, resolution 0.01 m/s2'
            },
            {
              name: 'acceleration_y',
              type: 'double',
              units: 'm/s2',
              note: '±100 m/s2, resolution 0.01 m/s2'
            },
            {
              name: 'acceleration_z',
              type: 'double',
              units: 'm/s2',
              note: '±100 m/s2, resolution 0.01 m/s2'
            }
          ]
        }
      ]
    }
  ]
}
