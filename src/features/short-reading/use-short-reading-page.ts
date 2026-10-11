import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, watch } from 'vue'

import { isSameAudioTarget } from '@/features/audio/audio-machine'
import { createShortReadingController } from '@/features/short-reading/short-reading-controller'
import { getRuntimeServices } from '@/services/runtime'
import { AudioStatus } from '@/shared/enums/audio'
import { ShortReadingKind, ShortReadingPageStatus } from '@/shared/enums/short-reading'
import { useAudioStore } from '@/stores/audio'
import { useSessionStore } from '@/stores/session'

import type { ShortReadingEntryOptions } from '@/shared/types/short-reading'

/** 连接短文纯阅读页面与运行时服务，previewOnly 为安全预览页面 */
export const useShortReadingPage = (previewOnly = false) => {
  const runtime = getRuntimeServices()
  const audio = useAudioStore()
  const session = useSessionStore()
  const page = createShortReadingController({ service: runtime.shortReading, audio })
  const audioStatus = computed(() =>
    page.detail.value?.whole_audio &&
    isSameAudioTarget(audio.snapshot.target, page.detail.value.whole_audio)
      ? audio.snapshot.status
      : AudioStatus.IDLE
  )
  let request = 0
  let hidden = false
  let id = ''
  let entry: ShortReadingEntryOptions = {}

  /** 直接路由每次先核验模块开关，contentId 为路由传入的稳定短文ID */
  const initialize = async (contentId?: string, source: ShortReadingEntryOptions = {}) => {
    const current = ++request
    id = contentId ?? ''
    entry = { ...source }
    page.suspend()
    page.status.value = ShortReadingPageStatus.LOADING
    try {
      const modules = await runtime.catalog.getModules()
      if (current !== request) return
      if (!modules.items.some((item) => item.key === ShortReadingKind.CONTENT && item.enabled)) {
        page.dispose()
        page.status.value = ShortReadingPageStatus.UNAVAILABLE
        return
      }
      await page.initialize(id, previewOnly, entry)
    } catch {
      if (current !== request) return
      page.dispose()
      page.status.value = ShortReadingPageStatus.UNAVAILABLE
    }
  }

  /** 页面隐藏停止播放和受限写入，回来后重新检查模块及授权 */
  const hide = () => {
    request++
    hidden = true
    page.suspend(true)
  }
  /** 页面真正重新显示时重新授权，onLoad后的首次onShow不重复open */
  const show = () => {
    if (hidden && id) {
      hidden = false
      void initialize(id, entry)
    }
  }
  /** 销毁页面丢弃当前账号的待提交短文命令 */
  const dispose = () => {
    request++
    page.dispose()
    id = ''
    entry = {}
    hidden = false
  }

  watch(
    () => [session.isAuthenticated, session.profile?.juya_id, session.cleanupGeneration] as const,
    ([authenticated, user, cleanup], [previousAuthenticated, previousUser, previousCleanup]) => {
      if (
        cleanup !== previousCleanup ||
        (previousAuthenticated && !authenticated) ||
        (previousUser && previousUser !== user)
      ) {
        dispose()
        page.status.value = ShortReadingPageStatus.UNAVAILABLE
      }
    },
    { flush: 'sync' }
  )
  onShow(show)
  onHide(hide)
  onUnload(dispose)
  onBeforeUnmount(dispose)

  return { ...page, audioStatus, initialize }
}
