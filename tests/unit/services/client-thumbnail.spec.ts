import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { clearClientThumbnails, clientThumbnail } from '@/services/client-thumbnail'

beforeEach(() => {
  clearClientThumbnails()
  vi.stubGlobal('uni', {
    downloadFile: vi.fn(({ success }) =>
      success({ statusCode: 200, tempFilePath: 'wxfile://original.png' })
    ),
    getImageInfo: vi.fn(({ success }) => success({ width: 1200, height: 1800 })),
    compressImage: vi.fn(({ success }) => success({ tempFilePath: 'wxfile://small.jpg' }))
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('coalesces original downloads and retains distinct full and scaled image files', async () => {
  const source = vi.fn(async () => 'https://api.example/original')
  const [first, second] = await Promise.all([
    clientThumbnail('account:card:v1', source),
    clientThumbnail('account:card:v1', source)
  ])
  expect(first).toEqual({
    thumbnailSrc: 'wxfile://small.jpg',
    originalSrc: 'wxfile://original.png'
  })
  expect(second).toBe(first)
  expect(await clientThumbnail('account:card:v1', source)).toBe(first)
  expect(uni.downloadFile).toHaveBeenCalledOnce()
  expect(uni.compressImage).toHaveBeenCalledWith(
    expect.objectContaining({ compressedWidth: 144, compressedHeight: 216, quality: 60 })
  )
})

it('does not cache a failed download or attempt to compress an HTTP error response', async () => {
  vi.mocked(uni.downloadFile).mockImplementationOnce(({ success }) => {
    success?.({ statusCode: 503, tempFilePath: 'wxfile://error' } as UniApp.DownloadSuccessData)
    return {} as UniApp.DownloadTask
  })
  const source = async () => 'https://api.example/original'
  await expect(clientThumbnail('failed', source)).rejects.toHaveProperty('status', 503)
  expect(uni.compressImage).not.toHaveBeenCalled()
  await expect(clientThumbnail('failed', source)).resolves.toHaveProperty(
    'thumbnailSrc',
    'wxfile://small.jpg'
  )
})

it('renews explicitly and separates accounts and immutable publication versions', async () => {
  const source = vi.fn(async () => 'https://api.example/original')
  await clientThumbnail('alice:card:v1', source)
  await clientThumbnail('alice:card:v1', source, true)
  await clientThumbnail('alice:card:v2', source)
  await clientThumbnail('bob:card:v2', source)
  clearClientThumbnails()
  await clientThumbnail('bob:card:v2', source)
  expect(uni.downloadFile).toHaveBeenCalledTimes(5)
})

it('rejects work that finishes after the account cache was cleared', async () => {
  let finish: (url: string) => void = () => undefined
  const pending = clientThumbnail(
    'old-account',
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  clearClientThumbnails()
  finish('https://api.example/original')
  await expect(pending).rejects.toThrow('账号状态已变化')
  expect(uni.downloadFile).not.toHaveBeenCalled()
})

it('expires cached results so a later visit obtains a fresh authorized original', async () => {
  vi.useFakeTimers()
  const source = vi.fn(async () => 'https://api.example/original')
  await clientThumbnail('expiry', source)
  vi.advanceTimersByTime(240001)
  await clientThumbnail('expiry', source)
  expect(uni.downloadFile).toHaveBeenCalledTimes(2)
})

it('uses canvas decoding when native image metadata rejects a displayable original', async () => {
  const drawImage = vi.fn()
  const image = {
    width: 2000,
    height: 3000,
    onload: () => {},
    onerror: () => {},
    set src(_value: string) {
      this.onload()
    }
  }
  const canvas = {
    width: 1,
    height: 1,
    createImage: () => image,
    getContext: () => ({ drawImage })
  }
  Object.assign(uni, {
    createOffscreenCanvas: vi.fn(() => canvas),
    canvasToTempFilePath: vi.fn(({ success }) =>
      success({ tempFilePath: 'wxfile://canvas-thumb.jpg' })
    )
  })
  vi.mocked(uni.getImageInfo).mockImplementationOnce(({ fail }) => {
    fail?.({ errMsg: 'getImageInfo:fail invalid' })
  })
  const result = await clientThumbnail(
    'canvas-fallback',
    async () => 'https://api.example/original'
  )
  expect(result).toEqual({
    thumbnailSrc: 'wxfile://canvas-thumb.jpg',
    originalSrc: 'wxfile://original.png'
  })
  expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 144, 216)
  expect(canvas).toMatchObject({ width: 144, height: 216 })
  expect(uni.compressImage).not.toHaveBeenCalled()
})
