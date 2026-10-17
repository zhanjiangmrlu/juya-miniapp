// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'

afterEach(() => vi.unstubAllGlobals())
it('keeps two primary destinations and switches registered tabs without adding a page stack', async () => {
  const switchTab = vi.fn()
  vi.stubGlobal('uni', { switchTab })
  const wrapper = mount(AppBottomTabs, { props: { active: 'learning' } })
  expect(wrapper.findAll('button')).toHaveLength(2)
  expect(wrapper.get('button.active').text()).toBe('学习')
  await wrapper.findAll('button')[1]!.trigger('click')
  expect(switchTab).toHaveBeenLastCalledWith({ url: '/pages/favorites/index' })
  await wrapper.setProps({ active: 'favorites' })
  expect(wrapper.get('button.active').text()).toBe('收藏')
  await wrapper.findAll('button')[0]!.trigger('click')
  expect(switchTab).toHaveBeenLastCalledWith({ url: '/pages/learning/index' })
  wrapper.unmount()
})
