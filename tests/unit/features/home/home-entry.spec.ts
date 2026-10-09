// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HomePageView from '@/features/home/components/home-page-view.vue'
import TodayTaskCard from '@/features/home/components/today-task-card.vue'
vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn(), onHide: vi.fn(), onUnload: vi.fn() }))
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => ({}) }))
vi.mock('@/services/startup', () => ({ ensureSession: async () => false }))
beforeEach(() => setActivePinia(createPinia()))
describe('首页入口补齐', () => {
  it('首次进入状态使用M02外观，而非普通进度仪表盘', () => {
    const wrapper = mount(HomePageView, {
      props: { mode: 'first' },
      global: {
        stubs: {
          HomeEntryPage: { template: '<div class="first-entry" />' },
          HomeDashboard: true,
          HomeNavigation: true,
          TabPageLayout: { template: '<div><slot /></div>' },
          NetworkReconnectDialog: true
        }
      }
    })
    expect(wrapper.find('.first-entry').exists()).toBe(true)
    expect(wrapper.find('home-dashboard-stub').exists()).toBe(false)
  })
  it('场景缺少安全封面时不按咖啡店名称写死本地图片', () => {
    const wrapper = mount(TodayTaskCard, {
      props: {
        scene: {
          accessLabel: '开放学习场景',
          canOpen: true,
          chineseTitle: '在咖啡店',
          description: '',
          entryUrl: '/sub-packages/scene/detail?sceneId=server',
          progress: 68,
          sceneId: 'server',
          series: '后台系列',
          title: 'At the Coffee Shop'
        },
        task: {
          buttonLabel: '继续学习',
          description: '',
          eyebrow: '继续上次进度',
          title: '场景',
          url: '/sub-packages/scene/dialogue?sceneId=server'
        }
      }
    })
    expect(wrapper.find('image').exists()).toBe(false)
    expect(wrapper.find('.image-placeholder').text()).toBe('后台系列')
  })
})
