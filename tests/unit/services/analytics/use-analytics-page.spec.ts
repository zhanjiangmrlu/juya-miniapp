import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => void) | undefined,
  hide: undefined as (() => void) | undefined,
  unload: undefined as (() => void) | undefined,
  pageShow: vi.fn(),
  pageHide: vi.fn(),
  needsPrompt: vi.fn(),
  prompt: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (listener: () => void) => {
    dependencies.show = listener
  },
  onHide: (listener: () => void) => {
    dependencies.hide = listener
  },
  onUnload: (listener: () => void) => {
    dependencies.unload = listener
  }
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => dependencies,
  requestAnalyticsConsent: dependencies.prompt
}))
beforeEach(() => vi.clearAllMocks())
describe('路由统计与首次提示', () => {
  it('可见页才请求授权，拒绝后的返回不会再请求提示', () => {
    dependencies.needsPrompt.mockReturnValueOnce(true).mockReturnValue(false)
    useAnalyticsPage('pages/home/index')
    expect(dependencies.prompt).not.toHaveBeenCalled()
    dependencies.show?.()
    expect(dependencies.pageShow).toHaveBeenCalledWith('pages/home/index')
    expect(dependencies.prompt).toHaveBeenCalledOnce()
    dependencies.hide?.()
    dependencies.unload?.()
    dependencies.show?.()
    expect(dependencies.pageHide).toHaveBeenCalledTimes(2)
    expect(dependencies.prompt).toHaveBeenCalledOnce()
  })
})
