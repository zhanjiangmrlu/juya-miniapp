// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneVocabulary from '@/features/learning/components/scene-vocabulary.vue'

import type { AudioState } from '@/shared/types/audio'

const state: AudioState = {
  status: 'paused',
  position: 8,
  duration: 35,
  error: '',
  rate: 1,
  rateError: '',
  wordId: null,
  wordStatus: 'idle',
  wordError: ''
}

it('offers all five rates inline, closes after choosing, and never emits a play action', async () => {
  const page = mount(SceneAudioPlayer, { props: { state }, global: { stubs: { slider: true } } })
  await page.get('[data-action="toggle-rate"]').trigger('click')
  expect(page.findAll('[data-rate]').map((item) => item.text())).toEqual([
    '1×',
    '1.25×',
    '1.5×',
    '1.75×',
    '2×'
  ])
  await page.get('[data-rate="1.75"]').trigger('click')
  expect(page.emitted('rate')).toEqual([[1.75]])
  expect(page.emitted('toggle')).toBeUndefined()
  expect(page.find('[data-rate]').exists()).toBe(false)
  await page.setProps({ state: { ...state, rate: 1.75 } })
  expect(page.get('[data-action="toggle-rate"]').text()).toBe('1.75× 倍速')
  expect(page.text()).toContain('0:08 / 0:35')
  page.unmount()
})

it('hides meaning and phonetic independently while keeping English, full source and voice controls', async () => {
  const page = mount(SceneVocabulary, {
    props: {
      state,
      dialogue: [
        { id: 'line', speaker: 'A', english: 'Our drama club needs a play.', chinese: '需要剧本' }
      ],
      vocabulary: [
        {
          id: 'one',
          english: 'drama',
          pronunciation_text: '',
          pronunciation_issue: false,
          meaning: '',
          phonetic: '',
          source: { line_id: 'line', start: 4, end: 9, quote: 'drama' }
        },
        {
          id: 'two',
          english: 'club',
          meaning: '社团',
          phonetic: '',
          pronunciation_text: '',
          pronunciation_issue: false
        },
        {
          id: 'three',
          english: 'play',
          meaning: '',
          phonetic: '/pleɪ/',
          pronunciation_text: '',
          pronunciation_issue: false
        }
      ]
    }
  })
  const words = page.findAll('.word')
  expect(words[0]!.find('.meaning').exists()).toBe(false)
  expect(words[0]!.find('.phonetic').exists()).toBe(false)
  expect(words[0]!.text()).toContain('Our drama club needs a play.')
  expect(words[1]!.get('.meaning').text()).toBe('社团')
  expect(words[1]!.find('.phonetic').exists()).toBe(false)
  expect(words[2]!.find('.meaning').exists()).toBe(false)
  expect(words[2]!.get('.phonetic').text()).toBe('/pleɪ/')
  await words[0]!.get('.voice-button').trigger('click')
  expect(page.emitted('play')).toEqual([['one']])
  page.unmount()
})
