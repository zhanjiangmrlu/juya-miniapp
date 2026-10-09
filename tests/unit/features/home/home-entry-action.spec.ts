// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HomeEntryPage from '@/features/home/components/home-entry-page.vue'
import { useLearningStore } from '@/stores/learning'
const task = vi.hoisted(() => ({ start: vi.fn(), open: vi.fn(), shows: [] as (() => void)[] }))
vi.mock('@dcloudio/uni-app', () => ({
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onShow: (callback: () => void) => task.shows.push(callback)
}))
vi.mock('@/features/home/use-home-page', async () => {
  const { ref } = await import('vue')
  return {
    useHomePage: () => ({
      cancel: vi.fn(),
      canStartTask: ref(true),
      home: {
        error: false,
        view: {
          todayTask: {
            buttonLabel: '开始翻卡',
            title: '收藏翻卡',
            description: '不限张数',
            url: '/sub-packages/favorites/review-front?cardIds=real'
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
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ scene: { open: task.open } })
}))
beforeEach(() => {
  setActivePinia(createPinia())
  task.start.mockReset()
  task.open.mockReset()
  task.shows = []
})
describe('今日任务步骤', () => {
  it('只浏览首次首页时读取安全试学摘要，不登记开始学习', async () => {
    const summary = {
      access: 'OPEN' as const,
      scene_id: 'server',
      chinese_title: '真实场景',
      title: 'Real scene',
      series: '日常英语',
      tags: [],
      trial_sentence: 'A read-only trial sentence.'
    }
    useLearningStore().catalog.items = [summary]
    const wrapper = mount(HomeEntryPage, {
      props: { mode: 'first' },
      global: {
        stubs: {
          EntryPageShell: { template: '<div><slot /></div>' },
          LearningPageHeading: true,
          EntrySummary: true,
          NetworkReconnectDialog: true
        }
      }
    })
    task.shows.forEach((show) => show())
    await flushPromises()
    expect(task.open).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'EntrySummary' }).props('value')).toBe(
      'A read-only trial sentence.'
    )
  })
  it('动态嵌入首页时由父页负责onShow，不留下卸载子组件回调', () => {
    const wrapper = mount(HomeEntryPage, {
      props: { mode: 'first', embedded: true },
      global: {
        stubs: {
          EntryPageShell: { template: '<div><slot /></div>' },
          LearningPageHeading: true,
          EntrySummary: true,
          NetworkReconnectDialog: true
        }
      }
    })
    expect(task.shows).toHaveLength(0)
    wrapper.unmount()
  })
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
