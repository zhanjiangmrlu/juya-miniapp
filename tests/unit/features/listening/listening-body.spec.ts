// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import ListeningBody from '@/features/listening/components/listening-body.vue'

import type { ListeningArticle } from '@/shared/types/listening'
it('restores phrase color after active playback and preserves dictionary offsets', async () => {
  const article = {
    payload: {
      body_en: '🌱 A day in life.',
      expressions: [{ english: 'a day in life', chinese: '生活', example: 'A day.' }]
    },
    timeline: {
      state: 'ready',
      words: [{ start: 2, end: 3, start_ms: 0, end_ms: 1000, sentence_id: '0' }]
    }
  } as ListeningArticle
  const page = mount(ListeningBody, {
    props: { article, milliseconds: 500, duration: 1, ended: false }
  })
  const anchor = page.get('#reading-word-2')
  expect(anchor.get('text').attributes('style')).toContain('rgba(220, 236, 201')
  expect(anchor.get('text').attributes('style')).toContain('font-weight: 700')
  await page.setProps({ ended: true })
  expect(anchor.get('text').attributes('style')).toContain('#e4efd6')
  expect(anchor.get('text').attributes('style')).toContain('font-weight: 700')
  await anchor.trigger('click')
  expect(page.emitted('lookup')?.[0]?.[0]).toMatchObject({ text: 'A', start: 2, end: 3 })
  expect(page.text()).toContain('🌱 A day in life.')
  page.unmount()
})

it('bolds existing expression highlights when an article has no independent vocabulary', async () => {
  const body = 'I like the chicken sandwich combo. It comes with fries. For here or to go?'
  const content: Pick<ListeningArticle, 'payload' | 'timeline'> = {
    payload: {
      title_zh: '快餐店',
      title_en: 'At a Fast-Food Restaurant',
      body_en: body,
      translation_zh: '',
      vocabulary: [],
      expressions: [
        { english: 'the chicken sandwich combo', chinese: '', example: '' },
        { english: 'comes with', chinese: '', example: '' },
        { english: 'For here or to go?', chinese: '', example: '' }
      ]
    },
    timeline: { state: 'failed', words: [] }
  }
  const page = mount(ListeningBody, {
    props: { article: content as ListeningArticle, milliseconds: 11000, duration: 39, ended: false }
  })
  for (const [word, color] of [
    ['chicken', '#e4efd6'],
    ['comes', '#e2edf2'],
    ['For', '#f7e6d6']
  ] as const) {
    const start = Array.from(body.slice(0, body.indexOf(word))).length
    const anchor = page.get('#reading-word-' + start)
    expect(anchor.get('text').attributes('style')).toContain(color)
    expect(
      anchor.findAll('text').every((item) => item.attributes('style')?.includes('font-weight: 700'))
    ).toBe(true)
  }
  expect(page.get('#reading-word-0').get('text').attributes('style')).not.toContain('font-weight')
  expect(page.text()).toBe(body)
  await page.get('#reading-word-38').trigger('click')
  expect(page.emitted('lookup')?.[0]?.[0]).toMatchObject({ text: 'comes', start: 38, end: 43 })
  page.unmount()
})

it('restores bound vocabulary above phrase backgrounds after playback without moving lookup offsets', async () => {
  const article = {
    payload: {
      body_en: '🌱 He goes. She goes.',
      expressions: [{ english: 'He goes' }, { english: 'She goes' }],
      vocabulary: [
        {
          id: 'w',
          english: 'go',
          source: {
            start: 11,
            end: 20,
            quote: 'She goes.',
            word_start: 15,
            word_end: 19,
            word: 'goes',
            confirmed: true
          }
        }
      ]
    },
    timeline: {
      state: 'ready',
      words: [{ start: 15, end: 19, start_ms: 0, end_ms: 1000, sentence_id: '0' }]
    }
  } as ListeningArticle
  const page = mount(ListeningBody, {
    props: { article, milliseconds: 500, duration: 1, ended: true }
  })
  const word = page.get('#reading-word-15')
  expect(word.get('text').attributes('style')).toContain('#e4efd6')
  expect(
    word.findAll('text').every((item) => item.attributes('style')?.includes('font-weight: 700'))
  ).toBe(true)
  await page.setProps({ ended: false })
  expect(
    word.findAll('text').some((item) => item.attributes('style')?.includes('rgba(220, 236, 201'))
  ).toBe(true)
  expect(
    word.findAll('text').every((item) => item.attributes('style')?.includes('font-weight: 700'))
  ).toBe(true)
  await page.setProps({ ended: true })
  expect(word.get('text').attributes('style')).toContain('#e4efd6')
  await word.trigger('click')
  expect(page.emitted('lookup')?.[0]?.[0]).toMatchObject({ text: 'goes', start: 15, end: 19 })
  page.unmount()
})

it('renders fallback text without a duplicate timeline notice and keeps vocabulary colored and bold', async () => {
  const body = 'car police.'
  const content: Pick<ListeningArticle, 'payload' | 'timeline'> = {
    payload: {
      title_zh: '交通',
      title_en: 'Traffic',
      body_en: body,
      translation_zh: '汽车和警察',
      expressions: [],
      vocabulary: [
        {
          id: 'car',
          english: 'car',
          meaning: '汽车',
          phonetic: '',
          source_hint: '',
          source: {
            start: 0,
            end: 11,
            quote: body,
            word_start: 0,
            word_end: 3,
            word: 'car',
            confirmed: true
          }
        },
        {
          id: 'police',
          english: 'police',
          meaning: '警察',
          phonetic: '',
          source_hint: '',
          source: {
            start: 0,
            end: 11,
            quote: body,
            word_start: 4,
            word_end: 10,
            word: 'police',
            confirmed: true
          }
        }
      ]
    },
    timeline: { state: 'failed', words: [] }
  }
  const page = mount(ListeningBody, {
    props: { article: content as ListeningArticle, milliseconds: 0, duration: 39, ended: false }
  })
  expect(page.text()).toBe(body)
  const car = page.get('#reading-word-0'),
    police = page.get('#reading-word-4')
  expect(car.get('text').attributes('style')).toContain('#e4efd6')
  expect(police.get('text').attributes('style')).toContain('#e2edf2')
  for (const word of [car, police])
    expect(
      word.findAll('text').every((item) => item.attributes('style')?.includes('font-weight: 700'))
    ).toBe(true)
  await police.trigger('click')
  expect(page.emitted('lookup')?.[0]?.[0]).toMatchObject({ text: 'police', start: 4, end: 10 })
  page.unmount()
})
