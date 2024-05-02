import type { Frame } from "../../../types";

export const parseClock = (text: string, clock: 'round' | 'set'): Pick<Frame, 'name' | 'raw'> => (
  {
    name: (clock === 'round') ? 'round clock' : 'set clock',
    raw: text
  }
)
