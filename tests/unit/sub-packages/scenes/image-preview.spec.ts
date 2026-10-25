// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: { id: string }) => void),
  show: undefined as undefined | (() => void),
  unload: undefined as undefined | (() => void),
  media: vi.fn(),
  request: vi.fn(),
  back: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: typeof ports.show) => (ports.show = callback),
  onLoad: (callback: typeof ports.load) => (ports.load = callback),
  onUnload: (callback: typeof ports.unload) => (ports.unload = callback)
}))
vi.mock('@/services/api', () => ({ session: { request: ports.request } }))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/services/navigation', () => ({ backTo: ports.back }))

import { ApiError } from '@/services/errors'
import { registerImagePreview } from '@/services/image-preview'
import { runtimeMode } from '@/services/runtime-mode'
import ImagePreview from '@/sub-packages/scenes/image-preview.vue'

beforeEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.clearAllMocks()
  ports.media.mockResolvedValue('/fresh-original')
  ports.request.mockResolvedValue({})
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ statusBarHeight: 47 }),
    getImageInfo: vi.fn(({ src, success }) => success({ path: src }))
  })
})
afterEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.unstubAllGlobals()
})

/** 用原生标签承接容器事件，tag 是小程序移动或缩放容器标签 */
const nativeContainer = (tag: string) =>
  defineComponent({
    setup:
      (_, { attrs, slots }) =>
      () =>
        h(tag, attrs, slots.default?.())
  })

/** 从同一版本详情页打开大图，loadSource 接收是否重新签发原图地址 */
const openPreview = (
  loadSource?: (renew?: boolean) => Promise<string>,
  access?: import('@/shared/contracts/generated/mini-api').components['schemas']['LearningPermission']
) => {
  const onInvalid = vi.fn(),
    onClose = vi.fn()
  registerImagePreview({
    access,
    cardId: 'scene-1',
    versionId: 'version-1',
    imageId: 'image-1',
    title: '晨间慢慢活动身体',
    loadSource,
    onInvalid,
    onClose
  })
  const page = mount(ImagePreview, {
    global: {
      stubs: {
        MovableView: nativeContainer('movable-view'),
        MovableArea: nativeContainer('movable-area')
      }
    }
  })
  ports.load?.({ id: 'scene-1' })
  return { page, onInvalid, onClose }
}

it('reuses the detail image request instead of fetching a second signed URL', async () => {
  const loadSource = vi.fn().mockResolvedValue('/already-loaded-original'),
    { page } = openPreview(loadSource)
  await flushPromises()
  expect(page.get('.zoom-image image').attributes('src')).toBe('/already-loaded-original')
  expect(loadSource).toHaveBeenCalledOnce()
  expect(page.get('.image-overlay').attributes('style')).toContain('--viewer-top: 47px')
  expect(ports.media).not.toHaveBeenCalled()
  page.unmount()
})

it('waits for the original pixels and removes the loading message only after image load', async () => {
  const { page } = openPreview()
  await flushPromises()
  expect(page.text()).toContain('正在加载原图')
  await page.get('.zoom-image image').trigger('load')
  expect(page.text()).not.toContain('正在加载原图')
  page.unmount()
})

it('keeps arbitrary pinch scales, clamps at 100–200%, and disables settling animation', async () => {
  const { page } = openPreview()
  await flushPromises()
  const image = page.get('movable-view')
  expect(image.attributes('scale-min')).toBe('1')
  expect(image.attributes('scale-max')).toBe('2')
  expect(image.attributes('animation')).toBe('false')
  expect(image.attributes('inertia')).toBe('false')
  await image.trigger('scale', { detail: { scale: 1.376 } })
  await image.trigger('touchend')
  expect(image.attributes('scale-value')).toBe('1')
  expect(page.text()).toContain('138%')
  await page.get('[aria-label="放大原图"]').trigger('click')
  expect(image.attributes('scale-value')).toBe('1.626')
  await image.trigger('scale', { detail: { scale: 2.1 } })
  expect(page.text()).toContain('200%')
  expect(page.get('[aria-label="放大原图"]').attributes('disabled')).toBeDefined()
  await page.get('.reset-image').trigger('click')
  expect(image.attributes('scale-value')).toBe('1')
  expect(page.get('[aria-label="缩小原图"]').attributes('disabled')).toBeDefined()
  page.unmount()
})

