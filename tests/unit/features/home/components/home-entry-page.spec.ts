// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import HomeEntryPage from '@/features/home/components/home-entry-page.vue'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'

vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn(), onHide: vi.fn(), onUnload: vi.fn() }))
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => ({}) }))
vi.mock('@/services/startup', () => ({ ensureSession: async () => false }))
beforeEach(() => setActivePinia(createPinia()))

describe('首页任务摘要响应更新', () => {
  it('进度跨过 50% 时更新说明，权限待确认时回退任务文案', async () => {
    const home = useHomeStore(),
      learning = useLearningStore()
    home.data = {
      checkins: { current_streak: 0, longest_streak: 0, total_days: 0 },
      greeting: '',
      today_task: { kind: 'CONTINUE_SCENE', target_id: 'one', card_ids: [] },
      unread_message_count: 0
    }
    const item = {
      access: 'OPEN' as const,
      scene_id: 'one',
      chinese_title: '问路',
      title: 'Directions',
      series: '日常',
      tags: [],
      progress: 49,
      trial_sentence: 'Where is it?'
    }
    learning.catalog = { authorization_pending: false, items: [item] }
    const wrapper = mount(HomeEntryPage, {
      props: { mode: 'today', embedded: true },
      global: {
        stubs: { EntryPageShell: { template: '<div><slot /></div>' }, SceneListSection: true }
      }
    })
    expect(wrapper.get('.summary-value').text()).toBe('49%')
    expect(wrapper.get('.summary-copy').text()).toBe('接着上次的位置继续学习')
    learning.catalog = { authorization_pending: false, items: [{ ...item, progress: 50 }] }
    await nextTick()
    expect(wrapper.get('.summary-copy').text()).toBe('已完成前半段对话')
    learning.catalog = { authorization_pending: true, items: [item] }
    await nextTick()
    expect(wrapper.get('.summary-value').text()).toBe('继续今日任务')
    expect(wrapper.get('.summary-copy').text()).toBe('从上次停下的位置继续阅读。')
    await wrapper.setProps({ mode: 'first' })
    expect(wrapper.get('.summary-value').text()).toBe('从真实场景开始练习')
    expect(wrapper.get('.summary-copy').text()).toBe('选择一个开放场景，开始生活英语练习。')
    learning.catalog = { authorization_pending: false, items: [item] }
    await nextTick()
    expect(wrapper.get('.summary-value').text()).toBe('Where is it?')
    expect(wrapper.get('.summary-copy').text()).toBe('从「问路」开始，让英语用在生活里。')
    wrapper.unmount()
  })
})
