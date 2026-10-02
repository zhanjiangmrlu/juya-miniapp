import { formatBeijingDate, getBeijingGreeting } from '@/shared/utils/beijing-time'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'
import type { HomeResponse, TodayTask } from '@/shared/contracts/home'
import type { UserProfile } from '@/shared/contracts/profile'

export interface TodayTaskViewModel {
  buttonLabel: string
  description: string
  eyebrow: string
  title: string
  url: string
}

export interface HomeViewModel {
  checkins: HomeResponse['checkins'] | null
  dateLabel: string
  isFallback: boolean
  salutation: string
  todayTask: TodayTaskViewModel | null
  unreadMessageCount: number | null
}

const TASK_COPY: Record<TodayTask['kind'], Omit<TodayTaskViewModel, 'url'>> = {
  CONTINUE_SCENE: {
    buttonLabel: '继续学习',
    description: '从上次停下的位置继续阅读。',
    eyebrow: '继续上次进度',
    title: '继续今日任务'
  },
  FAVORITE_REVIEW: {
    buttonLabel: '开始翻卡',
    description: '用一次轻量复习巩固收藏内容。',
    eyebrow: '最多 10 张',
    title: '收藏翻卡复习'
  },
  HISTORY_SCENE: {
    buttonLabel: '复习场景',
    description: '回到最久未复习的场景温故知新。',
    eyebrow: '复习建议',
    title: '重温一个真实场景'
  },
  NEW_SCENE: {
    buttonLabel: '开始今日学习',
    description: '完成一个场景，建立今天的学习记录。',
    eyebrow: '第一步',
    title: '从一个真实场景开始'
  }
}

/** 对查询参数进行编码，确保任务标识可以安全进入小程序路由。 */
function queryValue(value: string): string {
  return encodeURIComponent(value)
}

/** 为任务卡匹配真实目标，防止推荐场景与点击后打开的任务不一致。 */
export function resolveTaskScene(
  task: TodayTask | null,
  scenes: SceneCardViewModel[]
): SceneCardViewModel | undefined {
  if (!task?.target_id || task.kind === 'FAVORITE_REVIEW') return undefined
  return scenes.find((scene) => scene.sceneId === task.target_id && scene.canOpen)
}

/** 将服务端今日任务转换为唯一且可直接执行的页面入口。 */
export function resolveTodayTask(task: TodayTask | null): TodayTaskViewModel | null {
  if (!task) return null

  let url: string | null = null

  if (task.kind === 'FAVORITE_REVIEW' && task.card_ids.length > 0) {
    url = `/pages/favorites/review-front?cardIds=${queryValue(task.card_ids.join(','))}`
  } else if (task.target_id && task.kind === 'NEW_SCENE') {
    url = `/pages/scene/detail?sceneId=${queryValue(task.target_id)}`
  } else if (task.target_id && task.kind === 'HISTORY_SCENE') {
    url = `/pages/scene/dialogue?sceneId=${queryValue(task.target_id)}&from=history`
  } else if (task.target_id && task.kind === 'CONTINUE_SCENE') {
    url = `/pages/scene/dialogue?sceneId=${queryValue(task.target_id)}`
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
