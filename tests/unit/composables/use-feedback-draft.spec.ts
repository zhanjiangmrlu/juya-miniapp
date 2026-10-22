import { expect, it, vi } from 'vitest'

import { createFeedbackDraft } from '@/composables/use-feedback-draft'
import { ApiError } from '@/services/errors'
import { createOperationService } from '@/services/operation-service'

const setup = (feedbackId?: string) => {
  let owner: string | null = 'owner'
  const request = vi.fn(),
    rows = new Map<string, unknown>()
  const session = { userId: () => owner, request }
  let key = 0
  const operations = createOperationService({
    session,
    key: () => `feedback-operation-${++key}`,
    storage: {
      get: (k) => structuredClone(rows.get(k)),
      set: (k, v) => {
        rows.set(k, structuredClone(v))
      },
      remove: (k) => {
        rows.delete(k)
      }
    }
  })
  const draft = createFeedbackDraft({
    session,
    operations,
    action: feedbackId ? `feedback:reply:${feedbackId}` : 'feedback:create',
    feedbackId,
    owner: 'owner',
    source: { source: 'profile' },
    key: () => `image-${++key}`
  })
  return {
    draft,
    request,
    setOwner: (id: string | null) => {
      owner = id
    },
    rows,
    operations
  }
}
it('counts trimmed Unicode codepoints and blocks invalid content before any submission', async () => {
  const { draft, request } = setup()
  draft.category.value = 'content'
  draft.text.value = '   '
  expect(await draft.submit()).toBeNull()
  expect(request).not.toHaveBeenCalled()
  draft.text.value = ' 😀 '.repeat(501)
  expect(await draft.submit()).toBeNull()
  expect(request).not.toHaveBeenCalled()
  draft.text.value = ' ' + '😀'.repeat(500) + ' '
  request.mockResolvedValueOnce({ id: 'feedback-1', status: 'pending' })
  expect((await draft.submit())?.id).toBe('feedback-1')
  expect(draft.busy.value).toBe(false)
  expect(request.mock.calls[0]?.[1].body.text).toBe('😀'.repeat(500))
})
it('retains successful image IDs and retries only failed uploads before submitting them together', async () => {
  const { draft, request } = setup()
  request
    .mockResolvedValueOnce({
      id: 'image-1',
      state: 'ready',
      url: '/api/mini/v1/feedback-image/grant'
    })
    .mockRejectedValueOnce(new ApiError('bad_image', '无法解码图片', 422))
  await draft.addImages(['/one', '/two'])
  expect(draft.images.value[0]?.image?.id).toBe('image-1')
  expect(draft.images.value[1]?.error).toBe('无法解码图片')
  draft.category.value = 'display'
  draft.text.value = '图片位置'
  expect(await draft.submit()).toBeNull()
  request.mockResolvedValueOnce({
    id: 'image-2',
    state: 'ready',
    url: '/api/mini/v1/feedback-image/grant2'
  })
  await draft.upload(draft.images.value[1]!.key)
  request.mockResolvedValueOnce({ id: 'feedback-1' })
  await draft.submit()
  expect(
    request.mock.calls.filter(([path]) => path === '/api/mini/v1/feedback/images')
  ).toHaveLength(3)
  expect(request.mock.calls.at(-1)?.[1].body.images).toEqual(['image-1', 'image-2'])
})
it('queries an unknown original submission before explicit retry and never uses edited replacement text', async () => {
  const { draft, request } = setup()
  draft.category.value = 'content'
  draft.text.value = '原说明'
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await draft.submit()
  draft.text.value = '新说明'
  request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
  await draft.submit()
  expect(request.mock.calls[1]?.[0]).toContain('/operations/')
  expect(request).toHaveBeenCalledTimes(2)
  request.mockResolvedValueOnce({ id: 'feedback-1' })
  await draft.submit()
  expect(request.mock.calls[2]?.[1].body.text).toBe('原说明')
  expect(request.mock.calls[2]?.[1].key).toBe(request.mock.calls[0]?.[1].key)
})
it('locks private input on expiry, preserves it for the same owner and rejects all work under another account', async () => {
  const { draft, request, setOwner } = setup()
  draft.text.value = '保留的原说明'
  draft.category.value = 'content'
  draft.lock()
  setOwner(null)
  expect(draft.active.value).toBe(false)
  await draft.submit()
  expect(request).not.toHaveBeenCalled()
  setOwner('owner')
  await draft.resume()
  expect(draft.text.value).toBe('保留的原说明')
  expect(draft.active.value).toBe(true)
  draft.lock()
  setOwner('other')
  await draft.resume()
  expect(draft.text.value).toBe('')
  expect(draft.active.value).toBe(false)
})

