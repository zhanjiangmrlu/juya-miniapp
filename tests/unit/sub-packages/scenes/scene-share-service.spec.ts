import { expect, it, vi } from 'vitest'

import { createShareService } from '@/sub-packages/scenes/scene-share-service'

import type { HttpResponse } from '@/shared/types/runtime'

const scene = {
  card_id: 'card-1',
  version_id: 'v1',
  name: '晨间',
  title_en: 'Morning',
  images: {
    friends: {
      url: '/api/mini/v1/public/cards/card-1/share/images/v1/friends',
      width: 600,
      height: 480
    },
    timeline: {
      url: '/api/mini/v1/public/cards/card-1/share/images/v1/timeline',
      width: 600,
      height: 600
    }
  }
}

it('prepares an anonymous public-only summary and exact native fields/ratios', async () => {
  const send = vi.fn(async () => ({ status: 200, data: scene }))
  const share = createShareService({ send, resource: (path) => 'https://api.example' + path })
  await share.prepare('card-1')
  expect(send).toHaveBeenCalledWith({
    path: '/api/mini/v1/public/cards/card-1/share',
    method: 'GET',
    headers: {}
  })
  expect(share.friends()).toEqual({
    title: '晨间｜Morning',
    path: '/sub-packages/scenes/detail?target=scene&id=card-1',
    imageUrl: 'https://api.example' + scene.images.friends.url
  })
  expect(share.timeline()).toEqual({
    title: '晨间｜Morning',
    query: 'target=scene&id=card-1',
    imageUrl: 'https://api.example' + scene.images.timeline.url
  })
  expect(share.ready.value).toBe(true)
})

it('clears old summary on failure and never falls back to current private screenshot', async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce({ status: 200, data: scene })
    .mockResolvedValueOnce({
      status: 410,
      data: { error: { code: 'card_offline', message: '已下线' } }
    })
  const share = createShareService({ send, resource: (path) => path })
  await share.prepare('card-1')
  await share.prepare('card-1', '', true)
  expect(share.ready.value).toBe(false)
  expect(share.summary.value).toBeNull()
  expect(share.error.value).toContain('已下线')
  expect(share.friends()).toMatchObject({
    path: '/sub-packages/scenes/detail?target=scene&id=card-1'
  })
  expect(share.timeline()).toMatchObject({ query: 'target=scene&id=card-1' })
  expect(share.friends().imageUrl).toBeTruthy()
})

it('rejects late summaries, invalid cover dimensions and private cover URLs', async () => {
  let accept: (value: unknown) => void = () => undefined
  const send = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          accept = resolve
        })
    )
    .mockResolvedValueOnce({
      status: 200,
      data: JSON.parse(JSON.stringify(scene).replace(/card-1/g, 'card-2'))
    })
  const share = createShareService({ send, resource: (path) => path })
  const old = share.prepare('card-1')
  await share.prepare('card-2')
  accept({ status: 200, data: scene })
  await old
  expect(share.summary.value?.card_id).toBe('card-2')
  send.mockResolvedValue({
    status: 200,
    data: {
      ...scene,
      images: {
        ...scene.images,
        friends: { url: '/api/mini/v1/me/avatar', width: 400, height: 400 }
      }
    }
  })
  await share.prepare('card-1')
  expect(share.channels.friends.ready).toBe(false)
  expect(share.channels.timeline.ready).toBe(true)
  expect(share.friends()).toMatchObject({
    path: '/sub-packages/scenes/detail?target=scene&id=card-1'
  })
})

it('does not invent an English title for legacy cards', async () => {
  const share = createShareService({
    send: async () => ({ status: 200, data: { ...scene, title_en: '' } }),
    resource: (path) => path
  })
  await share.prepare('card-1')
  expect(share.friends().title).toBe('晨间')
})

