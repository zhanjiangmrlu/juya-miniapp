// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'

afterEach(() => vi.unstubAllGlobals())
it('keeps three primary destinations and switches registered tabs without adding a page stack', async () => {
  const switchTab = vi.fn()
  vi.stubGlobal('uni', { switchTab })
  const wrapper = mount(AppBottomTabs, { props: { active: 'home' } })
  expect(wrapper.findAll('button')).toHaveLength(3)
  expect(wrapper.get('button.active').text()).toBe('首页')
  await wrapper.findAll('button')[1]!.trigger('click')
  expect(switchTab).toHaveBeenLastCalledWith({ url: '/pages/records/index' })
  await wrapper.setProps({ active: 'records' })
  expect(wrapper.get('button.active').text()).toBe('学习记录')
  await wrapper.findAll('button')[0]!.trigger('click')
  expect(switchTab).toHaveBeenLastCalledWith({ url: '/pages/home/index' })
  wrapper.unmount()
})
