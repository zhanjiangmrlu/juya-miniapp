export const RecordsTab = { LEARNED: 'learned', CHECKINS: 'checkins' } as const
export type RecordsTab = (typeof RecordsTab)[keyof typeof RecordsTab] & string
export const UnavailableReason = { DELETED: 'deleted', OFFLINE: 'offline' } as const
export type UnavailableReason = (typeof UnavailableReason)[keyof typeof UnavailableReason] & string
