// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: { id: string; queue?: string }) => void),
  request: vi.fn(),
  run: vi.fn(),
  recover: vi.fn(),
  pending: vi.fn(() => false),
  next: vi.fn(),
  matches: vi.fn(),
  source: vi.fn(() => 'learning'),
  clear: vi.fn(),
  commit: vi.fn(() => vi.fn()),
  prepare: vi.fn(),
  take: vi.fn(),
  discard: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: vi.fn(),
  onHide: vi.fn(),
  onPageScroll: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'learner' },
  operations: { run: ports.run, pending: ports.pending, recover: ports.recover },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/source-queue', () => ({
  sourceQueue: {
    next: ports.next,
    matches: ports.matches,
    source: ports.source,
    clear: ports.clear,
    commit: ports.commit
  },
  prepareSourceScene: ports.prepare,
  takePreparedScene: ports.take,
  discardPreparedScene: ports.discard
}))
vi.mock('@/services/audio-port', () => ({ createAudioPort: () => ({}) }))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ ensure: async () => true, refreshStatistics: async () => undefined })
}))
vi.mock('@/features/learning/audio-controller', () => ({
  createAudioController: () => ({ state: {}, dispose: vi.fn() })
}))

import SceneDetail from '@/sub-packages/scenes/detail.vue'

let today = false,
  completedBefore = false
/** 返回当前发布卡及服务端今日状态
 * @param id 当前读取的稳定卡片
 */
const scene = (id = 'first') => ({
  card_id: id,
  version_id: 'v1',
  thumbnail_id: null,
  content: { name: id, dialogue: [], vocabulary: [], chunks: [] },
  state: {
    completed: today || completedBefore,
    today_completed: today,
    favorite: false,
    started: true
  }
})
/** 打开带有可选来源标识的真实详情组件
 * @param queue 是否由列表来源进入
 * @param realDialogue 是否渲染真实对话以验证译文重新收起
 */
const open = (queue = true, realDialogue = false) => {
  const page = shallowMount(SceneDetail, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /><slot name="footer" /></view>' },
        SceneDialogue: !realDialogue
      }
    }
  })
  ports.load?.({ id: 'first', ...(queue ? { queue: 'q' } : {}) })
  return page
}
beforeEach(() => {
  vi.clearAllMocks()
  today = false
  completedBefore = false
  ports.pending.mockReturnValue(false)
  ports.source.mockReturnValue('learning')
  ports.matches.mockImplementation((id) => id === 'q')
  ports.request.mockImplementation(async (path: string) =>
    scene(path.includes('/second') ? 'second' : 'first')
  )
  ports.run.mockImplementation(async () => {
    today = true
  })
  ports.next.mockResolvedValue(null)
  ports.take.mockReturnValue(null)
  vi.stubGlobal('uni', {
    pageScrollTo: vi.fn(),
    switchTab: vi.fn(),
    redirectTo: vi.fn(({ success }) => success())
  })
})

it('offers next after confirmed completion without submitting another completion, and keeps the original stack', async () => {
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.get('.safe-footer .primary').text()).toBe('继续学习下一张')
  ports.next.mockResolvedValue('second')
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(ports.run).toHaveBeenCalledTimes(1)
  expect(uni.redirectTo).toHaveBeenCalledWith(
    expect.objectContaining({ url: '/sub-packages/scenes/detail?id=second&queue=q' })
  )
  page.unmount()
})

it('allows next for a card completed today and never resubmits it', async () => {
  today = true
  const page = open()
  await flushPromises()
  expect(page.get('.safe-footer .primary').attributes('disabled')).toBeUndefined()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(ports.run).not.toHaveBeenCalled()
  expect(ports.next).toHaveBeenCalledTimes(1)
  expect(page.findComponent({ name: 'SceneQueueEnd' }).exists()).toBe(true)
  page.unmount()
})

it('does not advance or claim queue end after an unknown completion or a next-page failure', async () => {
  ports.run.mockRejectedValue(new Error('result unknown'))
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(ports.next).not.toHaveBeenCalled()
  expect(page.findComponent({ name: 'SceneQueueEnd' }).exists()).toBe(false)
  page.unmount()
  today = true
  ports.next.mockRejectedValue(new Error('page unavailable'))
  const retry = open()
  await flushPromises()
  await retry.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(retry.text()).toContain('page unavailable')
  expect(retry.findComponent({ name: 'SceneQueueEnd' }).exists()).toBe(false)
  retry.unmount()
})

it('provides only a learning-page action for a direct single card after completion', async () => {
  today = true
  const page = open(false)
  await flushPromises()
  expect(page.get('.safe-footer .primary').text()).toBe('前往学习页')
  await page.get('.safe-footer .primary').trigger('click')
  expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/learning/index' })
  expect(ports.next).not.toHaveBeenCalled()
  page.unmount()
})

it('keeps current published content when a queue expires, instead of treating the card as offline', async () => {
  const { ApiError } = await import('@/services/errors')
  today = true
  ports.next.mockRejectedValue(new ApiError('queue_expired', '来源已过期，请重新进入列表', 410))
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.find('.scene-title').exists()).toBe(true)
  expect(page.text()).toContain('来源已过期')
  page.unmount()
})

