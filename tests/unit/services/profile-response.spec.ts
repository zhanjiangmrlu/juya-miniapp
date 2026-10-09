import { describe, expect, it } from 'vitest'

import { adaptUserProfile } from '@/services/profile-response'

describe('用户资料响应', () => {
  it('将正式响应句芽号映射为展示字段且不把对象键当图片地址', () => {
    expect(
      adaptUserProfile({
        public_id: 'user',
        juya_number: '100001',
        nickname: null,
        avatar_object_key: 'avatars/private.png',
        contact_prompt_eligible: true
      })
    ).toEqual({
      juya_id: '100001',
      nickname: null,
      avatar_url: null,
      contact_prompt_eligible: true
    })
  })
  it('保持本地兼容响应及联系提示判定', () => {
    expect(
      adaptUserProfile({ juya_id: 'local', nickname: '小芽', avatar_url: null })
    ).toMatchObject({ juya_id: 'local' })
  })
})