it('allows a ready channel even when the other cover fails and retries only that channel', async () => {
  const prepareImage = vi
    .fn()
    .mockResolvedValueOnce('/local-friends.jpg')
    .mockRejectedValueOnce(new Error('封面下载失败'))
  const share = createShareService({
    send: async () => ({ status: 200, data: scene }),
    resource: (path) => path,
    prepareImage
  })
  await share.prepare('card-1')
  expect(share.ready.value).toBe(true)
  expect(share.channels.friends.ready).toBe(true)
  expect(share.channels.timeline.ready).toBe(false)
  expect(share.friends().imageUrl).toBe('/local-friends.jpg')
  prepareImage.mockImplementation(async (path: string) =>
    path.endsWith('/friends') ? '/local-friends.jpg' : '/local-timeline.jpg'
  )
  await share.retry('timeline')
  expect(prepareImage).toHaveBeenCalledTimes(3)
  expect(share.friends().imageUrl).toBe('/local-friends.jpg')
  expect(share.timeline().imageUrl).toBe('/local-timeline.jpg')
})

it('coalesces load, show and click preparation for the same target/version', async () => {
  let finish: (value: HttpResponse) => void = () => undefined
  const send = vi.fn(
    () =>
      new Promise<HttpResponse>((resolve) => {
        finish = resolve
      })
  )
  const share = createShareService({ send, resource: (path) => path })
  const requests = [
    share.prepare('card-1', 'v1'),
    share.prepare('card-1', 'v1'),
    share.prepare('card-1', 'v1')
  ]
  expect(send).toHaveBeenCalledTimes(1)
  finish({ status: 200, data: scene })
  await Promise.all(requests)
  await share.prepare('card-1', 'v1')
  expect(send).toHaveBeenCalledTimes(1)
})

it('rejects a publication mismatch and ignores files completed after clear', async () => {
  const finishes: ((value: string) => void)[] = []
  const share = createShareService({
    send: async () => ({ status: 200, data: scene }),
    resource: (path) => path,
    prepareImage: () =>
      new Promise((resolve) => {
        finishes.push(resolve)
      })
  })
  await share.prepare('card-1', 'v2')
  expect(share.ready.value).toBe(false)
  expect(share.error.value).toContain('更新')
  const pending = share.prepare('card-1', 'v1')
  await Promise.resolve()
  await Promise.resolve()
  share.clear()
  for (const finish of finishes) finish('/late-file')
  await pending
  expect(share.ready.value).toBe(false)
  expect(share.summary.value).toBeNull()
})

it('enables friends without waiting for a hanging timeline and merges repeated channel retries', async () => {
  let finishTimeline: (value: string) => void = () => undefined
  const prepareImage = vi.fn((path: string) =>
    path.endsWith('/friends')
      ? Promise.resolve('/friends')
      : new Promise<string>((resolve) => {
          finishTimeline = resolve
        })
  )
  const share = createShareService({
    send: async () => ({ status: 200, data: scene }),
    resource: (path) => path,
    prepareImage
  })
  const pending = share.prepare('card-1')
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(share.channels.friends.ready).toBe(true)
  expect(share.channels.timeline.busy).toBe(true)
  const retries = [share.retry('timeline'), share.retry('timeline')]
  expect(prepareImage).toHaveBeenCalledTimes(2)
  finishTimeline('/timeline')
  await Promise.all([pending, ...retries])
  expect(share.channels.timeline.ready).toBe(true)
})

it('rejects a malformed channel without blocking the other safe public cover', async () => {
  const prepareImage = vi.fn().mockResolvedValue('/safe-friends')
  const share = createShareService({
    send: async () => ({
      status: 200,
      data: {
        ...scene,
        images: {
          ...scene.images,
          timeline: { url: '/api/mini/v1/me/avatar', width: 600, height: 600 }
        }
      }
    }),
    resource: (path) => path,
    prepareImage
  })
  await share.prepare('card-1')
  expect(share.channels.friends.ready).toBe(true)
  expect(share.channels.timeline.ready).toBe(false)
  expect(share.channels.timeline.error).toContain('封面')
  expect(prepareImage).toHaveBeenCalledTimes(1)
  expect(share.timeline().imageUrl).not.toContain('/me/avatar')
})

it('allows a channel retry after the native image port throws synchronously', async () => {
  let failed = true
  const prepareImage = vi.fn((path: string) => {
    if (failed && path.endsWith('/friends')) throw new Error('native failure')
    return Promise.resolve(path)
  })
  const share = createShareService({
    send: async () => ({ status: 200, data: scene }),
    resource: (path) => path,
    prepareImage
  })
  await share.prepare('card-1')
  expect(share.channels.friends.error).toContain('native failure')
  failed = false
  await share.retry('friends')
  expect(share.channels.friends.ready).toBe(true)
})
