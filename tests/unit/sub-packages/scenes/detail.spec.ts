// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: { id: string }) => void),
  media: vi.fn(),
  request: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => (ports.load = callback),
  onShow: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'learner' },
  operations: {},
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/audio-port', () => ({ createAudioPort: () => ({}) }))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ ensure: () => Promise.resolve(true) })
}))
vi.mock('@/features/learning/audio-controller', () => ({
  createAudioController: () => ({ state: {}, dispose: vi.fn() })
}))

import { activeImagePreview } from '@/services/image-preview'
import SceneDetail from '@/sub-packages/scenes/detail.vue'

beforeEach(() => {
  vi.clearAllMocks()
  ports.request.mockResolvedValue({
    id: 'scene-1',
    version_id: 'version-1',
    content: {
      name: '晨间慢慢活动身体',
      image_id: 'image-1',
      dialogue: [],
      vocabulary: [],
      chunks: []
    },
    state: { completed: false, favorite: false }
  })
  vi.stubGlobal('uni', {
    createInnerAudioContext: () => ({}),
    navigateTo: vi.fn(),
    getImageInfo: vi.fn(({ success }) => success({ path: 'wxfile://scene-original' }))
  })
})
afterEach(() => vi.unstubAllGlobals())

/** 挂载场景正文并启动详情加载，子模块隔离以只验证图片请求链路 */
const openDetail = () => {
  const page = shallowMount(SceneDetail, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  ports.load?.({ id: 'scene-1' })
  return page
}

it('shares an in-flight original download when the learner opens the viewer early', async () => {
  let finish: (url: string) => void = () => undefined
  ports.media.mockReturnValue(
    new Promise<string>((resolve) => {
      finish = resolve
    })
  )
  const page = openDetail()
  await flushPromises()
  await page.get('.expand-image').trigger('click')
  const original = activeImagePreview()?.loadSource?.()
  expect(ports.media).toHaveBeenCalledExactlyOnceWith(
    'scene-1',
    'image-1',
    'version-1',
    false,
    false
  )
  finish('https://api.example/original')
  await expect(original).resolves.toBe('wxfile://scene-original')
  await flushPromises()
  expect(page.get('.scene-thumbnail image').attributes('src')).toBe('wxfile://scene-original')
  expect(uni.getImageInfo).toHaveBeenCalledOnce()
  page.unmount()
})

it('reuses the same local original after the detail image is already displayed', async () => {
  ports.media.mockResolvedValue('https://api.example/original')
  const page = openDetail()
  await flushPromises()
  await page.get('.expand-image').trigger('click')
  await expect(activeImagePreview()?.loadSource?.()).resolves.toBe('wxfile://scene-original')
  expect(ports.media).toHaveBeenCalledOnce()
  expect(uni.getImageInfo).toHaveBeenCalledOnce()
  page.unmount()
})
