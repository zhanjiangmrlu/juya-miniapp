// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
vi.hoisted(() => {
  vi.stubGlobal('uni', { getStorageSync: () => undefined, request: () => undefined })
})
import Component from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
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
