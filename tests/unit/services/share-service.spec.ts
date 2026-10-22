import { expect, it, vi } from 'vitest'

import {
  createShareService,
  homeShare,
  parseShareTarget,
  shareTargetURL
} from '@/services/share-service'

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

it('whitelists only target and stable card ID, stripping sender and queue data', () => {
  const target = parseShareTarget({
    target: 'scene',
    id: 'card-1',
    queue: 'foreign',
    version_id: 'old',
    token: 'secret'
  })
  expect(target).toEqual({ target: 'scene', id: 'card-1' })
  expect(shareTargetURL(target!)).toBe('/sub-packages/scenes/detail?target=scene&id=card-1')
  expect(parseShareTarget({ target: 'scene', id: '../me' })).toBeNull()
  expect(parseShareTarget({ target: 'unknown', id: 'card-1' })).toBeNull()
  expect(parseShareTarget({ target: 'learning', id: 'injected' })).toEqual({ target: 'learning' })
})

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
  await share.prepare('card-1')
  expect(share.ready.value).toBe(false)
  expect(share.summary.value).toBeNull()
  expect(share.error.value).toContain('已下线')
  expect(share.friends()).toEqual(homeShare.friends)
  expect(share.timeline()).toEqual(homeShare.timeline)
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
  expect(share.ready.value).toBe(false)
  expect(share.friends()).toEqual(homeShare.friends)
})

it('does not invent an English title for legacy cards', async () => {
  const share = createShareService({
    send: async () => ({ status: 200, data: { ...scene, title_en: '' } }),
    resource: (path) => path
  })
  await share.prepare('card-1')
  expect(share.friends().title).toBe('晨间')
})

it('does not enable native callbacks until both actual cover files are prepared, and uses safe brand fallback on file failure', async () => {
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
  expect(share.ready.value).toBe(false)
  expect(share.friends()).toEqual(homeShare.friends)
  prepareImage.mockImplementation(async (path: string) =>
    path.endsWith('/friends') ? '/local-friends.jpg' : '/local-timeline.jpg'
  )
  await share.prepare('card-1')
  expect(share.friends().imageUrl).toBe('/local-friends.jpg')
  expect(share.timeline().imageUrl).toBe('/local-timeline.jpg')
})
