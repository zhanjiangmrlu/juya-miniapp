export const RecordsTab = {
  LEARNED: 'learned',
  CHECKINS: 'checkins',
  LISTENING: 'listening'
} as const
export type RecordsTab = (typeof RecordsTab)[keyof typeof RecordsTab] & string
export const UnavailableReason = { DELETED: 'deleted', OFFLINE: 'offline' } as const
export type UnavailableReason = (typeof UnavailableReason)[keyof typeof UnavailableReason] & string
export const QueueSource = {
  LEARNING: 'learning',
  FAVORITES: 'favorites',
  RECORDS: 'records',
  DAY: 'day'
} as const
export type QueueSource = (typeof QueueSource)[keyof typeof QueueSource] & string
