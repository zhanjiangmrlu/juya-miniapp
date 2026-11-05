// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import { AudioStatus } from '@/shared/enums/audio'
import ListeningVocabulary from '@/sub-packages/listening/components/listening-vocabulary.vue'

const audio = {
  rate: 1 as const,
  rateError: '',
  status: AudioStatus.PAUSED,
  position: 0,
  duration: 20,
  error: '',
  wordId: null,
  wordStatus: AudioStatus.IDLE,
  wordError: ''
}
const words = [
  {
    source_hint: '',
    id: 'room-1',
    english: 'room',
    phonetic: '/ruːm/',
    meaning: '房间',
    source: {
      start: 3,
      end: 20,
      quote: 'Walk in the room.',
      word_start: 15,
      word_end: 19,
      word: 'room',
      confirmed: true
    }
  },
  {
    source_hint: '',
    id: 'room-2',
    english: 'room',
    phonetic: '',
    meaning: '余地',
    source: {
      start: 21,
      end: 31,
      quote: 'Make room.',
      word_start: 26,
      word_end: 30,
      word: 'room',
      confirmed: true
    }
  }
]
it('renders same-spelling meanings independently with exact source sentences and emits stable word identities', async () => {
  const page = mount(ListeningVocabulary, {
    props: { words, body: '😀.\nWalk in the room.\nMake room.', audio }
  })
  expect(page.findAll('.vocabulary-row')).toHaveLength(2)
  expect(page.findAll('.word-phonetic')).toHaveLength(1)
  expect(page.findAll('.word-sentence').map((item) => item.text())).toEqual([
    'Walk in the room.',
    'Make room.'
  ])
  expect(page.findAll('.word-source').map((item) => item.text())).toEqual([
    '正文原句 · 第2段',
    '正文原句 · 第3段'
  ])
  await page.findAll('.word-speaker')[1]!.trigger('click')
  expect(page.emitted('play')).toEqual([['room-2']])
  await page.setProps({
    audio: {
      ...audio,
      wordId: 'vocabulary:room-2',
      wordStatus: AudioStatus.ERROR,
      wordError: '发音暂不可用，点击重试'
    }
  })
  expect(page.findAll('.word-retry')).toHaveLength(1)
  await page.get('.word-retry').trigger('click')
  expect(page.emitted('play')).toEqual([['room-2'], ['room-2']])
  await page.setProps({ words: [] })
  expect(page.find('.vocabulary').exists()).toBe(false)
  page.unmount()
})
