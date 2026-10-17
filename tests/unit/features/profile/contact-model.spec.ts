import { describe, expect, it } from 'vitest'

import { contactChange, maskPhone } from '@/features/profile/contact-model'
const base = { phone: '13800138000', wechat_contact: 'legacy-unverified-value', contact_version: 4 }
describe('optional contact edits', () => {
  it('sends only actually changed values so an untouched historical source is preserved', () => {
    expect(
      contactChange(base, { phone: ' 13900139000 ', wechat_contact: base.wechat_contact })
    ).toEqual({ version: 4, phone: '13900139000', consent_version: '2026-10-17' })
  })
  it('does not create an empty save when an optional new account leaves both fields blank', () => {
    expect(
      contactChange(
        { phone: null, wechat_contact: null, contact_version: 1 },
        { phone: ' ', wechat_contact: '' }
      )
    ).toBeNull()
  })
  it('rejects clearing a previously saved field and never partially saves the other one', () => {
    expect(() => contactChange(base, { phone: '', wechat_contact: 'Learner123' })).toThrow(
      '不能通过清空删除'
    )
  })
  it('validates changed values without turning a phone into account identity', () => {
    expect(() =>
      contactChange(base, { phone: '123', wechat_contact: base.wechat_contact })
    ).toThrow('11位')
    expect(() => contactChange(base, { phone: base.phone, wechat_contact: '123bad' })).toThrow(
      '微信号'
    )
    expect(maskPhone(base.phone)).toBe('138****8000')
  })
})

it('rebases a version conflict without turning untouched stale fields into user edits', async () => {
  const { rebaseContact } = await import('@/features/profile/contact-model')
  expect(
    rebaseContact(
      { phone: '13800138000', wechat_contact: 'OriginalWx', contact_version: 1 },
      { phone: '13900139000', wechat_contact: 'OriginalWx' },
      { phone: '13700137000', wechat_contact: 'OtherDeviceWx', contact_version: 2 }
    )
  ).toEqual({ phone: '13900139000', wechat_contact: 'OtherDeviceWx' })
})
