import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createPageShareCoverCache } from '@/services/page-share-cover-cache'
import { runtimeMode } from '@/services/runtime-mode'

import type { PageShareCoverAssets } from '@/shared/types/share'

const assets: PageShareCoverAssets = {
  friends: {
    url: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/brand/friends-111111111111.jpg',
    file: 'friends-111111111111.jpg',
    fallback: '/static/friends-fallback.jpg',
    width: 1000,
    height: 800,
    bytes: 100
  },
  timeline: {
    url: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/brand/timeline-222222222222.jpg',
    file: 'timeline-222222222222.jpg',
    fallback: '/static/timeline-fallback.jpg',
    width: 800,
    height: 800,
    bytes: 80
  }
}
const files = new Map<string, { size: number; width: number; height: number }>()
const downloads: UniNamespace.DownloadFileOption[] = []
const abort = vi.fn()
const fileReads = vi.fn()
const fileWrites = vi.fn()
const imageDecodes = vi.fn()

/** 用渠道对应的真实文件数据完成一次原生下载
 * @param channel 本次下载所属的分享渠道
 * @param status 原生下载返回的 HTTP 状态
 */
const finish = (channel: 'friends' | 'timeline', status = 200) => {
  const asset = assets[channel]
  const request = downloads.find((item) => item.url === asset.url)!
  files.set(request.filePath!, { size: asset.bytes, width: asset.width, height: asset.height })
  request.success?.({ statusCode: status, tempFilePath: request.filePath!, errMsg: 'ok' })
}

beforeEach(() => {
  files.clear()
  downloads.length = 0
  abort.mockClear()
  fileReads.mockClear()
  fileWrites.mockClear()
  imageDecodes.mockClear()
  vi.stubGlobal('uni', {
    env: { USER_DATA_PATH: '/owned' },
    getFileSystemManager: () => ({
      accessSync: (path: string) => {
        fileReads()
        if (!files.has(path)) throw new Error('missing')
      },
      statSync: (path: string) => files.get(path),
      renameSync: (from: string, to: string) => {
        fileWrites()
        const value = files.get(from)
        if (!value) throw new Error('missing')
        files.set(to, value)
        files.delete(from)
      },
      unlinkSync: (path: string) => {
        fileWrites()
        files.delete(path)
      }
    }),
    getImageInfo: ({ src, success, fail }: UniNamespace.GetImageInfoOptions) => {
      imageDecodes()
      const file = files.get(src)
      if (file) success?.({ ...file, path: src, orientation: 'up', type: 'jpeg' })
      else fail?.({ errMsg: 'missing' })
    },
    downloadFile: (options: UniNamespace.DownloadFileOption) => {
      downloads.push(options)
      return { abort }
    }
  })
})
afterEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('immediately provides packaged fallbacks, deduplicates prefetch, and prepares channels independently', async () => {
  const cache = createPageShareCoverCache(assets)
  expect(cache.image('friends')).toBe('/static/friends-fallback.jpg')
  const first = cache.prepare()
  const second = cache.prepare()
  expect(downloads).toHaveLength(2)
  expect(downloads[0]?.header).toEqual({})
  finish('friends')
  finish('timeline', 503)
  await Promise.all([first, second])
  expect(cache.image('friends')).toBe('/owned/juya-page-share-friends-111111111111.jpg')
  expect(cache.image('timeline')).toBe('/static/timeline-fallback.jpg')
})

it('reuses verified persistent files across cache instances without another download', async () => {
  const first = createPageShareCoverCache(assets)
  const preparing = first.prepare()
  finish('friends')
  finish('timeline')
  await preparing
  downloads.length = 0
  const restarted = createPageShareCoverCache(assets)
  await restarted.prepare()
  expect(downloads).toHaveLength(0)
  expect(restarted.image('timeline')).toBe('/owned/juya-page-share-timeline-222222222222.jpg')
})

it('falls back immediately after system eviction and downloads the missing channel again', async () => {
  const cache = createPageShareCoverCache(assets)
  const preparing = cache.prepare()
  finish('friends')
  finish('timeline')
  await preparing
  files.delete('/owned/juya-page-share-friends-111111111111.jpg')
  expect(cache.image('friends')).toBe('/static/friends-fallback.jpg')
  downloads.length = 0
  const retry = cache.prepare()
  expect(downloads).toHaveLength(1)
  finish('friends')
  await retry
  expect(cache.image('friends')).toBe('/owned/juya-page-share-friends-111111111111.jpg')
})

