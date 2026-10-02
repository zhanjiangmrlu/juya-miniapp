import { validateCorrectionReason } from './contact-form'
/** 拼接更正申请，wechatId 为已校验的新微信号，reason 为本人填写的更正原因 */
export const composeCorrectionReason = (wechatId: string, reason: string) => {
  const validation = validateCorrectionReason(reason)
  if (!validation.valid) return validation
  return validateCorrectionReason(`新微信号：${wechatId}\n更正原因：${validation.normalizedReason}`)
}
