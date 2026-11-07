// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: { id: string }) => void),
  unload: undefined as undefined | (() => void),
  owner: 'learner' as string | null,
  ensure: vi.fn(async () => true),
  media: vi.fn(),
  request: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onLoad: (callback: typeof ports.load) => (ports.load = callback),
  onShow: vi.fn(),
  onHide: vi.fn(),
  onPageScroll: vi.fn(),
  onUnload: (callback: typeof ports.unload) => (ports.unload = callback)
}))
vi.mock('@/services/api', () => ({
  session: {
    contentRequest: ports.request,
    request: ports.request,
    identity: () => ports.owner || 'guest:0',
    userId: () => ports.owner
  },
  operations: {
    pending: () => {
      if (!ports.owner) throw new Error('请先登录')
      return false
    }
  },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/audio-port', () => ({ createAudioPort: () => ({}) }))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ restore: async () => null, ensure: ports.ensure })
}))
vi.mock('@/services/audio-controller', () => ({
  createAudioController: () => ({ state: {}, dispose: vi.fn() })
}))

import { clearClientThumbnails } from '@/services/client-thumbnail'
import { ApiError } from '@/services/errors'
import SceneDetail from '@/sub-packages/scenes/detail.vue'
import { activeImagePreview } from '@/sub-packages/scenes/image-preview-service'

const scene = {
  card_id: 'scene-1',
  version_id: 'version-1',
  thumbnail_id: 'thumb-1',
  audio_duration: null,
  published_at: '',
  content: {
    name: '晨间慢慢活动身体',
    image_id: 'image-1',
    dialogue: [],
    vocabulary: [],
    chunks: []
  },
  state: { completed: false, today_completed: false, favorite: false }
}

beforeEach(() => {
  vi.resetAllMocks()
  ports.owner = 'learner'
  ports.ensure.mockResolvedValue(true)
  clearClientThumbnails()
  ports.request.mockResolvedValue(scene)
  ports.media.mockImplementation(async (_card: string, media: string) =>
    media === 'thumb-1' ? 'https://api.example/thumbnail' : 'https://api.example/original'
  )
  vi.stubGlobal('uni', {
    navigateTo: vi.fn(),
    downloadFile: vi.fn(({ success }) =>
      success({ statusCode: 200, tempFilePath: 'wxfile://downloaded-original.png' })
    ),
    compressImage: vi.fn(({ success }) =>
      success({ tempFilePath: 'wxfile://generated-thumbnail.jpg' })
    ),
    getImageInfo: vi.fn(({ src, success }) =>
      success({
        path: src.startsWith('wxfile:') ? src : 'wxfile://scene-original',
        width: 1200,
        height: 1800
      })
    )
  })
})
afterEach(() => vi.unstubAllGlobals())

/** 挂载正文并直接进入详情，图片请求外的学习模块保持隔离 */
const openDetail = () => {
  const page = shallowMount(SceneDetail, {
    global: { stubs: { AppPage: { template: '<view><slot /><slot name="footer" /></view>' } } }
  })
  ports.load?.({ id: 'scene-1' })
  return page
}

it('loads only a real thumbnail on direct detail entry without preparing an original', async () => {
  const page = openDetail()
  await flushPromises()
  expect(page.get('.scene-thumbnail image').attributes('src')).toBe(
    'https://api.example/thumbnail?thumbnail=list'
  )
  expect(ports.media).toHaveBeenCalledExactlyOnceWith(
    'scene-1',
    'thumb-1',
    'version-1',
    false,
    false
  )
  expect(uni.getImageInfo).not.toHaveBeenCalled()
  page.unmount()
})

it('keeps detail image loading until pixels arrive while text remains usable', async () => {
  const page = openDetail()
  await flushPromises()
  expect(page.find('.image-loading').exists()).toBe(true)
  expect(page.text()).toContain('晨间慢慢活动身体')
  await page.get('.scene-thumbnail image').trigger('load')
  expect(page.find('.image-loading').exists()).toBe(false)
  await page.get('.scene-thumbnail image').trigger('error')
  expect(page.find('.image-loading').exists()).toBe(false)
  expect(page.get('.image-retry').text()).toContain('重试')
  page.unmount()
})

it('starts the original only in the viewer and shares concurrent requests without replacing the thumbnail', async () => {
  let finish: (url: string) => void = () => undefined
  ports.media.mockImplementation((_card: string, media: string) =>
    media === 'thumb-1'
      ? Promise.resolve('https://api.example/thumbnail')
      : new Promise<string>((resolve) => {
          finish = resolve
        })
  )
  const page = openDetail()
  await flushPromises()
  await page.get('.expand-image').trigger('click')
  const context = activeImagePreview()
  expect(context?.initialSrc).toBe('')
  expect(ports.media).toHaveBeenCalledTimes(1)
  const first = context?.loadSource?.()
  const second = context?.loadSource?.()
  finish('https://api.example/original')
  await expect(first).resolves.toBe('wxfile://scene-original')
  await expect(second).resolves.toBe('wxfile://scene-original')
  await expect(context?.loadSource?.()).resolves.toBe('wxfile://scene-original')
  expect(ports.media).toHaveBeenCalledTimes(2)
  expect(uni.getImageInfo).toHaveBeenCalledOnce()
  expect(page.get('.scene-thumbnail image').attributes('src')).toBe(
    'https://api.example/thumbnail?thumbnail=list'
  )
  page.unmount()
})

