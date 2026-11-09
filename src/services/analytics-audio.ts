import { analytics } from '@/services/analytics'

import type { AnalyticsProperties, AudioAnalyticsObserver } from '@/shared/types/analytics'

/** 固定当前播放器所属内容，正文点词只保留行与位置，避免重复 UUID 超长
 * @param context 创建该播放器时确认的内容类型、编号和发布版本
 */
export const createAudioAnalytics =
  (context: AnalyticsProperties): AudioAnalyticsObserver =>
  (event, properties) => {
    const wordId = properties.word_id
    analytics.track(event, {
      ...properties,
      ...context,
      ...(wordId?.startsWith('dictionary:')
        ? { word_id: wordId.split(':').slice(3).join(':') }
        : {})
    })
  }