it('submits a new review for a previously completed favorite and then offers review next', async () => {
  completedBefore = true
  ports.source.mockReturnValue('favorites')
  const page = open()
  await flushPromises()
  expect(page.get('.safe-footer .primary').text()).toBe('完成本次复习')
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(ports.run).toHaveBeenCalledTimes(1)
  expect(page.get('.safe-footer .primary').text()).toBe('复习下一张')
  page.unmount()
})

it('keeps an unknown completion blocked until the operation result and current state are recovered', async () => {
  ports.run.mockImplementation(async () => {
    ports.pending.mockReturnValue(true)
    throw new Error('result unknown')
  })
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.get('.safe-footer .primary').attributes('disabled')).toBeDefined()
  expect(ports.next).not.toHaveBeenCalled()
  ports.recover.mockImplementation(async () => {
    today = true
    ports.pending.mockReturnValue(false)
  })
  await page.get('.notice.error .text-button').trigger('click')
  await flushPromises()
  expect(ports.recover).toHaveBeenCalledWith('complete:first')
  expect(page.get('.safe-footer .primary').text()).toBe('继续学习下一张')
  page.unmount()
})

it('retains the current body and cursor when the next card body fails, and retries that same target', async () => {
  today = true
  ports.next.mockResolvedValue('second')
  ports.request.mockImplementation(async (path: string) => {
    if (path.includes('/second')) throw new Error('next body failed')
    return scene()
  })
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.get('.scene-title .title').text()).toBe('first')
  expect(page.text()).toContain('next body failed')
  expect(ports.commit).not.toHaveBeenCalled()
  expect(uni.redirectTo).not.toHaveBeenCalled()
  ports.request.mockImplementation(async (path: string) =>
    scene(path.includes('/second') ? 'second' : 'first')
  )
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(ports.next).toHaveBeenCalledTimes(2)
  expect(ports.commit).toHaveBeenCalledWith('second')
  expect(uni.redirectTo).toHaveBeenCalledWith(
    expect.objectContaining({ url: '/sub-packages/scenes/detail?id=second&queue=q' })
  )
  page.unmount()
})

it('shows the source-specific end choice immediately when the last completion is confirmed', async () => {
  ports.next.mockResolvedValue(null)
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.findComponent({ name: 'SceneQueueEnd' }).exists()).toBe(true)
  expect(ports.commit).not.toHaveBeenCalled()
  page.unmount()
})

it('keeps confirmed completion visible when the end probe fails and never reports a false end', async () => {
  ports.next.mockRejectedValue(new Error('cannot check next page'))
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.get('.scene-title .title').text()).toBe('first')
  expect(page.text()).toContain('cannot check next page')
  expect(page.findComponent({ name: 'SceneQueueEnd' }).exists()).toBe(false)
  page.unmount()
})

it('blocks a persisted unknown completion on re-entry until recovery confirms the original operation', async () => {
  ports.pending.mockReturnValue(true)
  const page = open()
  await flushPromises()
  expect(page.get('.safe-footer .primary').attributes('disabled')).toBeDefined()
  expect(page.text()).toContain('结果待确认')
  expect(ports.run).not.toHaveBeenCalled()
  ports.recover.mockImplementation(async () => {
    today = true
    ports.pending.mockReturnValue(false)
  })
  await page.get('.notice.error .text-button').trigger('click')
  await flushPromises()
  expect(ports.recover).toHaveBeenCalledWith('complete:first')
  expect(page.get('.safe-footer .primary').attributes('disabled')).toBeUndefined()
  expect(ports.run).not.toHaveBeenCalled()
  page.unmount()
})

it('rolls back the source cursor and discards the one-use body when native next navigation fails', async () => {
  today = true
  ports.next.mockResolvedValue('second')
  vi.mocked(uni.redirectTo).mockImplementation((options) => {
    options!.fail?.({ errMsg: 'native failure' })
    return undefined as never
  })
  const page = open()
  await flushPromises()
  await page.get('.safe-footer .primary').trigger('click')
  await flushPromises()
  expect(page.get('.scene-title .title').text()).toBe('first')
  expect(page.text()).toContain('下一张暂未打开')
  expect(ports.commit.mock.results[0]!.value).toHaveBeenCalledTimes(1)
  expect(ports.discard).toHaveBeenCalledTimes(1)
  page.unmount()
})

it('explains a changed publication position reset and starts a re-entered dialogue with translation collapsed', async () => {
  const value = scene()
  ports.request.mockResolvedValue({
    ...value,
    reading_position: null,
    reading_position_reset: true,
    content: {
      ...value.content,
      dialogue: [{ id: 'line-1', speaker: 'A', english: 'Current version.', chinese: '当前版本' }]
    }
  })
  const page = open(false, true)
  await flushPromises()
  expect(page.text()).toContain('内容已更新，已从顶部开始阅读')
  expect(page.find('.translation-section').exists()).toBe(false)
  await page.get('.translation-toggle').trigger('click')
  await flushPromises()
  expect(page.find('.translation-section').exists()).toBe(true)
  page.unmount()
  const reopened = open(false, true)
  await flushPromises()
  expect(reopened.find('.translation-section').exists()).toBe(false)
  reopened.unmount()
})
