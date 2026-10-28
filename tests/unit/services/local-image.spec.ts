import { afterEach, expect, it, vi } from 'vitest'

import { localImageSource } from '@/services/local-image'

afterEach(() => vi.unstubAllGlobals())

it('downloads authorized loopback images to a temporary file for native rendering', async () => {
  const downloadFile = vi.fn((options) =>
    options.success({ statusCode: 200, tempFilePath: 'wxfile://temporary-image' })
  )
  vi.stubGlobal('uni', { downloadFile })
  await expect(localImageSource('http://127.0.0.1:8002/media?thumbnail=list')).resolves.toBe(
    'wxfile://temporary-image'
  )
  expect(downloadFile.mock.calls[0][0].url).toBe('http://127.0.0.1:8002/media?thumbnail=list')
})

it('preserves HTTPS and packaged images without downloading them', async () => {
  vi.stubGlobal('uni', { downloadFile: vi.fn() })
  await expect(localImageSource('https://example.com/image')).resolves.toBe(
    'https://example.com/image'
  )
  await expect(localImageSource('/static/image.png')).resolves.toBe('/static/image.png')
  expect(uni.downloadFile).not.toHaveBeenCalled()
})

it('rejects failed downloads so the existing image retry remains available', async () => {
  vi.stubGlobal('uni', {
    downloadFile: (options: UniApp.DownloadFileOption) => options.fail?.({ errMsg: 'offline' })
  })
  await expect(localImageSource('http://localhost:8002/image')).rejects.toThrow('图片下载失败')
})
