// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

import { useShortReadingHistory } from '@/features/short-reading/use-short-reading-history'

import type { components } from '../../../fixtures/contracts/v15-a9a97b8/provider'
const dependencies = vi.hoisted(() => ({
  show: undefined as (() => unknown) | undefined,
  hide: undefined as (() => unknown) | undefined,
  unload: undefined as (() => unknown) | undefined,
  history: vi.fn(),
  preview: vi.fn(),
  navigate: vi.fn(),
  session: { isAuthenticated: true, cleanupGeneration: 0, profile: { juya_id: 'one' } }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (hook: typeof dependencies.show) => {
    dependencies.show = hook
  },
  onHide: (hook: typeof dependencies.hide) => {
    dependencies.hide = hook
  },
  onUnload: (hook: typeof dependencies.unload) => {
    dependencies.unload = hook
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    shortReading: { history: dependencies.history, preview: dependencies.preview }
  })
}))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
const page = {
  items: [
    {
      content_id: 'reading/one',
      title_en: 'Saved title',
      title_zh: '已保存的安全标题',
      saved_content_version: 1,
      started_at: '2026-10-10T00:00:00Z',
      last_read_at: '2026-10-11T01:00:00Z',
      completed_at: '2026-10-11T01:00:00Z',
      can_open: false
    }
  ],
  started_count: 42,
  completed_count: 28,
  next_cursor: 'next+page',
  has_more: true
} satisfies components['schemas']['ReadingHistoryPage']
let state: ReturnType<typeof useShortReadingHistory>
const render = () =>
  mount(
    defineComponent({
      setup: () => {
        state = useShortReadingHistory()
        return () => null
      }
    })
  )
