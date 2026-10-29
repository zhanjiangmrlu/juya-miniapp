// @vitest-environment happy-dom
import { config, mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import SceneDictionary from '@/features/learning/components/scene-dictionary.vue'

config.global.stubs['scroll-view'] = { template: '<div data-scroll><slot /></div>' }

const selection = {
  cardId: 'card',
  version_id: 'v1',
  word: 'went',
  line_id: 'line-1',
  start: 0,
  end: 4
}
const result = {
  word: 'went',
  lemma: 'go',
  phonetic: '',
  source: 'dictionary' as const,
  definitions: [{ part_of_speech: 'v.', meaning: '去的过去式' }],
  speech_text: 'went',
  provider: 'fixture'
}

it('shows original word, a separate trusted lemma and source, hides missing IPA, and never auto-emits speech', async () => {
  const page = mount(SceneDictionary, {
    props: { selection, result, busy: false, error: '', voiceStatus: 'idle', voiceError: '' }
  })
  expect(page.get('.dictionary-word').text()).toBe('went')
  expect(page.text()).toContain('原形 go')
  expect(page.text()).toContain('词典释义')
  expect(page.find('.dictionary-phonetic').exists()).toBe(false)
  expect(page.find('[data-scroll]').exists()).toBe(true)
  expect(page.emitted('play')).toBeUndefined()
  await page.get('.dictionary-voice').trigger('click')
  expect(page.emitted('play')).toEqual([[]])
  await page.get('.dictionary-veil').trigger('click')
  expect(page.emitted('close')).toEqual([[]])
  page.unmount()
})

it('keeps loading, missing and failed query states distinct without fake definitions', async () => {
  const page = mount(SceneDictionary, {
    props: { selection, result: null, busy: true, error: '', voiceStatus: 'idle', voiceError: '' }
  })
  expect(page.text()).toContain('正在查询')
  await page.setProps({ busy: false, error: '词典服务暂未配置' })
  expect(page.text()).toContain('词典服务暂未配置')
  expect(page.text()).not.toContain('暂未找到')
  await page.get('.dictionary-retry').trigger('click')
  expect(page.emitted('retry')).toEqual([[]])
  await page.setProps({ error: '', result: { ...result, source: 'missing', definitions: [] } })
  expect(page.text()).toContain('暂未找到这个单词的释义')
  expect(page.find('.dictionary-voice').exists()).toBe(false)
  expect(page.find('.dictionary-definition').exists()).toBe(false)
  page.unmount()
})

it('shows the real source sentence and keeps pronunciation beside the word with explicit retry', async () => {
  const page = mount(SceneDictionary, {
    props: {
      selection,
      result,
      busy: false,
      error: '',
      voiceStatus: 'error',
      voiceError: '发音暂不可用',
      sourceSentence: 'She went home.'
    }
  })
  expect(page.get('.dictionary-context').text()).toContain('She went home.')
  expect(page.get('.dictionary-word-row').find('.dictionary-voice').exists()).toBe(true)
  await page.get('.dictionary-voice').trigger('click')
  expect(page.emitted('play')).toEqual([[]])
})
