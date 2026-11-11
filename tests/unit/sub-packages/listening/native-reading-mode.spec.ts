// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import ListeningBody from '@/sub-packages/listening/components/listening-body.vue'
import SceneDialogue from '@/sub-packages/scenes/components/scene-dialogue.vue'

import type { ListeningArticle } from '@/shared/types/listening'

/** 提供包含真实权限和播放时间轴的完整听读数据 */
const readingArticle = (): ListeningArticle => ({
  id: 'a1',
  content_type: 'listening',
  topic_id: null,
  category_id: 'c1',
  category_name: '日常',
  category_order: 0,
  title_zh: '一天',
  title_en: 'A day',
  tags: [],
  word_count: 2,
  version_id: 'v1',
  available: true,
  thumbnail_url: null,
  state: null,
  progress: null,
  queue_token: null,
  audio_duration: 1,
  access: {
    can_learn: true,
    can_lookup: false,
    is_free: true,
    reason: null,
    server_now: '2026-11-11T00:00:00Z',
    expires_at: null,
    version: 'free-only'
  },
  payload: {
    title_zh: '一天',
    title_en: 'A day',
    translation_zh: '一天。',
    body_en: 'A day.',
    expressions: [{ english: 'A day', chinese: '一天', example: '' }],
    vocabulary: []
  },
  timeline: {
    state: 'ready',
    words: [{ start: 0, end: 1, start_ms: 0, end_ms: 1000, sentence_id: '0' }]
  }
})

it('preserves native selectable scene text and static colors without emitting internal lookup', async () => {
  const page = mount(SceneDialogue, {
    props: {
      dialogue: [{ id: 'one', speaker: 'A', english: 'Try mobile today.', chinese: '今天试试' }],
      vocabulary: [
        {
          id: 'w',
          english: 'mobile',
          meaning: '移动的',
          phonetic: '',
          pronunciation_text: 'mobile',
          pronunciation_issue: false,
          source: { line_id: 'one', start: 4, end: 10, quote: 'mobile' }
        }
      ]
    }
  })
  const english = page.get('.english')
  expect(english.text()).toBe('Try mobile today.')
  expect(english.find('text[selectable]').exists()).toBe(true)
  expect(english.find('[role="button"]').exists()).toBe(false)
  await english.get('.highlight').trigger('click')
  expect(page.emitted('lookup')).toBeUndefined()
  page.unmount()
})

it('keeps static expression colors inside their exact ranges within hyphenated words', () => {
  const article = readingArticle()
  article.payload.body_en = 'well-known check-in.'
  article.payload.expressions = [
    { english: 'well', chinese: '', example: '' },
    { english: 'in', chinese: '', example: '' }
  ]
  article.timeline = { state: 'missing', words: [] }
  const page = mount(ListeningBody, {
    props: { article, milliseconds: 500, duration: 1, ended: false }
  })
  const green = page
    .findAll('text[style]')
    .filter((node) => node.attributes('style')?.includes('#e4efd6'))
  const blue = page
    .findAll('text[style]')
    .filter((node) => node.attributes('style')?.includes('#e2edf2'))
  expect(green.map((node) => node.text()).join('')).toBe('well')
  expect(blue.map((node) => node.text()).join('')).toBe('in')
  expect(page.text()).toBe('well-known check-in.')
  page.unmount()
})

it('keeps listening static phrase emphasis unchanged as audio advances and never emits lookup', async () => {
  const article = readingArticle()
  const page = mount(ListeningBody, {
    props: { article, milliseconds: 100, duration: 1, ended: false }
  })
  const before = page.get('#reading-word-0').html()
  expect(before).toContain('#e4efd6')
  expect(before).toContain('font-weight: 700')
  expect(before).not.toContain('rgba(220, 236, 201')
  await page.setProps({ milliseconds: 800 })
  expect(page.get('#reading-word-0').html()).toBe(before)
  await page.get('#reading-word-0').trigger('click')
  expect(page.emitted('lookup')).toBeUndefined()
  expect(page.text()).toBe('A day.')
  expect(page.find('text[selectable]').exists()).toBe(true)
  page.unmount()
})
