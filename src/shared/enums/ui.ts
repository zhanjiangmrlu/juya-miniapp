export const PageBackgroundKind = {
  SCENE: 'scene',
  LISTENING: 'listening',
  READING: 'reading',
  PROFILE: 'profile',
  RECORDS: 'records',
  PAPER: 'paper'
} as const
export type PageBackgroundKind = (typeof PageBackgroundKind)[keyof typeof PageBackgroundKind] &
  string
