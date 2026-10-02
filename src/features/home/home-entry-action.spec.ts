// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HomeEntryPage from './components/home-entry-page.vue'
const task = vi.hoisted(() => ({ start: vi.fn() }))
vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn() }))
vi.mock('@/features/home/use-home-page', async () => {
  const { ref } = await import('vue')
  return {
    useHomePage: () => ({
      home: {
        error: false,
        view: {
          todayTask: {
            buttonLabel: '开始翻卡',
            title: '收藏翻卡',
            description: '不限张数',
            url: '/pages/favorites/review-front?cardIds=real'
          }
        }
      },
      load: vi.fn(),
      openScene: vi.fn(),
      startTask: task.start,
      taskScene: ref(undefined)
    })
  }
})
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => ({}) }))
beforeEach(() => {
  setActivePinia(createPinia())
  task.start.mockReset()
})
describe('今日任务步骤', () => {
  it('收藏任务无场景摘要时，当前任务行仍启动服务端翻卡任务', async () => {
    const wrapper = mount(HomeEntryPage, {
      props: { mode: 'today' },
      global: {
        stubs: {
          EntryPageShell: { template: '<div><slot /></div>' },
          LearningPageHeading: true,
          EntrySummary: true,
          NetworkReconnectDialog: true
        }
      }
    })
    await wrapper.find('.step-card').trigger('click')
    expect(task.start).toHaveBeenCalledOnce()
    expect(wrapper.findAll('.step-card')[1].attributes('disabled')).toBeDefined()
  })
})
