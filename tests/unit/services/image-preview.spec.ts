import { afterEach, expect, it, vi } from 'vitest'

import { prepareImagePreviewSource } from '@/services/image-preview'

afterEach(() => vi.unstubAllGlobals())

it('returns the downloaded temporary file so both views avoid a second no-store download', async () => {
  const getImageInfo = vi.fn(({ success }) => success({ path: 'wxfile://original-card' }))
  vi.stubGlobal('uni', { getImageInfo })
  await expect(prepareImagePreviewSource('https://api.example/original')).resolves.toBe(
    'wxfile://original-card'
  )
  expect(getImageInfo).toHaveBeenCalledOnce()
})

it('reports download failures so an expired or broken image can be retried', async () => {
  vi.stubGlobal('uni', { getImageInfo: ({ fail }: { fail: () => void }) => fail() })
  await expect(prepareImagePreviewSource('https://api.example/expired')).rejects.toThrow(
    '图片暂未加载'
  )
})
