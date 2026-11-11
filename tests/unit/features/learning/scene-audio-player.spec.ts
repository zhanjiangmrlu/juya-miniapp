// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'

import type { AudioState } from '@/shared/types/audio'

it('shows generic playback status when no synchronization hint is supplied', async () => {
  const state: AudioState = {
    status: 'paused',
    position: 2,
    duration: 8,
    rate: 1,
    rateError: '',
    error: '',
    wordId: '',
    wordStatus: 'idle',
    wordError: ''
  }
  const page = mount(SceneAudioPlayer, {
    props: { state, title: '全文音频', syncStatus: '' },
    global: { stubs: { slider: true } }
  })
  expect(page.get('.audio-status').text()).toBe('已暂停 · 点击继续播放')
  expect(page.text()).not.toMatch(/高亮|尾迹|跟随/)
  await page.setProps({ state: { ...state, status: 'playing' } })
  expect(page.get('.audio-status').text()).toBe('正在播放全文音频')
  expect(page.text()).not.toMatch(/高亮|尾迹|跟随/)
  await page.setProps({ syncStatus: '正在播放 · 逐字高亮跟随音频' })
  expect(page.get('.audio-status').text()).toBe('正在播放 · 逐字高亮跟随音频')
  page.unmount()
})
