export const ConsentAction = {
  ACCOUNT: 'account',
  STATISTICS: 'statistics',
  FAVORITE_SCENE: 'favorite_scene',
  FAVORITE_LISTENING: 'favorite_listening',
  COMPLETE_SCENE: 'complete_scene',
  COMPLETE_LISTENING: 'complete_listening'
} as const
export type ConsentAction = (typeof ConsentAction)[keyof typeof ConsentAction] & string