it('rejects corrupt or wrong-sized downloaded images and retries after failure', async () => {
  const cache = createPageShareCoverCache(assets)
  const preparing = cache.prepare()
  finish('friends', 403)
  const request = downloads[1]!
  files.set(request.filePath!, { size: 80, width: 800, height: 1 })
  request.success?.({ statusCode: 200, tempFilePath: request.filePath!, errMsg: 'ok' })
  await preparing
  expect(files.size).toBe(0)
  expect(cache.image('friends')).toBe('/static/friends-fallback.jpg')
  downloads.length = 0
  const retry = cache.prepare()
  finish('friends')
  finish('timeline')
  await retry
  expect(cache.image('timeline')).toBe('/owned/juya-page-share-timeline-222222222222.jpg')
})

it('times out downloads, aborts them, and ignores late successes', async () => {
  vi.useFakeTimers()
  const cache = createPageShareCoverCache(assets)
  const preparing = cache.prepare()
  await vi.advanceTimersByTimeAsync(8000)
  await preparing
  expect(abort).toHaveBeenCalledTimes(2)
  finish('friends')
  expect(cache.image('friends')).toBe('/static/friends-fallback.jpg')
  expect(files.size).toBe(0)
})

it('does not download in browse-only mode or when an environment has no remote configuration', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await createPageShareCoverCache(assets).prepare()
  expect(downloads).toHaveLength(0)
  runtimeMode.update({ apiCategory: 'default' })
  const unconfigured = createPageShareCoverCache({
    friends: { ...assets.friends, url: '' },
    timeline: { ...assets.timeline, url: '' }
  })
  await unconfigured.prepare()
  expect(downloads).toHaveLength(0)
  expect(unconfigured.image('friends')).toBe('/static/friends-fallback.jpg')
})

it('does not delete a newer cached cover when an aborted older download succeeds late', async () => {
  vi.useFakeTimers()
  const cache = createPageShareCoverCache(assets)
  const first = cache.prepare()
  const stale = downloads[0]!
  await vi.advanceTimersByTimeAsync(8000)
  await first
  downloads.length = 0
  const retry = cache.prepare()
  finish('friends')
  finish('timeline')
  await retry
  files.set(stale.filePath!, { size: 100, width: 1000, height: 800 })
  stale.success?.({ statusCode: 200, tempFilePath: stale.filePath!, errMsg: 'late' })
  expect(cache.image('friends')).toBe('/owned/juya-page-share-friends-111111111111.jpg')
})

it('does not inspect existing local files after entering browse-only mode', async () => {
  const cache = createPageShareCoverCache(assets)
  const preparing = cache.prepare()
  finish('friends')
  finish('timeline')
  await preparing
  fileReads.mockClear()
  runtimeMode.update({ apiCategory: 'browseOnly' })
  expect(cache.image('friends')).toBe('/static/friends-fallback.jpg')
  await cache.prepare()
  expect(fileReads).not.toHaveBeenCalled()
})

it('cancels in-flight preparation without calling restricted file or image APIs, then retries in full mode', async () => {
  const cache = createPageShareCoverCache(assets)
  const preparing = cache.prepare()
  fileReads.mockClear()
  runtimeMode.update({ apiCategory: 'browseOnly' })
  finish('friends')
  finish('timeline')
  await preparing
  expect(abort).toHaveBeenCalledTimes(2)
  expect(fileReads).not.toHaveBeenCalled()
  expect(fileWrites).not.toHaveBeenCalled()
  expect(imageDecodes).not.toHaveBeenCalled()
  expect(cache.image('timeline')).toBe('/static/timeline-fallback.jpg')
  runtimeMode.update({ apiCategory: 'default' })
  downloads.length = 0
  const retry = cache.prepare()
  finish('friends')
  finish('timeline')
  await retry
  expect(cache.image('timeline')).toBe('/owned/juya-page-share-timeline-222222222222.jpg')
  expect([...files.keys()].every((path) => !path.includes('.pending-'))).toBe(true)
})
