import { TODAY_TASK_COPY as TASK_COPY } from '@/shared/constants/home'
import { TodayTaskKind } from '@/shared/enums/home'
import { formatBeijingDate, getBeijingGreeting } from '@/shared/utils/beijing-time'

import type { HomeResponse, TodayTask } from '@/shared/contracts/home'
import type { UserProfile } from '@/shared/contracts/profile'
import type { HomeViewModel, TodayTaskViewModel } from '@/shared/types/home'
import type { SceneCardViewModel } from '@/shared/types/learning'

export type { TodayTaskViewModel } from '@/shared/types/home'
export type { HomeViewModel } from '@/shared/types/home'

/** 对查询参数进行编码，确保任务标识可以安全进入小程序路由。 */
function queryValue(value: string): string {
  return encodeURIComponent(value)
}

/** 为任务卡匹配真实目标，防止推荐场景与点击后打开的任务不一致。 */
export function resolveTaskScene(
  task: TodayTask | null,
  scenes: SceneCardViewModel[]
): SceneCardViewModel | undefined {
  if (!task?.target_id || task.kind === TodayTaskKind.FAVORITE_REVIEW) return undefined
  return scenes.find((scene) => scene.sceneId === task.target_id && scene.canOpen)
}

/** 将服务端今日任务转换为唯一且可直接执行的页面入口。 */
export function resolveTodayTask(task: TodayTask | null): TodayTaskViewModel | null {
  if (!task) return null

  let url: string | null = null

  if (task.kind === TodayTaskKind.FAVORITE_REVIEW && task.card_ids.length > 0) {
    url = `/sub-packages/favorites/review-front?cardIds=${queryValue(task.card_ids.join(','))}`
  } else if (task.target_id && task.kind === TodayTaskKind.NEW_SCENE) {
    url = `/sub-packages/scene/detail?sceneId=${queryValue(task.target_id)}`
  } else if (task.target_id && task.kind === TodayTaskKind.HISTORY_SCENE) {
    url = `/sub-packages/scene/dialogue?sceneId=${queryValue(task.target_id)}&from=history`
  } else if (task.target_id && task.kind === TodayTaskKind.CONTINUE_SCENE) {
    url = `/sub-packages/scene/dialogue?sceneId=${queryValue(task.target_id)}`
  }

  return url ? { ...TASK_COPY[task.kind], url } : null
}

/**
 * 将首页聚合响应转换为页面模型；身份未建立时明确返回空学习数据，禁止生成游客进度。
 */
export function presentHome(
  dto: HomeResponse | null,
  profile: UserProfile | undefined,
  now = new Date()
): HomeViewModel {
  const nickname = profile?.nickname?.trim() || profile?.wechat_nickname?.trim() || '学习者'

  return {
    checkins: dto?.checkins ?? null,
    dateLabel: formatBeijingDate(now),
    isFallback: !dto,
    salutation: `${getBeijingGreeting(now)}，${nickname}`,
    todayTask: resolveTodayTask(dto?.today_task ?? null),
    unreadMessageCount: dto?.unread_message_count ?? null
  }
}
