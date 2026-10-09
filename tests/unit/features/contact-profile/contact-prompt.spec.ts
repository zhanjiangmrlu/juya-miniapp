import { describe, expect, it } from 'vitest'

import { shouldExposeContactPrompt } from '@/features/contact-profile/contact-prompt'
describe('联系资料一次提示', () => {
  it('仅服务端确认三场景完成且未填写未曝光时展示', () => {
    expect(shouldExposeContactPrompt(true, null, false)).toBe(true)
    expect(shouldExposeContactPrompt(false, null, false)).toBe(false)
    expect(shouldExposeContactPrompt(true, 'wechat_123', false)).toBe(false)
    expect(shouldExposeContactPrompt(true, null, true)).toBe(false)
  })
})
