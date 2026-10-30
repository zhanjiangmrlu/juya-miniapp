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
  await page.setProps({ ended: true })
  expect(anchor.get('text').attributes('style')).toContain('#e4efd6')
  await anchor.trigger('click')
  expect(page.emitted('lookup')?.[0]?.[0]).toMatchObject({ text: 'A', start: 2, end: 3 })
  expect(page.text()).toContain('🌱 A day in life.')
  page.unmount()
})
