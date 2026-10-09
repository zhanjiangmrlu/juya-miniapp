import { beforeEach, describe, expect, it, vi } from 'vitest'

import { submitSupplement } from '@/features/feedback/supplement-submit'

import type { FeedbackItem } from '@/shared/contracts/feedback'
const upload = vi.hoisted(() => vi.fn())
vi.mock('@/features/feedback/upload-service', () => ({ uploadFeedbackImage: upload }))
const item = { id: 'one', screenshots: [] } as unknown as FeedbackItem
const image = { path: '/one.png', mimeType: 'image/png', size: 50 }
beforeEach(() => vi.resetAllMocks())
describe('补充截图提交', () => {
  it('成功上传后携带对象键提交，不发送本地图片路径', async () => {
    upload.mockResolvedValue('feedback/one.png')
    const supplement = vi.fn().mockResolvedValue(item)
    await submitSupplement({ supplement } as never, item, ' 第三句无法播放 ', image)
    expect(supplement).toHaveBeenCalledWith('one', '第三句无法播放', ['feedback/one.png'])
  })
  it('上传失败不调用补充接口，原本机附件不被修改', async () => {
    upload.mockRejectedValue(new Error('upload failed'))
    const supplement = vi.fn()
    await expect(
      submitSupplement({ supplement } as never, item, '第三句无法播放', image)
    ).rejects.toThrow('upload failed')
    expect(supplement).not.toHaveBeenCalled()
    expect(image.path).toBe('/one.png')
  })
  it('原记录已有截图时禁止再附加，保持整条最多一张', async () => {
    const supplement = vi.fn()
    await expect(
      submitSupplement(
        { supplement } as never,
        { ...item, screenshots: ['existing'] },
        '第三句无法播放',
        image
      )
    ).rejects.toThrow('最多上传')
    expect(upload).not.toHaveBeenCalled()
    expect(supplement).not.toHaveBeenCalled()
  })
})
