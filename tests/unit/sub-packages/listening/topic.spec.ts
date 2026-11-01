// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: null as null | ((query: { id: string }) => void),
  show: null as null | (() => void),
  request: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onReachBottom: vi.fn(),
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  }
}))
vi.mock('@/services/api', () => ({
  onSessionExpired: () => () => undefined,
  session: { request: ports.request, userId: () => 'owner' }
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
import Topic from '@/sub-packages/listening/topic.vue'
beforeEach(() => {
  vi.stubGlobal('uni', { redirectTo: vi.fn() })
  ports.request
    .mockReset()
    .mockResolvedValue({ items: [{ id: 'old-topic', category_id: 'real-category' }] })
})
it('maps an old topic identity to its server category and redirects directly to category articles', async () => {
  const page = shallowMount(Topic, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  ports.load?.({ id: 'old-topic' })
  ports.show?.()
  await flushPromises()
  expect(ports.request).toHaveBeenCalledWith('/api/mini/v1/listening/topics')
  expect(uni.redirectTo).toHaveBeenCalledWith({
    url: '/sub-packages/listening/index?category_id=real-category'
  })
  page.unmount()
})
it('does not guess a category if historical topic lookup fails', async () => {
  ports.request.mockRejectedValueOnce(new Error('offline'))
  const page = shallowMount(Topic, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  ports.load?.({ id: 'old-topic' })
  ports.show?.()
  await flushPromises()
  expect(uni.redirectTo).not.toHaveBeenCalled()
  expect(page.getComponent({ name: 'AppState' }).props('error')).toBe('offline')
  page.unmount()
})
