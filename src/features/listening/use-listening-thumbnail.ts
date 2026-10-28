import { onBeforeUnmount, ref, watch } from 'vue'

import { onSessionExpired, session } from '@/services/api'

import { listeningThumbnail } from './listening-service'

/** 取得当前摘要安全小图票据，并隔离过期请求与账号
 * @param path 当前服务端摘要的受保护缩略图地址
 */
export const useListeningThumbnail = (path: () => string | null | undefined) => {
  const thumbnail = ref(''),
    imageError = ref(false)
  let generation = 0
  /** 重新签发短票据，失败原位重试 */
  const retryThumbnail = async () => {
    const run = ++generation,
      owner = session.userId(),
      value = path()
    thumbnail.value = ''
    imageError.value = false
    if (!value) return
    try {
      const src = await listeningThumbnail(value)
      if (run === generation && owner === session.userId()) thumbnail.value = src
    } catch {
      if (run === generation) imageError.value = true
    }
  }
  watch(path, retryThumbnail, { immediate: true })
  const unsubscribe = onSessionExpired(() => {
    generation++
    thumbnail.value = ''
  })
  onBeforeUnmount(() => {
    generation++
    unsubscribe()
  })
  return { thumbnail, imageError, retryThumbnail }
}
