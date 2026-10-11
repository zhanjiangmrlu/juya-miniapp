// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import AudioFailed from '@/sub-packages/scene/audio-failed.vue'

const dependencies = vi.hoisted(() => ({ play: vi.fn(), navigate: vi.fn() }))
vi.mock('@dcloudio/uni-app', () => ({ onLoad: vi.fn(), onHide: vi.fn(), onUnload: vi.fn() }))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
vi.mock('@/features/scene/use-scene-page', () => ({
  useScenePage: () => ({
    audio: { snapshot: { status: 'FAILED' } },
    disposeAudio: vi.fn(),
    fullModel: ref({ title: 'Coffee', chineseTitle: '在咖啡店', audio: { target_id: 'whole' } }),
    initialize: vi.fn(),
    play: dependencies.play,
    scene: {
      dialogueEntries: [
        { entry_id: 's1', speaker: 'Ivy', text: 'A complete first sentence.' },
        { entry_id: 's2', speaker: 'Barista', text: 'A complete final sentence.' }
      ]
    },
    sceneId: ref('coffee')
  })
}))

describe('M15音频失败阅读降级', () => {
  it('全部正文在同一阅读卡，重试和跟读保留且无逐词入口', async () => {
    const wrapper = mount(AudioFailed, {
      global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
    })
    expect(wrapper.findAll('.failure-dialogue .sentence-row')).toHaveLength(2)
    expect(wrapper.get('.failure-dialogue').text()).toContain('A complete final sentence.')
    expect(wrapper.find('.clickable').exists()).toBe(false)
    await wrapper.findAll('.scene-action')[0].trigger('click')
    expect(dependencies.play).toHaveBeenCalledWith({ target_id: 'whole' })
    await wrapper.findAll('.scene-action')[1].trigger('click')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'navigateTo',
      url: '/sub-packages/scene/shadowing?sceneId=coffee'
    })
    wrapper.unmount()
  })
})
