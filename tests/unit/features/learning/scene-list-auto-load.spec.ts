// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  show: undefined as (() => void) | undefined,
  hide: undefined as (() => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => {
    lifecycle.show = callback
  },
  onHide: (callback: () => void) => {
    lifecycle.hide = callback
  }
}))
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'

const observers: Array<{ notify?: (entry: { intersectionRatio: number }) => void }> = []
beforeEach(() => {
  observers.length = 0
  vi.stubGlobal('uni', {
    createIntersectionObserver: () => {
      const state: (typeof observers)[number] = {}
      observers.push(state)
      const observer = {
        relativeToViewport: () => observer,
        observe: (_selector: string, callback: (entry: { intersectionRatio: number }) => void) => {
          state.notify = callback
        },
        disconnect: () => undefined
      }
      return observer
    }
  })
})
afterEach(() => vi.unstubAllGlobals())
const setup = (onMore = vi.fn()) =>
  mount(SceneListFooter, {
    props: { busy: false, error: '', hasMore: true, done: false, onMore }
  })

it('loads when the footer enters the screen even without a native page-bottom event', async () => {
  const footer = setup()
  await flushPromises()
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(footer.emitted('more')).toHaveLength(1)
  expect(footer.find('button').exists()).toBe(false)
  footer.unmount()
})

it('remeasures after each completed page, and does not auto-retry a failed next page', async () => {
  const footer = setup()
  await flushPromises()
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  await footer.setProps({ busy: true })
  await footer.setProps({ busy: false })
  await flushPromises()
  observers.at(-1)?.notify?.({ intersectionRatio: 0 })
  expect(footer.emitted('more')).toHaveLength(1)
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(footer.emitted('more')).toHaveLength(2)
  await footer.setProps({ error: 'offline' })
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(footer.emitted('more')).toHaveLength(2)
  await footer.get('button').trigger('click')
  expect(footer.emitted('more')).toHaveLength(3)
  footer.unmount()
})

it('waits for the initial refresh to finish, then fills a short screen automatically', async () => {
  const footer = setup()
  await footer.setProps({ refreshing: true })
  await flushPromises()
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(footer.emitted('more')).toBeUndefined()
  await footer.setProps({ refreshing: false })
  await flushPromises()
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(footer.emitted('more')).toHaveLength(1)
  footer.unmount()
})

it('rejects late visibility notifications while hidden, after completion, and after unmount', async () => {
  const more = vi.fn(),
    footer = setup(more)
  await flushPromises()
  const old = observers.at(-1)
  lifecycle.hide?.()
  old?.notify?.({ intersectionRatio: 1 })
  expect(more).not.toHaveBeenCalled()
  lifecycle.show?.()
  await flushPromises()
  old?.notify?.({ intersectionRatio: 1 })
  expect(more).not.toHaveBeenCalled()
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(more).toHaveBeenCalledTimes(1)
  await footer.setProps({ hasMore: false, done: true })
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(more).toHaveBeenCalledTimes(1)
  expect(footer.text()).toContain('已全部加载')
  footer.unmount()
  observers.at(-1)?.notify?.({ intersectionRatio: 1 })
  expect(more).toHaveBeenCalledTimes(1)
})
