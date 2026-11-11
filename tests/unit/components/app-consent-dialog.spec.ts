// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import Dialog from '@/components/app-consent-dialog/app-consent-dialog.vue'
it('offers independent login choices and allows browsing without consent', async () => {
  const w = mount(Dialog, { props: { first: true, confirmed: false, busy: false, error: '' } })
  await w.get('.primary').trigger('click')
  expect(w.emitted('login')?.[0]).toEqual([true])
  await w.get('.secondary').trigger('click')
  expect(w.emitted('login')?.[1]).toEqual([false])
  await w.get('.browse').trigger('click')
  expect(w.emitted('close')).toHaveLength(1)
  expect(w.text()).toContain('用户协议与隐私保护')
})
it('blocks duplicate login while pending and keeps failure retry in place', async () => {
  const w = mount(Dialog, { props: { first: false, confirmed: true, busy: true, error: '' } })
  expect(w.get('.primary').attributes('disabled')).toBeDefined()
  expect(w.text()).toContain('登录中')
  await w.setProps({ busy: false, error: '登录暂未成功，请重试' })
  expect(w.text()).toContain('登录暂未成功')
  expect(w.get('.secondary').text()).toBe('仅登录，不允许统计')
})

it('explains the exact favorite action and asks for another click after login', () => {
  const w = mount(Dialog, {
    props: { first: false, confirmed: false, busy: false, error: '', action: 'favorite_listening' }
  })
  expect(w.get('.title').text()).toBe('登录后可收藏这篇听读')
  expect(w.get('.foot').text()).toBe('登录成功后，请再次点击收藏')
})

it('settings statistics login does not promise to turn collection on', async () => {
  const w = mount(Dialog, {
    props: { first: false, confirmed: true, busy: false, error: '', action: 'statistics' }
  })
  expect(w.get('.primary').text()).toBe('登录后再选择统计')
  expect(w.text()).toContain('真实统计未运行')
})

it.each([
  { first: true, confirmed: false, action: 'account' as const, primary: '同意并登录，允许统计' },
  { first: false, confirmed: true, action: 'account' as const, primary: '登录并允许统计' },
  {
    first: false,
    confirmed: false,
    action: 'favorite_listening' as const,
    primary: '同意并登录，允许统计'
  }
])(
  'describes permission without promising a running SDK: %o',
  async ({ first, confirmed, action, primary }) => {
    const view = mount(Dialog, { props: { first, confirmed, action, busy: false, error: '' } })
    expect(view.get('.primary').text()).toBe(primary)
    expect(view.text()).toContain('本版真实统计未运行')
    expect(view.findAll('button').some((button) => button.text().includes('开启统计'))).toBe(false)
    await view.get('.primary').trigger('click')
    await view.get('.secondary').trigger('click')
    expect(view.emitted('login')).toEqual([[true], [false]])
    view.unmount()
  }
)
