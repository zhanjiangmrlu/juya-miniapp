export const AudioStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error'
} as const
export type AudioStatus = (typeof AudioStatus)[keyof typeof AudioStatus] & string
