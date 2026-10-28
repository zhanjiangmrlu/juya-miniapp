export const ListeningTimelineState = { READY: 'ready' } as const
export type ListeningTimelineState =
  (typeof ListeningTimelineState)[keyof typeof ListeningTimelineState] & string
export const ListeningCollectionMode = { FAVORITES: 'favorites', RECORDS: 'records' } as const
export type ListeningCollectionMode =
  (typeof ListeningCollectionMode)[keyof typeof ListeningCollectionMode] & string
export const ContentType = { SCENE: 'scene', LISTENING: 'listening' } as const
export type ContentType = (typeof ContentType)[keyof typeof ContentType] & string
export const ListeningTimestampKind = {
  FAVORITE: 'favorite',
  LEARNED: 'learned',
  DAILY: 'daily'
} as const
export type ListeningTimestampKind =
  (typeof ListeningTimestampKind)[keyof typeof ListeningTimestampKind] & string