beforeEach(() => {
  vi.resetAllMocks()
  dependencies.session = reactive({
    isAuthenticated: true,
    cleanupGeneration: 0,
    profile: { juya_id: 'one' }
  })
  dependencies.history.mockResolvedValue(page)
  dependencies.preview.mockResolvedValue({ content_id: 'reading/one' })
})
describe('本人独立阅读记录', () => {
  it('分页读取取代在途预览时释放按钮，旧预览不导航', async () => {
    const wrapper = render()
    await state.load()
    let finish!: (value: unknown) => void
    dependencies.preview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const opening = state.open(state.items.value[0]!)
    dependencies.history.mockResolvedValueOnce({ ...page, has_more: false, next_cursor: null })
    await state.load(true)
    expect(state.openingId.value).toBeNull()
    finish({ content_id: 'reading/one' })
    await opening
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('首次账号资料异步确认会重读可见页，旧身份在途结果不恢复', async () => {
    dependencies.session.profile.juya_id = ''
    let finish!: (value: unknown) => void
    dependencies.history.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = render()
    const loading = state.load()
    dependencies.session.profile.juya_id = 'confirmed'
    await flushPromises()
    expect(dependencies.history).toHaveBeenCalledTimes(2)
    expect(state.completedCount.value).toBe(28)
    finish({ ...page, completed_count: 999 })
    await loading
    expect(state.completedCount.value).toBe(28)
    wrapper.unmount()
  })
  it('隐藏页确认新账号不请求，重新显示才读取本人历史', async () => {
    const wrapper = render()
    dependencies.hide?.()
    dependencies.session.profile.juya_id = 'confirmed'
    expect(dependencies.history).not.toHaveBeenCalled()
    dependencies.show?.()
    await flushPromises()
    expect(dependencies.history).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
  it('同身份清学习只清摘要并提供重试，用户重读确认总数', async () => {
    const wrapper = render()
    await state.load()
    dependencies.session.cleanupGeneration++
    expect(dependencies.history).toHaveBeenCalledTimes(1)
    expect(state.error.value).toContain('重新加载')
    expect(state.completedCount.value).toBeUndefined()
    await state.load()
    expect(state.completedCount.value).toBe(28)
    wrapper.unmount()
  })
  it('已下线预览404仍保留历史标题和进度，不跳转不存在的预览', async () => {
    const wrapper = render()
    await state.load()
    dependencies.preview.mockRejectedValueOnce({ status: 404, code: 'CONTENT_NOT_FOUND' })
    await state.open(state.items.value[0]!)
    expect(dependencies.preview).toHaveBeenCalledWith('reading/one')
    expect(dependencies.navigate).not.toHaveBeenCalled()
    expect(state.items.value).toHaveLength(1)
    expect(state.completedCount.value).toBe(28)
    expect(state.notice.value).toContain('记录已保留')
    wrapper.unmount()
  })
  it.each(['hide', 'cleanup', 'account'] as const)(
    '%s后迟到安全预览不导航或写回提示',
    async (event) => {
      const wrapper = render()
      await state.load()
      let finish!: (value: unknown) => void
      dependencies.preview.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      const opening = state.open(state.items.value[0]!)
      if (event === 'hide') dependencies.hide?.()
      else if (event === 'cleanup') dependencies.session.cleanupGeneration++
      else dependencies.session.profile.juya_id = 'two'
      finish({ content_id: 'reading/one' })
      await opening
      expect(dependencies.navigate).not.toHaveBeenCalled()
      expect(state.notice.value).toBe('')
      wrapper.unmount()
    }
  )
  it('独立总数使用后端counts，不把当前页数量当已读数；无权仅跳安全预览', async () => {
    const wrapper = render()
    dependencies.show?.()
    await flushPromises()
    expect(state.completedCount.value).toBe(28)
    expect(state.startedCount.value).toBe(42)
    expect(state.items.value).toHaveLength(1)
    await state.open(state.items.value[0]!)
    expect(dependencies.navigate).toHaveBeenLastCalledWith({
      type: 'navigateTo',
      url: '/sub-packages/short-reading/preview?contentId=reading%2Fone'
    })
    state.items.value[0]!.can_open = true
    await state.open(state.items.value[0]!)
    expect(dependencies.navigate).toHaveBeenLastCalledWith({
      type: 'navigateTo',
      url: '/sub-packages/short-reading/detail?contentId=reading%2Fone'
    })
    expect(
      dependencies.navigate.mock.calls.every(
        ([request]) =>
          !request.url.includes('sourceLocator') && !request.url.includes('contentVersion')
      )
    ).toBe(true)
    wrapper.unmount()
  })
  it('下一页失败保留本人摘要与游标供重试，成功追加去重且保持后台顺序', async () => {
    const wrapper = render()
    await state.load()
    dependencies.history.mockRejectedValueOnce(new Error('offline'))
    await state.load(true)
    expect(state.items.value).toHaveLength(1)
    expect(state.nextCursor.value).toBe('next+page')
    expect(state.error.value).toContain('加载失败')
    dependencies.history.mockResolvedValueOnce({
      ...page,
      items: [page.items[0], { ...page.items[0], content_id: 'two', title_zh: '短文已下线' }],
      has_more: false,
      next_cursor: null
    })
    await state.load(true)
    expect(dependencies.history).toHaveBeenLastCalledWith('next+page')
    expect(state.items.value.map((item) => item.content_id)).toEqual(['reading/one', 'two'])
    expect(state.nextCursor.value).toBeNull()
    wrapper.unmount()
  })
  it.each(['cursor', 'denied', 'repeat'] as const)(
    '%s失效清除可打开入口与旧游标，重试从首屏开始',
    async (kind) => {
      const wrapper = render()
      await state.load()
      if (kind === 'repeat') dependencies.history.mockResolvedValueOnce(page)
      else
        dependencies.history.mockRejectedValueOnce({
          code: kind === 'cursor' ? 'CURSOR_INVALID' : 'ACCOUNT_NOT_ACTIVE',
          status: kind === 'cursor' ? 422 : 403
        })
      await state.load(true)
      expect(state.items.value).toEqual([])
      expect(state.nextCursor.value).toBeNull()
      expect(state.completedCount.value).toBeUndefined()
      expect(state.error.value).not.toBe('')
      dependencies.history.mockResolvedValueOnce({ ...page, has_more: false, next_cursor: null })
      await state.load()
      expect(dependencies.history).toHaveBeenLastCalledWith(undefined)
      wrapper.unmount()
    }
  )
  it.each(['hide', 'unload', 'cleanup', 'account'] as const)(
    '%s后迟到历史不能恢复标题、总数或正文入口',
    async (event) => {
      let finish!: (value: unknown) => void
      dependencies.history.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      const wrapper = render()
      const loading = state.load()
      if (event === 'account')
        dependencies.history.mockImplementationOnce(() => new Promise(() => {}))
      if (event === 'cleanup') dependencies.session.cleanupGeneration++
      else if (event === 'account') dependencies.session.profile.juya_id = 'two'
      else dependencies[event]?.()
      finish(page)
      await loading
      expect(state.items.value).toEqual([])
      expect(state.completedCount.value).toBeUndefined()
      await state.open(page.items[0])
      expect(dependencies.navigate).not.toHaveBeenCalled()
      wrapper.unmount()
    }
  )
})