it('renews the original URL on explicit retry after cached pixels fail', async () => {
  const loadSource = vi.fn(async (renew?: boolean) =>
    renew ? '/fresh-original' : '/expired-original'
  )
  const { page } = openPreview(loadSource)
  await flushPromises()
  await page.get('.zoom-image image').trigger('error')
  await flushPromises()
  await page.get('.overlay-message button').trigger('click')
  await flushPromises()
  expect(loadSource.mock.calls).toEqual([[false], [true]])
  expect(page.get('.zoom-image image').attributes('src')).toBe('/fresh-original')
  page.unmount()
})

it('removes a rendered private original and invalidates an in-flight retry when the official mode becomes browseOnly', async () => {
  let finish: (value: string) => void = () => undefined
  const loadSource = vi
    .fn()
    .mockResolvedValueOnce('/private-full-resolution-file')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
  const { page, onClose } = openPreview(loadSource)
  await flushPromises()
  expect(page.get('.zoom-image image').attributes('src')).toBe('/private-full-resolution-file')
  await page.get('.zoom-image image').trigger('error')
  await page.get('.overlay-message button').trigger('click')
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await flushPromises()
  expect(page.find('.zoom-image image').exists()).toBe(false)
  expect(onClose).toHaveBeenCalledOnce()
  finish('/late-private-original')
  await flushPromises()
  expect(page.find('[src="/late-private-original"]').exists()).toBe(false)
  page.unmount()
})

it('does not read or load the registered private context when the overlay is opened cold in browseOnly', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  const loadSource = vi.fn(async () => '/private-file')
  const { page } = openPreview(loadSource)
  await flushPromises()
  expect(loadSource).not.toHaveBeenCalled()
  expect(ports.media).not.toHaveBeenCalled()
  expect(page.find('.zoom-image image').exists()).toBe(false)
  page.unmount()
})

it('hides an already rendered full-resolution original immediately when browseOnly is reported', async () => {
  const { page } = openPreview(async () => '/private-original-visible')
  await flushPromises()
  expect(page.get('.zoom-image image').attributes('src')).toBe('/private-original-visible')
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await flushPromises()
  expect(page.find('.image-overlay').exists()).toBe(false)
  expect(page.find('[src="/private-original-visible"]').exists()).toBe(false)
  page.unmount()
})

it('does not navigate or invalidate the parent when an image status check finishes after closing', async () => {
  let reject: (reason: Error) => void = () => undefined
  ports.request.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail
      })
  )
  const { page, onInvalid } = openPreview()
  await flushPromises()
  await page.get('.zoom-image image').trigger('error')
  ports.unload?.()
  page.unmount()
  reject(new ApiError('card_offline', '已下线', 410))
  await flushPromises()
  expect(ports.back).not.toHaveBeenCalled()
  expect(onInvalid).not.toHaveBeenCalled()
})

it('keeps retry loading when the replaced original emits a late load event', async () => {
  const { page } = openPreview()
  await flushPromises()
  const oldImage = page.get('.zoom-image image')
  await oldImage.trigger('error')
  await flushPromises()
  await page.get('.overlay-message button').trigger('click')
  await flushPromises()
  await oldImage.trigger('load')
  expect(page.text()).toContain('正在加载原图')
  await page.get('.zoom-image image').trigger('load')
  expect(page.text()).not.toContain('正在加载原图')
  page.unmount()
})

it('shares the normal onLoad/onShow permission check and loads the original after it resolves', async () => {
  const access = {
    can_learn: true,
    can_lookup: false,
    is_free: true,
    reason: null,
    version: '1',
    server_now: '2026-10-25T00:00:00Z',
    expires_at: null
  }
  let finish!: (value: { access: typeof access }) => void
  ports.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const source = vi.fn().mockResolvedValue('/verified-original')
  const { page } = openPreview(source, access)
  ports.show?.()
  expect(ports.request).toHaveBeenCalledTimes(1)
  finish({ access })
  await flushPromises()
  expect(source).toHaveBeenCalledTimes(1)
  expect(page.get('.zoom-image image').attributes('src')).toBe('/verified-original')
  page.unmount()
})
