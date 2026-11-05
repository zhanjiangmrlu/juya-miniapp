// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ wait: undefined as undefined | (() => Promise<void>) }))
vi.mock('vue', async (original) => {
  const vue = await original<typeof import('vue')>()
  return {
    ...vue,
    getCurrentInstance: () => {
      const instance = vue.getCurrentInstance()
      return native.wait && instance ? { ...instance, proxy: { $nextTick: native.wait } } : instance
    }
  }
})
beforeEach(() => {
  native.wait = undefined
  vi.stubGlobal('requestAnimationFrame', undefined)
})

afterEach(() => vi.unstubAllGlobals())

import ListeningImageViewer from '@/sub-packages/listening/components/listening-image-viewer.vue'
it('connects zoom buttons to the native scale, remembers pinch and resets both zoom and pan', async () => {
  const page = mount(ListeningImageViewer, {
    props: { image: '/real-image', error: '' },
    global: {
      stubs: {
        'movable-area': { template: '<div><slot /></div>' },
        'movable-view': { template: '<div><slot /></div>' }
      }
    }
  })
  expect(page.get('.image-area').attributes('scale-area')).toBeDefined()
  await page.get('[data-action="zoom-in"]').trigger('click')
  await flushPromises()
  expect(page.get('.image-pan').attributes('scale-value')).toBe('1.5')
  await page.get('.image-pan').trigger('scale', { detail: { scale: 2.5 } })
  expect(page.get('.image-pan').attributes('scale-value')).toBe('1.5')
  await page.get('.image-pan').trigger('touchend')
  expect(page.get('.image-pan').attributes('scale-value')).toBe('1.5')
  await page.get('[data-action="zoom-out"]').trigger('click')
  await flushPromises()
  expect(page.get('.image-pan').attributes('scale-value')).toBe('2')
  await page.get('.image-pan').trigger('change', { detail: { x: 30, y: 20 } })
  await page.get('[data-action="fit"]').trigger('click')
  await flushPromises()
  expect(page.get('.image-pan').attributes()).toMatchObject({ 'scale-value': '1', x: '0', y: '0' })
  await page.get('.image-close').trigger('click')
  await flushPromises()
  expect(page.emitted('close')).toEqual([[]])
  page.unmount()
})

it('reissues fit even when pinch and pan changed while the previous command was already fit', async () => {
  const page = mount(ListeningImageViewer, {
    props: { image: '/real-image', error: '' },
    global: {
      stubs: {
        'movable-area': { template: '<div><slot /></div>' },
        'movable-view': { template: '<div><slot /></div>' }
      }
    }
  })
  await page.get('.image-pan').trigger('scale', { detail: { scale: 3 } })
  await page.get('.image-pan').trigger('change', { detail: { x: 80, y: -40 } })
  await page.get('.image-pan').trigger('touchcancel')
  expect(page.get('.image-pan').attributes()).toMatchObject({ 'scale-value': '1', x: '0', y: '0' })
  const changes: string[] = []
  const observer = new MutationObserver(() =>
    changes.push(page.get('.image-pan').attributes('scale-value')!)
  )
  observer.observe(page.get('.image-pan').element, { attributes: true })
  await page.get('[data-action="fit"]').trigger('click')
  await flushPromises()
  await Promise.resolve()
  expect(changes).toContain('3')
  expect(page.get('.image-pan').attributes()).toMatchObject({ 'scale-value': '1', x: '0', y: '0' })
  observer.disconnect()
  page.unmount()
})

it('waits for the native render and never replays old pan coordinates while zooming', async () => {
  let finish: () => void = () => undefined
  native.wait = () =>
    new Promise<void>((resolve) => {
      finish = resolve
    })
  const page = mount(ListeningImageViewer, {
    props: { image: '/real-image', error: '' },
    global: {
      stubs: {
        'movable-area': { template: '<div><slot /></div>' },
        'movable-view': { template: '<div><slot /></div>' }
      }
    }
  })
  await page.get('.image-pan').trigger('change', { detail: { x: 80, y: 40 } })
  await page.get('.image-pan').trigger('scale', { detail: { scale: 3, x: 10, y: 5 } })
  await page.get('[data-action="zoom-out"]').trigger('click')
  await flushPromises()
  expect(page.get('.image-pan').attributes()).toMatchObject({ 'scale-value': '3', x: '0', y: '0' })
  finish()
  await flushPromises()
  expect(page.get('.image-pan').attributes()).toMatchObject({
    'scale-value': '2.5',
    x: '0',
    y: '0'
  })
  page.unmount()
})
