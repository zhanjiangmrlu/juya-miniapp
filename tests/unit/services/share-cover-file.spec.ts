import { afterEach, expect, it, vi } from 'vitest'

import { downloadShareCover } from '@/services/share-cover-file'

afterEach(() => vi.unstubAllGlobals())

it('prepares only a public cover without credentials and verifies exact native pixel dimensions', async () => {
  const downloadFile = vi.fn((options) => {
    options.success({ statusCode: 200, tempFilePath: '/local-public-cover' })
    return { abort: vi.fn() }
  })
  const getImageInfo = vi.fn((options) =>
    options.success({ width: 600, height: 480, path: options.src })
  )
  vi.stubGlobal('uni', { downloadFile, getImageInfo })
  await expect(
    downloadShareCover('/api/mini/v1/public/cards/one/share/images/v1/friends', 600, 480)
  ).resolves.toBe('/local-public-cover')
  expect(downloadFile.mock.calls[0]?.[0].header).toEqual({})
  getImageInfo.mockImplementation((options) =>
    options.success({ width: 600, height: 600, path: options.src })
  )
  await expect(
    downloadShareCover('/api/mini/v1/public/cards/one/share/images/v1/friends', 600, 480)
  ).rejects.toThrow('封面')
  await expect(downloadShareCover('/api/mini/v1/cards/one/media', 600, 480)).rejects.toThrow('公开')
})

it('decodes the downloaded public file with OffscreenCanvas when getImageInfo fails', async () => {
  const image = {
    width: 600,
    height: 480,
    onload: () => undefined,
    onerror: () => undefined,
    set src(value: string) {
      expect(value).toBe('/downloaded-public')
      this.onload()
    }
  }
  const createOffscreenCanvas = vi.fn(() => ({ createImage: () => image }))
  vi.stubGlobal('uni', {
    downloadFile: (options: { success: (value: unknown) => void }) =>
      options.success({ statusCode: 200, tempFilePath: '/downloaded-public' }),
    getImageInfo: (options: { fail: () => void }) => options.fail(),
    createOffscreenCanvas
  })
  await expect(
    downloadShareCover('/api/mini/v1/public/cards/one/share/images/v1/friends', 600, 480)
  ).resolves.toBe('/downloaded-public')
  expect(createOffscreenCanvas).toHaveBeenCalledOnce()
  image.width = 601
  await expect(
    downloadShareCover('/api/mini/v1/public/cards/one/share/images/v1/friends', 600, 480)
  ).rejects.toThrow('比例')
})

it('rejects actual decode errors and unsupported canvas capability instead of claiming success', async () => {
  const image = {
    onload: () => undefined,
    onerror: () => undefined,
    set src(_value: string) {
      this.onerror()
    }
  }
  vi.stubGlobal('uni', {
    downloadFile: (options: { success: (value: unknown) => void }) =>
      options.success({ statusCode: 200, tempFilePath: '/broken' }),
    getImageInfo: (options: { fail: () => void }) => options.fail(),
    createOffscreenCanvas: () => ({ createImage: () => image })
  })
  await expect(
    downloadShareCover('/api/mini/v1/public/cards/one/share/images/v1/friends', 600, 480)
  ).rejects.toThrow('解码')
  vi.stubGlobal('uni', { downloadFile: uni.downloadFile, getImageInfo: uni.getImageInfo })
  await expect(
    downloadShareCover('/api/mini/v1/public/cards/one/share/images/v1/friends', 600, 480)
  ).rejects.toThrow('封面')
})

it('turns a silent native decoder into a retryable failure instead of waiting forever', async () => {
  vi.useFakeTimers()
  try {
    vi.stubGlobal('uni', {
      downloadFile: (options: { success: (value: unknown) => void }) =>
        options.success({ statusCode: 200, tempFilePath: '/silent' }),
      getImageInfo: (options: { fail: () => void }) => options.fail(),
      createOffscreenCanvas: () => ({
        createImage: () => ({ src: '', onload: () => undefined, onerror: () => undefined })
      })
    })
    const pending = downloadShareCover(
      '/api/mini/v1/public/cards/one/share/images/v1/friends',
      600,
      480
    )
    const result = expect(pending).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(10000)
    await result
  } finally {
    vi.useRealTimers()
  }
})
