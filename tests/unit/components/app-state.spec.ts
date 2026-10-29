// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import AppState from '@/components/app-state/app-state.vue'
it('provides an explicit empty-state action while preserving the slot', async () => {
  const page = mount(AppState, {
    props: { empty: true, actionLabel: '查看全部主题', icon: '/static/design/heart.svg' },
    slots: { default: '保留旧入口' }
  })
  expect(page.get('.empty-icon').attributes('src')).toBe('/static/design/heart.svg')
  expect(page.text()).toContain('保留旧入口')
  await page.get('[data-action="state-action"]').trigger('click')
  expect(page.emitted('action')).toEqual([[]])
})
it('centers a failed listening request with a retry entry without treating it as empty', async () => {
  const page = mount(AppState, {
    props: { error: '请求超时', centeredError: true, title: '加载失败' }
  })
  expect(page.get('.empty-title').text()).toBe('加载失败')
  expect(page.text()).toContain('请求超时')
  await page.get('.state-retry').trigger('click')
  expect(page.emitted('retry')).toEqual([[]])
})