it.each([undefined, 'feedback-1'])(
  'allows another original create or supplement after a confirmed success (%s)',
  async (feedbackId) => {
    const { draft, request } = setup(feedbackId)
    draft.category.value = 'content'
    draft.text.value = '第一次说明'
    request.mockResolvedValueOnce({ id: 'feedback-1', status: 'pending' })
    await draft.submit()
    draft.category.value = 'function'
    draft.text.value = '第二次说明'
    request.mockResolvedValueOnce({ id: 'feedback-2', status: 'pending' })
    await draft.submit()
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1]?.[1].body.text).toBe('第二次说明')
    expect(request.mock.calls[1]?.[1].key).not.toBe(request.mock.calls[0]?.[1].key)
    expect(draft.busy.value).toBe(false)
  }
)

it('explicitly retries the original image after same-owner relogin and a missing receipt without reuploading successful items', async () => {
  const { draft, request, operations, setOwner } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '上传响应未知'))
  await draft.addImages(['/original-image'])
  draft.lock()
  setOwner(null)
  operations.clearMemory()
  setOwner('owner')
  await draft.resume()
  request
    .mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    .mockResolvedValueOnce({
      id: 'image-1',
      state: 'ready',
      url: '/api/mini/v1/feedback/images/grant'
    })
  await draft.upload(draft.images.value[0]!.key)
  expect(draft.images.value[0]?.image?.id).toBe('image-1')
  expect(request.mock.calls[1]?.[0]).toContain('/operations/')
  expect(request.mock.calls[2]?.[1].key).toBe(request.mock.calls[0]?.[1].key)
  expect(request.mock.calls[2]?.[1].body.file_path).toBe('/original-image')
})

it.each([undefined, 'feedback-1'])(
  'leaves an unknown transaction recoverable with its original immutable input after leaving (%s)',
  async (feedbackId) => {
    const { draft, request } = setup(feedbackId)
    draft.category.value = 'content'
    draft.text.value = '原说明'
    request.mockRejectedValueOnce(new ApiError('network_unknown', '结果未知'))
    await draft.submit()
    draft.discard()
    request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    await draft.resume()
    expect(draft.text.value).toBe('原说明')
    expect(draft.retryOriginal.value).toBe(true)
    request.mockResolvedValueOnce({ id: 'accepted', status: 'pending' })
    expect((await draft.submit())?.id).toBe('accepted')
    expect(request.mock.calls[2]?.[1].key).toBe(request.mock.calls[0]?.[1].key)
    expect(request.mock.calls[2]?.[1].body.text).toBe('原说明')
  }
)

it.each([undefined, 'feedback-1'])(
  'allows a fresh metadata-only draft to refill the original key and recover a late committed receipt after conflict (%s)',
  async (feedbackId) => {
    const { draft: previous, request, rows } = setup(feedbackId)
    previous.category.value = 'content'
    previous.text.value = '旧原文'
    request.mockRejectedValueOnce(new ApiError('network_unknown', '结果未知'))
    await previous.submit()
    const newKey = vi.fn(() => 'must-not-create-new-key'),
      session = { userId: () => 'owner', request }
    const operations = createOperationService({
      session,
      key: newKey,
      storage: {
        get: (key) => rows.get(key),
        set: (key, value) => {
          rows.set(key, value)
        },
        remove: (key) => {
          rows.delete(key)
        }
      }
    })
    const action = feedbackId ? `feedback:reply:${feedbackId}` : 'feedback:create'
    const draft = createFeedbackDraft({
      session,
      operations,
      action,
      feedbackId,
      owner: 'owner',
      source: { source: 'profile' },
      key: () => 'image'
    })
    request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    await draft.resume()
    draft.updateText('重填的说明')
    draft.selectCategory('function')
    expect(draft.text.value).toBe('重填的说明')
    let accepted = 0
    request.mockImplementationOnce(async () => {
      accepted++
      throw new ApiError('operation_conflict', '原请求已接受', 409)
    })
    await draft.submit()
    expect(request.mock.calls[2]?.[1].key).toBe(request.mock.calls[0]?.[1].key)
    expect(operations.pending(action)).toBe(true)
    request.mockResolvedValueOnce({
      status: 'succeeded',
      result: { id: 'original-accepted', status: 'pending' }
    })
    expect((await draft.submit())?.id).toBe('original-accepted')
    expect(request.mock.calls[3]?.[0]).toContain('/operations/')
    expect(accepted).toBe(1)
    expect(newKey).not.toHaveBeenCalled()
    expect(request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2)
  }
)

