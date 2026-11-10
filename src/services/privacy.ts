import { createPrivacyService } from '@/services/privacy-service'

import type { PolicyBundle } from '@/shared/types/privacy'

/** 生成协议确认与请求幂等标识，不作为账号身份 */
const key = () =>
  globalThis.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const n = Math.floor(Math.random() * 16)
    return (char === 'x' ? n : (n & 3) | 8).toString(16)
  })
export const privacy = createPrivacyService({
  namespace: import.meta.env.MODE === 'production' ? 'production' : 'test',
  storage: {
    get: (name) => uni.getStorageSync(name),
    set: (name, value) => uni.setStorageSync(name, value),
    remove: (name) => uni.removeStorageSync(name)
  },
  key,
  request: async (path, options) => {
    const { session } = await import('@/services/api')
    return session.request(path, options)
  },
  policies: async () => {
    const { sendRequest } = await import('@/services/platform')
    const response = await sendRequest({
      path: '/api/mini/v1/privacy/policies',
      method: 'GET',
      headers: {}
    })
    if (response.status !== 200) throw new Error('协议暂未获取，请稍后重试')
    return response.data as PolicyBundle
  }
})
