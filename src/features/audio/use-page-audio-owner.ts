import { onScopeDispose, provide } from 'vue'

import { AUDIO_PAGE_OWNER_KEY } from '@/shared/constants/audio-owner'
import { useAudioStore } from '@/stores/audio'

/** 创建页面播放身份，子组件共享身份且清理仅取消本页拥有的播放器 */
export const usePageAudioOwner = () => {
  const owner = Symbol('page-audio')
  const audio = useAudioStore()
  provide(AUDIO_PAGE_OWNER_KEY, owner)
  /** 取消本页发音请求和播放，保留已切换至其他页面的播放 */
  const cancelAudio = () => audio.cancelOwned(owner)
  onScopeDispose(cancelAudio)
  return { owner, cancelAudio }
}
