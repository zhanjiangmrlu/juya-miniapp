// @vitest-environment happy-dom
import { shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

vi.mock('@/services/navigation', () => ({ backTo: vi.fn() }))
vi.mock('@/services/api', () => ({
  onSessionExpired: () => () => undefined,
  session: { userId: () => 'owner' }
}))
vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn() }))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ profile: null }) }))
vi.mock('@/features/listening/listening-service', () => ({ getListeningHome: vi.fn() }))
import Home from '@/pages/home/index.vue'
it('shows the fixed IELTS introduction and three listening descriptions while opening the existing scene route', async () => {
  const navigateTo = vi.fn()
  vi.stubGlobal('uni', { navigateTo })
  const page = shallowMount(Home, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  expect(page.text()).toContain('雅思词汇')
  expect(page.text()).toContain('IELTS Vocabulary')
  expect(page.text()).toContain('积累约3,700个词汇。')
  expect(page.text()).toContain('English in Real Life：')
  expect(page.text()).toContain('涵盖10类日常英语内容。')
  expect(page.text()).toContain('IELTS Speaking B2–C1：')
  expect(page.text()).toContain('涵盖10类口语内容。')
  expect(page.text()).toContain('生活场景听读：')
  expect(page.text()).toContain('约覆盖1.5万—2万词汇。')
  await page.get('.scene-module').trigger('click')
  expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/learning/index' })
  page.unmount()
  vi.unstubAllGlobals()
})
