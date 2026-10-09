import { ContactStatus } from '@/shared/enums/contact-profile'
export const CONTACT_STATUS_LABELS: Record<string, string> = {
  [ContactStatus.NOT_PROVIDED]: '未填写',
  [ContactStatus.PENDING]: '待联系',
  [ContactStatus.CONTACTED]: '已联系',
  [ContactStatus.UNREACHABLE]: '暂无法联系',
  [ContactStatus.DO_NOT_CONTACT]: '不希望联系'
}
export const CORRECTION_REASON_MIN_LENGTH = 2
export const CORRECTION_REASON_MAX_LENGTH = 500
