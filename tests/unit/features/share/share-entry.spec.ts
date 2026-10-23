// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  load: null as null | ((query: Record<string, string>) => void),
  show: null as null | (() => void),
  hide: null as null | (() => void),
  unload: null as null | (() => void),
  friends: null as null | (() => unknown),
  timeline: null as null | (() => unknown),
  request: vi.fn(),
  publicRequest: vi.fn(),
  cover: vi.fn(),
  ensure: vi.fn(async () => true),
  restore: vi.fn(async () => ({ id: 'owner' })),
  audio: vi.fn(),
  disposeAudio: vi.fn(),
  next: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onHide: (callback: typeof ports.hide) => {
    ports.hide = callback
  },
  onUnload: (callback: typeof ports.unload) => {
    ports.unload = callback
  },
  onPageScroll: vi.fn(),
  onShareAppMessage: (callback: typeof ports.friends) => {
    ports.friends = callback
  },
  onShareTimeline: (callback: typeof ports.timeline) => {
    ports.timeline = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'owner' },
  operations: { pending: () => false },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/platform', () => ({
  sendPublicRequest: ports.publicRequest,
  resourceURL: (path: string) => path,
  operationKey: () => 'key'
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    profile: { id: 'owner' },
    ensure: ports.ensure,
    restore: ports.restore
  })
}))
vi.mock('@/services/audio-port', () => ({ createAudioPort: ports.audio }))
vi.mock('@/services/share-cover-file', () => ({ prepareShareCover: ports.cover }))
vi.mock('@/features/learning/audio-controller', () => ({
  createAudioController: () => ({ state: {}, dispose: ports.disposeAudio })
}))
vi.mock('@/services/source-queue', () => ({
  sourceQueue: {
    matches: (queue: string) => queue === 'foreign',
    source: () => 'favorites',
    next: ports.next
  },
  takePreparedScene: () => null
}))

import { ApiError } from '@/services/errors'
import { runtimeMode } from '@/services/runtime-mode'
import SceneDetail from '@/sub-packages/scenes/detail.vue'

const summary = {
  card_id: 'card-1',
  version_id: 'v1',
  name: '公开晨间',
  title_en: 'Public Morning',
  images: {
    friends: {
      url: '/api/mini/v1/public/cards/card-1/share/images/v1/friends',
      width: 600,
      height: 480
    },
    timeline: {
      url: '/api/mini/v1/public/cards/card-1/share/images/v1/timeline',
      width: 600,
      height: 600
    }
  }
}
/** 挂载分享目标页面，公开摘要保留真实渲染以验证没有私人正文
 * @param query 原生收到的外部分享参数
 */
const open = (
  query: Record<string, string> = { target: 'scene', id: 'card-1', queue: 'foreign' }
) => {
  const page = mount(SceneDetail, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot/><slot name="footer"/></div>' },
        SceneDialogue: true,
        SceneVocabulary: true,
        SceneAudioPlayer: true
      }
    }
  })
  ports.load?.(query)
  ports.show?.()
  return page
}
beforeEach(() => {
  vi.clearAllMocks()
  runtimeMode.update({ apiCategory: 'default' })
  ports.cover.mockImplementation(async (path: string) => path)
  ports.publicRequest.mockResolvedValue({ status: 200, data: summary })
  ports.request.mockResolvedValue({
    card_id: 'card-1',
    version_id: 'v1',
    content: { name: '本人正文', title_en: 'Private Body', dialogue: [], vocabulary: [] },
    state: { today_completed: true, completed: true, favorite: false, started: true }
  })
  vi.stubGlobal('uni', {
    pageScrollTo: vi.fn(),
    hideShareMenu: vi.fn(),
    showShareMenu: vi.fn(),
    switchTab: vi.fn()
  })
})
afterEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.unstubAllGlobals()
})

it('shows only anonymous summary in browseOnly with a valid cached account and never initializes private audio', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  const page = open()
  await flushPromises()
  expect(page.text()).toContain('公开晨间')
  expect(page.text()).not.toContain('本人正文')
  expect(page.text()).not.toContain('前往学习页')
  expect(ports.publicRequest).toHaveBeenCalledTimes(1)
  expect(ports.request).not.toHaveBeenCalled()
  expect(ports.ensure).not.toHaveBeenCalled()
  expect(ports.restore).not.toHaveBeenCalled()
  expect(ports.audio).not.toHaveBeenCalled()
  await page.get('button.primary').trigger('click')
  expect(page.text()).toContain('请使用微信页面提供的')
  expect(uni.switchTab).not.toHaveBeenCalled()
  page.unmount()
})

it('rechecks the recipient identity and ignores a forged sender queue in full mode', async () => {
  const page = open()
  await flushPromises()
  expect(ports.ensure).toHaveBeenCalledWith('/sub-packages/scenes/detail?target=scene&id=card-1')
  expect(ports.restore).toHaveBeenCalledOnce()
  expect(page.text()).toContain('前往学习页')
  expect(page.text()).not.toContain('复习下一张')
  expect(ports.next).not.toHaveBeenCalled()
  expect(ports.friends?.()).toEqual({
    title: '公开晨间｜Public Morning',
    path: '/sub-packages/scenes/detail?target=scene&id=card-1',
    imageUrl: summary.images.friends.url
  })
  expect(Object.keys(ports.timeline?.() as object).sort()).toEqual(['imageUrl', 'query', 'title'])
  ports.unload?.()
  page.unmount()
})

