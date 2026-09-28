export type TodayTaskKind = 'CONTINUE_SCENE' | 'NEW_SCENE' | 'FAVORITE_REVIEW' | 'HISTORY_SCENE'
export interface CheckinSummary {
  current_streak: number
  longest_streak: number
  total_days: number
}
export interface TodayTask {
  card_ids: string[]
  kind: TodayTaskKind
  target_id: string | null
}
export interface HomeResponse {
  checkins: CheckinSummary
  greeting: string
  today_task: TodayTask | null
  unread_message_count: number
}