it('renews a failed thumbnail and clears its error without requesting the original', async () => {
  const page = openDetail()
  await flushPromises()
  await page.get('.scene-thumbnail image').trigger('error')
  ports.media.mockResolvedValue('https://api.example/fresh-thumbnail')
  await page.get('.image-retry').trigger('click')
  await flushPromises()
  expect(ports.media).toHaveBeenLastCalledWith('scene-1', 'thumb-1', 'version-1', false, true)
  expect(page.get('.scene-thumbnail image').attributes('src')).toBe(
    'https://api.example/fresh-thumbnail?thumbnail=list'
  )
  expect(page.find('.image-retry').exists()).toBe(false)
  expect(uni.getImageInfo).not.toHaveBeenCalled()
  page.unmount()
})

it('keeps a usable thumbnail after the original fails and renews only the original on retry', async () => {
  const page = openDetail()
  await flushPromises()
  await page.get('.expand-image').trigger('click')
  const context = activeImagePreview()
  ports.media.mockRejectedValueOnce(new Error('offline'))
  await expect(context?.loadSource?.()).rejects.toThrow('offline')
  expect(page.get('.scene-thumbnail image').attributes('src')).toBe(
    'https://api.example/thumbnail?thumbnail=list'
  )
  await expect(context?.loadSource?.(true)).resolves.toBe('wxfile://scene-original')
  expect(ports.media).toHaveBeenLastCalledWith('scene-1', 'image-1', 'version-1', false, true)
  page.unmount()
})

it('generates a smaller thumbnail locally when metadata is missing and retains the full original for viewing', async () => {
  ports.request.mockResolvedValue({ ...scene, thumbnail_id: null })
  const page = openDetail()
  await flushPromises()
  expect(page.get('.scene-thumbnail image').attributes('src')).toBe(
    'wxfile://generated-thumbnail.jpg'
  )
  expect(uni.compressImage).toHaveBeenCalledWith(
    expect.objectContaining({
      src: 'wxfile://downloaded-original.png',
      compressedWidth: 144,
      compressedHeight: 216
    })
  )
  expect(ports.media).toHaveBeenCalledExactlyOnceWith(
    'scene-1',
    'image-1',
    'version-1',
    false,
    false
  )
  await page.get('.expand-image').trigger('click')
  await expect(activeImagePreview()?.loadSource?.()).resolves.toBe(
    'wxfile://downloaded-original.png'
  )
  expect(uni.downloadFile).toHaveBeenCalledOnce()
  page.unmount()
})

it('ignores a thumbnail response after the detail page has been unloaded', async () => {
  let finish: (url: string) => void = () => undefined
  ports.media.mockReturnValue(
    new Promise<string>((resolve) => {
      finish = resolve
    })
  )
  const page = openDetail()
  await flushPromises()
  ports.unload?.()
  finish('https://api.example/late-thumbnail')
  await flushPromises()
  expect(page.find('.scene-thumbnail image').exists()).toBe(false)
  page.unmount()
})

it('does not reuse a cached original once the publication has become stale', async () => {
  const page = openDetail()
  await flushPromises()
  await page.get('.expand-image').trigger('click')
  const context = activeImagePreview()
  await expect(context?.loadSource?.()).resolves.toBe('wxfile://scene-original')
  context?.onInvalid(new ApiError('version_changed', '内容已更新', 409))
  await expect(context?.loadSource?.()).rejects.toThrow('场景图片暂不可用')
  page.unmount()
})

it('still opens the full original when front-end thumbnail processing fails', async () => {
  ports.request.mockResolvedValue({ ...scene, thumbnail_id: null })
  vi.mocked(uni.compressImage).mockImplementation(({ fail }) => {
    fail?.({ errMsg: 'compressImage:fail invalid' })
  })
  const page = openDetail()
  await flushPromises()
  expect(page.find('.image-retry').exists()).toBe(true)
  await page.get('.expand-image').trigger('click')
  await expect(activeImagePreview()?.loadSource?.()).resolves.toBe('wxfile://scene-original')
  expect(uni.compressImage).toHaveBeenCalledOnce()
  page.unmount()
})

it('opens a free guest scene without private access, personal state or an identity gate', async () => {
  ports.owner = null
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/summary')
      ? {
          id: 'scene-1',
          name: '晨间慢慢活动身体',
          version_id: 'version-1',
          state: null,
          available: true,
          thumbnail_id: 'thumb-1',
          access: { can_learn: true, can_lookup: false, is_free: true }
        }
      : { ...scene, state: null, access: { can_learn: true, can_lookup: false, is_free: true } }
  )
  const page = openDetail()
  await flushPromises()
  expect(ports.ensure).not.toHaveBeenCalled()
  expect(page.text()).toContain('晨间慢慢活动身体')
  expect(page.text()).toContain('当前为游客体验')
  expect(page.get('.safe-footer').text()).toContain('完成本次学习')
  expect(page.get('.safe-footer').text()).not.toContain('已完成学习')
  expect(ports.request.mock.calls.some(([path]) => path.endsWith('/access'))).toBe(false)
  expect(ports.request.mock.calls[0][0]).toContain('mark_started=false')
  page.unmount()
})