it('stops existing private tracks and removes private content immediately on an official mode change', async () => {
  const page = open()
  await flushPromises()
  expect(ports.audio).toHaveBeenCalledTimes(2)
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await flushPromises()
  expect(ports.disposeAudio).toHaveBeenCalled()
  expect(page.text()).toContain('公开晨间')
  expect(page.text()).not.toContain('本人正文')
  const count = ports.request.mock.calls.length
  ports.hide?.()
  ports.show?.()
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(count)
  page.unmount()
})

it('keeps invalid incoming targets out of the private detail boundary', async () => {
  const page = open({ target: 'scene', id: '../me', queue: 'foreign' })
  await flushPromises()
  expect(ports.request).not.toHaveBeenCalled()
  expect(ports.audio).not.toHaveBeenCalled()
  expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/learning/index' })
  page.unmount()
})

it('revalidates identity and the current publication before leaving a public summary, including a now-offline target', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  const page = open()
  await flushPromises()
  let rejectBody: (reason: unknown) => void = () => undefined
  ports.request.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectBody = reject
      })
  )
  runtimeMode.update({ apiCategory: 'default' })
  await flushPromises()
  expect(ports.ensure).toHaveBeenCalledWith('/sub-packages/scenes/detail?target=scene&id=card-1')
  expect(ports.restore).toHaveBeenCalledOnce()
  expect(page.text()).not.toContain('本人正文')
  expect(ports.audio).not.toHaveBeenCalled()
  rejectBody(new ApiError('card_offline', '已下线', 410))
  await flushPromises()
  expect(page.text()).not.toContain('本人正文')
  expect(page.find('.safe-footer').exists()).toBe(false)
  expect(page.text()).toContain('返回学习页')
  await page.get('.unavailable .primary').trigger('click')
  expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/learning/index' })
  expect(ports.audio).not.toHaveBeenCalled()
  ports.unload?.()
  page.unmount()
})

it('retains the safe target without reading private body or preparing audio when voluntary login is required', async () => {
  ports.ensure.mockResolvedValueOnce(false)
  const page = open()
  await flushPromises()
  expect(ports.ensure).toHaveBeenCalledWith('/sub-packages/scenes/detail?target=scene&id=card-1')
  expect(ports.request).not.toHaveBeenCalled()
  expect(ports.audio).not.toHaveBeenCalled()
  page.unmount()
})

it('opens the sheet immediately while pending and merges load/show/repeated click requests', async () => {
  let finish: (value: unknown) => void = () => undefined
  ports.publicRequest.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const page = open()
  await flushPromises()
  const entry = page
    .findAll('.detail-tools button')
    .find((button) => button.text().includes('分享场景'))!
  expect(entry.attributes('disabled')).toBeUndefined()
  await entry.trigger('click')
  expect(page.find('[role="dialog"]').exists()).toBe(true)
  expect(page.get('[role="dialog"]').text()).toContain('正在准备')
  await entry.trigger('click')
  ports.show?.()
  await flushPromises()
  expect(ports.publicRequest).toHaveBeenCalledTimes(1)
  finish({ status: 200, data: summary })
  await flushPromises()
  expect(page.find('[open-type="share"]').exists()).toBe(true)
  ports.unload?.()
  page.unmount()
})

it('rejects late share files after hide and never reopens the old sheet or menu', async () => {
  const finishes: ((value: string) => void)[] = []
  ports.cover.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishes.push(resolve)
      })
  )
  const page = open()
  await flushPromises()
  await page
    .findAll('.detail-tools button')
    .find((button) => button.text().includes('分享场景'))!
    .trigger('click')
  ports.hide?.()
  for (const finish of finishes) finish('/late-file')
  await flushPromises()
  expect(page.find('[role="dialog"]').exists()).toBe(false)
  expect(ports.friends?.()).toMatchObject({
    path: '/sub-packages/scenes/detail?target=scene&id=card-1',
    imageUrl: '/static/brand/brand-share.png'
  })
  ports.unload?.()
  page.unmount()
})

it('keeps friend sharing usable and offers timeline-only retry when that cover fails', async () => {
  ports.cover.mockImplementation(async (path: string) => {
    if (path.endsWith('/timeline')) throw new Error('朋友圈封面下载失败')
    return '/friend-ready'
  })
  const page = open()
  await flushPromises()
  await page
    .findAll('.detail-tools button')
    .find((button) => button.text().includes('分享场景'))!
    .trigger('click')
  await flushPromises()
  expect(page.find('[open-type="share"]').exists()).toBe(true)
  await page.findAll('.channel-button')[1]!.trigger('click')
  expect(page.get('[role="dialog"]').text()).toContain('朋友圈封面下载失败')
  ports.cover.mockResolvedValue('/timeline-ready')
  await page.get('.share-retry').trigger('click')
  await flushPromises()
  expect(ports.cover).toHaveBeenCalledTimes(3)
  expect(ports.publicRequest).toHaveBeenCalledOnce()
  expect(ports.friends?.()).toMatchObject({ imageUrl: '/friend-ready' })
  expect(ports.timeline?.()).toMatchObject({ imageUrl: '/timeline-ready' })
  ports.unload?.()
  page.unmount()
})
