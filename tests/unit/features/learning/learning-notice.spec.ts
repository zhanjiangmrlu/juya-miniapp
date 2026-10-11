import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLearningPage } from '@/features/learning/use-learning-page'
import { useSessionStore } from '@/stores/session'

vi.mock('@/services/analytics/runtime', () => ({ getAnalytics: () => ({ track: vi.fn() }) }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    catalog: {
      getModules: async () => ({ items: [] }),
      getCatalog: async () => ({
        items: [],
        authorization_pending: false,
        profile_completion_enabled: true
      })
    }
  })
}))
const preview = {
  sceneId: 'preview',
  entryUrl: null,
  canOpen: false,
  title: '',
  chineseTitle: '',
  description: '',
  series: '',
  progress: 0,
  accessLabel: '内容预览'
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('uni', { removeStorageSync: vi.fn(), getStorageInfoSync: () => ({ keys: [] }) })
})
afterEach(() => vi.unstubAllGlobals())
describe('学习预览资料入口曝光', () => {
  it('读取目录不消耗入口，首次真正弹出后跨页面不再主动展示', async () => {
    const page = useLearningPage()
    await page.load()
    expect(useSessionStore().contactGuideShown).toBe(false)
    await page.selectScene(preview)
    expect(page.profileActionShown.value).toBe(false)
    expect(useSessionStore().contactGuideShown).toBe(true)
    page.closeNotice()
    await page.selectScene(preview)
    expect(page.profileActionShown.value).toBe(true)
    const nextPage = useLearningPage()
    await nextPage.load()
    await nextPage.selectScene(preview)
    expect(nextPage.profileActionShown.value).toBe(true)
  })
  it('退出会话立即关闭旧账号提示并恢复新会话入口资格', async () => {
    const page = useLearningPage()
    await page.load()
    await page.selectScene(preview)
    expect(page.noticeVisible.value).toBe(true)
    useSessionStore().clear()
    expect(page.noticeVisible.value).toBe(false)
    expect(page.profileActionShown.value).toBe(false)
    await page.load()
    await page.selectScene(preview)
    expect(page.profileActionShown.value).toBe(false)
    expect(useSessionStore().contactGuideShown).toBe(true)
  })
})
