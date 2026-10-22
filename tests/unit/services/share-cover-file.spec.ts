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
