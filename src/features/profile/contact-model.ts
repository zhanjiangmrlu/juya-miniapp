import { ApiError } from '@/services/errors'
import { CONSENT_VERSION } from '@/shared/constants/account'
import { PHONE_PATTERN, WECHAT_CONTACT_PATTERN } from '@/shared/constants/profile'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { ContactBaseline, ContactInput } from '@/shared/types/profile'

/** 构造一次原子联系方式变更，未修改字段不写回
 * @param base 已确认的本人联系方式与版本
 * @param draft 当前用户手填值
 */
export const contactChange = (
  base: ContactBaseline,
  draft: ContactInput
): components['schemas']['ContactChange'] | null => {
  const phone = draft.phone.trim(),
    wechat = draft.wechat_contact.trim()
  if (base.phone && !phone)
    throw new ApiError(
      'contact_removal_rejected',
      '已有联系方式不能通过清空删除，请保留或修改',
      0,
      [{ field: 'phone' }]
    )
  if (base.wechat_contact && !wechat)
    throw new ApiError(
      'contact_removal_rejected',
      '已有联系方式不能通过清空删除，请保留或修改',
      0,
      [{ field: 'wechat_contact' }]
    )
  const result: components['schemas']['ContactChange'] = {
    version: base.contact_version,
    consent_version: CONSENT_VERSION
  }
  let changed = false
  if (phone !== (base.phone || '')) {
    if (phone && !PHONE_PATTERN.test(phone))
      throw new ApiError('phone_invalid', '请输入11位大陆手机号', 0, [{ field: 'phone' }])
    result.phone = phone
    changed = true
  }
  if (wechat !== (base.wechat_contact || '')) {
    if (wechat && !WECHAT_CONTACT_PATTERN.test(wechat))
      throw new ApiError('wechat_contact_invalid', '请填写6–20位微信号，以字母开头', 0, [
        { field: 'wechat_contact' }
      ])
    result.wechat_contact = wechat
    changed = true
  }
  return changed ? result : null
}

/** 只读资料页默认脱敏手机号
 * @param phone 本人已保存手机号
 */
export const maskPhone = (phone: string) =>
  phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '已填写手机号'

/** 在明确重新获取后只保留用户实际修改的字段
 * @param previous 原编辑基准
 * @param draft 当前未提交输入
 * @param latest 最新服务器资料
 */
export const rebaseContact = (
  previous: ContactBaseline,
  draft: ContactInput,
  latest: ContactBaseline
): ContactInput => ({
  phone: draft.phone.trim() === (previous.phone || '') ? latest.phone || '' : draft.phone,
  wechat_contact:
    draft.wechat_contact.trim() === (previous.wechat_contact || '')
      ? latest.wechat_contact || ''
      : draft.wechat_contact
})
