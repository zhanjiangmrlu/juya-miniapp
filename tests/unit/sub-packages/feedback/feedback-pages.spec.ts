// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { createFeedbackDraft } from '@/composables/use-feedback-draft'
import { ApiError } from '@/services/errors'
import { createOperationService } from '@/services/operation-service'

import type { FeedbackDetail } from '@/shared/types/feedback'
const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: Record<string, string>) => void),
  show: undefined as undefined | (() => void),
  request: vi.fn(),
  ensure: vi.fn(),
  acknowledge: vi.fn(),
  draft: undefined as unknown,
  redirect: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: typeof ports.load) => {
    ports.load = cb
  },
  onShow: (cb: typeof ports.show) => {
    ports.show = cb
  },
  onHide: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/composables/use-unsaved-guard', () => ({
  useUnsavedGuard: () => ({
    canEdit: ref(true),
    nativeShow: ref(false),
    open: ref(false),
    requestBack: vi.fn(),
    choose: vi.fn(),
    nativeBeforeLeave: vi.fn(),
    nativeAfterLeave: vi.fn()
  })
}))
vi.mock('@/services/api', () => ({
  session: { userId: () => 'owner', request: ports.request },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/feedback-service', () => ({
  feedbackDraft: () => ports.draft,
  feedbackInbox: { acknowledge: ports.acknowledge }
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: ports.ensure }) }))
import FeedbackCreate from '@/sub-packages/feedback/create.vue'
import FeedbackDetailPage from '@/sub-packages/feedback/detail.vue'

const original: FeedbackDetail = {
  id: 'feedback-1',
  user_id: 'owner',
  user_code: 'Juya001',
  category: 'content',
  status: 'resolved',
  summary: '原说明',
  source: 'scene',
  card_id: 'card-1',
  version_id: 'version-1',
  source_title: '安全场景摘要',
  source_title_en: 'Safe summary',
  source_available: false,
  source_unavailable_reason: 'deleted',
  created_at: '2026-10-22T02:00:00Z',
  updated_at: '2026-10-22T03:00:00Z',
  unread: true,
  latest_event_id: 2,
  events: [
    {
      id: 1,
      actor: 'user',
      text: '原说明',
      status: 'pending',
      images: [],
      created_at: '2026-10-22T02:00:00Z'
    },
    {
      id: 2,
      actor: 'admin',
      text: '原管理员回复',
      status: 'resolved',
      images: [],
      created_at: '2026-10-22T03:00:00Z'
    }
  ]
}
const globals = {
  stubs: {
    'page-container': { template: '<div><slot/></div>' },
    AppPage: { template: '<div><slot/></div>' },
    AppState: { props: ['error'], template: '<div role="alert">{{error}}</div>' },
    FeedbackComposer: false,
    FeedbackThread: false
  }
}
beforeEach(() => {
  ports.request.mockReset()
  ports.ensure.mockReset().mockResolvedValue(true)
  ports.acknowledge.mockReset().mockResolvedValue(undefined)
  ports.redirect.mockReset().mockImplementation(({ success }) => success())
  const rows = new Map<string, unknown>(),
    session = { userId: () => 'owner', request: ports.request }
  let key = 0
  const operations = createOperationService({
    session,
    key: () => `feedback-write-key-${++key}`,
    storage: {
      get: (k) => rows.get(k),
      set: (k, v) => {
        rows.set(k, v)
      },
      remove: (k) => {
        rows.delete(k)
      }
    }
  })
  ports.draft = createFeedbackDraft({
    session,
    operations,
    owner: 'owner',
    action: 'feedback:reply:feedback-1',
    feedbackId: 'feedback-1',
    key: () => `image-key-${++key}`
  })
  vi.stubGlobal('uni', { redirectTo: ports.redirect, navigateTo: vi.fn(), previewImage: vi.fn() })
})
it('renders the server snapshot before acknowledgement and permits repeated supplements after resolved status', async () => {
  let current = structuredClone(original)
  ports.request.mockImplementation(async (_path, options) => {
    if (options?.method === 'POST') {
      current = {
        ...current,
        status: 'pending',
        latest_event_id: current.latest_event_id + 1,
        events: [
          ...current.events,
          {
            id: current.latest_event_id + 1,
            actor: 'user',
            text: options.body.text,
            status: 'pending',
            images: [],
            created_at: '2026-10-22T04:00:00Z'
          }
        ]
      }
      return current
    }
    return current
  })
  const page = shallowMount(FeedbackDetailPage, { global: globals })
  ports.load?.({ id: 'feedback-1' })
  ports.acknowledge.mockImplementation(async () => {
    expect(page.text()).toContain('原管理员回复')
  })
  ports.show?.()
  await flushPromises()
  expect(page.text()).toContain('安全场景摘要 · 来源已删除')
  expect(page.find('.feedback-source button').exists()).toBe(false)
  for (const text of ['补充一', '补充二']) {
    await page.get('textarea').setValue(text)
    await page.get('.submit').trigger('click')
    await flushPromises()
    expect(page.text()).toContain(text)
    expect(page.get('textarea').attributes('disabled')).toBeUndefined()
  }
  expect(page.text()).toContain('待处理')
  expect(current.events.map((item) => item.text)).toEqual([
    '原说明',
    '原管理员回复',
    '补充一',
    '补充二'
  ])
  expect(ports.request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
    2
  )
})
it('does not acknowledge a detail fetch failure', async () => {
  ports.request.mockRejectedValue(new ApiError('unavailable', '读取失败', 503))
  const page = shallowMount(FeedbackDetailPage, { global: globals })
  ports.load?.({ id: 'feedback-1' })
  ports.show?.()
  await flushPromises()
  expect(page.text()).toContain('读取失败')
  expect(ports.acknowledge).not.toHaveBeenCalled()
})
it('preserves the scene reference through the login target before requesting source content', async () => {
  ports.ensure.mockResolvedValue(false)
  shallowMount(FeedbackCreate, { global: globals })
  ports.load?.({ card_id: 'card-1', version_id: 'version-1' })
  ports.show?.()
  await flushPromises()
  expect(ports.ensure).toHaveBeenCalledWith(
    '/sub-packages/feedback/create?card_id=card-1&version_id=version-1'
  )
  expect(ports.request).not.toHaveBeenCalled()
})

it('keeps a malformed scene source blocked instead of silently creating generic feedback', async () => {
  const page = shallowMount(FeedbackCreate, { global: globals })
  ports.load?.({ card_id: 'card-1', version_id: '/invalid' })
  ports.show?.()
  await flushPromises()
  expect(page.text()).toContain('来源参数无效')
  expect(page.find('textarea').exists()).toBe(false)
  expect(ports.ensure).not.toHaveBeenCalled()
})

it('actually renders the available English title in the scene feedback source', async () => {
  ports.request.mockResolvedValueOnce({
    version_id: 'version-1',
    content: { name: '来源中文', title_en: 'Source English' }
  })
  const page = shallowMount(FeedbackCreate, { global: globals })
  ports.load?.({ card_id: 'card-1', version_id: 'version-1' })
  ports.show?.()
  await flushPromises()
  expect(page.get('.feedback-source').text()).toContain('Source English')
})
