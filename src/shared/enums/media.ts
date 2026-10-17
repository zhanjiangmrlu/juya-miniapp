export const MediaState = {
  READY: 'ready',
  FAILED: 'failed',
  PROCESSING: 'processing',
  QUEUED: 'queued'
} as const
export type MediaState = (typeof MediaState)[keyof typeof MediaState] & string