it.each([undefined, 'feedback-1'])(
  'purges private input on account switch but still allows the original owner to refill the same pending key (%s)',
  async (feedbackId) => {
    const { draft, request, setOwner, operations } = setup(feedbackId)
    draft.category.value = 'content'
    draft.text.value = '前账号私人说明'
    request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
    await draft.submit()
    draft.lock()
    setOwner('other')
    await draft.resume()
    operations.clearMemory()
    expect(draft.text.value).toBe('')
    expect(draft.images.value).toEqual([])
    setOwner('owner')
    request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    await draft.resume()
    expect(draft.refill.value).toBe(true)
    draft.updateText('本人重新填写')
    draft.selectCategory('function')
    request.mockResolvedValueOnce({ id: 'confirmed-original-key', status: 'pending' })
    expect((await draft.submit())?.id).toBe('confirmed-original-key')
    expect(request.mock.calls[2]?.[1].key).toBe(request.mock.calls[0]?.[1].key)
    expect(request.mock.calls[2]?.[1].body.text).toBe('本人重新填写')
  }
)

it.each([undefined, 'feedback-1'])(
  'keeps a rebound unknown transaction on its original key through another timeout, normal retry rejection and final receipt (%s)',
  async (feedbackId) => {
    const { draft: original, request, rows } = setup(feedbackId)
    original.category.value = 'content'
    original.text.value = 'original A'
    request.mockRejectedValueOnce(new ApiError('network_unknown', 'A结果未知'))
    await original.submit()
    const session = { userId: () => 'owner', request },
      generated = vi.fn(() => 'forbidden-key-2')
    const operations = createOperationService({
      session,
      key: generated,
      storage: {
        get: (key) => rows.get(key),
        set: (key, value) => {
          rows.set(key, value)
        },
        remove: (key) => {
          rows.delete(key)
        }
      }
    })
    const action = feedbackId ? `feedback:reply:${feedbackId}` : 'feedback:create'
    const draft = createFeedbackDraft({
      session,
      operations,
      action,
      feedbackId,
      owner: 'owner',
      source: { source: 'profile' },
      key: () => 'image-key'
    })
    request.mockRejectedValueOnce(new ApiError('operation_unknown', '暂未提交', 404))
    await draft.resume()
    draft.updateText('replacement B')
    draft.selectCategory('function')
    request.mockRejectedValueOnce(new ApiError('network_unknown', 'B结果未知'))
    await draft.submit()
    request.mockRejectedValueOnce(new ApiError('operation_unknown', '仍未查到', 404))
    await draft.submit()
    expect(draft.retryOriginal.value).toBe(true)
    request.mockRejectedValueOnce(new ApiError('invalid_request', 'B重试校验失败', 422))
    await draft.submit()
    expect(operations.pending(action)).toBe(true)
    expect(draft.unknown.value).toBe(true)
    let accepted = 0
    request.mockImplementationOnce(async () => {
      accepted++
      return { status: 'succeeded', result: { id: 'accepted-original-A', status: 'pending' } }
    })
    expect((await draft.submit())?.id).toBe('accepted-original-A')
    expect(request.mock.calls.at(-1)?.[0]).toContain('/operations/')
    expect(
      request.mock.calls
        .filter(([, options]) => options?.method === 'POST')
        .map(([, options]) => options.key)
    ).toEqual(['feedback-operation-1', 'feedback-operation-1', 'feedback-operation-1'])
    expect(accepted).toBe(1)
    expect(generated).not.toHaveBeenCalled()
    expect(JSON.stringify(Array.from(rows.values()))).not.toContain('replacement B')
  }
)
