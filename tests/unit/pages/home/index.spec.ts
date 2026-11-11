// @vitest-environment happy-dom
import { shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import { analytics } from '@/services/analytics'

vi.mock('@/services/navigation', () => ({ backTo: vi.fn() }))
vi.mock('@/services/api', () => ({
  onSessionExpired: () => () => undefined,
  session: { identity: () => 'owner', userId: () => 'owner' }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onShow: vi.fn()
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ profile: null }) }))
vi.mock('@/features/listening/listening-service', () => ({ getListeningHome: vi.fn() }))
import Home from '@/pages/home/index.vue'
it('shows the fixed IELTS introduction and three listening descriptions while opening the existing scene route', async () => {
  const navigateTo = vi.fn()
  vi.stubGlobal('uni', { navigateTo })
  const page = shallowMount(Home, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' },
        'scroll-view': { template: '<view><slot /></view>' }
      }
    }
  })
  expect(page.text()).toContain('雅思词汇')
  expect(page.text()).toContain('IELTS Vocabulary')
  expect(page.text()).toContain('246张场景卡，覆盖约3,600个核心词汇，累计9,840次词汇呈现。')
  expect(page.text()).toContain('看图文、听音频，在场景对话中反复巩固词汇。')
  expect(page.text()).toContain('配套246篇精读笔记，逐句翻译、解析搭配，帮你读懂句子、学会表达。')
  expect(page.text()).toContain('English in Real Life')
  expect(page.text()).toContain('涵盖10类日常英语内容。')
  expect(page.text()).toContain('IELTS Speaking B2–C1')
  expect(page.text()).toContain('涵盖10类口语内容。')
  expect(page.text()).toContain('生活场景听读')
  expect(page.text()).toContain('约覆盖1.5万—2万词汇。')
  await page.get('.scene-module').trigger('click')
  expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/learning/index' })
  page.unmount()
  vi.unstubAllGlobals()
})

it('uses the environment static host for its hashed home decoration', () => {
  const page = shallowMount(Home)
  const container = page.findComponent({ name: 'AppPage' })
  expect(container.props('backgroundImage')).toMatch(
    /^https:\/\/juya-test\.oss-cn-shenzhen\.aliyuncs\.com\/miniapp\/static\/listening\/home-watercolor-[a-f0-9]{12}@3x\.jpg$/
  )
  page.unmount()
})

it('records the chosen home entry once with a route-only destination', async () => {
  const track = vi.spyOn(analytics, 'track')
  vi.stubGlobal('uni', { navigateTo: vi.fn() })
  const page = shallowMount(Home, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' },
        'scroll-view': { template: '<view><slot /></view>' }
      }
    }
  })
  try {
    await page.get('.scene-module').trigger('click')
    expect(track).toHaveBeenCalledWith(
      'entry_click',
      expect.objectContaining({
        entry_source: 'home_learning',
        target_page: 'pages/learning/index'
      })
    )
  } finally {
    page.unmount()
    track.mockRestore()
    vi.unstubAllGlobals()
  }
})
