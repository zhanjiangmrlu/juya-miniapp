// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import ShareSummary from '@/features/share/components/share-summary.vue'

it('falls back from an unavailable OSS summary image and retries after the configured version changes', async () => {
  const page = mount(ShareSummary, {
    props: {
      image: 'https://assets.example/cover-v1.jpg',
      fallbackImage: '/static/local-small.jpg',
      description: '把英语用进生活里'
    }
  })
  expect(page.get('.summary-cover').attributes('src')).toBe('https://assets.example/cover-v1.jpg')
  await page.get('.summary-cover').trigger('error')
  expect(page.get('.summary-cover').attributes('src')).toBe('/static/local-small.jpg')
  await page.get('.summary-cover').trigger('error')
  expect(page.get('.summary-cover').attributes('src')).toBe('/static/local-small.jpg')
  await page.setProps({ image: 'https://assets.example/cover-v2.jpg' })
  expect(page.get('.summary-cover').attributes('src')).toBe('https://assets.example/cover-v2.jpg')
  page.unmount()
})

it('retains the existing public scene summary when no generic fallback is supplied', async () => {
  const page = mount(ShareSummary, { props: { image: '/original-scene-cover.png' } })
  await page.get('.summary-cover').trigger('error')
  expect(page.get('.summary-cover').attributes('src')).toBe('/original-scene-cover.png')
  expect(page.text()).toContain('在真实场景里学英语')
  page.unmount()
})
