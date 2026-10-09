import type { ShareTarget } from '@/shared/enums/sharing'
import type { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import type { MaybeRefOrGetter } from 'vue'

export interface WechatShareScene {
  sceneId: string
  title: string
}
export type WechatShareOptions =
  | { target: typeof ShareTarget.HOME }
  | { target: typeof ShareTarget.SCENE; scene: MaybeRefOrGetter<WechatShareScene | undefined> }

export interface WechatShareHooks {
  onShareAppMessage: typeof onShareAppMessage
  onShareTimeline: typeof onShareTimeline
}
