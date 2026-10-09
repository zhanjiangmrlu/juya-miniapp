import { TodayTaskKind } from '@/shared/enums/home'

import type { TodayTask } from '@/shared/contracts/home'
import type { TodayTaskViewModel } from '@/shared/types/home'

export const TODAY_TASK_COPY: Record<TodayTask['kind'], Omit<TodayTaskViewModel, 'url'>> = {
  [TodayTaskKind.CONTINUE_SCENE]: {
    buttonLabel: '继续学习',
    description: '从上次停下的位置继续阅读。',
    eyebrow: '继续上次进度',
    title: '继续今日任务'
  },
  [TodayTaskKind.FAVORITE_REVIEW]: {
    buttonLabel: '开始翻卡',
    description: '用一次轻量复习巩固收藏内容。',
    eyebrow: '不限张数',
    title: '收藏翻卡复习'
  },
  [TodayTaskKind.HISTORY_SCENE]: {
    buttonLabel: '复习场景',
    description: '回到最久未复习的场景温故知新。',
    eyebrow: '复习建议',
    title: '重温一个真实场景'
  },
  [TodayTaskKind.NEW_SCENE]: {
    buttonLabel: '开始今日学习',
    description: '完成一个场景，建立今天的学习记录。',
    eyebrow: '第一步',
    title: '从一个真实场景开始'
  }
}
