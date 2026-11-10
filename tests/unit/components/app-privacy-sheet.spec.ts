// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({ fail: false }))
vi.hoisted(() => {
  vi.stubGlobal('uni', {
    getStorageSync: () => undefined,
    request: (options: { fail: () => void; success: (result: unknown) => void }) => {
      if (ports.fail) options.fail()
      else
        options.success({
          statusCode: 200,
          data: { mode: 'legacy', server_now: '', documents: [] }
        })
    }
  })
})
import Component from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
import { analytics } from '@/services/analytics'
import { session } from '@/services/api'
import { privacy } from '@/services/privacy'
afterEach(() => {
  vi.restoreAllMocks()
  privacy.reset()
})
beforeEach(() => {
  ports.fail = false
})
it('shows independent statistics control without granting permission in legacy mode', async () => {
  const w = mount(Component, {
    global: { stubs: { 'scroll-view': { template: '<div><slot /></div>' } } }
  })
  expect(w.text()).toContain('不收集手机号和微信号')
  expect(w.get('button.statistics-switch').attributes('disabled')).toBeDefined()
  expect(w.text()).toContain('当前未开启')
  await w.get('.primary').trigger('click')
  expect(w.emitted('close')).toHaveLength(1)
})

it('keeps statistics off without presenting passive loading failures as action errors', async () => {
  ports.fail = true
  const w = mount(Component, {
    global: { stubs: { 'scroll-view': { template: '<div><slot /></div>' } } }
  })
  await flushPromises()
  expect(w.get('button.statistics-switch').attributes('disabled')).toBeDefined()
  expect(w.find('[role="alert"]').exists()).toBe(false)
})

it('allows immediate local withdrawal when existing enabled statistics cannot refresh offline', async () => {
  ports.fail = true
  vi.spyOn(session, 'userId').mockReturnValue('learner-1')
  vi.spyOn(privacy, 'currentOwner').mockReturnValue('learner-1')
  vi.spyOn(analytics, 'running', 'get').mockReturnValue(true)
  privacy.state.value = {
    agreements: { current: true },
    analytics: {
      enabled: true,
      revision: 2,
      scope_version: 'v1',
      updated_at: null,
      collecting: null
    }
  }
  const choose = vi.spyOn(privacy, 'choose').mockImplementation(async () => {
    privacy.state.value!.analytics.enabled = false
    throw new Error('offline')
  })
  const w = mount(Component, {
    global: { stubs: { 'scroll-view': { template: '<div><slot /></div>' } } }
  })
  await flushPromises()
  expect(w.text()).toContain('当前已开启')
  expect(w.get('button.statistics-switch').attributes('disabled')).toBeUndefined()
  await w.get('button.statistics-switch').trigger('click')
  expect(choose).toHaveBeenCalledWith(false)
  expect(privacy.state.value?.analytics.enabled).toBe(false)
})
