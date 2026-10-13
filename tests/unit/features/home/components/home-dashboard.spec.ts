// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import HomeDashboard from '@/features/home/components/home-dashboard.vue'
import { presentHome } from '@/features/home/home-presenter'

beforeEach(() => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, screenHeight: 844 })
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('首页今日任务空状态', () => {
  it('真实首页返回空任务后，连接提示切换为暂无任务说明', async () => {
    const wrapper = mount(HomeDashboard, {
      props: { openSceneCount: null, view: presentHome(null, undefined) }
    })
    expect(wrapper.get('.task-card').text()).toContain('连接后获取今日任务')

    await wrapper.setProps({
      openSceneCount: 0,
      view: presentHome(
        {
          checkins: { current_streak: 0, longest_streak: 0, total_days: 0 },
          greeting: '',
          today_task: null,
          unread_message_count: 0
        },
        undefined
      )
    })

    const card = wrapper.get('.task-card')
    expect(card.text()).toContain('暂无可学习任务')
    expect(card.text()).toContain('学习页')
    expect(card.text()).not.toContain('连接后')
    expect(card.text()).not.toContain('身份建立')
    expect(card.find('button').exists()).toBe(false)
    wrapper.unmount()
  })
})
