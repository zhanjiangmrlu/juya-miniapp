// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import { createFeedbackDraft } from '@/composables/use-feedback-draft'
import FeedbackComposer from '@/features/feedback/components/feedback-composer.vue'

it('shows per-image failure controls and Unicode count while unresolved submission locks replacement edits', async () => {
  const draft = createFeedbackDraft({
    owner: 'owner',
    action: 'feedback:create',
    source: { source: 'profile' },
    key: () => 'key',
    session: { userId: () => 'owner', request: vi.fn() },
    operations: { pending: () => false } as never
  })
  const wrapper = mount(FeedbackComposer, { props: { draft } })
  await wrapper.find('textarea').setValue('😀')
  expect(wrapper.text()).toContain('1 / 500')
  draft.images.value = [
    { key: 'one', path: '/one', status: 'error', error: '无法解码', image: null }
  ]
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toContain('无法解码')
  expect(wrapper.text()).toContain('重试上传')
  draft.unknown.value = true
  await wrapper.vm.$nextTick()
  expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('查询提交结果')
})

it('enables explicit refill only after a receipt miss and labels submission as the original operation', async () => {
  const draft = createFeedbackDraft({
    owner: 'owner',
    action: 'feedback:create',
    source: { source: 'profile' },
    key: () => 'key',
    session: { userId: () => 'owner', request: vi.fn() },
    operations: { pending: () => true } as never
  })
  draft.unknown.value = true
  draft.refill.value = true
  const wrapper = mount(FeedbackComposer, { props: { draft } })
  expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
  await wrapper.get('textarea').setValue('重新填写')
  expect(draft.text.value).toBe('重新填写')
  expect(wrapper.text()).toContain('以原操作标识确认提交')
})
