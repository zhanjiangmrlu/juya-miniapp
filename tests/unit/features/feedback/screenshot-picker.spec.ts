import { afterEach, describe, expect, it, vi } from 'vitest'

import { chooseFeedbackScreenshot } from '@/features/feedback/screenshot-picker'
afterEach(() => vi.unstubAllGlobals())
describe('跨端反馈图片选择', () => {
  it('H5临时blob路径使用原文件MIME，而不是误判为JPEG', () => {
    vi.stubGlobal('uni', {
      chooseImage: (options: { success: (data: unknown) => void }) =>
        options.success({ tempFiles: [{ path: 'blob:local/path', size: 10, type: 'image/png' }] })
    })
    const select = vi.fn()
    chooseFeedbackScreenshot(select, vi.fn())
    expect(select).toHaveBeenCalledWith({
      path: 'blob:local/path',
      size: 10,
      mimeType: 'image/png'
    })
  })
  it('拒绝GIF并明确单张压缩选择，非法图片不进入草稿', () => {
    const chooseImage = vi.fn((options: { success: (data: unknown) => void }) =>
      options.success({ tempFiles: [{ path: '/one.gif', size: 10, type: 'image/gif' }] })
    )
    vi.stubGlobal('uni', { chooseImage })
    const select = vi.fn(),
      fail = vi.fn()
    chooseFeedbackScreenshot(select, fail)
    expect(select).not.toHaveBeenCalled()
    expect(fail).toHaveBeenCalledWith('仅支持 JPG、PNG 或 WebP 图片')
    expect(chooseImage.mock.calls[0]?.[0]).toMatchObject({ count: 1, sizeType: ['compressed'] })
  })
})
