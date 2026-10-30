// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import ListeningCompletion from '@/features/listening/components/listening-completion.vue'

it('lets the reader stay on the completed article in both next-article and topic-end branches', async () => {
  const page = mount(ListeningCompletion, {
    props: { next: { title_zh: '真实下一篇', title_en: 'Next', word_count: 123 }, ended: false }
  })
  expect(page.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
  expect(page.text()).toContain('真实下一篇')
  expect(page.get('[data-action="next"]').text()).toBe('继续学习下一篇')
  await page.get('[data-action="stay"]').trigger('click')
  expect(page.emitted('stay')).toEqual([[]])
  await page.get('[data-action="next"]').trigger('click')
  expect(page.emitted('next')).toEqual([[]])
  await page.setProps({ next: null, ended: true })
  expect(page.text()).toContain('本主题已学到最后一篇')
  await page.get('[data-action="topic"]').trigger('click')
  await page.get('[data-action="stay"]').trigger('click')
  expect(page.emitted('topic')).toEqual([[]])
  expect(page.emitted('stay')).toHaveLength(2)
  page.unmount()
})
