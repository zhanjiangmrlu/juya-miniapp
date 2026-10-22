// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  load: null as null | ((query: Record<string, string>) => void),
  unload: null as null | (() => void),
  media: vi.fn(),
  request: vi.fn(),
  context: {
    cardId: 'card',
    versionId: 'v1',
    imageId: 'image',
    title: '场景',
    initialSrc: '/already-loaded',
    onInvalid: vi.fn(),
    onClose: vi.fn()
  }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn(),
  onLoad: (cb: typeof ports.load) => {
    ports.load = cb
  },
  onUnload: (cb: typeof ports.unload) => {
    ports.unload = cb
  }
}))
vi.mock('@/services/api', () => ({ session: { request: ports.request } }))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/services/navigation', () => ({ backTo: vi.fn() }))
vi.mock('@/services/image-preview', () => ({
  activeImagePreview: () => ports.context,
  discardImagePreview: vi.fn(),
  closeImagePreview: vi.fn(),
  prepareImagePreviewSource: (url: string) => Promise.resolve(url)
}))

beforeEach(() => {
  vi.stubGlobal('uni', { getWindowInfo: () => ({ statusBarHeight: 47 }) })
  ports.context.initialSrc = '/already-loaded'
  ports.media.mockReset()
  ports.media.mockResolvedValue('/renewed-image')
})
afterEach(() => vi.unstubAllGlobals())

it('opens the same loaded original without fetching another media ticket', async () => {
  const { default: Preview } = await import('@/sub-packages/scenes/image-preview.vue')
  const page = mount(Preview, {
    global: {
      stubs: {
        'movable-area': { template: '<div><slot /></div>' },
        'movable-view': { template: '<div><slot /></div>' }
      }
    }
  })
  ports.load?.({ id: 'card' })
  await flushPromises()
  expect(page.get('.zoom-image image').attributes('src')).toBe('/already-loaded')
  expect(ports.media).not.toHaveBeenCalled()
  page.unmount()
})

it('keeps fractional pinch scale and bounds gestures and buttons to 100–200 percent', async () => {
  const { default: Preview } = await import('@/sub-packages/scenes/image-preview.vue')
  const page = mount(Preview, {
    global: {
      stubs: {
        'movable-area': { template: '<div><slot /></div>' },
        'movable-view': { template: '<div><slot /></div>' }
      }
    }
  })
  ports.load?.({ id: 'card' })
  await flushPromises()
  const image = page.get('.zoom-image')
  expect(image.attributes('scale-max')).toBe('2')
  expect(image.attributes('animation')).toBe('false')
  await image.trigger('scale', { detail: { scale: 1.376 } })
  expect(image.attributes('scale-value')).toBe('1')
  expect(page.text()).toContain('138%')
  await image.trigger('scale', { detail: { scale: 2.2 } })
  expect(page.text()).toContain('200%')
  expect(page.get('[aria-label="放大原图"]').attributes('disabled')).toBeDefined()
  await page.get('.reset-image').trigger('click')
  expect(image.attributes('scale-value')).toBe('1')
  page.unmount()
})
