import { afterEach, expect, it, vi } from 'vitest'

import { prepareImagePreviewSource } from '@/services/image-preview'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('returns the downloaded temporary original so reopening the viewer can reuse it', async () => {
  const getImageInfo = vi.fn(({ success }) => success({ path: 'wxfile://original-card' }))
  vi.stubGlobal('uni', { getImageInfo })
  await expect(prepareImagePreviewSource('https://api.example/original')).resolves.toBe(
    'wxfile://original-card'
  )
  expect(getImageInfo).toHaveBeenCalledOnce()
})

it('lets the image renderer load the authorized original when native preparation rejects it', async () => {
  const reason = { errMsg: 'getImageInfo:fail invalid https://api.example/private-credential' }
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.stubGlobal('uni', {
    getImageInfo: ({ fail }: { fail: (error: typeof reason) => void }) => fail(reason)
  })
  await expect(prepareImagePreviewSource('https://api.example/original')).resolves.toBe(
    'https://api.example/original'
  )
  expect(warning.mock.calls.flat().join(' ')).not.toContain('private-credential')
  expect(warning.mock.calls.flat().join(' ')).toContain('getImageInfo:fail invalid')
})
